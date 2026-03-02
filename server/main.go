package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/prism/server/internal/ai"
	"github.com/prism/server/internal/config"
	"github.com/prism/server/internal/handler"
	"github.com/prism/server/internal/middleware"
	"github.com/prism/server/internal/repository"
	"github.com/prism/server/internal/service"
)

func main() {
	cfg := config.Load()

	repo := repository.NewMemoryRepository()
	aiClient := ai.NewHTTPClient(cfg.AIServiceURL)
	learningService := service.NewLearningService(
		repo,
		aiClient,
		cfg.SupabaseURL,
		cfg.SupabaseServiceRoleKey,
		cfg.SupabaseStorageBucket,
		cfg.SupabaseStorageBaseURL,
	)
	h := handler.NewAPIHandler(learningService)

	jwksValidator, err := middleware.NewJWKSValidator(
		cfg.SupabaseJWKSURL,
		cfg.SupabaseJWTIssuer,
		cfg.SupabaseJWTAudience,
	)
	if err != nil {
		log.Fatalf("Failed to initialize JWKS validator: %v", err)
	}

	r := gin.Default()
	r.Use(corsMiddleware())

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello World from Prism Server",
			"service": "Go Backend with Gin",
		})
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")
	api.Use(jwksValidator.Middleware())
	{
		// 学习路径规划模块
		api.POST("/assessment/cold-start/sessions", h.CreateColdStartSession)
		api.POST("/assessment/cold-start/sessions/:sessionId/submit", h.SubmitColdStartSession)
		api.POST("/assessment/homework/grade", h.GradeHomework)
		api.GET("/learning-paths/current", h.GetCurrentLearningPath)
		api.POST("/learning-paths/:pathId/attempts", h.SubmitPracticeAttempt)
		api.GET("/learning-paths/:pathId/prediction", h.GetPrediction)
		api.GET("/knowledge-points", h.ListKnowledgePoints)
		api.GET("/weaknesses", h.ListWeaknesses)

		// 跨场景适配模块
		api.PUT("/scene", h.SwitchScene)
		api.GET("/scene", h.GetCurrentScene)

		// 健康管理模块
		api.GET("/health-alerts", h.ListHealthAlerts)
		api.POST("/health-alerts/:alertId/ack", h.AcknowledgeHealthAlert)
		api.GET("/health-summary", h.GetHealthSummary)

		// 情绪干预模块
		api.POST("/intervention/evaluate", h.EvaluateIntervention)

		// 虚拟助教模块
		api.POST("/chat/sessions", h.CreateChatSession)
		api.GET("/chat/sessions", h.ListChatSessions)
		api.POST("/chat/sessions/:sessionId/messages", h.SendMessage)
		api.GET("/chat/sessions/:sessionId/messages", h.ListChatMessages)

		// 智能笔记模块
		api.POST("/notes", h.CreateNote)
		api.GET("/notes", h.ListNotes)
		api.GET("/notes/:noteId", h.GetNote)
		api.POST("/notes/transcribe", h.TranscribeAudio)
		api.GET("/notes/search", h.SearchNotes)
	}

	log.Printf("Server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	origin := os.Getenv("CORS_ORIGIN")
	if origin == "" {
		origin = "*"
	}
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
