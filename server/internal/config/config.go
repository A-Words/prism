package config

import (
	"os"
	"strings"
)

type Config struct {
	Port                   string
	AIServiceURL           string
	DatabaseURL            string
	SupabaseURL            string
	SupabaseJWKSURL        string
	SupabaseJWTIssuer      string
	SupabaseJWTAudience    string
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
	jwtIssuer := os.Getenv("SUPABASE_JWT_ISSUER")
	if jwtIssuer == "" {
		if strings.TrimSpace(supabaseURL) != "" {
			jwtIssuer = strings.TrimRight(supabaseURL, "/") + "/auth/v1"
		} else {
			jwtIssuer = "http://localhost:8000/auth/v1"
		}
	}

	return Config{
		Port:                   getEnv("PORT", "8080"),
		AIServiceURL:           getEnv("AI_SERVICE_URL", "http://localhost:5000"),
		DatabaseURL:            os.Getenv("DATABASE_URL"),
		SupabaseURL:            supabaseURL,
		SupabaseJWKSURL:        jwksURL,
		SupabaseJWTIssuer:      jwtIssuer,
		SupabaseJWTAudience:    getEnv("SUPABASE_JWT_AUDIENCE", "authenticated"),
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
