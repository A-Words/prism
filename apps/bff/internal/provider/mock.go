package provider

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"prism/apps/bff/internal/domain"
)

type MockProvider struct{}

func (m *MockProvider) GenerateOutline(_ context.Context, input TextExploreInput) (domain.KnowledgeOutline, error) {
	nodes := []domain.KnowledgeNode{
		{ID: "n_root", Title: input.Topic, Summary: "主题概览与学习目标", Level: 0},
		{ID: "n_1", Title: "核心概念", Summary: "建立概念定义与边界", Level: 1},
		{ID: "n_2", Title: "典型例题", Summary: "通过例题理解应用", Level: 1},
		{ID: "n_3", Title: "常见误区", Summary: "高频错误与纠偏", Level: 1},
	}
	edges := []domain.KnowledgeEdge{
		{Source: "n_root", Target: "n_1", Relation: "contains"},
		{Source: "n_root", Target: "n_2", Relation: "contains"},
		{Source: "n_root", Target: "n_3", Relation: "contains"},
		{Source: "n_1", Target: "n_2", Relation: "prerequisite"},
	}

	sourceType := "text"
	if input.FromImage {
		sourceType = "image"
	}

	return domain.KnowledgeOutline{
		Topic:      input.Topic,
		Difficulty: "beginner",
		SourceType: sourceType,
		Nodes:      nodes,
		Edges:      edges,
	}, nil
}

func (m *MockProvider) AnalyzeFrame(_ context.Context, _ VisionFrameInput) (domain.VisionState, error) {
	states := []domain.VisionState{
		{FocusLevel: "high", Emotion: "engaged", Posture: "normal", Confidence: 0.81, SampledAt: time.Now().UTC().Format(time.RFC3339)},
		{FocusLevel: "low", Emotion: "frustrated", Posture: "too_close", Confidence: 0.86, SampledAt: time.Now().UTC().Format(time.RFC3339)},
		{FocusLevel: "medium", Emotion: "confused", Posture: "slouching", Confidence: 0.72, SampledAt: time.Now().UTC().Format(time.RFC3339)},
	}
	return states[time.Now().UnixNano()%int64(len(states))], nil
}

func (m *MockProvider) GenerateHint(_ context.Context, input TutorHintInput) (domain.InterventionEvent, error) {
	message := "检测到你可能受阻，我可以拆成更简单步骤。"
	action := "explain_simpler"
	if input.TriggerReason == "posture" {
		message = "你离屏幕有点近，先调整坐姿，再做一题热身。"
		action = "review_prerequisite"
	}
	return domain.InterventionEvent{
		EventID:       "iev_" + uuid.NewString(),
		TriggerReason: input.TriggerReason,
		TriggerCount:  input.TriggerCount,
		Message:       message,
		ActionType:    action,
		CreatedAt:     time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (m *MockProvider) GenerateNoteStream(_ context.Context, input TutorStreamInput) ([]string, error) {
	return []string{
		fmt.Sprintf("## 节点 %s 讲解\n", input.NodeID),
		"1. 先明确定义与适用条件。\n",
		"2. 再看一个最小可行例题。\n",
		"3. 最后用反例校验边界。\n",
	}, nil
}
