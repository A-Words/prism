package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	_ "modernc.org/sqlite"
	"prism/apps/bff/internal/auth"
	"prism/apps/bff/internal/intervention"
	"prism/apps/bff/internal/provider"
	"prism/apps/bff/internal/storage"
)

func newTestRouter(t *testing.T) http.Handler {
	t.Helper()
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := storage.Migrate(db); err != nil {
		t.Fatal(err)
	}
	store := storage.NewSQLiteStore(db)
	p, err := provider.NewRouter(provider.Config{Mode: "mock"})
	if err != nil {
		t.Fatal(err)
	}
	return NewRouter(Dependencies{
		Store:          store,
		Providers:      p,
		Auth:           auth.NewVerifier(auth.Config{RequireAuth: false}),
		Interventions:  intervention.NewEngine(2, time.Second),
		PrivacyVersion: "2026-03-04",
	})
}

func TestExploreTextEnvelope(t *testing.T) {
	router := newTestRouter(t)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/explore/text", strings.NewReader(`{"topic":"函数"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload["request_id"] == nil {
		t.Fatal("request_id must exist")
	}
	if payload["data"] == nil {
		t.Fatal("data must exist")
	}
}

func TestAnalyzeVisionConsentRequired(t *testing.T) {
	router := newTestRouter(t)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/vision/analyze", strings.NewReader(`{"consent_enabled":false}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("unexpected status: %d", rec.Code)
	}
}
