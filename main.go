package main

import (
	"context"
	"embed"
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
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
)

const maxDocumentSize = 16 << 20

var version = "dev"

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

type app struct {
	document *documentStore
}

func main() {
	addr := flag.String("addr", "127.0.0.1:4587", "listen address")
	document := flag.String("file", "", "Markdown file to watch and save")
	open := flag.Bool("open", true, "open the reader in the default browser")
	showVersion := flag.Bool("version", false, "print version and exit")
	flag.Parse()

	if *showVersion {
		fmt.Println("Feather Markdown", version)
		return
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
	application := &app{document: &documentStore{path: filePath}}
	server := &http.Server{
		Handler:           application.routes(),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	url := "http://" + browserAddress(listener.Addr().String())
	log.Printf("Feather Markdown %s is running at %s", version, url)
	if filePath != "" {
		log.Printf("watching %s", filePath)
	}

	if *open {
		go func() {
			time.Sleep(120 * time.Millisecond)
			if err := openBrowser(url); err != nil {
				log.Printf("open browser: %v", err)
			}
		}()
	}

	go func() {
		if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}

func (a *app) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/document", a.handleDocument)
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
		response := documentResponse{Enabled: true, Name: filepath.Base(a.document.path), Content: string(data)}
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
		a.document.mu.Lock()
		err = os.MkdirAll(filepath.Dir(a.document.path), 0o755)
		if err == nil {
			err = os.WriteFile(a.document.path, body, 0o644)
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
