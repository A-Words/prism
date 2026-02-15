package handler

import (
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/prism/server/internal/middleware"
	"github.com/prism/server/internal/model"
)

func (h *APIHandler) CreateColdStartSession(c *gin.Context) {
	var req model.CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "detail": err.Error()})
		return
	}

	response, err := h.service.CreateColdStartSession(c.Request.Context(), middleware.CurrentUserID(c), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *APIHandler) SubmitColdStartSession(c *gin.Context) {
	sessionID, err := strconv.Atoi(c.Param("sessionId"))
	if err != nil || sessionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	var req model.SubmitColdStartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "detail": err.Error()})
		return
	}

	response, err := h.service.SubmitColdStartSession(c.Request.Context(), middleware.CurrentUserID(c), sessionID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *APIHandler) GradeHomework(c *gin.Context) {
	subject := strings.TrimSpace(strings.ToLower(c.PostForm("subject")))
	if subject == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject is required"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported image format"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unable to open file"})
		return
	}
	defer file.Close()

	payload, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unable to read file"})
		return
	}

	response, err := h.service.GradeHomework(c.Request.Context(), middleware.CurrentUserID(c), subject, fileHeader.Filename, payload)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}
