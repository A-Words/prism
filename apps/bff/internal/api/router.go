package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"prism/apps/bff/internal/auth"
	"prism/apps/bff/internal/domain"
	"prism/apps/bff/internal/intervention"
	"prism/apps/bff/internal/provider"
	"prism/apps/bff/internal/storage"
)

type Dependencies struct {
	Store          *storage.SQLiteStore
	Providers      *provider.Router
	Auth           *auth.Verifier
	Interventions  *intervention.Engine
	PrivacyVersion string
}

type handler struct {
	deps Dependencies
}

type envelopeErr struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	Retryable bool           `json:"retryable"`
	Details   map[string]any `json:"details,omitempty"`
}

type requestContextKey string

const (
	requestIDKey requestContextKey = "request_id"
	userIDKey    requestContextKey = "user_id"
)

var (
	registerMetricsOnce = false
	apiLatency          = prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: "prism",
		Name:      "api_latency_ms",
		Help:      "API latency in milliseconds",
		Buckets:   []float64{50, 100, 250, 500, 1000, 3000, 8000},
	}, []string{"route", "method"})
	apiErrors = prometheus.NewCounterVec(prometheus.CounterOpts{
		Namespace: "prism",
		Name:      "api_errors_total",
		Help:      "API errors total",
	}, []string{"route", "code"})
	syncQueueDepth = prometheus.NewGauge(prometheus.GaugeOpts{
		Namespace: "prism",
		Name:      "sync_queue_depth",
		Help:      "Current pending sync queue depth",
	})
)

func NewRouter(deps Dependencies) http.Handler {
	if !registerMetricsOnce {
		prometheus.MustRegister(apiLatency, apiErrors, syncQueueDepth)
		registerMetricsOnce = true
	}

	h := &handler{deps: deps}
	r := chi.NewRouter()
	r.Use(h.requestID)
	r.Use(h.cors)
	r.Use(h.metrics)

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	r.Handle("/metrics", promhttp.Handler())

	r.Route("/api/v1", func(api chi.Router) {
		api.Post("/explore/text", h.withAuth(h.exploreText))
		api.Post("/explore/image", h.withAuth(h.exploreImage))
		api.Get("/notes/{nodeId}", h.withAuth(h.getNote))
		api.Put("/notes/{nodeId}", h.withAuth(h.putNote))
		api.Get("/notes/{nodeId}/stream", h.withAuth(h.streamNote))
		api.Post("/vision/analyze", h.withAuth(h.analyzeVision))
		api.Post("/intervention/evaluate", h.withAuth(h.evaluateIntervention))
		api.Post("/sync/push", h.withAuth(h.syncPush))
		api.Post("/sync/pull", h.withAuth(h.syncPull))
	})

	return r
}

func (h *handler) exploreText(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Topic    string `json:"topic"`
		Language string `json:"language"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Topic) == "" {
		h.error(w, r, http.StatusBadRequest, "E_BAD_REQUEST", "topic is required", false, nil)
		return
	}

	outline, err := h.deps.Providers.Text.GenerateOutline(r.Context(), provider.TextExploreInput{
		Topic: req.Topic, Language: req.Language,
	})
	if err != nil {
		h.error(w, r, http.StatusServiceUnavailable, "E_PROVIDER_UNAVAILABLE", err.Error(), true, nil)
		return
	}
	h.success(w, r, http.StatusOK, outline, nil)
}

func (h *handler) exploreImage(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(4 << 20); err != nil {
		h.error(w, r, http.StatusBadRequest, "E_BAD_REQUEST", "invalid multipart form", false, nil)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		h.error(w, r, http.StatusBadRequest, "E_BAD_REQUEST", "file is required", false, nil)
		return
	}
	_ = file.Close()

	outline, err := h.deps.Providers.Text.GenerateOutline(r.Context(), provider.TextExploreInput{
		Topic: header.Filename, Language: "zh-CN", FromImage: true,
	})
	if err != nil {
		h.error(w, r, http.StatusServiceUnavailable, "E_PROVIDER_UNAVAILABLE", err.Error(), true, nil)
		return
	}
	h.success(w, r, http.StatusOK, outline, nil)
}

func (h *handler) getNote(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "nodeId")
	userID := userIDFromCtx(r.Context())
	note, err := h.deps.Store.GetNote(userID, nodeID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			h.error(w, r, http.StatusNotFound, "E_NOT_FOUND", "note not found", false, nil)
			return
		}
		h.error(w, r, http.StatusInternalServerError, "E_INTERNAL", "failed to query note", true, nil)
		return
	}
	h.success(w, r, http.StatusOK, note, nil)
}

func (h *handler) putNote(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "nodeId")
	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		idempotencyKey = uuid.NewString()
	}
	var req struct {
		Markdown string `json:"markdown"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.error(w, r, http.StatusBadRequest, "E_BAD_REQUEST", "invalid request body", false, nil)
		return
	}
	if strings.TrimSpace(req.Markdown) == "" {
		h.error(w, r, http.StatusBadRequest, "E_BAD_REQUEST", "markdown is required", false, nil)
		return
	}
	userID := userIDFromCtx(r.Context())
	note, err := h.deps.Store.UpsertNote(userID, nodeID, req.Markdown, "user", idempotencyKey)
	if err != nil {
		h.error(w, r, http.StatusInternalServerError, "E_INTERNAL", "failed to save note", true, nil)
		return
	}
	if count, err := h.deps.Store.PendingQueueCount(); err == nil {
		syncQueueDepth.Set(float64(count))
	}
	h.success(w, r, http.StatusOK, note, map[string]any{"local_saved": true})
}

func (h *handler) streamNote(w http.ResponseWriter, r *http.Request) {
	nodeID := chi.URLParam(r, "nodeId")
	chunks, err := h.deps.Providers.Tutor.GenerateNoteStream(r.Context(), provider.TutorStreamInput{NodeID: nodeID})
	if err != nil {
		h.error(w, r, http.StatusServiceUnavailable, "E_PROVIDER_UNAVAILABLE", err.Error(), true, nil)
		return
	}

	lastID, _ := strconv.Atoi(r.Header.Get("Last-Event-ID"))

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	flusher, ok := w.(http.Flusher)
	if !ok {
		h.error(w, r, http.StatusInternalServerError, "E_INTERNAL", "stream unsupported", false, nil)
		return
	}

	for i, chunk := range chunks {
		id := i + 1
		if id <= lastID {
			continue
		}
		_, _ = fmt.Fprintf(w, "id: %d\n", id)
		_, _ = fmt.Fprintf(w, "event: message\n")
		_, _ = fmt.Fprintf(w, "data: %s\n\n", strconv.Quote(chunk))
		flusher.Flush()
		time.Sleep(80 * time.Millisecond)
	}
	_, _ = fmt.Fprintf(w, "event: heartbeat\ndata: {\"ok\":true}\n\n")
	_, _ = fmt.Fprintf(w, "event: done\ndata: {\"completed\":true}\n\n")
	flusher.Flush()
}

func (h *handler) analyzeVision(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ConsentEnabled bool   `json:"consent_enabled"`
		FrameDataURL   string `json:"frame_data_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.error(w, r, http.StatusBadRequest, "E_BAD_REQUEST", "invalid request body", false, nil)
		return
	}
	if !req.ConsentEnabled {
		h.error(w, r, http.StatusForbidden, "E_PRIVACY_CONSENT_REQUIRED", "consent required", false, map[string]any{
			"privacy_ack_version": h.deps.PrivacyVersion,
		})
		return
	}

	vision, err := h.deps.Providers.Vision.AnalyzeFrame(r.Context(), provider.VisionFrameInput{
		ConsentEnabled: true,
		FrameDataURL:   req.FrameDataURL,
	})
	if err != nil {
		h.error(w, r, http.StatusServiceUnavailable, "E_PROVIDER_UNAVAILABLE", err.Error(), true, nil)
		return
	}
	_ = h.deps.Store.SaveVision(userIDFromCtx(r.Context()), vision)
	h.success(w, r, http.StatusOK, vision, nil)
}

func (h *handler) evaluateIntervention(w http.ResponseWriter, r *http.Request) {
	var req struct {
		VisionState domain.VisionState `json:"vision_state"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.error(w, r, http.StatusBadRequest, "E_BAD_REQUEST", "invalid request body", false, nil)
		return
	}

	userID := userIDFromCtx(r.Context())
	trigger, reason, count := h.deps.Interventions.Record(userID, req.VisionState)
	if !trigger {
		h.success(w, r, http.StatusOK, nil, nil)
		return
	}

	event, err := h.deps.Providers.Tutor.GenerateHint(r.Context(), provider.TutorHintInput{
		TriggerReason: reason,
		TriggerCount:  count,
	})
	if err != nil {
		h.error(w, r, http.StatusServiceUnavailable, "E_PROVIDER_UNAVAILABLE", err.Error(), true, nil)
		return
	}
	if err := h.deps.Store.SaveIntervention(userID, event); err != nil {
		h.error(w, r, http.StatusInternalServerError, "E_INTERNAL", "failed to save intervention", true, nil)
		return
	}
	h.success(w, r, http.StatusOK, event, nil)
}

func (h *handler) syncPush(w http.ResponseWriter, r *http.Request) {
	pushed, err := h.deps.Store.PushQueueBatch(100)
	if err != nil {
		h.error(w, r, http.StatusInternalServerError, "E_INTERNAL", "sync push failed", true, nil)
		return
	}
	if count, err := h.deps.Store.PendingQueueCount(); err == nil {
		syncQueueDepth.Set(float64(count))
	}
	h.success(w, r, http.StatusOK, map[string]int{"pushed": pushed}, nil)
}

func (h *handler) syncPull(w http.ResponseWriter, r *http.Request) {
	h.success(w, r, http.StatusOK, map[string]int{"pulled": 0}, nil)
}

func (h *handler) requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rid := r.Header.Get("X-Request-ID")
		if rid == "" {
			rid = "req_" + uuid.NewString()
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey, rid)))
	})
}

func (h *handler) withAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r.Header.Get("Authorization"))
		userID, err := h.deps.Auth.Verify(token)
		if err != nil {
			code := "TOKEN_INVALID"
			httpCode := http.StatusUnauthorized
			if err.Error() == "TOKEN_EXPIRED" {
				code = "TOKEN_EXPIRED"
			}
			h.error(w, r, httpCode, code, "authentication failed", false, nil)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userIDKey, userID)))
	}
}

func (h *handler) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Request-ID")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type responseRecorder struct {
	http.ResponseWriter
	status int
}

func (r *responseRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (h *handler) metrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		route := r.URL.Path
		rr := &responseRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rr, r)
		apiLatency.WithLabelValues(route, r.Method).Observe(float64(time.Since(start).Milliseconds()))
		if rr.status >= 400 {
			apiErrors.WithLabelValues(route, strconv.Itoa(rr.status)).Inc()
		}
	})
}

func (h *handler) success(w http.ResponseWriter, r *http.Request, status int, data any, meta map[string]any) {
	payload := map[string]any{
		"request_id": requestIDFromCtx(r.Context()),
		"data":       data,
	}
	if meta != nil {
		payload["meta"] = meta
	}
	writeJSON(w, status, payload)
}

func (h *handler) error(w http.ResponseWriter, r *http.Request, status int, code, message string, retryable bool, details map[string]any) {
	payload := map[string]any{
		"request_id": requestIDFromCtx(r.Context()),
		"error": envelopeErr{
			Code:      code,
			Message:   message,
			Retryable: retryable,
			Details:   details,
		},
	}
	writeJSON(w, status, payload)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func requestIDFromCtx(ctx context.Context) string {
	if value, ok := ctx.Value(requestIDKey).(string); ok {
		return value
	}
	return "req_unknown"
}

func userIDFromCtx(ctx context.Context) string {
	if value, ok := ctx.Value(userIDKey).(string); ok && value != "" {
		return value
	}
	return "dev-user"
}

func bearerToken(header string) string {
	parts := strings.SplitN(header, " ", 2)
	if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
		return strings.TrimSpace(parts[1])
	}
	return ""
}
