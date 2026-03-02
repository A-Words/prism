package service

import (
	"context"
	"errors"
	"time"

	"github.com/prism/server/internal/model"
)

// SwitchScene 切换用户当前学习场景，返回新场景及其策略
func (s *LearningService) SwitchScene(_ context.Context, userID string, scene string) (model.SwitchSceneResponse, error) {
	if !model.ValidScene(scene) {
		return model.SwitchSceneResponse{}, errors.New("invalid scene: must be classroom, self-study, or exam-prep")
	}
	s.repo.SetUserScene(userID, scene)
	strategy := model.SceneStrategyTemplates[model.SceneType(scene)]
	return model.SwitchSceneResponse{
		CurrentScene: model.SceneType(scene),
		Strategy:     strategy,
		EffectiveAt:  time.Now().UTC().Format(time.RFC3339),
	}, nil
}

// GetCurrentScene 获取用户当前场景及对应策略
func (s *LearningService) GetCurrentScene(_ context.Context, userID string) model.GetCurrentSceneResponse {
	scene := s.repo.GetUserScene(userID)
	strategy := model.SceneStrategyTemplates[model.SceneType(scene)]
	return model.GetCurrentSceneResponse{
		CurrentScene: model.SceneType(scene),
		Strategy:     strategy,
	}
}
