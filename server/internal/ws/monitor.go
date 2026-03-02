package ws

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prism/server/internal/model"
	"github.com/prism/server/internal/service"
)

type TokenValidatorFunc func(token string) (string, error)

var (
	tokenValidatorMu sync.RWMutex
	tokenValidator   TokenValidatorFunc
)

func SetTokenValidator(validator TokenValidatorFunc) {
	tokenValidatorMu.Lock()
	tokenValidator = validator
	tokenValidatorMu.Unlock()
}

func MonitorHandler(hub *Hub, svc *service.LearningService) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := validateToken(c.Query("token"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "websocket upgrade failed"})
			return
		}

		var client *Client
		client = NewClient(hub, conn, func(envelope model.WSEnvelope) {
			go handleMonitorEnvelope(client, svc, userID, envelope)
		})
		client.Run()
	}
}

func handleMonitorEnvelope(client *Client, svc *service.LearningService, userID string, envelope model.WSEnvelope) {
	switch envelope.Event {
	case "video_frame":
		handleVideoFrame(client, svc, userID, envelope)
	case "audio_chunk":
		client.Send(buildEnvelope("audio_chunk", envelope.TraceID, envelope.SessionID, map[string]any{"status": "received"}))
	default:
		client.Send(buildEnvelope("error", envelope.TraceID, envelope.SessionID, map[string]any{"message": "unsupported event"}))
	}
}

func handleVideoFrame(client *Client, svc *service.LearningService, userID string, envelope model.WSEnvelope) {
	payload, ok := toMap(envelope.Payload)
	if !ok {
		client.Send(buildEnvelope("error", envelope.TraceID, envelope.SessionID, map[string]any{"message": "invalid payload"}))
		return
	}

	image := strings.TrimSpace(toString(payload["image"]))
	audio := strings.TrimSpace(toString(payload["audio"]))
	scene := strings.TrimSpace(toString(payload["scene"]))
	if image == "" {
		client.Send(buildEnvelope("error", envelope.TraceID, envelope.SessionID, map[string]any{"message": "image is required"}))
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	var (
		emotionResp model.AIEmotionAnalyzeResponse
		poseResp    model.AIPoseAnalyzeResponse
		emotionErr  error
		poseErr     error
		wg          sync.WaitGroup
	)

	wg.Add(2)
	go func() {
		defer wg.Done()
		emotionResp, emotionErr = svc.AnalyzeEmotion(ctx, model.AIEmotionAnalyzeRequest{Image: image, Audio: audio})
	}()
	go func() {
		defer wg.Done()
		poseResp, poseErr = svc.AnalyzePose(ctx, model.AIPoseAnalyzeRequest{Image: image})
	}()
	wg.Wait()

	if emotionErr != nil {
		client.Send(buildEnvelope("error", envelope.TraceID, envelope.SessionID, map[string]any{"message": fmt.Sprintf("analyze emotion failed: %v", emotionErr)}))
		return
	}
	if poseErr != nil {
		client.Send(buildEnvelope("error", envelope.TraceID, envelope.SessionID, map[string]any{"message": fmt.Sprintf("analyze pose failed: %v", poseErr)}))
		return
	}

	client.Send(buildEnvelope("emotion_result", envelope.TraceID, envelope.SessionID, emotionResp))
	client.Send(buildEnvelope("pose_result", envelope.TraceID, envelope.SessionID, poseResp))

	_ = svc.CreateStudyLog(ctx, userID, scene, emotionResp.Emotion, emotionResp.FocusScore, emotionResp.FatigueLevel, poseResp.PostureStatus)

	if emotionResp.FatigueLevel > 0.7 {
		alert := svc.CreateHealthAlert(ctx, userID, string(model.HealthAlertFatigue), "检测到疲劳水平较高，建议短暂休息")
		client.Send(buildEnvelope("health_alert", envelope.TraceID, envelope.SessionID, alert))
	}

	if poseResp.PostureStatus == "slouching" || poseResp.PostureStatus == "too_close" {
		alert := svc.CreateHealthAlert(ctx, userID, string(model.HealthAlertPosture), "检测到坐姿异常，请调整坐姿")
		client.Send(buildEnvelope("health_alert", envelope.TraceID, envelope.SessionID, alert))
	}
}

func validateToken(token string) (string, error) {
	if strings.TrimSpace(token) == "" {
		return "", fmt.Errorf("missing token")
	}

	tokenValidatorMu.RLock()
	validator := tokenValidator
	tokenValidatorMu.RUnlock()
	if validator == nil {
		return "", fmt.Errorf("token validator is not configured")
	}

	userID, err := validator(token)
	if err != nil {
		return "", fmt.Errorf("invalid token")
	}
	if strings.TrimSpace(userID) == "" {
		return "", fmt.Errorf("invalid token subject")
	}
	return userID, nil
}

func buildEnvelope(event string, traceID string, sessionID string, payload any) model.WSEnvelope {
	return model.WSEnvelope{
		Event:     event,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		TraceID:   traceID,
		SessionID: sessionID,
		Payload:   payload,
	}
}

func toMap(value any) (map[string]any, bool) {
	mapped, ok := value.(map[string]any)
	return mapped, ok
}

func toString(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case fmt.Stringer:
		return typed.String()
	default:
		return ""
	}
}

func toInt(value any) (int, bool) {
	switch typed := value.(type) {
	case int:
		return typed, true
	case int32:
		return int(typed), true
	case int64:
		return int(typed), true
	case float64:
		return int(typed), true
	case string:
		parsed, err := strconv.Atoi(typed)
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}
