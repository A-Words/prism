package middleware

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func TestJWKSValidatorMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate rsa key: %v", err)
	}
	kid := "test-kid"
	jwkServer := newJWKSHTTPServer(t, kid, &privateKey.PublicKey)
	defer jwkServer.Close()

	validator, err := NewJWKSValidator(jwkServer.URL)
	if err != nil {
		t.Fatalf("new jwks validator: %v", err)
	}

	r := gin.New()
	r.Use(validator.Middleware())
	r.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"userID": CurrentUserID(c)})
	})

	validToken := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"sub": "user-123",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	validToken.Header["kid"] = kid
	validTokenString, err := validToken.SignedString(privateKey)
	if err != nil {
		t.Fatalf("sign valid token: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+validTokenString)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}

	reqNoAuth := httptest.NewRequest(http.MethodGet, "/protected", nil)
	wNoAuth := httptest.NewRecorder()
	r.ServeHTTP(wNoAuth, reqNoAuth)
	if wNoAuth.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", wNoAuth.Code)
	}

	expiredToken := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"sub": "user-123",
		"exp": time.Now().Add(-time.Hour).Unix(),
	})
	expiredToken.Header["kid"] = kid
	expiredTokenString, err := expiredToken.SignedString(privateKey)
	if err != nil {
		t.Fatalf("sign expired token: %v", err)
	}

	reqExpired := httptest.NewRequest(http.MethodGet, "/protected", nil)
	reqExpired.Header.Set("Authorization", "Bearer "+expiredTokenString)
	wExpired := httptest.NewRecorder()
	r.ServeHTTP(wExpired, reqExpired)
	if wExpired.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for expired token, got %d", wExpired.Code)
	}

	wrongKidToken := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"sub": "user-123",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	wrongKidToken.Header["kid"] = "other-kid"
	wrongKidTokenString, err := wrongKidToken.SignedString(privateKey)
	if err != nil {
		t.Fatalf("sign wrong kid token: %v", err)
	}

	reqWrongKid := httptest.NewRequest(http.MethodGet, "/protected", nil)
	reqWrongKid.Header.Set("Authorization", "Bearer "+wrongKidTokenString)
	wWrongKid := httptest.NewRecorder()
	r.ServeHTTP(wWrongKid, reqWrongKid)
	if wWrongKid.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for wrong kid token, got %d", wWrongKid.Code)
	}
}

func newJWKSHTTPServer(t *testing.T, kid string, publicKey *rsa.PublicKey) *httptest.Server {
	t.Helper()

	n := base64.RawURLEncoding.EncodeToString(publicKey.N.Bytes())
	e := base64.RawURLEncoding.EncodeToString(big.NewInt(int64(publicKey.E)).Bytes())

	payload := map[string]any{
		"keys": []map[string]any{
			{
				"kty": "RSA",
				"kid": kid,
				"alg": "RS256",
				"use": "sig",
				"n":   n,
				"e":   e,
			},
		},
	}

	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(payload); err != nil {
			t.Fatalf("encode jwks payload: %v", err)
		}
	}))
}
