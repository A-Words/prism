package service

import (
	"testing"
	"time"

	"github.com/prism/server/internal/model"
)

func TestUpdateMastery(t *testing.T) {
	higher := updateMastery(0.5, 0.5, 45, true)
	if higher <= 0.5 {
		t.Fatalf("expected mastery increase, got %f", higher)
	}

	lower := updateMastery(0.5, 0.5, 120, false)
	if lower >= 0.5 {
		t.Fatalf("expected mastery decrease, got %f", lower)
	}
}

func TestCalcNodeStatus(t *testing.T) {
	now := time.Now().UTC()
	if got := calcNodeStatus(0.9, now.Add(-2*time.Hour), now); got != model.NodeStatusMastered {
		t.Fatalf("expected mastered, got %s", got)
	}
	if got := calcNodeStatus(0.7, now.Add(-30*24*time.Hour), now); got != model.NodeStatusReview {
		t.Fatalf("expected review, got %s", got)
	}
	if got := calcNodeStatus(0.3, now, now); got != model.NodeStatusPending {
		t.Fatalf("expected pending, got %s", got)
	}
}
