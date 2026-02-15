package service

import (
	"math"
	"strings"
	"time"

	"github.com/prism/server/internal/model"
)

func clamp(value float64, min float64, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func expectedSecByDifficulty(difficulty float64) float64 {
	return 45 + difficulty*75
}

// updateMastery 使用固定可解释公式更新掌握度。
func updateMastery(oldMastery float64, difficulty float64, durationSec int, correct bool) float64 {
	accSignal := -1.0
	if correct {
		accSignal = 1.0
	}
	duration := float64(durationSec)
	if duration < 10 {
		duration = 10
	}
	timeSignal := clamp((expectedSecByDifficulty(difficulty)/duration)-1, -0.5, 0.5)
	delta := 0.12*accSignal + 0.05*timeSignal
	return clamp(oldMastery+delta, 0, 1)
}

func computeWrongRate(attempts []model.QuestionAttempt) float64 {
	if len(attempts) == 0 {
		return 0
	}
	wrong := 0
	for _, attempt := range attempts {
		if !attempt.IsCorrect {
			wrong++
		}
	}
	return float64(wrong) / float64(len(attempts))
}

func computeWeakScore(mastery float64, wrongRate14d float64, recentWrong bool) float64 {
	base := 0.6*(1-mastery) + 0.4*wrongRate14d
	if recentWrong {
		base += 0.08
	}
	return clamp(base, 0, 1)
}

func calcNodeStatus(mastery float64, lastPracticedAt time.Time, now time.Time) model.NodeStatus {
	if mastery >= 0.85 && !lastPracticedAt.IsZero() && now.Sub(lastPracticedAt) <= 14*24*time.Hour {
		return model.NodeStatusMastered
	}
	if mastery >= 0.60 {
		return model.NodeStatusReview
	}
	return model.NodeStatusPending
}

func normalizeAnswer(answer string) string {
	trimmed := strings.TrimSpace(strings.ToLower(answer))
	trimmed = strings.ReplaceAll(trimmed, " ", "")
	return trimmed
}

func almostEqual(a float64, b float64) bool {
	return math.Abs(a-b) <= 1e-9
}
