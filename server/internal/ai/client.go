package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/prism/server/internal/model"
)

type Client interface {
	VisionOCR(ctx context.Context, req model.AIVisionOCRRequest) (model.AIVisionOCRResponse, error)
	GradeHomework(ctx context.Context, req model.AIGradeHomeworkRequest) (model.AIGradeHomeworkResponse, error)
	PredictOutcome(ctx context.Context, req model.AIPredictOutcomeRequest) (model.AIPredictOutcomeResponse, error)
	AnalyzeEmotion(ctx context.Context, req model.AIEmotionAnalyzeRequest) (model.AIEmotionAnalyzeResponse, error)
	AnalyzePose(ctx context.Context, req model.AIPoseAnalyzeRequest) (model.AIPoseAnalyzeResponse, error)
	ChatCompletion(ctx context.Context, req model.AIChatCompletionRequest) (model.AIChatCompletionResponse, error)
	Transcribe(ctx context.Context, req model.AITranscribeRequest) (model.AITranscribeResponse, error)
	Embed(ctx context.Context, req model.AIEmbedRequest) (model.AIEmbedResponse, error)
	Search(ctx context.Context, req model.AISearchRequest) (model.AISearchResponse, error)
}

type HTTPClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewHTTPClient(baseURL string) *HTTPClient {
	return &HTTPClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *HTTPClient) VisionOCR(ctx context.Context, req model.AIVisionOCRRequest) (model.AIVisionOCRResponse, error) {
	var response model.AIVisionOCRResponse
	err := c.postJSON(ctx, "/vision/ocr", req, &response)
	return response, err
}

func (c *HTTPClient) GradeHomework(ctx context.Context, req model.AIGradeHomeworkRequest) (model.AIGradeHomeworkResponse, error) {
	var response model.AIGradeHomeworkResponse
	err := c.postJSON(ctx, "/assessment/grade-homework", req, &response)
	return response, err
}

func (c *HTTPClient) PredictOutcome(ctx context.Context, req model.AIPredictOutcomeRequest) (model.AIPredictOutcomeResponse, error) {
	var response model.AIPredictOutcomeResponse
	err := c.postJSON(ctx, "/assessment/predict-outcome", req, &response)
	return response, err
}

func (c *HTTPClient) AnalyzeEmotion(ctx context.Context, req model.AIEmotionAnalyzeRequest) (model.AIEmotionAnalyzeResponse, error) {
	var response model.AIEmotionAnalyzeResponse
	err := c.postJSON(ctx, "/analyze/emotion", req, &response)
	return response, err
}

func (c *HTTPClient) AnalyzePose(ctx context.Context, req model.AIPoseAnalyzeRequest) (model.AIPoseAnalyzeResponse, error) {
	var response model.AIPoseAnalyzeResponse
	err := c.postJSON(ctx, "/analyze/pose", req, &response)
	return response, err
}

func (c *HTTPClient) ChatCompletion(ctx context.Context, req model.AIChatCompletionRequest) (model.AIChatCompletionResponse, error) {
	var response model.AIChatCompletionResponse
	err := c.postJSON(ctx, "/chat/completions", req, &response)
	return response, err
}

func (c *HTTPClient) Transcribe(ctx context.Context, req model.AITranscribeRequest) (model.AITranscribeResponse, error) {
	var response model.AITranscribeResponse
	err := c.postJSON(ctx, "/speech/transcribe", req, &response)
	return response, err
}

func (c *HTTPClient) Embed(ctx context.Context, req model.AIEmbedRequest) (model.AIEmbedResponse, error) {
	var response model.AIEmbedResponse
	err := c.postJSON(ctx, "/embed", req, &response)
	return response, err
}

func (c *HTTPClient) Search(ctx context.Context, req model.AISearchRequest) (model.AISearchResponse, error) {
	var response model.AISearchResponse
	err := c.postJSON(ctx, "/search", req, &response)
	return response, err
}

func (c *HTTPClient) postJSON(ctx context.Context, path string, payload any, out any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("request ai service: %w", err)
	}
	defer httpResp.Body.Close()

	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return fmt.Errorf("read ai response: %w", err)
	}

	if httpResp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("ai service status=%d body=%s", httpResp.StatusCode, string(respBody))
	}

	if err := json.Unmarshal(respBody, out); err != nil {
		return fmt.Errorf("unmarshal ai response: %w", err)
	}
	return nil
}
