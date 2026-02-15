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
