package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/prism/server/internal/middleware"
)

func (h *APIHandler) ListHealthAlerts(c *gin.Context) {
	userID := middleware.CurrentUserID(c)

	// 可选 acknowledged 过滤
	var acknowledged *bool
	if ackStr := c.Query("acknowledged"); ackStr != "" {
		val := ackStr == "true"
		acknowledged = &val
	}

	alerts := h.service.ListHealthAlerts(c.Request.Context(), userID, acknowledged)
	c.JSON(http.StatusOK, gin.H{"items": alerts})
}

func (h *APIHandler) AcknowledgeHealthAlert(c *gin.Context) {
	alertID, err := strconv.Atoi(c.Param("alertId"))
	if err != nil || alertID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid alert id"})
		return
	}

	response, err := h.service.AcknowledgeHealthAlert(c.Request.Context(), middleware.CurrentUserID(c), alertID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *APIHandler) GetHealthSummary(c *gin.Context) {
	response := h.service.GetHealthSummary(c.Request.Context(), middleware.CurrentUserID(c))
	c.JSON(http.StatusOK, response)
}
