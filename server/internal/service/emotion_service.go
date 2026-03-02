package service

import (
	"context"
	"errors"

	"github.com/prism/server/internal/model"
)

// EvaluateIntervention 根据情绪/专注/疲劳/姿态状态，决定干预动作
// 使用规则引擎实现，不依赖 AI 调用（确保低延迟 & 可离线降级）
func (s *LearningService) EvaluateIntervention(_ context.Context, req model.InterventionEvalRequest) (model.InterventionEvalResponse, error) {
	if req.Emotion == "" {
		return model.InterventionEvalResponse{}, errors.New("emotion is required")
	}

	// 优先级: 姿态问题 > 疲劳 > 情绪焦虑/沮丧 > 困惑 > 默认鼓励
	if req.PostureStatus == "slouching" || req.PostureStatus == "too_close" {
		return model.InterventionEvalResponse{
			Action:  model.InterventionPostureReminder,
			Message: "注意坐姿哦！保持良好的坐姿有助于集中注意力。",
			Urgency: "medium",
		}, nil
	}

	if req.FatigueLevel >= 0.7 {
		return model.InterventionEvalResponse{
			Action:  model.InterventionSuggestBreak,
			Message: "你已经学习很久了，建议休息几分钟再继续。",
			Urgency: "high",
		}, nil
	}

	switch model.EmotionType(req.Emotion) {
	case model.EmotionAnxious, model.EmotionFrustrated:
		return model.InterventionEvalResponse{
			Action:  model.InterventionAdjustDifficulty,
			Message: "别担心，我来帮你调整难度，一步步来。",
			Urgency: "medium",
		}, nil
	case model.EmotionConfused:
		return model.InterventionEvalResponse{
			Action:  model.InterventionEncourage,
			Message: "遇到困难很正常，试着回顾一下前面的知识点。",
			Urgency: "low",
		}, nil
	case model.EmotionTired:
		return model.InterventionEvalResponse{
			Action:  model.InterventionSuggestBreak,
			Message: "看起来有些疲惫，休息一下效果会更好。",
			Urgency: "medium",
		}, nil
	default:
		// focused 或未知情绪 → 鼓励继续
		return model.InterventionEvalResponse{
			Action:  model.InterventionEncourage,
			Message: "状态不错，继续保持！",
			Urgency: "low",
		}, nil
	}
}

// AnalyzeEmotion 调用 AI 服务分析情绪（图像+可选音频）
func (s *LearningService) AnalyzeEmotion(ctx context.Context, req model.AIEmotionAnalyzeRequest) (model.AIEmotionAnalyzeResponse, error) {
	return s.ai.AnalyzeEmotion(ctx, req)
}

// AnalyzePose 调用 AI 服务分析姿态
func (s *LearningService) AnalyzePose(ctx context.Context, req model.AIPoseAnalyzeRequest) (model.AIPoseAnalyzeResponse, error) {
	return s.ai.AnalyzePose(ctx, req)
}
