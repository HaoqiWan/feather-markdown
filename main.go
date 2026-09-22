package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"sync"
	"syscall"
	"time"
)

const maxDocumentSize = 16 << 20

var version = "dev"

var featherAssetReference = regexp.MustCompile(`feather-asset:([a-f0-9]{24}\.(?:png|jpg|gif|webp|svg))`)

//go:embed web
var embeddedFiles embed.FS

type documentStore struct {
	path string
	mu   sync.RWMutex
}

type documentResponse struct {
	Enabled  bool   `json:"enabled"`
	Name     string `json:"name,omitempty"`
	Content  string `json:"content,omitempty"`
	Modified int64  `json:"modified,omitempty"`
}

type workspaceEntry struct {
	Name     string           `json:"name"`
	Path     string           `json:"path"`
	Type     string           `json:"type"`
	Children []workspaceEntry `json:"children,omitempty"`
}

type workspaceResponse struct {
	Enabled bool             `json:"enabled"`
	Name    string           `json:"name,omitempty"`
	Path    string           `json:"path,omitempty"`
	Entries []workspaceEntry `json:"entries,omitempty"`
}

type app struct {
	document    *documentStore
	assetDir    string
	startWindow func(string) error
	workspaceMu sync.RWMutex
	workspace   string
}

func main() {
	addr := flag.String("addr", "127.0.0.1:0", "internal listen address")
	document := flag.String("file", "", "Markdown file to watch and save")
	browser := flag.Bool("browser", false, "run in the default browser instead of a desktop window")
	debug := flag.Bool("debug", false, "enable desktop webview developer tools")
	startup := flag.String("startup", "", "internal startup action")
	showVersion := flag.Bool("version", false, "print version and exit")
	flag.Parse()
	if *document == "" && flag.NArg() > 0 {
		*document = flag.Arg(0)
	}

	if *showVersion {
		fmt.Println("Feather Markdown", version)
		return
	}
	if *startup != "" && *startup != "new" && *startup != "open" {
		log.Fatal("startup action must be new or open")
	}

	filePath := ""
	if *document != "" {
		absolute, err := filepath.Abs(*document)
		if err != nil {
			log.Fatal(err)
		}
		filePath = absolute
	}

	listener, err := net.Listen("tcp", *addr)
	if err != nil {
		log.Fatal(err)
	}
	application := &app{document: &documentStore{path: filePath}, startWindow: startNewWindow}
	server := &http.Server{
		Handler:           application.routes(),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	url := "http://" + browserAddress(listener.Addr().String())
	if *startup != "" {
		url += "?startup=" + *startup
	}
	log.Printf("Feather Markdown %s is running at %s", version, url)
	if filePath != "" {
		log.Printf("watching %s", filePath)
	}

	if *browser {
		go func() {
			time.Sleep(120 * time.Millisecond)
			if err := openBrowser(url); err != nil {
				log.Printf("open browser: %v", err)
			}
		}()
	}

	serverErrors := make(chan error, 1)
	go func() {
		if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- err
		}
	}()

	if *browser {
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
		select {
		case <-stop:
		case err := <-serverErrors:
			log.Printf("server: %v", err)
		}
	} else if err := runDesktop(url, *debug); err != nil {
		_ = server.Close()
		log.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}

func (a *app) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/document", a.handleDocument)
	mux.HandleFunc("/api/window", a.handleWindow)
	mux.HandleFunc("/api/assets", a.handleAssetUpload)
	mux.HandleFunc("/api/assets/", a.handleAsset)
	mux.HandleFunc("/api/workspace", a.handleWorkspace)
	mux.HandleFunc("/api/workspace/file", a.handleWorkspaceFile)
	mux.HandleFunc("/api/workspace/create", a.handleWorkspaceCreate)
	mux.HandleFunc("/api/workspace/resource", a.handleWorkspaceResource)
	mux.HandleFunc("/api/workspace/assets", a.handleWorkspaceAssetUpload)
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "version": version})
	})

	web, err := fs.Sub(embeddedFiles, "web")
	if err != nil {
		panic(err)
	}
	assets := http.FileServer(http.FS(web))
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			if _, err := fs.Stat(web, strings.TrimPrefix(r.URL.Path, "/")); err != nil {
				http.NotFound(w, r)
				return
			}
		}
		if r.URL.Path == "/service-worker.js" {
			w.Header().Set("Service-Worker-Allowed", "/")
			w.Header().Set("Cache-Control", "no-cache")
		}
		assets.ServeHTTP(w, r)
	}))

	return securityHeaders(mux)
}

func (a *app) imageAssetDirectory() (string, error) {
	if a.assetDir != "" {
		return a.assetDir, nil
	}
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("locate user config directory: %w", err)
	}
	return filepath.Join(configDir, "Feather Markdown", "assets"), nil
}

func imageAssetType(data []byte) (extension string, contentType string, err error) {
	detected := http.DetectContentType(data)
	switch detected {
	case "image/png":
		return ".png", detected, nil
	case "image/jpeg":
		return ".jpg", detected, nil
	case "image/gif":
		return ".gif", detected, nil
	case "image/webp":
		return ".webp", detected, nil
	}
	trimmed := bytes.TrimSpace(data)
	if len(trimmed) > 0 && bytes.Contains(bytes.ToLower(trimmed[:min(len(trimmed), 1024)]), []byte("<svg")) {
		return ".svg", "image/svg+xml", nil
	}
	return "", "", fmt.Errorf("unsupported image type %q", detected)
}

func validAssetID(id string) bool {
	extension := strings.ToLower(filepath.Ext(id))
	if extension != ".png" && extension != ".jpg" && extension != ".gif" && extension != ".webp" && extension != ".svg" {
		return false
	}
	digest := strings.TrimSuffix(id, extension)
	if len(digest) != 24 || strings.ToLower(id) != id {
		return false
	}
	_, err := hex.DecodeString(digest)
	return err == nil
}

func (a *app) storeImageAsset(data []byte) (string, error) {
	extension, _, err := imageAssetType(data)
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256(data)
	id := hex.EncodeToString(digest[:12]) + extension
	directory, err := a.imageAssetDirectory()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(directory, 0o700); err != nil {
		return "", err
	}
	if err := os.WriteFile(filepath.Join(directory, id), data, 0o600); err != nil {
		return "", err
	}
	return id, nil
}

func documentAssetFolder(documentPath string) string {
	name := filepath.Base(documentPath)
	extension := filepath.Ext(name)
	base := strings.TrimSuffix(name, extension)
	if base == "" {
		base = "document"
	}
	return base + ".assets"
}

func (a *app) materializeDocumentAssets(content, documentPath string) (string, error) {
	matches := featherAssetReference.FindAllStringSubmatch(content, -1)
	if len(matches) == 0 {
		return content, nil
	}
	sourceDirectory, err := a.imageAssetDirectory()
	if err != nil {
		return "", err
	}
	assetFolder := documentAssetFolder(documentPath)
	destinationDirectory := filepath.Join(filepath.Dir(documentPath), assetFolder)
	if err := os.MkdirAll(destinationDirectory, 0o755); err != nil {
		return "", err
	}
	for _, match := range matches {
		id := match[1]
		data, err := os.ReadFile(filepath.Join(sourceDirectory, id))
		if err != nil {
			return "", fmt.Errorf("read image asset %s: %w", id, err)
		}
		if err := os.WriteFile(filepath.Join(destinationDirectory, id), data, 0o644); err != nil {
			return "", fmt.Errorf("write portable image asset %s: %w", id, err)
		}
	}
	return featherAssetReference.ReplaceAllStringFunc(content, func(reference string) string {
		parts := featherAssetReference.FindStringSubmatch(reference)
		return "<./" + assetFolder + "/" + parts[1] + ">"
	}), nil
}

func (a *app) internalizeDocumentAssets(content, documentPath string) string {
	assetFolder := documentAssetFolder(documentPath)
	pattern := regexp.MustCompile(`<?\./` + regexp.QuoteMeta(assetFolder) + `/([a-f0-9]{24}\.(?:png|jpg|gif|webp|svg))>?`)
	return pattern.ReplaceAllStringFunc(content, func(reference string) string {
		match := pattern.FindStringSubmatch(reference)
		if len(match) != 2 || !validAssetID(match[1]) {
			return reference
		}
		data, err := os.ReadFile(filepath.Join(filepath.Dir(documentPath), assetFolder, match[1]))
		if err != nil {
			return reference
		}
		id, err := a.storeImageAsset(data)
		if err != nil {
			return reference
		}
		return "feather-asset:" + id
	})
}

func (a *app) handleAssetUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	remoteIP := net.ParseIP(host)
	if err != nil || remoteIP == nil || !remoteIP.IsLoopback() {
		http.Error(w, "assets can only be added locally", http.StatusForbidden)
		return
	}
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, (8<<20)+1))
	if err != nil {
		http.Error(w, "image exceeds 8 MiB", http.StatusRequestEntityTooLarge)
		return
	}
	if len(data) == 0 || len(data) > 8<<20 {
		http.Error(w, "image must be between 1 byte and 8 MiB", http.StatusRequestEntityTooLarge)
		return
	}
	if _, _, err := imageAssetType(data); err != nil {
		http.Error(w, err.Error(), http.StatusUnsupportedMediaType)
		return
	}
	id, err := a.storeImageAsset(data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (a *app) handleAsset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/assets/")
	if !validAssetID(id) {
		http.NotFound(w, r)
		return
	}
	directory, err := a.imageAssetDirectory()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	data, err := os.ReadFile(filepath.Join(directory, id))
	if errors.Is(err, os.ErrNotExist) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_, contentType, err := imageAssetType(data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnsupportedMediaType)
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	if r.Method == http.MethodGet {
		_, _ = w.Write(data)
	}
}

func (a *app) configDirectory() (string, error) {
	if a.assetDir != "" {
		return filepath.Dir(a.assetDir), nil
	}
	directory, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(directory, "Feather Markdown"), nil
}

func (a *app) loadWorkspacePreference() string {
	directory, err := a.configDirectory()
	if err != nil {
		return ""
	}
	data, err := os.ReadFile(filepath.Join(directory, "workspace.json"))
	if err != nil {
		return ""
	}
	var preference struct {
		Path string `json:"path"`
	}
	if json.Unmarshal(data, &preference) != nil {
		return ""
	}
	info, err := os.Stat(preference.Path)
	if err != nil || !info.IsDir() {
		return ""
	}
	absolute, err := filepath.Abs(preference.Path)
	if err != nil {
		return ""
	}
	return filepath.Clean(absolute)
}

func (a *app) saveWorkspacePreference(path string) error {
	directory, err := a.configDirectory()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(directory, 0o700); err != nil {
		return err
	}
	data, _ := json.Marshal(map[string]string{"path": path})
	return os.WriteFile(filepath.Join(directory, "workspace.json"), data, 0o600)
}

func (a *app) workspaceRoot() string {
	a.workspaceMu.RLock()
	root := a.workspace
	a.workspaceMu.RUnlock()
	if root != "" {
		return root
	}
	root = a.loadWorkspacePreference()
	if root != "" {
		a.workspaceMu.Lock()
		a.workspace = root
		a.workspaceMu.Unlock()
	}
	return root
}

func (a *app) setWorkspace(path string) error {
	absolute, err := filepath.Abs(strings.TrimSpace(path))
	if err != nil {
		return err
	}
	info, err := os.Stat(absolute)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("workspace is not a directory")
	}
	absolute = filepath.Clean(absolute)
	if err := a.saveWorkspacePreference(absolute); err != nil {
		return err
	}
	a.workspaceMu.Lock()
	a.workspace = absolute
	a.workspaceMu.Unlock()
	return nil
}

func workspaceTree(directory, relative string, depth int, count *int) ([]workspaceEntry, error) {
	if depth > 12 || *count >= 3000 {
		return nil, nil
	}
	items, err := os.ReadDir(directory)
	if err != nil {
		return nil, err
	}
	entries := make([]workspaceEntry, 0, len(items))
	for _, item := range items {
		if *count >= 3000 || strings.HasPrefix(item.Name(), ".") {
			continue
		}
		entryPath := filepath.Join(relative, item.Name())
		if item.IsDir() {
			children, childErr := workspaceTree(filepath.Join(directory, item.Name()), entryPath, depth+1, count)
			if childErr != nil {
				continue
			}
			entries = append(entries, workspaceEntry{Name: item.Name(), Path: filepath.ToSlash(entryPath), Type: "folder", Children: children})
			*count++
			continue
		}
		extension := strings.ToLower(filepath.Ext(item.Name()))
		if extension != ".md" && extension != ".markdown" && extension != ".mdown" && extension != ".mkd" {
			continue
		}
		entries = append(entries, workspaceEntry{Name: item.Name(), Path: filepath.ToSlash(entryPath), Type: "file"})
		*count++
	}
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Type != entries[j].Type {
			return entries[i].Type == "folder"
		}
		return strings.ToLower(entries[i].Name) < strings.ToLower(entries[j].Name)
	})
	return entries, nil
}

func (a *app) workspaceSnapshot() (workspaceResponse, error) {
	root := a.workspaceRoot()
	if root == "" {
		return workspaceResponse{Enabled: false}, nil
	}
	count := 0
	entries, err := workspaceTree(root, "", 0, &count)
	if err != nil {
		return workspaceResponse{}, err
	}
	return workspaceResponse{Enabled: true, Name: filepath.Base(root), Path: root, Entries: entries}, nil
}

func localRequest(r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	remoteIP := net.ParseIP(host)
	return err == nil && remoteIP != nil && remoteIP.IsLoopback()
}

func (a *app) handleWorkspace(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		snapshot, err := a.workspaceSnapshot()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, snapshot)
	case http.MethodPost:
		if !localRequest(r) {
			http.Error(w, "workspace can only be changed locally", http.StatusForbidden)
			return
		}
		var request struct {
			Path string `json:"path"`
		}
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
		decoder.DisallowUnknownFields()
		if decoder.Decode(&request) != nil || strings.TrimSpace(request.Path) == "" {
			http.Error(w, "a workspace path is required", http.StatusBadRequest)
			return
		}
		if err := a.setWorkspace(request.Path); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		snapshot, err := a.workspaceSnapshot()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, snapshot)
	default:
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (a *app) workspaceTarget(relative string) (string, error) {
	root := a.workspaceRoot()
	if root == "" {
		return "", fmt.Errorf("no workspace selected")
	}
	if strings.ContainsRune(relative, 0) || filepath.IsAbs(relative) || filepath.VolumeName(relative) != "" {
		return "", fmt.Errorf("invalid workspace path")
	}
	clean := filepath.Clean(filepath.FromSlash(relative))
	if clean == "." || clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("invalid workspace path")
	}
	target := filepath.Join(root, clean)
	relativeToRoot, err := filepath.Rel(root, target)
	if err != nil || relativeToRoot == ".." || strings.HasPrefix(relativeToRoot, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("workspace path escapes its root")
	}
	return target, nil
}

func (a *app) handleWorkspaceFile(w http.ResponseWriter, r *http.Request) {
	if !localRequest(r) {
		http.Error(w, "workspace files are only available locally", http.StatusForbidden)
		return
	}
	relative := r.URL.Query().Get("path")
	target, err := a.workspaceTarget(relative)
	if err != nil || !isMarkdownPath(target) {
		http.Error(w, "invalid Markdown path", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodGet:
		data, err := os.ReadFile(target)
		if errors.Is(err, os.ErrNotExist) {
			http.NotFound(w, r)
			return
		}
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if len(data) > maxDocumentSize {
			http.Error(w, "document exceeds 16 MiB", http.StatusRequestEntityTooLarge)
			return
		}
		content := a.internalizeDocumentAssets(string(data), target)
		writeJSON(w, http.StatusOK, map[string]string{"name": filepath.Base(target), "path": filepath.ToSlash(relative), "content": content})
	case http.MethodPut:
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxDocumentSize))
		if err != nil {
			http.Error(w, "document exceeds 16 MiB", http.StatusRequestEntityTooLarge)
			return
		}
		portableContent, err := a.materializeDocumentAssets(string(body), target)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if err := os.WriteFile(target, []byte(portableContent), 0o644); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"saved": true})
	default:
		w.Header().Set("Allow", "GET, PUT")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (a *app) handleWorkspaceResource(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	target, err := a.workspaceTarget(r.URL.Query().Get("path"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	data, err := os.ReadFile(target)
	if err != nil || len(data) > 16<<20 {
		http.NotFound(w, r)
		return
	}
	_, contentType, err := imageAssetType(data)
	if err != nil {
		http.Error(w, "unsupported workspace resource", http.StatusUnsupportedMediaType)
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(http.StatusOK)
	if r.Method == http.MethodGet {
		_, _ = w.Write(data)
	}
}

func (a *app) handleWorkspaceAssetUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !localRequest(r) {
		http.Error(w, "workspace assets are only available locally", http.StatusForbidden)
		return
	}
	documentPath, err := a.workspaceTarget(r.URL.Query().Get("path"))
	if err != nil || !isMarkdownPath(documentPath) {
		http.Error(w, "invalid Markdown path", http.StatusBadRequest)
		return
	}
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, (8<<20)+1))
	if err != nil || len(data) == 0 || len(data) > 8<<20 {
		http.Error(w, "image exceeds 8 MiB", http.StatusRequestEntityTooLarge)
		return
	}
	extension, _, err := imageAssetType(data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnsupportedMediaType)
		return
	}
	digest := sha256.Sum256(data)
	id := hex.EncodeToString(digest[:12]) + extension
	assetFolder := documentAssetFolder(documentPath)
	directory := filepath.Join(filepath.Dir(documentPath), assetFolder)
	if err := os.MkdirAll(directory, 0o755); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := os.WriteFile(filepath.Join(directory, id), data, 0o644); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "reference": "<./" + assetFolder + "/" + id + ">"})
}

func isMarkdownPath(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".md", ".markdown", ".mdown", ".mkd":
		return true
	default:
		return false
	}
}

func validWorkspaceName(name string) bool {
	name = strings.TrimSpace(name)
	return name != "" && name != "." && name != ".." && filepath.Base(name) == name && !strings.ContainsAny(name, `<>:"/\|?*`)
}

func (a *app) handleWorkspaceCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !localRequest(r) {
		http.Error(w, "workspace files are only available locally", http.StatusForbidden)
		return
	}
	var request struct {
		Type   string `json:"type"`
		Parent string `json:"parent"`
		Name   string `json:"name"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&request) != nil || !validWorkspaceName(request.Name) {
		http.Error(w, "invalid workspace item", http.StatusBadRequest)
		return
	}
	parent := a.workspaceRoot()
	if request.Parent != "" {
		var err error
		parent, err = a.workspaceTarget(request.Parent)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}
	if info, err := os.Stat(parent); err != nil || !info.IsDir() {
		http.Error(w, "parent category does not exist", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(request.Name)
	if request.Type == "note" && !isMarkdownPath(name) {
		name += ".md"
	}
	target := filepath.Join(parent, name)
	switch request.Type {
	case "folder":
		if err := os.Mkdir(target, 0o755); err != nil {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
	case "note":
		file, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
		if err != nil {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		_ = file.Close()
	default:
		http.Error(w, "type must be note or folder", http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"path": filepath.ToSlash(filepath.Join(request.Parent, name)), "name": name, "type": request.Type})
}

func (a *app) handleWindow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	remoteIP := net.ParseIP(host)
	if err != nil || remoteIP == nil || !remoteIP.IsLoopback() {
		http.Error(w, "new windows can only be created locally", http.StatusForbidden)
		return
	}
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		http.Error(w, "content type must be application/json", http.StatusUnsupportedMediaType)
		return
	}
	var request struct {
		Action string `json:"action"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil || (request.Action != "new" && request.Action != "open") {
		http.Error(w, "action must be new or open", http.StatusBadRequest)
		return
	}
	startWindow := a.startWindow
	if startWindow == nil {
		startWindow = startNewWindow
	}
	if err := startWindow(request.Action); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]bool{"opened": true})
}

func (a *app) handleDocument(w http.ResponseWriter, r *http.Request) {
	if a.document.path == "" {
		writeJSON(w, http.StatusOK, documentResponse{Enabled: false})
		return
	}

	switch r.Method {
	case http.MethodGet:
		a.document.mu.RLock()
		defer a.document.mu.RUnlock()
		data, err := os.ReadFile(a.document.path)
		if errors.Is(err, os.ErrNotExist) {
			writeJSON(w, http.StatusOK, documentResponse{Enabled: true, Name: filepath.Base(a.document.path)})
			return
		}
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if len(data) > maxDocumentSize {
			http.Error(w, "document exceeds 16 MiB", http.StatusRequestEntityTooLarge)
			return
		}
		info, _ := os.Stat(a.document.path)
		content := a.internalizeDocumentAssets(string(data), a.document.path)
		response := documentResponse{Enabled: true, Name: filepath.Base(a.document.path), Content: content}
		if info != nil {
			response.Modified = info.ModTime().UnixMilli()
		}
		writeJSON(w, http.StatusOK, response)
	case http.MethodPut:
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxDocumentSize))
		if err != nil {
			http.Error(w, "document exceeds 16 MiB", http.StatusRequestEntityTooLarge)
			return
		}
		portableContent, err := a.materializeDocumentAssets(string(body), a.document.path)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		a.document.mu.Lock()
		err = os.MkdirAll(filepath.Dir(a.document.path), 0o755)
		if err == nil {
			err = os.WriteFile(a.document.path, []byte(portableContent), 0o644)
		}
		a.document.mu.Unlock()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"saved": true})
	default:
		w.Header().Set("Allow", "GET, PUT")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("X-Frame-Options", "DENY")
		if contentType := mime.TypeByExtension(filepath.Ext(r.URL.Path)); contentType != "" {
			w.Header().Set("Content-Type", contentType)
		}
		next.ServeHTTP(w, r)
	})
}

func browserAddress(address string) string {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return address
	}
	if host == "0.0.0.0" || host == "::" || host == "" {
		host = "127.0.0.1"
	}
	return net.JoinHostPort(host, port)
}

func openBrowser(url string) error {
	var command *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		command = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		command = exec.Command("open", url)
	default:
		command = exec.Command("xdg-open", url)
	}
	return command.Start()
}

func startNewWindow(action string) error {
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	return exec.Command(executable, "-startup", action).Start()
}
