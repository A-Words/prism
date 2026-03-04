package provider

import (
	"context"
	"errors"
	"strings"

	"prism/apps/bff/internal/domain"
)

type TextProvider interface {
	GenerateOutline(ctx context.Context, input TextExploreInput) (domain.KnowledgeOutline, error)
}

type VisionProvider interface {
	AnalyzeFrame(ctx context.Context, input VisionFrameInput) (domain.VisionState, error)
}

type TutorProvider interface {
	GenerateHint(ctx context.Context, input TutorHintInput) (domain.InterventionEvent, error)
	GenerateNoteStream(ctx context.Context, input TutorStreamInput) ([]string, error)
}

type Router struct {
	Text   TextProvider
	Vision VisionProvider
	Tutor  TutorProvider
}

type Config struct {
	Mode              string
	OpenAIKey         string
	OpenAIBaseURL     string
	OpenAITextModel   string
	OpenAITutorModel  string
	OpenAIVisionModel string
}

type TextExploreInput struct {
	Topic     string
	Language  string
	FromImage bool
}

type VisionFrameInput struct {
	ConsentEnabled bool
	FrameDataURL   string
}

type TutorHintInput struct {
	TriggerReason string
	TriggerCount  int
}

type TutorStreamInput struct {
	NodeID string
}

func NewRouter(cfg Config) (*Router, error) {
	mode := strings.ToLower(strings.TrimSpace(cfg.Mode))
	if mode == "" || mode == "mock" {
		mock := &MockProvider{}
		return &Router{Text: mock, Vision: mock, Tutor: mock}, nil
	}
	if mode == "openai" {
		if cfg.OpenAIKey == "" {
			return nil, errors.New("OPENAI_API_KEY required for openai mode")
		}
		op := NewOpenAIProvider(cfg)
		return &Router{Text: op, Vision: op, Tutor: op}, nil
	}
	return nil, errors.New("unsupported provider mode")
}
