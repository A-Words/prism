package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
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

// OCRNote 调用 OCR 识别并直接落库笔记，同时建立知识点关联
func (s *LearningService) OCRNote(ctx context.Context, userID string, title string, imageBase64 string, task string) (model.OCRNoteResponse, error) {
	imageBase64 = strings.TrimSpace(imageBase64)
	if imageBase64 == "" {
		return model.OCRNoteResponse{}, errors.New("image is required")
	}
	if strings.TrimSpace(task) == "" {
		task = "handwriting"
	}

	ocrResp, err := s.ai.VisionOCR(ctx, model.AIVisionOCRRequest{
		Image: imageBase64,
		Task:  task,
	})
	if err != nil {
		return model.OCRNoteResponse{}, fmt.Errorf("ocr note: %w", err)
	}

	finalTitle := strings.TrimSpace(title)
	if finalTitle == "" {
		finalTitle = buildOCRNoteTitle(ocrResp.Text)
	}
	if finalTitle == "" {
		finalTitle = "OCR 笔记"
	}

	now := time.Now().UTC()
	note := s.repo.CreateNote(model.Note{
		UserID:     userID,
		Title:      finalTitle,
		Content:    strings.TrimSpace(ocrResp.Text),
		SourceType: model.NoteSourceOCR,
		CreatedAt:  now,
		UpdatedAt:  now,
	})

	searchResp, searchErr := s.ai.Search(ctx, model.AISearchRequest{
		Query: strings.TrimSpace(ocrResp.Text),
		TopK:  5,
	})
	if searchErr != nil {
		return model.OCRNoteResponse{
			Note:                noteToDTO(note),
			Structured:          ocrResp.Structured,
			RelatedKnowledgeIDs: []int{},
		}, nil
	}

	// 仅保留知识点来源的结果，避免把 note 自身命中误当成知识图谱关联
	knowledgeIDs := make([]int, 0, len(searchResp.Results))
	knowledgeLinks := make([]model.NoteKnowledgeLink, 0, len(searchResp.Results))
	seen := make(map[int]bool)
	for _, result := range searchResp.Results {
		if result.ID <= 0 || result.Source != "knowledge_point" || seen[result.ID] {
			continue
		}
		seen[result.ID] = true
		knowledgeIDs = append(knowledgeIDs, result.ID)
		knowledgeLinks = append(knowledgeLinks, model.NoteKnowledgeLink{
			NoteID:         note.ID,
			KnowledgeID:    result.ID,
			RelevanceScore: result.Score,
		})
	}
	s.repo.SaveNoteKnowledgeLinks(note.ID, knowledgeLinks)

	return model.OCRNoteResponse{
		Note:                noteToDTO(note),
		Structured:          ocrResp.Structured,
		RelatedKnowledgeIDs: knowledgeIDs,
	}, nil
}

func buildOCRNoteTitle(content string) string {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return ""
	}
	for _, separator := range []string{"\n", "。", ".", "；", ";", "?"} {
		if idx := strings.Index(trimmed, separator); idx > 0 {
			trimmed = strings.TrimSpace(trimmed[:idx])
			break
		}
	}
	runes := []rune(trimmed)
	if len(runes) > 24 {
		return string(runes[:24])
	}
	return trimmed
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
