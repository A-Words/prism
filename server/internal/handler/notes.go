package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/prism/server/internal/middleware"
	"github.com/prism/server/internal/model"
)

func (h *APIHandler) CreateNote(c *gin.Context) {
	var req model.CreateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "detail": err.Error()})
		return
	}

	response := h.service.CreateNote(c.Request.Context(), middleware.CurrentUserID(c), req)
	c.JSON(http.StatusCreated, response)
}

func (h *APIHandler) ListNotes(c *gin.Context) {
	notes := h.service.ListNotes(c.Request.Context(), middleware.CurrentUserID(c))
	c.JSON(http.StatusOK, gin.H{"items": notes})
}

func (h *APIHandler) GetNote(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("noteId"))
	if err != nil || noteID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid note id"})
		return
	}

	note, err := h.service.GetNote(c.Request.Context(), middleware.CurrentUserID(c), noteID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, note)
}

func (h *APIHandler) TranscribeAudio(c *gin.Context) {
	var req model.AITranscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "detail": err.Error()})
		return
	}

	response, err := h.service.TranscribeAudio(c.Request.Context(), req.Audio, req.Format)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *APIHandler) SearchNotes(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
		return
	}

	topK := 10
	if topKStr := c.Query("topK"); topKStr != "" {
		if val, err := strconv.Atoi(topKStr); err == nil && val > 0 {
			topK = val
		}
	}

	response, err := h.service.SearchNotes(c.Request.Context(), query, topK)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}
