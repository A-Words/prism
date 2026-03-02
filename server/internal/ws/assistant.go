package ws

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prism/server/internal/model"
	"github.com/prism/server/internal/service"
)

func AssistantHandler(hub *Hub, svc *service.LearningService) gin.HandlerFunc {
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
			go handleAssistantEnvelope(client, svc, userID, envelope)
		})
		client.Run()
	}
}

func handleAssistantEnvelope(client *Client, svc *service.LearningService, userID string, envelope model.WSEnvelope) {
	if envelope.Event != "chat_message" {
		client.Send(buildEnvelope("error", envelope.TraceID, envelope.SessionID, map[string]any{"message": "unsupported event"}))
		return
	}

	payload, ok := toMap(envelope.Payload)
	if !ok {
		client.Send(buildEnvelope("error", envelope.TraceID, envelope.SessionID, map[string]any{"message": "invalid payload"}))
		return
	}

	sessionID, ok := toInt(payload["sessionId"])
	if !ok || sessionID <= 0 {
		if strings.TrimSpace(envelope.SessionID) != "" {
			if parsed, err := strconv.Atoi(envelope.SessionID); err == nil {
				sessionID = parsed
				ok = true
			}
		}
	}
	if !ok || sessionID <= 0 {
		client.Send(buildEnvelope("error", envelope.TraceID, envelope.SessionID, map[string]any{"message": "invalid sessionId"}))
		return
	}

	content := strings.TrimSpace(toString(payload["content"]))
	if content == "" {
		client.Send(buildEnvelope("error", envelope.TraceID, envelope.SessionID, map[string]any{"message": "content is required"}))
		return
	}

	scene := strings.TrimSpace(toString(payload["scene"]))
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := svc.SendMessage(ctx, userID, sessionID, content, scene)
	if err != nil {
		client.Send(buildEnvelope("error", envelope.TraceID, envelope.SessionID, map[string]any{"message": err.Error()}))
		return
	}

	chunks := splitChunks(resp.Content, 80)
	for index, chunk := range chunks {
		client.Send(buildEnvelope("chat_chunk", envelope.TraceID, strconv.Itoa(sessionID), map[string]any{
			"index":   index,
			"content": chunk,
		}))
	}

	client.Send(buildEnvelope("chat_done", envelope.TraceID, strconv.Itoa(sessionID), map[string]any{
		"messageId":           resp.ID,
		"content":             resp.Content,
		"relatedKnowledgeIds": resp.RelatedKnowledgeIDs,
		"createdAt":           resp.CreatedAt,
		"streamCompletedAt":   time.Now().UTC().Format(time.RFC3339),
	}))
}

func splitChunks(content string, chunkSize int) []string {
	if chunkSize <= 0 {
		return []string{content}
	}
	runes := []rune(content)
	if len(runes) == 0 {
		return []string{""}
	}
	chunks := make([]string, 0, (len(runes)/chunkSize)+1)
	for start := 0; start < len(runes); start += chunkSize {
		end := start + chunkSize
		if end > len(runes) {
			end = len(runes)
		}
		chunks = append(chunks, string(runes[start:end]))
	}
	return chunks
}
