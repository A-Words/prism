package model

import "time"

type NodeStatus string

const (
	NodeStatusMastered NodeStatus = "mastered"
	NodeStatusPending  NodeStatus = "pending"
	NodeStatusReview   NodeStatus = "review"
)

type QuestionContent struct {
	Question    string   `json:"question"`
	Options     []string `json:"options"`
	Answer      string   `json:"answer"`
	Explanation string   `json:"explanation"`
}

type KnowledgePoint struct {
	ID      int    `json:"id"`
	Subject string `json:"subject"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

type KnowledgeDependency struct {
	KnowledgeID    int `json:"knowledgeId"`
	PrerequisiteID int `json:"prerequisiteId"`
}

type Question struct {
	ID               int             `json:"id"`
	KnowledgePointID int             `json:"knowledgePointId"`
	Difficulty       float64         `json:"difficulty"`
	Content          QuestionContent `json:"content"`
}

type KnowledgeMastery struct {
	UserID         string
	KnowledgeID    int
	MasteryLevel   float64
	LastPracticedAt time.Time
}

type LearningPath struct {
	ID                int
	UserID            string
	Subject           string
	GoalKnowledgeIDs  []int
	KnowledgeSequence []int
	CurrentIndex      int
	SkippedNodeIDs    map[int]bool
	TargetDate        time.Time
	UpdatedAt         time.Time
}

type AssessmentSession struct {
	ID               int
	UserID           string
	Subject          string
	GoalKnowledgeIDs []int
	TargetDate       time.Time
	QuestionIDs      []int
	Status           string
	CreatedAt        time.Time
	CompletedAt      *time.Time
}

type QuestionAttempt struct {
	ID         int
	UserID     string
	QuestionID int
	KnowledgeID int
	Source     string
	Answer     string
	IsCorrect  bool
	DurationSec int
	AnsweredAt time.Time
}

type HomeworkUpload struct {
	ID             int
	UserID         string
	Subject        string
	StoragePath    string
	StoragePublicURL string
	OCRText        string
	OCRStructured  map[string]any
	CreatedAt      time.Time
}

type Assignment struct {
	ID            int
	UserID        string
	QuestionID    int
	UploadID      int
	AnswerContent string
	IsCorrect     bool
	AIFeedback    string
	KnowledgeIDs  []int
	Confidence    float64
	GradingSource string
	SubmittedAt   time.Time
}

type LearningPathState struct {
	UserID        string
	PathID        int
	CorrectStreak int
	WrongStreak   int
	UpdatedAt     time.Time
}

type PathAdjustmentEvent struct {
	ID        int
	UserID    string
	PathID    int
	EventType string
	Payload   map[string]any
	CreatedAt time.Time
}

type CreateSessionRequest struct {
	Subject          string `json:"subject" binding:"required"`
	GoalKnowledgeIDs []int  `json:"goalKnowledgeIds" binding:"required"`
	TargetDate       string `json:"targetDate" binding:"required"`
}

type AssessmentQuestionDTO struct {
	ID          int      `json:"id"`
	KnowledgeID int      `json:"knowledgeId"`
	Difficulty  float64  `json:"difficulty"`
	Question    string   `json:"question"`
	Options     []string `json:"options"`
}

type CreateSessionResponse struct {
	SessionID  int                     `json:"sessionId"`
	Subject    string                  `json:"subject"`
	TargetDate string                  `json:"targetDate"`
	Questions  []AssessmentQuestionDTO `json:"questions"`
}

type AnswerSubmission struct {
	QuestionID  int    `json:"questionId" binding:"required"`
	Answer      string `json:"answer" binding:"required"`
	DurationSec int    `json:"durationSec" binding:"required"`
}

type SubmitColdStartRequest struct {
	Answers []AnswerSubmission `json:"answers" binding:"required"`
}

type WeakPointDTO struct {
	KnowledgeID int     `json:"knowledgeId"`
	Title       string  `json:"title"`
	WeakScore   float64 `json:"weakScore"`
	Reason      string  `json:"reason"`
}

type PathNodeDTO struct {
	ID                     int        `json:"id"`
	Title                  string     `json:"title"`
	Subject                string     `json:"subject"`
	Status                 NodeStatus `json:"status"`
	Mastery                float64    `json:"mastery"`
	PrerequisiteIDs        []int      `json:"prerequisiteIds"`
	IsCurrent              bool       `json:"isCurrent"`
	IsSkipped              bool       `json:"isSkipped"`
	PredictedImproveProb   float64    `json:"predictedImproveProb"`
}

type PathEdgeDTO struct {
	From int `json:"from"`
	To   int `json:"to"`
}

type PathAdjustmentEventDTO struct {
	EventType string         `json:"eventType"`
	Payload   map[string]any `json:"payload"`
	CreatedAt string         `json:"createdAt"`
}

type LearningPathDTO struct {
	PathID              int                      `json:"pathId"`
	Subject             string                   `json:"subject"`
	TargetDate          string                   `json:"targetDate"`
	CurrentIndex        int                      `json:"currentIndex"`
	Nodes               []PathNodeDTO            `json:"nodes"`
	Edges               []PathEdgeDTO            `json:"edges"`
	OverallImproveProb  float64                  `json:"overallImproveProb"`
	AdjustmentEvents    []PathAdjustmentEventDTO `json:"adjustmentEvents,omitempty"`
}

type ColdStartSubmitResponse struct {
	WeakPoints    []WeakPointDTO `json:"weakPoints"`
	LearningPath  LearningPathDTO `json:"learningPath"`
}

type PracticeAttemptPayload struct {
	QuestionID  int    `json:"questionId" binding:"required"`
	KnowledgeID int    `json:"knowledgeId" binding:"required"`
	Answer      string `json:"answer" binding:"required"`
	DurationSec int    `json:"durationSec" binding:"required"`
	Source      string `json:"source" binding:"required"`
}

type NodeProbabilityDTO struct {
	KnowledgeID  int     `json:"knowledgeId"`
	Title        string  `json:"title"`
	Probability  float64 `json:"probability"`
}

type PredictionDTO struct {
	OverallProbability float64              `json:"overallProbability"`
	NodeProbabilities  []NodeProbabilityDTO `json:"nodeProbabilities"`
	Rationale          string               `json:"rationale"`
}

type HomeworkGradedItemDTO struct {
	Question      string  `json:"question"`
	StudentAnswer string  `json:"studentAnswer"`
	CorrectAnswer string  `json:"correctAnswer"`
	IsCorrect     bool    `json:"isCorrect"`
	KnowledgeIDs  []int   `json:"knowledgeIds"`
	Feedback      string  `json:"feedback"`
	Confidence    float64 `json:"confidence"`
}

type HomeworkGradeResponse struct {
	UploadID      int                     `json:"uploadId"`
	ImageURL      string                  `json:"imageUrl"`
	OCRText       string                  `json:"ocrText"`
	GradedItems   []HomeworkGradedItemDTO `json:"gradedItems"`
	WeakPoints    []WeakPointDTO          `json:"weakPoints"`
}

type KnowledgePointDTO struct {
	ID      int    `json:"id"`
	Subject string `json:"subject"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

type AIVisionOCRRequest struct {
	Image string `json:"image"`
	Task  string `json:"task"`
}

type AIVisionOCRResponse struct {
	Text       string         `json:"text"`
	Structured map[string]any `json:"structured"`
}

type AIGradeHomeworkRequest struct {
	Subject string `json:"subject"`
	OCRText string `json:"ocrText"`
}

type AIGradeHomeworkItem struct {
	Question      string  `json:"question"`
	StudentAnswer string  `json:"studentAnswer"`
	CorrectAnswer string  `json:"correctAnswer"`
	IsCorrect     bool    `json:"isCorrect"`
	KnowledgeIDs  []int   `json:"knowledgeIds"`
	Feedback      string  `json:"feedback"`
	Confidence    float64 `json:"confidence"`
}

type AIGradeHomeworkResponse struct {
	Items []AIGradeHomeworkItem `json:"items"`
}

type AIPredictNode struct {
	KnowledgeID  int     `json:"knowledgeId"`
	Title        string  `json:"title"`
	BaseProbability float64 `json:"baseProbability"`
}

type AIPredictOutcomeRequest struct {
	Subject         string          `json:"subject"`
	OverallBaseProb float64         `json:"overallBaseProb"`
	Nodes           []AIPredictNode `json:"nodes"`
}

type AIPredictOutcomeResponse struct {
	CalibrationFactor float64 `json:"calibrationFactor"`
	Rationale         string  `json:"rationale"`
}

// ==================== 场景适配模块 ====================

type SceneType string

const (
	SceneClassroom SceneType = "classroom"
	SceneSelfStudy SceneType = "self-study"
	SceneExamPrep  SceneType = "exam-prep"
)

// ValidScene 检查场景值是否合法
func ValidScene(s string) bool {
	switch SceneType(s) {
	case SceneClassroom, SceneSelfStudy, SceneExamPrep:
		return true
	}
	return false
}

type SceneStrategy struct {
	PathMode          string `json:"pathMode"`
	InterventionLevel string `json:"interventionLevel"`
	TutorMode         string `json:"tutorMode"`
}

// SceneStrategyTemplates 场景策略模板（可配置，避免硬编码散落在前端）
var SceneStrategyTemplates = map[SceneType]SceneStrategy{
	SceneClassroom: {PathMode: "balanced", InterventionLevel: "low", TutorMode: "hint_first"},
	SceneSelfStudy: {PathMode: "balanced", InterventionLevel: "medium", TutorMode: "mixed"},
	SceneExamPrep:  {PathMode: "exam-sprint", InterventionLevel: "high", TutorMode: "mixed"},
}

type SwitchSceneRequest struct {
	Scene string `json:"scene" binding:"required"`
}

type SwitchSceneResponse struct {
	CurrentScene SceneType     `json:"currentScene"`
	Strategy     SceneStrategy `json:"strategy"`
	EffectiveAt  string        `json:"effectiveAt"`
}

type GetCurrentSceneResponse struct {
	CurrentScene SceneType     `json:"currentScene"`
	Strategy     SceneStrategy `json:"strategy"`
}

// ==================== 健康管理模块 ====================

type HealthAlertType string

const (
	HealthAlertFatigue     HealthAlertType = "fatigue"
	HealthAlertPosture     HealthAlertType = "posture"
	HealthAlertBreakNeeded HealthAlertType = "break_needed"
	HealthAlertStress      HealthAlertType = "stress"
)

type HealthAlert struct {
	ID           int             `json:"id"`
	UserID       string          `json:"-"`
	AlertType    HealthAlertType `json:"alertType"`
	Message      string          `json:"message"`
	Acknowledged bool            `json:"acknowledged"`
	CreatedAt    time.Time       `json:"createdAt"`
	UpdatedAt    time.Time       `json:"updatedAt"`
}

type HealthAlertDTO struct {
	ID           int    `json:"id"`
	AlertType    string `json:"alertType"`
	Message      string `json:"message"`
	Acknowledged bool   `json:"acknowledged"`
	CreatedAt    string `json:"createdAt"`
}

type AckAlertResponse struct {
	ID           int    `json:"id"`
	Acknowledged bool   `json:"acknowledged"`
	UpdatedAt    string `json:"updatedAt"`
}

type StudyLog struct {
	ID            int       `json:"id"`
	UserID        string    `json:"-"`
	Scene         string    `json:"scene"`
	Emotion       string    `json:"emotion"`
	FocusScore    float64   `json:"focusScore"`
	FatigueLevel  float64   `json:"fatigueLevel"`
	PostureStatus string    `json:"postureStatus"`
	CreatedAt     time.Time `json:"createdAt"`
}

type TrendPoint struct {
	Ts    string  `json:"ts"`
	Value float64 `json:"value"`
}

type PostureDistribution struct {
	Status string  `json:"status"`
	Ratio  float64 `json:"ratio"`
}

type HealthSummaryResponse struct {
	FocusTrend           []TrendPoint          `json:"focusTrend"`
	FatigueTrend         []TrendPoint          `json:"fatigueTrend"`
	PostureDistribution  []PostureDistribution `json:"postureDistribution"`
}

// ==================== 情绪干预模块 ====================

type EmotionType string

const (
	EmotionFocused    EmotionType = "focused"
	EmotionConfused   EmotionType = "confused"
	EmotionAnxious    EmotionType = "anxious"
	EmotionFrustrated EmotionType = "frustrated"
	EmotionTired      EmotionType = "tired"
)

type InterventionAction string

const (
	InterventionAdjustDifficulty InterventionAction = "adjust_difficulty"
	InterventionEncourage        InterventionAction = "encourage"
	InterventionSuggestBreak     InterventionAction = "suggest_break"
	InterventionPostureReminder  InterventionAction = "posture_reminder"
)

type InterventionEvalRequest struct {
	Emotion       string  `json:"emotion" binding:"required"`
	FocusScore    float64 `json:"focusScore"`
	FatigueLevel  float64 `json:"fatigueLevel"`
	PostureStatus string  `json:"postureStatus"`
	Scene         string  `json:"scene"`
}

type InterventionEvalResponse struct {
	Action  InterventionAction `json:"action"`
	Message string             `json:"message"`
	Urgency string             `json:"urgency"`
}

// ==================== AI 情绪/姿态分析 ====================

type AIEmotionAnalyzeRequest struct {
	Image string `json:"image"`
	Audio string `json:"audio,omitempty"`
}

type AIEmotionAnalyzeResponse struct {
	Emotion      string  `json:"emotion"`
	Confidence   float64 `json:"confidence"`
	FocusScore   float64 `json:"focusScore"`
	FatigueLevel float64 `json:"fatigueLevel"`
}

type AIPoseAnalyzeRequest struct {
	Image string `json:"image"`
}

type AIPoseAnalyzeResponse struct {
	PostureStatus string         `json:"postureStatus"`
	Confidence    float64        `json:"confidence"`
	Details       map[string]any `json:"details"`
}

// ==================== 虚拟助教模块 ====================

type ChatSession struct {
	ID        int       `json:"id"`
	UserID    string    `json:"-"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ChatMessage struct {
	ID                  int       `json:"id"`
	SessionID           int       `json:"sessionId"`
	Role                string    `json:"role"`
	Content             string    `json:"content"`
	RelatedKnowledgeIDs []int     `json:"relatedKnowledgeIds,omitempty"`
	CreatedAt           time.Time `json:"createdAt"`
}

type ChatSessionDTO struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type ChatMessageDTO struct {
	ID                  int    `json:"id"`
	Role                string `json:"role"`
	Content             string `json:"content"`
	RelatedKnowledgeIDs []int  `json:"relatedKnowledgeIds,omitempty"`
	CreatedAt           string `json:"createdAt"`
}

type CreateChatSessionRequest struct {
	Title string `json:"title"`
}

type SendMessageRequest struct {
	Content string `json:"content" binding:"required"`
	Scene   string `json:"scene,omitempty"`
}

// ==================== AI 对话 ====================

type AIChatCompletionRequest struct {
	Messages         []AIChatMessage `json:"messages"`
	Scene            string          `json:"scene,omitempty"`
	KnowledgeContext string          `json:"knowledgeContext,omitempty"`
	Stream           bool            `json:"stream"`
}

type AIChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AIChatCompletionResponse struct {
	Content             string `json:"content"`
	RelatedKnowledgeIDs []int  `json:"relatedKnowledgeIds,omitempty"`
}

// ==================== 智能笔记模块 ====================

type NoteSourceType string

const (
	NoteSourceManual        NoteSourceType = "manual"
	NoteSourceVoice         NoteSourceType = "voice"
	NoteSourceOCR           NoteSourceType = "ocr"
	NoteSourceAutoGenerated NoteSourceType = "auto-generated"
)

type Note struct {
	ID         int            `json:"id"`
	UserID     string         `json:"-"`
	Title      string         `json:"title"`
	Content    string         `json:"content"`
	SourceType NoteSourceType `json:"sourceType"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
}

type NoteKnowledgeLink struct {
	NoteID         int
	KnowledgeID    int
	RelevanceScore float64
}

type NoteDTO struct {
	ID         int    `json:"id"`
	Title      string `json:"title"`
	Content    string `json:"content"`
	SourceType string `json:"sourceType"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

type CreateNoteRequest struct {
	Title      string `json:"title" binding:"required"`
	Content    string `json:"content" binding:"required"`
	SourceType string `json:"sourceType"`
}

type OCRNoteResponse struct {
	Note                NoteDTO        `json:"note"`
	Structured          map[string]any `json:"structured"`
	RelatedKnowledgeIDs []int          `json:"relatedKnowledgeIds"`
}

// ==================== AI 笔记相关 ====================

type AITranscribeRequest struct {
	Audio  string `json:"audio"`
	Format string `json:"format,omitempty"`
}

type AITranscribeResponse struct {
	Text string `json:"text"`
}

type AIEmbedRequest struct {
	Text string `json:"text"`
}

type AIEmbedResponse struct {
	Embedding []float64 `json:"embedding"`
}

type AISearchRequest struct {
	Query string `json:"query"`
	TopK  int    `json:"topK"`
}

type AISearchResult struct {
	ID      int     `json:"id"`
	Title   string  `json:"title"`
	Content string  `json:"content"`
	Score   float64 `json:"score"`
	Source  string  `json:"source,omitempty"`
}

type AISearchResponse struct {
	Results []AISearchResult `json:"results"`
}

// ==================== WebSocket 事件信封 ====================

type WSEnvelope struct {
	Event     string `json:"event"`
	Timestamp string `json:"timestamp"`
	TraceID   string `json:"traceId"`
	SessionID string `json:"sessionId,omitempty"`
	Payload   any    `json:"payload"`
}
