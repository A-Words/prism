package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/prism/server/internal/model"
)

func (h *APIHandler) EvaluateIntervention(c *gin.Context) {
	var req model.InterventionEvalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "detail": err.Error()})
		return
	}

	response, err := h.service.EvaluateIntervention(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}
