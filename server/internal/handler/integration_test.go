package handler

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/prism/server/internal/middleware"
	"github.com/prism/server/internal/model"
	"github.com/prism/server/internal/repository"
	"github.com/prism/server/internal/service"
)

type fakeAI struct{}

const (
	expectedIssuer   = "https://example.supabase.co/auth/v1"
	expectedAudience = "authenticated"
)

func (f fakeAI) VisionOCR(_ context.Context, _ model.AIVisionOCRRequest) (model.AIVisionOCRResponse, error) {
	return model.AIVisionOCRResponse{Text: "Q1"}, nil
}
func (f fakeAI) GradeHomework(_ context.Context, _ model.AIGradeHomeworkRequest) (model.AIGradeHomeworkResponse, error) {
	return model.AIGradeHomeworkResponse{}, nil
}
func (f fakeAI) PredictOutcome(_ context.Context, _ model.AIPredictOutcomeRequest) (model.AIPredictOutcomeResponse, error) {
	return model.AIPredictOutcomeResponse{CalibrationFactor: 1, Rationale: "ok"}, nil
}

func setupRouter(t *testing.T) (*gin.Engine, *rsa.PrivateKey, string) {
	t.Helper()

	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate rsa key: %v", err)
	}
	kid := "integration-kid"
	jwksServer := newJWKSHTTPServer(t, kid, &privateKey.PublicKey)
	t.Cleanup(jwksServer.Close)

	validator, err := middleware.NewJWKSValidator(jwksServer.URL, expectedIssuer, expectedAudience)
	if err != nil {
		t.Fatalf("new jwks validator: %v", err)
	}

	gin.SetMode(gin.TestMode)
	repo := repository.NewMemoryRepository()
	svc := service.NewLearningService(repo, fakeAI{}, "https://example.supabase.co", "service-key", "bucket", "")
	h := NewAPIHandler(svc)

	r := gin.New()
	api := r.Group("/api/v1")
	api.Use(validator.Middleware())
	api.POST("/assessment/cold-start/sessions", h.CreateColdStartSession)
	api.POST("/assessment/cold-start/sessions/:sessionId/submit", h.SubmitColdStartSession)
	api.GET("/learning-paths/current", h.GetCurrentLearningPath)
	return r, privateKey, kid
}

func authToken(privateKey *rsa.PrivateKey, kid string) string {
	t := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"sub": "test-user",
		"exp": time.Now().Add(time.Hour).Unix(),
		"iss": expectedIssuer,
		"aud": expectedAudience,
	})
	t.Header["kid"] = kid
	token, _ := t.SignedString(privateKey)
	return token
}

func TestColdStartEndpointFlow(t *testing.T) {
	r, privateKey, kid := setupRouter(t)
	token := authToken(privateKey, kid)

	createPayload := model.CreateSessionRequest{
		Subject:          "math",
		GoalKnowledgeIDs: []int{106},
		TargetDate:       time.Now().Add(7 * 24 * time.Hour).Format("2006-01-02"),
	}
	createBody, _ := json.Marshal(createPayload)
	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/assessment/cold-start/sessions", bytes.NewReader(createBody))
	createReq.Header.Set("Authorization", "Bearer "+token)
	createReq.Header.Set("Content-Type", "application/json")
	createResp := httptest.NewRecorder()
	r.ServeHTTP(createResp, createReq)
	if createResp.Code != http.StatusOK {
		t.Fatalf("create session failed: %d %s", createResp.Code, createResp.Body.String())
	}

	var createResult model.CreateSessionResponse
	if err := json.Unmarshal(createResp.Body.Bytes(), &createResult); err != nil {
		t.Fatalf("unmarshal create session: %v", err)
	}
	if createResult.SessionID == 0 || len(createResult.Questions) != 10 {
		t.Fatalf("unexpected session payload: %+v", createResult)
	}

	answers := make([]model.AnswerSubmission, 0, len(createResult.Questions))
	for _, question := range createResult.Questions {
		answers = append(answers, model.AnswerSubmission{QuestionID: question.ID, Answer: "1", DurationSec: 50})
	}
	submitPayload := model.SubmitColdStartRequest{Answers: answers}
	submitBody, _ := json.Marshal(submitPayload)
	submitReq := httptest.NewRequest(http.MethodPost, "/api/v1/assessment/cold-start/sessions/"+toString(createResult.SessionID)+"/submit", bytes.NewReader(submitBody))
	submitReq.Header.Set("Authorization", "Bearer "+token)
	submitReq.Header.Set("Content-Type", "application/json")
	submitResp := httptest.NewRecorder()
	r.ServeHTTP(submitResp, submitReq)
	if submitResp.Code != http.StatusOK {
		t.Fatalf("submit session failed: %d %s", submitResp.Code, submitResp.Body.String())
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/learning-paths/current?subject=math", nil)
	getReq.Header.Set("Authorization", "Bearer "+token)
	getResp := httptest.NewRecorder()
	r.ServeHTTP(getResp, getReq)
	if getResp.Code != http.StatusOK {
		t.Fatalf("get path failed: %d %s", getResp.Code, getResp.Body.String())
	}
}

func newJWKSHTTPServer(t *testing.T, kid string, publicKey *rsa.PublicKey) *httptest.Server {
	t.Helper()
	payload := map[string]any{
		"keys": []map[string]any{{
			"kty": "RSA",
			"kid": kid,
			"alg": "RS256",
			"use": "sig",
			"n":   base64.RawURLEncoding.EncodeToString(publicKey.N.Bytes()),
			"e":   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(publicKey.E)).Bytes()),
		}},
	}

	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(payload); err != nil {
			t.Fatalf("encode jwks payload: %v", err)
		}
	}))
}

func toString(value int) string {
	return strconv.Itoa(value)
}
