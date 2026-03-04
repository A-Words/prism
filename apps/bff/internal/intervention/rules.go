package intervention

import (
	"sync"
	"time"

	"prism/apps/bff/internal/domain"
)

type Engine struct {
	threshold int
	cooldown  time.Duration
	mu        sync.Mutex
	state     map[string]*counter
}

type counter struct {
	hits          int
	lastTriggered time.Time
}

func NewEngine(threshold int, cooldown time.Duration) *Engine {
	return &Engine{threshold: threshold, cooldown: cooldown, state: map[string]*counter{}}
}

func IsAnomaly(vision domain.VisionState) (string, bool) {
	if vision.Confidence < 0.6 {
		return "", false
	}
	if vision.Emotion == "frustrated" {
		return "frustrated", true
	}
	if vision.Posture == "too_close" || vision.Posture == "slouching" {
		return "posture", true
	}
	return "", false
}

func (e *Engine) Record(userID string, vision domain.VisionState) (trigger bool, reason string, count int) {
	e.mu.Lock()
	defer e.mu.Unlock()

	info, ok := e.state[userID]
	if !ok {
		info = &counter{}
		e.state[userID] = info
	}

	reason, anomaly := IsAnomaly(vision)
	if !anomaly {
		info.hits = 0
		return false, "", 0
	}

	if time.Since(info.lastTriggered) < e.cooldown {
		return false, reason, info.hits
	}

	info.hits++
	if info.hits >= e.threshold {
		info.lastTriggered = time.Now()
		info.hits = 0
		return true, reason, e.threshold
	}

	return false, reason, info.hits
}
