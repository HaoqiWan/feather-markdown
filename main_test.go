package main

import (
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
