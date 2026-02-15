package config

import "os"

type Config struct {
	Port                    string
	JWTSecret               string
	AIServiceURL            string
	SupabaseURL             string
	SupabaseServiceRoleKey  string
	SupabaseStorageBucket   string
	SupabaseStorageBaseURL  string
}

func Load() Config {
	return Config{
		Port:                   getEnv("PORT", "8080"),
		JWTSecret:              os.Getenv("SUPABASE_JWT_SECRET"),
		AIServiceURL:           getEnv("AI_SERVICE_URL", "http://localhost:5000"),
		SupabaseURL:            os.Getenv("SUPABASE_URL"),
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
