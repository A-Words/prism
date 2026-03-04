package intervention

import (
	"testing"
	"time"

	"prism/apps/bff/internal/domain"
)

func TestEngineThreshold(t *testing.T) {
	engine := NewEngine(2, time.Minute)
	vision := domain.VisionState{Emotion: "frustrated", Confidence: 0.9}

	trigger, _, _ := engine.Record("u1", vision)
	if trigger {
		t.Fatal("should not trigger at first anomaly")
	}
	trigger, _, _ = engine.Record("u1", vision)
	if !trigger {
		t.Fatal("should trigger at second anomaly")
	}
}

func TestIsAnomalyConfidenceGate(t *testing.T) {
	_, ok := IsAnomaly(domain.VisionState{Emotion: "frustrated", Confidence: 0.2})
	if ok {
		t.Fatal("low confidence should not be anomaly")
	}
}
