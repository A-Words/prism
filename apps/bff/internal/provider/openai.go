package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"prism/apps/bff/internal/domain"
)

type OpenAIProvider struct {
	baseURL     string
	apiKey      string
	textModel   string
	tutorModel  string
	visionModel string
	httpClient  *http.Client
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func NewOpenAIProvider(cfg Config) *OpenAIProvider {
	return &OpenAIProvider{
		baseURL:     cfg.OpenAIBaseURL,
		apiKey:      cfg.OpenAIKey,
		textModel:   cfg.OpenAITextModel,
		tutorModel:  cfg.OpenAITutorModel,
		visionModel: cfg.OpenAIVisionModel,
		httpClient:  &http.Client{Timeout: 25 * time.Second},
	}
}

func (o *OpenAIProvider) GenerateOutline(ctx context.Context, input TextExploreInput) (domain.KnowledgeOutline, error) {
	prompt := fmt.Sprintf("Generate 4-node knowledge outline for topic '%s' in Chinese, return plain markdown bullet list.", input.Topic)
	content, err := o.chat(ctx, o.textModel, prompt)
	if err != nil {
		return domain.KnowledgeOutline{}, err
	}
	mock := &MockProvider{}
	outline, _ := mock.GenerateOutline(ctx, input)
	outline.Nodes[0].Summary = content
	return outline, nil
}

func (o *OpenAIProvider) GenerateHint(ctx context.Context, input TutorHintInput) (domain.InterventionEvent, error) {
	prompt := fmt.Sprintf("Generate one short Chinese intervention message for reason=%s", input.TriggerReason)
	message, err := o.chat(ctx, o.tutorModel, prompt)
	if err != nil {
		return domain.InterventionEvent{}, err
	}
	return domain.InterventionEvent{
		EventID:       fmt.Sprintf("iev_%d", time.Now().UnixNano()),
		TriggerReason: input.TriggerReason,
		TriggerCount:  input.TriggerCount,
		Message:       message,
		ActionType:    "explain_simpler",
		CreatedAt:     time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (o *OpenAIProvider) GenerateNoteStream(ctx context.Context, input TutorStreamInput) ([]string, error) {
	prompt := fmt.Sprintf("Generate concise Chinese markdown explanation for node %s in 3 bullet points.", input.NodeID)
	text, err := o.chat(ctx, o.tutorModel, prompt)
	if err != nil {
		return nil, err
	}
	return []string{text}, nil
}

func (o *OpenAIProvider) chat(ctx context.Context, model string, prompt string) (string, error) {
	body, _ := json.Marshal(chatRequest{
		Model:    model,
		Messages: []chatMessage{{Role: "user", Content: prompt}},
	})

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, o.baseURL+"/chat/completions", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+o.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("openai failed: %s", string(raw))
	}

	var data chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", err
	}
	if len(data.Choices) == 0 {
		return "", errors.New("empty completion")
	}
	return data.Choices[0].Message.Content, nil
}

func (o *OpenAIProvider) AnalyzeFrame(ctx context.Context, input VisionFrameInput) (domain.VisionState, error) {
	if strings.TrimSpace(input.FrameDataURL) == "" {
		return domain.VisionState{}, errors.New("frame_data_url required for openai vision")
	}
	requestBody := map[string]any{
		"model": o.visionModel,
		"messages": []map[string]any{
			{
				"role": "user",
				"content": []map[string]any{
					{
						"type": "text",
						"text": "Classify learning state from image. Return strict JSON with keys: focus_level(low|medium|high), emotion(neutral|frustrated|confused|engaged), posture(normal|too_close|slouching), confidence(0-1).",
					},
					{
						"type": "image_url",
						"image_url": map[string]string{
							"url": input.FrameDataURL,
						},
					},
				},
			},
		},
	}

	body, _ := json.Marshal(requestBody)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, o.baseURL+"/chat/completions", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+o.apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := o.httpClient.Do(req)
	if err != nil {
		return domain.VisionState{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		return domain.VisionState{}, fmt.Errorf("openai vision failed: %s", string(raw))
	}
	var data chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return domain.VisionState{}, err
	}
	if len(data.Choices) == 0 {
		return domain.VisionState{}, errors.New("empty vision completion")
	}
	var parsed domain.VisionState
	content := strings.TrimSpace(data.Choices[0].Message.Content)
	if err := json.Unmarshal([]byte(content), &parsed); err != nil {
		return domain.VisionState{}, fmt.Errorf("vision output parse failed: %w", err)
	}
	if parsed.SampledAt == "" {
		parsed.SampledAt = time.Now().UTC().Format(time.RFC3339)
	}
	return parsed, nil
}
