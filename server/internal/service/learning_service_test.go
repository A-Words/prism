package service

import (
	"context"
	"testing"
	"time"

	"github.com/prism/server/internal/model"
	"github.com/prism/server/internal/repository"
)

type fakeAIClient struct{}

func (f fakeAIClient) VisionOCR(_ context.Context, _ model.AIVisionOCRRequest) (model.AIVisionOCRResponse, error) {
	return model.AIVisionOCRResponse{Text: "Q1: 1+1=2", Structured: map[string]any{"lang": "zh"}}, nil
}

func (f fakeAIClient) GradeHomework(_ context.Context, _ model.AIGradeHomeworkRequest) (model.AIGradeHomeworkResponse, error) {
	return model.AIGradeHomeworkResponse{Items: []model.AIGradeHomeworkItem{{
		Question:      "1+1=?",
		StudentAnswer: "2",
		CorrectAnswer: "2",
		IsCorrect:     true,
		KnowledgeIDs:  []int{101},
		Feedback:      "good",
		Confidence:    0.9,
	}}}, nil
}

func (f fakeAIClient) PredictOutcome(_ context.Context, _ model.AIPredictOutcomeRequest) (model.AIPredictOutcomeResponse, error) {
	return model.AIPredictOutcomeResponse{CalibrationFactor: 1.0, Rationale: "stable"}, nil
}

func (f fakeAIClient) AnalyzeEmotion(_ context.Context, _ model.AIEmotionAnalyzeRequest) (model.AIEmotionAnalyzeResponse, error) {
	return model.AIEmotionAnalyzeResponse{
		Emotion:      "focused",
		Confidence:   0.9,
		FocusScore:   0.8,
		FatigueLevel: 0.2,
	}, nil
}

func (f fakeAIClient) AnalyzePose(_ context.Context, _ model.AIPoseAnalyzeRequest) (model.AIPoseAnalyzeResponse, error) {
	return model.AIPoseAnalyzeResponse{
		PostureStatus: "good",
		Confidence:    0.9,
		Details:       map[string]any{"status": "good"},
	}, nil
}

func (f fakeAIClient) ChatCompletion(_ context.Context, _ model.AIChatCompletionRequest) (model.AIChatCompletionResponse, error) {
	return model.AIChatCompletionResponse{Content: "ok", RelatedKnowledgeIDs: []int{101}}, nil
}

func (f fakeAIClient) Transcribe(_ context.Context, _ model.AITranscribeRequest) (model.AITranscribeResponse, error) {
	return model.AITranscribeResponse{Text: "转写文本"}, nil
}

func (f fakeAIClient) Embed(_ context.Context, _ model.AIEmbedRequest) (model.AIEmbedResponse, error) {
	return model.AIEmbedResponse{Embedding: []float64{0.1, 0.2}}, nil
}

func (f fakeAIClient) Search(_ context.Context, _ model.AISearchRequest) (model.AISearchResponse, error) {
	return model.AISearchResponse{
		Results: []model.AISearchResult{
			{ID: 101, Title: "有理数运算", Content: "内容", Score: 0.9, Source: "knowledge_point"},
		},
	}, nil
}

func newTestService() *LearningService {
	repo := repository.NewMemoryRepository()
	return NewLearningService(repo, fakeAIClient{}, "https://example.supabase.co", "service-key", "bucket", "https://cdn.example.com")
}

func TestColdStartBuildsPath(t *testing.T) {
	svc := newTestService()
	userID := "user-1"

	session, err := svc.CreateColdStartSession(context.Background(), userID, model.CreateSessionRequest{
		Subject:          "math",
		GoalKnowledgeIDs: []int{106},
		TargetDate:       time.Now().Add(7 * 24 * time.Hour).Format("2006-01-02"),
	})
	if err != nil {
		t.Fatalf("CreateColdStartSession error: %v", err)
	}
	if len(session.Questions) != 10 {
		t.Fatalf("expected 10 questions, got %d", len(session.Questions))
	}

	answers := make([]model.AnswerSubmission, 0, len(session.Questions))
	for _, q := range session.Questions {
		answers = append(answers, model.AnswerSubmission{QuestionID: q.ID, Answer: "2", DurationSec: 45})
	}
	result, err := svc.SubmitColdStartSession(context.Background(), userID, session.SessionID, model.SubmitColdStartRequest{Answers: answers})
	if err != nil {
		t.Fatalf("SubmitColdStartSession error: %v", err)
	}
	if len(result.LearningPath.Nodes) == 0 {
		t.Fatalf("expected learning path nodes")
	}
}

func TestPracticeAttemptAdjustsPath(t *testing.T) {
	svc := newTestService()
	userID := "user-2"

	session, err := svc.CreateColdStartSession(context.Background(), userID, model.CreateSessionRequest{
		Subject:          "physics",
		GoalKnowledgeIDs: []int{206},
		TargetDate:       time.Now().Add(7 * 24 * time.Hour).Format("2006-01-02"),
	})
	if err != nil {
		t.Fatalf("CreateColdStartSession error: %v", err)
	}

	answers := make([]model.AnswerSubmission, 0, len(session.Questions))
	for _, q := range session.Questions {
		answer := "wrong"
		if len(q.Options) > 1 {
			answer = q.Options[1]
		}
		answers = append(answers, model.AnswerSubmission{QuestionID: q.ID, Answer: answer, DurationSec: 60})
	}
	result, err := svc.SubmitColdStartSession(context.Background(), userID, session.SessionID, model.SubmitColdStartRequest{Answers: answers})
	if err != nil {
		t.Fatalf("SubmitColdStartSession error: %v", err)
	}

	pathID := result.LearningPath.PathID
	_, err = svc.SubmitPracticeAttempt(context.Background(), userID, pathID, model.PracticeAttemptPayload{
		QuestionID:  2003,
		KnowledgeID: 202,
		Answer:      "0",
		DurationSec: 120,
		Source:      "path",
	})
	if err != nil {
		t.Fatalf("SubmitPracticeAttempt first error: %v", err)
	}
	updated, err := svc.SubmitPracticeAttempt(context.Background(), userID, pathID, model.PracticeAttemptPayload{
		QuestionID:  2003,
		KnowledgeID: 202,
		Answer:      "0",
		DurationSec: 120,
		Source:      "path",
	})
	if err != nil {
		t.Fatalf("SubmitPracticeAttempt second error: %v", err)
	}
	if len(updated.Nodes) == 0 {
		t.Fatalf("expected path nodes after adjustment")
	}
}
