package service

import (
	"context"
	"time"

	"github.com/prism/server/internal/model"
)

// CreateHealthAlert 创建健康预警记录
func (s *LearningService) CreateHealthAlert(_ context.Context, userID string, alertType string, message string) model.HealthAlert {
	now := time.Now().UTC()
	alert := s.repo.CreateHealthAlert(model.HealthAlert{
		UserID:       userID,
		AlertType:    model.HealthAlertType(alertType),
		Message:      message,
		Acknowledged: false,
		CreatedAt:    now,
		UpdatedAt:    now,
	})
	return alert
}

// ListHealthAlerts 列出用户健康预警（可选过滤已确认状态）
func (s *LearningService) ListHealthAlerts(_ context.Context, userID string, acknowledged *bool) []model.HealthAlertDTO {
	alerts := s.repo.ListHealthAlerts(userID, acknowledged)
	result := make([]model.HealthAlertDTO, 0, len(alerts))
	for _, alert := range alerts {
		result = append(result, model.HealthAlertDTO{
			ID:           alert.ID,
			AlertType:    string(alert.AlertType),
			Message:      alert.Message,
			Acknowledged: alert.Acknowledged,
			CreatedAt:    alert.CreatedAt.Format(time.RFC3339),
		})
	}
	return result
}

// AcknowledgeHealthAlert 确认一条健康预警
func (s *LearningService) AcknowledgeHealthAlert(_ context.Context, userID string, alertID int) (model.AckAlertResponse, error) {
	alert, ok := s.repo.AcknowledgeHealthAlert(userID, alertID)
	if !ok {
		return model.AckAlertResponse{}, errNotFound("health alert")
	}
	return model.AckAlertResponse{
		ID:           alert.ID,
		Acknowledged: alert.Acknowledged,
		UpdatedAt:    alert.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// CreateStudyLog 记录一条学习日志（由 WebSocket monitor 调用）
func (s *LearningService) CreateStudyLog(_ context.Context, userID string, scene string, emotion string, focusScore float64, fatigueLevel float64, postureStatus string) model.StudyLog {
	now := time.Now().UTC()
	return s.repo.CreateStudyLog(model.StudyLog{
		UserID:        userID,
		Scene:         scene,
		Emotion:       emotion,
		FocusScore:    focusScore,
		FatigueLevel:  fatigueLevel,
		PostureStatus: postureStatus,
		CreatedAt:     now,
	})
}

// GetHealthSummary 获取用户健康摘要（专注度趋势、疲劳趋势、姿态分布）
func (s *LearningService) GetHealthSummary(_ context.Context, userID string) model.HealthSummaryResponse {
	since := time.Now().UTC().Add(-24 * time.Hour)
	logs := s.repo.ListStudyLogs(userID, since)

	focusTrend := make([]model.TrendPoint, 0, len(logs))
	fatigueTrend := make([]model.TrendPoint, 0, len(logs))
	postureCounts := make(map[string]int)
	total := 0

	for _, log := range logs {
		ts := log.CreatedAt.Format(time.RFC3339)
		focusTrend = append(focusTrend, model.TrendPoint{Ts: ts, Value: log.FocusScore})
		fatigueTrend = append(fatigueTrend, model.TrendPoint{Ts: ts, Value: log.FatigueLevel})
		if log.PostureStatus != "" {
			postureCounts[log.PostureStatus]++
			total++
		}
	}

	postureDist := make([]model.PostureDistribution, 0, len(postureCounts))
	for status, count := range postureCounts {
		ratio := 0.0
		if total > 0 {
			ratio = float64(count) / float64(total)
		}
		postureDist = append(postureDist, model.PostureDistribution{Status: status, Ratio: ratio})
	}

	return model.HealthSummaryResponse{
		FocusTrend:          focusTrend,
		FatigueTrend:        fatigueTrend,
		PostureDistribution: postureDist,
	}
}
