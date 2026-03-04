package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	_ "modernc.org/sqlite"
	"prism/apps/bff/internal/api"
	"prism/apps/bff/internal/auth"
	"prism/apps/bff/internal/intervention"
	"prism/apps/bff/internal/provider"
	"prism/apps/bff/internal/storage"
)

func main() {
	port := envOrDefault("BFF_PORT", "8787")
	dbPath := envOrDefault("BFF_SQLITE_PATH", filepath.Join("apps", "bff", "data", "prism.db"))
	privacyAck := envOrDefault("PRISM_PRIVACY_ACK_VERSION", "2026-03-04")
	requireAuth := envOrDefault("BFF_REQUIRE_AUTH", "true") == "true"
	jwtLeeway, _ := strconv.Atoi(envOrDefault("BFF_JWT_LEEWAY_SECONDS", "60"))

	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		log.Fatal(err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := storage.Migrate(db); err != nil {
		log.Fatal(err)
	}

	store := storage.NewSQLiteStore(db)
	providers, err := provider.NewRouter(provider.Config{
		Mode:              envOrDefault("PROVIDER_MODE", "mock"),
		OpenAIKey:         os.Getenv("OPENAI_API_KEY"),
		OpenAIBaseURL:     envOrDefault("OPENAI_BASE_URL", "https://api.openai.com/v1"),
		OpenAITextModel:   envOrDefault("OPENAI_TEXT_MODEL", "gpt-4.1-mini"),
		OpenAITutorModel:  envOrDefault("OPENAI_TUTOR_MODEL", "gpt-4.1-mini"),
		OpenAIVisionModel: envOrDefault("OPENAI_VISION_MODEL", "gpt-4.1-mini"),
	})
	if err != nil {
		log.Fatal(err)
	}

	authenticator := auth.NewVerifier(auth.Config{
		RequireAuth:   requireAuth,
		SupabaseURL:   os.Getenv("SUPABASE_URL"),
		SupabaseAnon:  os.Getenv("SUPABASE_ANON_KEY"),
		JWTSecret:     os.Getenv("SUPABASE_JWT_SECRET"),
		LeewaySeconds: jwtLeeway,
	})

	ruleEngine := intervention.NewEngine(2, 5*time.Minute)

	router := api.NewRouter(api.Dependencies{
		Store:          store,
		Providers:      providers,
		Auth:           authenticator,
		Interventions:  ruleEngine,
		PrivacyVersion: privacyAck,
	})

	srv := &http.Server{
		Addr:    "127.0.0.1:" + port,
		Handler: router,
	}

	go func() {
		log.Printf("prism-bff listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
