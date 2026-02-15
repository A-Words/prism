package handler

import "github.com/prism/server/internal/service"

type APIHandler struct {
	service *service.LearningService
}

func NewAPIHandler(service *service.LearningService) *APIHandler {
	return &APIHandler{service: service}
}
