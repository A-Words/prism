package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/prism/server/internal/middleware"
	"github.com/prism/server/internal/model"
)

func (h *APIHandler) GetCurrentLearningPath(c *gin.Context) {
	subject := c.Query("subject")
	response, err := h.service.GetCurrentLearningPath(c.Request.Context(), middleware.CurrentUserID(c), subject)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *APIHandler) SubmitPracticeAttempt(c *gin.Context) {
	pathID, err := strconv.Atoi(c.Param("pathId"))
	if err != nil || pathID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path id"})
		return
	}

	var payload model.PracticeAttemptPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "detail": err.Error()})
		return
	}

	response, err := h.service.SubmitPracticeAttempt(c.Request.Context(), middleware.CurrentUserID(c), pathID, payload)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *APIHandler) GetPrediction(c *gin.Context) {
	pathID, err := strconv.Atoi(c.Param("pathId"))
	if err != nil || pathID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path id"})
		return
	}

	response, err := h.service.GetPrediction(c.Request.Context(), middleware.CurrentUserID(c), pathID)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}
