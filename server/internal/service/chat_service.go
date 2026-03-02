package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/prism/server/internal/model"
)

// CreateChatSession 创建新的助教对话会话
func (s *LearningService) CreateChatSession(_ context.Context, userID string, title string) model.ChatSessionDTO {
	if title == "" {
		title = "新对话"
	}
	now := time.Now().UTC()
	session := s.repo.CreateChatSession(model.ChatSession{
		UserID:    userID,
		Title:     title,
		CreatedAt: now,
		UpdatedAt: now,
	})
	return model.ChatSessionDTO{
		ID:        session.ID,
		Title:     session.Title,
		CreatedAt: session.CreatedAt.Format(time.RFC3339),
		UpdatedAt: session.UpdatedAt.Format(time.RFC3339),
	}
}

// ListChatSessions 列出用户的所有对话会话
func (s *LearningService) ListChatSessions(_ context.Context, userID string) []model.ChatSessionDTO {
	sessions := s.repo.ListChatSessions(userID)
	result := make([]model.ChatSessionDTO, 0, len(sessions))
	for _, session := range sessions {
		result = append(result, model.ChatSessionDTO{
			ID:        session.ID,
			Title:     session.Title,
			CreatedAt: session.CreatedAt.Format(time.RFC3339),
			UpdatedAt: session.UpdatedAt.Format(time.RFC3339),
		})
	}
	return result
}

// SendMessage 发送消息并获取 AI 助教回复
func (s *LearningService) SendMessage(ctx context.Context, userID string, sessionID int, content string, scene string) (model.ChatMessageDTO, error) {
	session, ok := s.repo.GetChatSession(userID, sessionID)
	if !ok {
		return model.ChatMessageDTO{}, errors.New("chat session not found")
	}

	now := time.Now().UTC()
	// 保存用户消息
	s.repo.CreateChatMessage(model.ChatMessage{
		SessionID: session.ID,
		Role:      "user",
		Content:   content,
		CreatedAt: now,
	})

	// 构建历史消息给 AI
	history := s.repo.ListChatMessages(session.ID)
	aiMessages := make([]model.AIChatMessage, 0, len(history))
	for _, msg := range history {
		aiMessages = append(aiMessages, model.AIChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// 调用 AI 对话服务
	aiResp, err := s.ai.ChatCompletion(ctx, model.AIChatCompletionRequest{
		Messages: aiMessages,
		Scene:    scene,
		Stream:   false,
	})
	if err != nil {
		return model.ChatMessageDTO{}, fmt.Errorf("ai chat: %w", err)
	}

	// 保存 AI 回复
	assistantMsg := s.repo.CreateChatMessage(model.ChatMessage{
		SessionID:           session.ID,
		Role:                "assistant",
		Content:             aiResp.Content,
		RelatedKnowledgeIDs: aiResp.RelatedKnowledgeIDs,
		CreatedAt:           time.Now().UTC(),
	})

	return model.ChatMessageDTO{
		ID:                  assistantMsg.ID,
		Role:                assistantMsg.Role,
		Content:             assistantMsg.Content,
		RelatedKnowledgeIDs: assistantMsg.RelatedKnowledgeIDs,
		CreatedAt:           assistantMsg.CreatedAt.Format(time.RFC3339),
	}, nil
}

// ListChatMessages 列出某个会话的所有消息
func (s *LearningService) ListChatMessages(_ context.Context, userID string, sessionID int) ([]model.ChatMessageDTO, error) {
	_, ok := s.repo.GetChatSession(userID, sessionID)
	if !ok {
		return nil, errors.New("chat session not found")
	}

	messages := s.repo.ListChatMessages(sessionID)
	result := make([]model.ChatMessageDTO, 0, len(messages))
	for _, msg := range messages {
		result = append(result, model.ChatMessageDTO{
			ID:                  msg.ID,
			Role:                msg.Role,
			Content:             msg.Content,
			RelatedKnowledgeIDs: msg.RelatedKnowledgeIDs,
			CreatedAt:           msg.CreatedAt.Format(time.RFC3339),
		})
	}
	return result, nil
}
