package middleware

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func RequireJWT(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.TrimSpace(secret) == "" {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "jwt secret is not configured"})
			return
		}
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		tokenString = strings.TrimSpace(strings.TrimPrefix(tokenString, "bearer "))
		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		subject, ok := claims["sub"].(string)
		if !ok || strings.TrimSpace(subject) == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token subject"})
			return
		}

		expRaw, ok := claims["exp"]
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token expiry"})
			return
		}
		expUnix, ok := toInt64(expRaw)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token expiry"})
			return
		}
		if time.Now().UTC().Unix() >= expUnix {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token expired"})
			return
		}

		c.Set("userID", subject)
		c.Next()
	}
}

func CurrentUserID(c *gin.Context) string {
	userID, _ := c.Get("userID")
	value, _ := userID.(string)
	return value
}

func toInt64(value any) (int64, bool) {
	switch typed := value.(type) {
	case float64:
		return int64(typed), true
	case int64:
		return typed, true
	case int:
		return int64(typed), true
	case json.Number:
		parsed, err := typed.Int64()
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}
