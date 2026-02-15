package config

import (
	"os"
	"strings"
)

type Config struct {
	Port                   string
	AIServiceURL           string
	SupabaseURL            string
	SupabaseJWKSURL        string
	SupabaseServiceRoleKey string
	SupabaseStorageBucket  string
	SupabaseStorageBaseURL string
}

func Load() Config {
	supabaseURL := os.Getenv("SUPABASE_URL")
	jwksURL := os.Getenv("SUPABASE_JWKS_URL")
	if jwksURL == "" {
		if strings.TrimSpace(supabaseURL) != "" {
			jwksURL = strings.TrimRight(supabaseURL, "/") + "/auth/v1/.well-known/jwks.json"
		} else {
			jwksURL = "http://localhost:8000/auth/v1/.well-known/jwks.json"
		}
	}

	return Config{
		Port:                   getEnv("PORT", "8080"),
		AIServiceURL:           getEnv("AI_SERVICE_URL", "http://localhost:5000"),
		SupabaseURL:            supabaseURL,
		SupabaseJWKSURL:        jwksURL,
		SupabaseServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		SupabaseStorageBucket:  getEnv("SUPABASE_STORAGE_BUCKET", "homework-images"),
		SupabaseStorageBaseURL: os.Getenv("SUPABASE_STORAGE_PUBLIC_BASE_URL"),
	}
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
