package middleware

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type JWKSValidator struct {
	jwksURL      string
	httpClient   *http.Client
	refreshEvery time.Duration
	issuer       string
	audience     string

	mu          sync.RWMutex
	keys        map[string]any
	lastRefresh time.Time
}

type jwksDocument struct {
	Keys []jwkKey `json:"keys"`
}

type jwkKey struct {
	KTY string `json:"kty"`
	KID string `json:"kid"`

	// RSA
	N string `json:"n"`
	E string `json:"e"`

	// EC
	CRV string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

func NewJWKSValidator(jwksURL string, issuer string, audience string) (*JWKSValidator, error) {
	if strings.TrimSpace(jwksURL) == "" {
		return nil, errors.New("jwks url is required")
	}
	if strings.TrimSpace(issuer) == "" {
		return nil, errors.New("jwt issuer is required")
	}
	if strings.TrimSpace(audience) == "" {
		return nil, errors.New("jwt audience is required")
	}

	validator := &JWKSValidator{
		jwksURL:      jwksURL,
		httpClient:   &http.Client{Timeout: 8 * time.Second},
		refreshEvery: 5 * time.Minute,
		issuer:       strings.TrimSpace(issuer),
		audience:     strings.TrimSpace(audience),
		keys:         make(map[string]any),
	}
	if err := validator.refreshKeys(); err != nil {
		return nil, fmt.Errorf("initialize jwks validator: %w", err)
	}
	return validator, nil
}

func (v *JWKSValidator) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		tokenString = strings.TrimSpace(strings.TrimPrefix(tokenString, "bearer "))

		claims := jwt.MapClaims{}
		parser := jwt.NewParser(jwt.WithValidMethods([]string{
			jwt.SigningMethodRS256.Alg(),
			jwt.SigningMethodRS384.Alg(),
			jwt.SigningMethodRS512.Alg(),
			jwt.SigningMethodES256.Alg(),
			jwt.SigningMethodES384.Alg(),
			jwt.SigningMethodES512.Alg(),
			jwt.SigningMethodEdDSA.Alg(),
		}))
		token, err := parser.ParseWithClaims(tokenString, claims, v.keyFunc)
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

		issuer, ok := claims["iss"].(string)
		if !ok || strings.TrimSpace(issuer) == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token issuer"})
			return
		}
		if issuer != v.issuer {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token issuer"})
			return
		}

		audRaw, ok := claims["aud"]
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token audience"})
			return
		}
		if !hasAudience(audRaw, v.audience) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token audience"})
			return
		}

		c.Set("userID", subject)
		c.Next()
	}
}

func (v *JWKSValidator) keyFunc(token *jwt.Token) (any, error) {
	if token == nil {
		return nil, errors.New("nil token")
	}

	kid, _ := token.Header["kid"].(string)
	if strings.TrimSpace(kid) == "" {
		return nil, errors.New("missing kid in jwt header")
	}

	if v.shouldRefresh() {
		_ = v.refreshKeys()
	}

	v.mu.RLock()
	key, ok := v.keys[kid]
	v.mu.RUnlock()
	if ok {
		return key, nil
	}

	// kid 可能是刚轮转出来的 key，未命中时强制刷新一次。
	if err := v.refreshKeys(); err != nil {
		return nil, err
	}

	v.mu.RLock()
	key, ok = v.keys[kid]
	v.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("kid %s not found in jwks", kid)
	}
	return key, nil
}

func (v *JWKSValidator) shouldRefresh() bool {
	v.mu.RLock()
	defer v.mu.RUnlock()
	return time.Since(v.lastRefresh) > v.refreshEvery
}

func (v *JWKSValidator) refreshKeys() error {
	req, err := http.NewRequest(http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return fmt.Errorf("create jwks request: %w", err)
	}

	resp, err := v.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request jwks: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("jwks endpoint status=%d", resp.StatusCode)
	}

	var doc jwksDocument
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return fmt.Errorf("decode jwks response: %w", err)
	}
	if len(doc.Keys) == 0 {
		return errors.New("jwks has no keys")
	}

	parsedKeys := make(map[string]any, len(doc.Keys))
	for _, rawKey := range doc.Keys {
		if strings.TrimSpace(rawKey.KID) == "" {
			continue
		}
		publicKey, err := parseJWK(rawKey)
		if err != nil {
			continue
		}
		parsedKeys[rawKey.KID] = publicKey
	}
	if len(parsedKeys) == 0 {
		return errors.New("no valid keys parsed from jwks")
	}

	v.mu.Lock()
	v.keys = parsedKeys
	v.lastRefresh = time.Now().UTC()
	v.mu.Unlock()
	return nil
}

func parseJWK(key jwkKey) (any, error) {
	switch key.KTY {
	case "RSA":
		return parseRSAKey(key)
	case "EC":
		return parseECKey(key)
	case "OKP":
		return parseOKPKey(key)
	default:
		return nil, fmt.Errorf("unsupported jwk kty: %s", key.KTY)
	}
}

func parseRSAKey(key jwkKey) (*rsa.PublicKey, error) {
	nBytes, err := decodeBase64URL(key.N)
	if err != nil {
		return nil, fmt.Errorf("decode rsa n: %w", err)
	}
	eBytes, err := decodeBase64URL(key.E)
	if err != nil {
		return nil, fmt.Errorf("decode rsa e: %w", err)
	}
	if len(eBytes) == 0 {
		return nil, errors.New("rsa exponent is empty")
	}
	exponent := 0
	for _, b := range eBytes {
		exponent = exponent<<8 + int(b)
	}
	if exponent <= 1 {
		return nil, errors.New("invalid rsa exponent")
	}

	modulus := new(big.Int).SetBytes(nBytes)
	if modulus.Sign() <= 0 {
		return nil, errors.New("invalid rsa modulus")
	}
	return &rsa.PublicKey{N: modulus, E: exponent}, nil
}

func parseECKey(key jwkKey) (*ecdsa.PublicKey, error) {
	curve := pickCurve(key.CRV)
	if curve == nil {
		return nil, fmt.Errorf("unsupported ec curve: %s", key.CRV)
	}
	xBytes, err := decodeBase64URL(key.X)
	if err != nil {
		return nil, fmt.Errorf("decode ec x: %w", err)
	}
	yBytes, err := decodeBase64URL(key.Y)
	if err != nil {
		return nil, fmt.Errorf("decode ec y: %w", err)
	}

	x := new(big.Int).SetBytes(xBytes)
	y := new(big.Int).SetBytes(yBytes)
	if !curve.IsOnCurve(x, y) {
		return nil, errors.New("ec point is not on curve")
	}
	return &ecdsa.PublicKey{Curve: curve, X: x, Y: y}, nil
}

func parseOKPKey(key jwkKey) (ed25519.PublicKey, error) {
	if key.CRV != "Ed25519" {
		return nil, fmt.Errorf("unsupported okp curve: %s", key.CRV)
	}
	xBytes, err := decodeBase64URL(key.X)
	if err != nil {
		return nil, fmt.Errorf("decode okp x: %w", err)
	}
	if len(xBytes) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("invalid ed25519 key size: %d", len(xBytes))
	}
	publicKey := make(ed25519.PublicKey, ed25519.PublicKeySize)
	copy(publicKey, xBytes)
	return publicKey, nil
}

func pickCurve(crv string) elliptic.Curve {
	switch crv {
	case "P-256":
		return elliptic.P256()
	case "P-384":
		return elliptic.P384()
	case "P-521":
		return elliptic.P521()
	default:
		return nil
	}
}

func decodeBase64URL(value string) ([]byte, error) {
	if strings.TrimSpace(value) == "" {
		return nil, errors.New("empty base64url value")
	}
	return base64.RawURLEncoding.DecodeString(value)
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

func hasAudience(raw any, expected string) bool {
	switch typed := raw.(type) {
	case string:
		return typed == expected
	case []string:
		for _, value := range typed {
			if value == expected {
				return true
			}
		}
	case []any:
		for _, item := range typed {
			value, ok := item.(string)
			if ok && value == expected {
				return true
			}
		}
	case jwt.ClaimStrings:
		for _, value := range typed {
			if value == expected {
				return true
			}
		}
	}
	return false
}
