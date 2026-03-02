package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/prism/server/internal/model"
)

// CreateNote 创建新笔记
func (s *LearningService) CreateNote(_ context.Context, userID string, req model.CreateNoteRequest) model.NoteDTO {
	sourceType := req.SourceType
	if sourceType == "" {
		sourceType = string(model.NoteSourceManual)
	}
	now := time.Now().UTC()
	note := s.repo.CreateNote(model.Note{
		UserID:     userID,
		Title:      req.Title,
		Content:    req.Content,
		SourceType: model.NoteSourceType(sourceType),
		CreatedAt:  now,
		UpdatedAt:  now,
	})
	return noteToDTO(note)
}

// ListNotes 列出用户的所有笔记
func (s *LearningService) ListNotes(_ context.Context, userID string) []model.NoteDTO {
	notes := s.repo.ListNotes(userID)
	result := make([]model.NoteDTO, 0, len(notes))
	for _, note := range notes {
		result = append(result, noteToDTO(note))
	}
	return result
}

// GetNote 获取单条笔记详情
func (s *LearningService) GetNote(_ context.Context, userID string, noteID int) (model.NoteDTO, error) {
	note, ok := s.repo.GetNote(userID, noteID)
	if !ok {
		return model.NoteDTO{}, errNotFound("note")
	}
	return noteToDTO(note), nil
}

// TranscribeAudio 调用 AI 转录音频为文本
func (s *LearningService) TranscribeAudio(ctx context.Context, audio string, format string) (model.AITranscribeResponse, error) {
	if audio == "" {
		return model.AITranscribeResponse{}, errors.New("audio data is required")
	}
	return s.ai.Transcribe(ctx, model.AITranscribeRequest{Audio: audio, Format: format})
}

// SearchNotes 调用 AI 语义搜索笔记
func (s *LearningService) SearchNotes(ctx context.Context, query string, topK int) (model.AISearchResponse, error) {
	if query == "" {
		return model.AISearchResponse{}, errors.New("query is required")
	}
	if topK <= 0 {
		topK = 10
	}
	return s.ai.Search(ctx, model.AISearchRequest{Query: query, TopK: topK})
}

func noteToDTO(note model.Note) model.NoteDTO {
	return model.NoteDTO{
		ID:         note.ID,
		Title:      note.Title,
		Content:    note.Content,
		SourceType: string(note.SourceType),
		CreatedAt:  note.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  note.UpdatedAt.Format(time.RFC3339),
	}
}

// errNotFound 统一的"未找到"错误工厂
func errNotFound(entity string) error {
	return fmt.Errorf("%s not found", entity)
}
