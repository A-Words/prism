package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func TestRequireJWT(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret"
	r := gin.New()
	r.Use(RequireJWT(secret))
	r.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"userID": CurrentUserID(c)})
	})

	validToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "user-123",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	validTokenString, _ := validToken.SignedString([]byte(secret))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+validTokenString)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	reqNoAuth := httptest.NewRequest(http.MethodGet, "/protected", nil)
	wNoAuth := httptest.NewRecorder()
	r.ServeHTTP(wNoAuth, reqNoAuth)
	if wNoAuth.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", wNoAuth.Code)
	}

	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "user-123",
		"exp": time.Now().Add(-time.Hour).Unix(),
	})
	expiredTokenString, _ := expiredToken.SignedString([]byte(secret))
	reqExpired := httptest.NewRequest(http.MethodGet, "/protected", nil)
	reqExpired.Header.Set("Authorization", "Bearer "+expiredTokenString)
	wExpired := httptest.NewRecorder()
	r.ServeHTTP(wExpired, reqExpired)
	if wExpired.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for expired token, got %d", wExpired.Code)
	}
}
