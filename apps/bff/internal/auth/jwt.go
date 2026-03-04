package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Config struct {
	RequireAuth   bool
	SupabaseURL   string
	SupabaseAnon  string
	JWTSecret     string
	LeewaySeconds int
}

type Claims struct {
	Sub string `json:"sub"`
	jwt.RegisteredClaims
}

type Verifier struct {
	cfg Config
	hc  *http.Client
}

func NewVerifier(cfg Config) *Verifier {
	return &Verifier{cfg: cfg, hc: &http.Client{Timeout: 8 * time.Second}}
}

func (v *Verifier) Verify(token string) (string, error) {
	if !v.cfg.RequireAuth {
		return "dev-user", nil
	}
	if token == "" {
		return "", errors.New("TOKEN_INVALID")
	}

	if v.cfg.JWTSecret != "" {
		claims := &Claims{}
		_, err := jwt.ParseWithClaims(token, claims, func(_ *jwt.Token) (any, error) {
			return []byte(v.cfg.JWTSecret), nil
		}, jwt.WithLeeway(time.Duration(v.cfg.LeewaySeconds)*time.Second))
		if err != nil {
			if errors.Is(err, jwt.ErrTokenExpired) {
				return "", errors.New("TOKEN_EXPIRED")
			}
			return "", errors.New("TOKEN_INVALID")
		}
		if claims.Sub == "" {
			return "", errors.New("TOKEN_INVALID")
		}
		return claims.Sub, nil
	}

	if v.cfg.SupabaseURL == "" {
		return "", errors.New("TOKEN_INVALID")
	}

	req, _ := http.NewRequest(http.MethodGet, strings.TrimRight(v.cfg.SupabaseURL, "/")+"/auth/v1/user", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	if v.cfg.SupabaseAnon != "" {
		req.Header.Set("apikey", v.cfg.SupabaseAnon)
	}

	resp, err := v.hc.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return "", errors.New("TOKEN_INVALID")
	}
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("supabase verify failed: %d", resp.StatusCode)
	}

	var payload struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}
	if payload.ID == "" {
		return "", errors.New("TOKEN_INVALID")
	}
	return payload.ID, nil
}
