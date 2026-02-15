package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/prism/server/internal/middleware"
)

func (h *APIHandler) ListKnowledgePoints(c *gin.Context) {
	subject := c.Query("subject")
	points, err := h.service.GetKnowledgePoints(c.Request.Context(), subject)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": points})
}

func (h *APIHandler) ListWeaknesses(c *gin.Context) {
	subject := c.Query("subject")
	weaknesses, err := h.service.GetWeaknesses(c.Request.Context(), middleware.CurrentUserID(c), subject)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": weaknesses})
}
