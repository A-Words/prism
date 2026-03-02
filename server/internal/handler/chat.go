package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/prism/server/internal/middleware"
	"github.com/prism/server/internal/model"
)

func (h *APIHandler) CreateChatSession(c *gin.Context) {
	var req model.CreateChatSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// title 非必填，允许空 body
		req = model.CreateChatSessionRequest{}
	}

	response := h.service.CreateChatSession(c.Request.Context(), middleware.CurrentUserID(c), req.Title)
	c.JSON(http.StatusCreated, response)
}

func (h *APIHandler) ListChatSessions(c *gin.Context) {
	sessions := h.service.ListChatSessions(c.Request.Context(), middleware.CurrentUserID(c))
	c.JSON(http.StatusOK, gin.H{"items": sessions})
}

func (h *APIHandler) SendMessage(c *gin.Context) {
	sessionID, err := strconv.Atoi(c.Param("sessionId"))
	if err != nil || sessionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	var req model.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "detail": err.Error()})
		return
	}

	response, err := h.service.SendMessage(c.Request.Context(), middleware.CurrentUserID(c), sessionID, req.Content, req.Scene)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *APIHandler) ListChatMessages(c *gin.Context) {
	sessionID, err := strconv.Atoi(c.Param("sessionId"))
	if err != nil || sessionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	messages, err := h.service.ListChatMessages(c.Request.Context(), middleware.CurrentUserID(c), sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": messages})
}
