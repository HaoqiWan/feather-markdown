package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestHealthAndStaticApp(t *testing.T) {
	testApp := &app{document: &documentStore{}}

	health := httptest.NewRecorder()
	testApp.routes().ServeHTTP(health, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if health.Code != http.StatusOK || !strings.Contains(health.Body.String(), `"status":"ok"`) {
		t.Fatalf("health response = %d %s", health.Code, health.Body.String())
	}

	index := httptest.NewRecorder()
	testApp.routes().ServeHTTP(index, httptest.NewRequest(http.MethodGet, "/", nil))
	if index.Code != http.StatusOK || !strings.Contains(index.Body.String(), "Feather Markdown") {
		t.Fatalf("index response = %d", index.Code)
	}
}

func TestDocumentRoundTrip(t *testing.T) {
	documentPath := filepath.Join(t.TempDir(), "notes.md")
	testApp := &app{document: &documentStore{path: documentPath}}
	handler := testApp.routes()

	put := httptest.NewRecorder()
	handler.ServeHTTP(put, httptest.NewRequest(http.MethodPut, "/api/document", strings.NewReader("# Hello\n")))
	if put.Code != http.StatusOK {
		t.Fatalf("PUT response = %d %s", put.Code, put.Body.String())
	}
	data, err := os.ReadFile(documentPath)
	if err != nil || string(data) != "# Hello\n" {
		t.Fatalf("saved document = %q, %v", data, err)
	}

	get := httptest.NewRecorder()
	handler.ServeHTTP(get, httptest.NewRequest(http.MethodGet, "/api/document", nil))
	if get.Code != http.StatusOK || !strings.Contains(get.Body.String(), `"content":"# Hello\n"`) {
		t.Fatalf("GET response = %d %s", get.Code, get.Body.String())
	}
}

func TestDocumentDisabled(t *testing.T) {
	testApp := &app{document: &documentStore{}}
	response := httptest.NewRecorder()
	testApp.routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/document", nil))
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"enabled":false`) {
		t.Fatalf("response = %d %s", response.Code, response.Body.String())
	}
}

func TestImageAssetRoundTrip(t *testing.T) {
	testApp := &app{document: &documentStore{}, assetDir: t.TempDir()}
	handler := testApp.routes()
	image := append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, 24)...)

	upload := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/assets", bytes.NewReader(image))
	request.RemoteAddr = "127.0.0.1:43210"
	handler.ServeHTTP(upload, request)
	if upload.Code != http.StatusCreated {
		t.Fatalf("asset upload response = %d %s", upload.Code, upload.Body.String())
	}
	var uploaded struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(upload.Body).Decode(&uploaded); err != nil || !validAssetID(uploaded.ID) {
		t.Fatalf("asset upload id = %q, error = %v", uploaded.ID, err)
	}

	download := httptest.NewRecorder()
	handler.ServeHTTP(download, httptest.NewRequest(http.MethodGet, "/api/assets/"+uploaded.ID, nil))
	if download.Code != http.StatusOK || !bytes.Equal(download.Body.Bytes(), image) {
		t.Fatalf("asset download response = %d, bytes = %d", download.Code, download.Body.Len())
	}
	if download.Header().Get("Content-Type") != "image/png" {
		t.Fatalf("asset content type = %q", download.Header().Get("Content-Type"))
	}
}

func TestImageAssetRejectsUnsupportedContent(t *testing.T) {
	testApp := &app{document: &documentStore{}, assetDir: t.TempDir()}
	request := httptest.NewRequest(http.MethodPost, "/api/assets", strings.NewReader("not an image"))
	request.RemoteAddr = "127.0.0.1:43210"
	response := httptest.NewRecorder()
	testApp.routes().ServeHTTP(response, request)
	if response.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("unsupported asset response = %d %s", response.Code, response.Body.String())
	}
}

func TestDocumentAssetsArePortableOnDisk(t *testing.T) {
	root := t.TempDir()
	documentPath := filepath.Join(root, "guide.md")
	testApp := &app{document: &documentStore{path: documentPath}, assetDir: filepath.Join(root, "library")}
	image := append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, 24)...)
	id, err := testApp.storeImageAsset(image)
	if err != nil {
		t.Fatal(err)
	}
	handler := testApp.routes()

	put := httptest.NewRecorder()
	handler.ServeHTTP(put, httptest.NewRequest(http.MethodPut, "/api/document", strings.NewReader("![diagram](feather-asset:"+id+")")))
	if put.Code != http.StatusOK {
		t.Fatalf("portable PUT response = %d %s", put.Code, put.Body.String())
	}
	saved, err := os.ReadFile(documentPath)
	if err != nil {
		t.Fatal(err)
	}
	wantReference := "![diagram](<./guide.assets/" + id + ">)"
	if string(saved) != wantReference {
		t.Fatalf("portable document = %q, want %q", saved, wantReference)
	}
	asset, err := os.ReadFile(filepath.Join(root, "guide.assets", id))
	if err != nil || !bytes.Equal(asset, image) {
		t.Fatalf("portable asset bytes = %d, error = %v", len(asset), err)
	}

	get := httptest.NewRecorder()
	handler.ServeHTTP(get, httptest.NewRequest(http.MethodGet, "/api/document", nil))
	if get.Code != http.StatusOK || !strings.Contains(get.Body.String(), "feather-asset:"+id) {
		t.Fatalf("internalized GET response = %d %s", get.Code, get.Body.String())
	}
}

func TestWorkspaceTreeCreateReadWriteAndAssets(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "Projects"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "Projects", "plan.md"), []byte("# Plan"), 0o644); err != nil {
		t.Fatal(err)
	}
	testApp := &app{document: &documentStore{}, assetDir: filepath.Join(t.TempDir(), "assets"), workspace: root}
	handler := testApp.routes()

	tree := httptest.NewRecorder()
	handler.ServeHTTP(tree, httptest.NewRequest(http.MethodGet, "/api/workspace", nil))
	if tree.Code != http.StatusOK || !strings.Contains(tree.Body.String(), `"name":"Projects"`) || !strings.Contains(tree.Body.String(), `"name":"plan.md"`) {
		t.Fatalf("workspace tree response = %d %s", tree.Code, tree.Body.String())
	}

	create := httptest.NewRecorder()
	createRequest := httptest.NewRequest(http.MethodPost, "/api/workspace/create", strings.NewReader(`{"type":"note","parent":"Projects","name":"ideas"}`))
	createRequest.RemoteAddr = "127.0.0.1:43210"
	handler.ServeHTTP(create, createRequest)
	if create.Code != http.StatusCreated {
		t.Fatalf("workspace create response = %d %s", create.Code, create.Body.String())
	}

	put := httptest.NewRecorder()
	putRequest := httptest.NewRequest(http.MethodPut, "/api/workspace/file?path=Projects%2Fideas.md", strings.NewReader("# Ideas"))
	putRequest.RemoteAddr = "127.0.0.1:43210"
	handler.ServeHTTP(put, putRequest)
	if put.Code != http.StatusOK {
		t.Fatalf("workspace PUT response = %d %s", put.Code, put.Body.String())
	}
	get := httptest.NewRecorder()
	getRequest := httptest.NewRequest(http.MethodGet, "/api/workspace/file?path=Projects%2Fideas.md", nil)
	getRequest.RemoteAddr = "127.0.0.1:43210"
	handler.ServeHTTP(get, getRequest)
	if get.Code != http.StatusOK || !strings.Contains(get.Body.String(), `"content":"# Ideas"`) {
		t.Fatalf("workspace GET response = %d %s", get.Code, get.Body.String())
	}

	image := append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, 24)...)
	upload := httptest.NewRecorder()
	uploadRequest := httptest.NewRequest(http.MethodPost, "/api/workspace/assets?path=Projects%2Fideas.md", bytes.NewReader(image))
	uploadRequest.RemoteAddr = "127.0.0.1:43210"
	handler.ServeHTTP(upload, uploadRequest)
	if upload.Code != http.StatusCreated || !strings.Contains(upload.Body.String(), `ideas.assets/`) {
		t.Fatalf("workspace asset response = %d %s", upload.Code, upload.Body.String())
	}

	escape := httptest.NewRecorder()
	escapeRequest := httptest.NewRequest(http.MethodGet, "/api/workspace/file?path=..%2Foutside.md", nil)
	escapeRequest.RemoteAddr = "127.0.0.1:43210"
	handler.ServeHTTP(escape, escapeRequest)
	if escape.Code != http.StatusBadRequest {
		t.Fatalf("workspace traversal response = %d %s", escape.Code, escape.Body.String())
	}
}

func TestCreateAdditionalWindow(t *testing.T) {
	started := ""
	testApp := &app{
		document: &documentStore{},
		startWindow: func(action string) error {
			started = action
			return nil
		},
	}
	request := httptest.NewRequest(http.MethodPost, "/api/window", strings.NewReader(`{"action":"open"}`))
	request.Header.Set("Content-Type", "application/json")
	request.RemoteAddr = "127.0.0.1:43210"
	response := httptest.NewRecorder()
	testApp.routes().ServeHTTP(response, request)
	if response.Code != http.StatusCreated || started != "open" {
		t.Fatalf("window response = %d %s, action = %q", response.Code, response.Body.String(), started)
	}
}

func TestCreateAdditionalWindowRejectsRemoteRequest(t *testing.T) {
	testApp := &app{document: &documentStore{}, startWindow: func(string) error {
		t.Fatal("remote request must not start a window")
		return nil
	}}
	request := httptest.NewRequest(http.MethodPost, "/api/window", strings.NewReader(`{"action":"new"}`))
	request.Header.Set("Content-Type", "application/json")
	request.RemoteAddr = "203.0.113.8:43210"
	response := httptest.NewRecorder()
	testApp.routes().ServeHTTP(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("remote window response = %d %s", response.Code, response.Body.String())
	}
}

func TestValidateExternalURL(t *testing.T) {
	accepted := []string{
		"https://commonmark.org/",
		"http://localhost:8080/docs?q=markdown#links",
		"mailto:hello@example.com",
	}
	for _, candidate := range accepted {
		if _, err := validateExternalURL(candidate); err != nil {
			t.Errorf("validateExternalURL(%q) returned %v", candidate, err)
		}
	}

	rejected := []string{
		"javascript:alert(1)",
		"file:///C:/Windows/System32/notepad.exe",
		"//example.com/path",
		"/relative/path",
		"https:///missing-host",
		"mailto:",
	}
	for _, candidate := range rejected {
		if _, err := validateExternalURL(candidate); err == nil {
			t.Errorf("validateExternalURL(%q) unexpectedly succeeded", candidate)
		}
	}
}
