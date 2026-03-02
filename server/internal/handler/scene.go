package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/prism/server/internal/middleware"
	"github.com/prism/server/internal/model"
)

func (h *APIHandler) SwitchScene(c *gin.Context) {
	var req model.SwitchSceneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "detail": err.Error()})
		return
	}

	response, err := h.service.SwitchScene(c.Request.Context(), middleware.CurrentUserID(c), req.Scene)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *APIHandler) GetCurrentScene(c *gin.Context) {
	response := h.service.GetCurrentScene(c.Request.Context(), middleware.CurrentUserID(c))
	c.JSON(http.StatusOK, response)
}
