package db

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// ==================== JSON 辅助类型 ====================

// IntSlice 用于将 Go []int 序列化为 PostgreSQL JSONB
type IntSlice []int

func (s IntSlice) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}
	b, err := json.Marshal(s)
	return string(b), err
}

func (s *IntSlice) Scan(src interface{}) error {
	switch v := src.(type) {
	case []byte:
		return json.Unmarshal(v, s)
	case string:
		return json.Unmarshal([]byte(v), s)
	case nil:
		*s = IntSlice{}
		return nil
	default:
		return fmt.Errorf("IntSlice.Scan: 不支持的类型 %T", src)
	}
}

// BoolMap 用于将 Go map[int]bool 序列化为 PostgreSQL JSONB
type BoolMap map[int]bool

func (m BoolMap) Value() (driver.Value, error) {
	if m == nil {
		return "{}", nil
	}
	b, err := json.Marshal(m)
	return string(b), err
}

func (m *BoolMap) Scan(src interface{}) error {
	switch v := src.(type) {
	case []byte:
		return json.Unmarshal(v, m)
	case string:
		return json.Unmarshal([]byte(v), m)
	case nil:
		*m = BoolMap{}
		return nil
	default:
		return fmt.Errorf("BoolMap.Scan: 不支持的类型 %T", src)
	}
}

// JSONMap 用于将 Go map[string]any 序列化为 PostgreSQL JSONB
type JSONMap map[string]any

func (m JSONMap) Value() (driver.Value, error) {
	if m == nil {
		return "{}", nil
	}
	b, err := json.Marshal(m)
	return string(b), err
}

func (m *JSONMap) Scan(src interface{}) error {
	switch v := src.(type) {
	case []byte:
		return json.Unmarshal(v, m)
	case string:
		return json.Unmarshal([]byte(v), m)
	case nil:
		*m = JSONMap{}
		return nil
	default:
		return fmt.Errorf("JSONMap.Scan: 不支持的类型 %T", src)
	}
}

// QuestionContentJSON 用于将 QuestionContent 序列化为 JSONB
type QuestionContentJSON struct {
	Question    string   `json:"question"`
	Options     []string `json:"options"`
	Answer      string   `json:"answer"`
	Explanation string   `json:"explanation"`
}

func (q QuestionContentJSON) Value() (driver.Value, error) {
	b, err := json.Marshal(q)
	return string(b), err
}

func (q *QuestionContentJSON) Scan(src interface{}) error {
	switch v := src.(type) {
	case []byte:
		return json.Unmarshal(v, q)
	case string:
		return json.Unmarshal([]byte(v), q)
	case nil:
		return nil
	default:
		return fmt.Errorf("QuestionContentJSON.Scan: 不支持的类型 %T", src)
	}
}

// OCRStructuredJSON 用于 homework_uploads 的 OCR 结构化结果
type OCRStructuredJSON map[string]any

func (o OCRStructuredJSON) Value() (driver.Value, error) {
	if o == nil {
		return "{}", nil
	}
	b, err := json.Marshal(o)
	return string(b), err
}

func (o *OCRStructuredJSON) Scan(src interface{}) error {
	switch v := src.(type) {
	case []byte:
		return json.Unmarshal(v, o)
	case string:
		return json.Unmarshal([]byte(v), o)
	case nil:
		*o = OCRStructuredJSON{}
		return nil
	default:
		return fmt.Errorf("OCRStructuredJSON.Scan: 不支持的类型 %T", src)
	}
}

// ==================== GORM 模型定义 ====================

// KnowledgePointModel 知识点
type KnowledgePointModel struct {
	ID      int    `gorm:"primaryKey;autoIncrement"`
	Subject string `gorm:"type:varchar(50);index;not null"`
	Title   string `gorm:"type:text;not null"`
	Content string `gorm:"type:text"`
	// Embedding vector(1536) — 由 AI 服务写入，GORM 不直接管理向量列
}

func (KnowledgePointModel) TableName() string { return "knowledge_points" }

// KnowledgeDependencyModel 知识点依赖关系
type KnowledgeDependencyModel struct {
	ID             int `gorm:"primaryKey;autoIncrement"`
	KnowledgeID    int `gorm:"index;not null"`
	PrerequisiteID int `gorm:"index;not null"`
}

func (KnowledgeDependencyModel) TableName() string { return "knowledge_dependencies" }

// QuestionModel 题目
type QuestionModel struct {
	ID               int                 `gorm:"primaryKey;autoIncrement"`
	KnowledgePointID int                 `gorm:"index;not null"`
	Difficulty       float64             `gorm:"type:float;not null;default:0.5"`
	Content          QuestionContentJSON `gorm:"type:jsonb;not null"`
}

func (QuestionModel) TableName() string { return "questions" }

// KnowledgeMasteryModel 用户知识点掌握度
type KnowledgeMasteryModel struct {
	ID              int       `gorm:"primaryKey;autoIncrement"`
	UserID          string    `gorm:"type:uuid;uniqueIndex:idx_mastery_user_knowledge;not null"`
	KnowledgeID     int       `gorm:"uniqueIndex:idx_mastery_user_knowledge;not null"`
	MasteryLevel    float64   `gorm:"type:float;not null;default:0"`
	LastPracticedAt time.Time `gorm:"not null"`
}

func (KnowledgeMasteryModel) TableName() string { return "knowledge_mastery" }

// AssessmentSessionModel 评估会话
type AssessmentSessionModel struct {
	ID               int       `gorm:"primaryKey;autoIncrement"`
	UserID           string    `gorm:"type:uuid;index;not null"`
	Subject          string    `gorm:"type:varchar(50);not null"`
	GoalKnowledgeIDs IntSlice  `gorm:"type:jsonb;not null;default:'[]'"`
	TargetDate       time.Time `gorm:"not null"`
	QuestionIDs      IntSlice  `gorm:"type:jsonb;not null;default:'[]'"`
	Status           string    `gorm:"type:varchar(20);not null;default:'active'"`
	CreatedAt        time.Time `gorm:"autoCreateTime"`
	CompletedAt      *time.Time
}

func (AssessmentSessionModel) TableName() string { return "assessment_sessions" }

// QuestionAttemptModel 答题记录
type QuestionAttemptModel struct {
	ID          int       `gorm:"primaryKey;autoIncrement"`
	UserID      string    `gorm:"type:uuid;index;not null"`
	QuestionID  int       `gorm:"index;not null"`
	KnowledgeID int       `gorm:"index;not null"`
	Source      string    `gorm:"type:varchar(30)"`
	Answer      string    `gorm:"type:text"`
	IsCorrect   bool      `gorm:"not null;default:false"`
	DurationSec int       `gorm:"not null;default:0"`
	AnsweredAt  time.Time `gorm:"not null"`
}

func (QuestionAttemptModel) TableName() string { return "question_attempts" }

// LearningPathModel 学习路径
type LearningPathModel struct {
	ID                int       `gorm:"primaryKey;autoIncrement"`
	UserID            string    `gorm:"type:uuid;index;not null"`
	Subject           string    `gorm:"type:varchar(50);not null"`
	GoalKnowledgeIDs  IntSlice  `gorm:"type:jsonb;not null;default:'[]'"`
	KnowledgeSequence IntSlice  `gorm:"type:jsonb;not null;default:'[]'"`
	CurrentIndex      int       `gorm:"not null;default:0"`
	SkippedNodeIDs    BoolMap   `gorm:"type:jsonb;not null;default:'{}'"`
	TargetDate        time.Time `gorm:"not null"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime"`
}

func (LearningPathModel) TableName() string { return "learning_paths" }

// LearningPathStateModel 学习路径实时状态（连对/连错）
type LearningPathStateModel struct {
	ID            int       `gorm:"primaryKey;autoIncrement"`
	UserID        string    `gorm:"type:uuid;uniqueIndex:idx_path_state_user_path;not null"`
	PathID        int       `gorm:"uniqueIndex:idx_path_state_user_path;not null"`
	CorrectStreak int       `gorm:"not null;default:0"`
	WrongStreak   int       `gorm:"not null;default:0"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime"`
}

func (LearningPathStateModel) TableName() string { return "learning_path_states" }

// PathAdjustmentEventModel 路径调整事件
type PathAdjustmentEventModel struct {
	ID        int       `gorm:"primaryKey;autoIncrement"`
	UserID    string    `gorm:"type:uuid;index;not null"`
	PathID    int       `gorm:"index;not null"`
	EventType string    `gorm:"type:varchar(50);not null"`
	Payload   JSONMap   `gorm:"type:jsonb;not null;default:'{}'"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

func (PathAdjustmentEventModel) TableName() string { return "path_adjustment_events" }

// HomeworkUploadModel 作业上传记录
type HomeworkUploadModel struct {
	ID               int               `gorm:"primaryKey;autoIncrement"`
	UserID           string            `gorm:"type:uuid;index;not null"`
	Subject          string            `gorm:"type:varchar(50)"`
	StoragePath      string            `gorm:"type:text"`
	StoragePublicURL string            `gorm:"type:text"`
	OCRText          string            `gorm:"type:text"`
	OCRStructured    OCRStructuredJSON `gorm:"type:jsonb;default:'{}'"`
	CreatedAt        time.Time         `gorm:"autoCreateTime"`
}

func (HomeworkUploadModel) TableName() string { return "homework_uploads" }

// AssignmentModel 作业批改结果
type AssignmentModel struct {
	ID            int       `gorm:"primaryKey;autoIncrement"`
	UserID        string    `gorm:"type:uuid;index;not null"`
	QuestionID    int       `gorm:"index"`
	UploadID      int       `gorm:"index"`
	AnswerContent string    `gorm:"type:text"`
	IsCorrect     bool      `gorm:"not null;default:false"`
	AIFeedback    string    `gorm:"type:text"`
	KnowledgeIDs  IntSlice  `gorm:"type:jsonb;default:'[]'"`
	Confidence    float64   `gorm:"type:float;default:0"`
	GradingSource string    `gorm:"type:varchar(30)"`
	SubmittedAt   time.Time `gorm:"not null"`
}

func (AssignmentModel) TableName() string { return "assignments" }

// HealthAlertModel 健康预警
type HealthAlertModel struct {
	ID           int       `gorm:"primaryKey;autoIncrement"`
	UserID       string    `gorm:"type:uuid;index;not null"`
	AlertType    string    `gorm:"type:varchar(30);not null"`
	Message      string    `gorm:"type:text;not null"`
	Acknowledged bool      `gorm:"not null;default:false"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
}

func (HealthAlertModel) TableName() string { return "health_alerts" }

// StudyLogModel 学习会话日志
type StudyLogModel struct {
	ID            int       `gorm:"primaryKey;autoIncrement"`
	UserID        string    `gorm:"type:uuid;index;not null"`
	Scene         string    `gorm:"type:varchar(30)"`
	Emotion       string    `gorm:"type:varchar(30)"`
	FocusScore    float64   `gorm:"type:float;default:0"`
	FatigueLevel  float64   `gorm:"type:float;default:0"`
	PostureStatus string    `gorm:"type:varchar(30)"`
	CreatedAt     time.Time `gorm:"autoCreateTime"`
}

func (StudyLogModel) TableName() string { return "study_logs" }

// ChatSessionModel 聊天会话
type ChatSessionModel struct {
	ID        int       `gorm:"primaryKey;autoIncrement"`
	UserID    string    `gorm:"type:uuid;index;not null"`
	Title     string    `gorm:"type:text"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

func (ChatSessionModel) TableName() string { return "chat_sessions" }

// ChatMessageModel 聊天消息
type ChatMessageModel struct {
	ID                  int       `gorm:"primaryKey;autoIncrement"`
	SessionID           int       `gorm:"index;not null"`
	Role                string    `gorm:"type:varchar(20);not null"`
	Content             string    `gorm:"type:text;not null"`
	RelatedKnowledgeIDs IntSlice  `gorm:"type:jsonb;default:'[]'"`
	CreatedAt           time.Time `gorm:"autoCreateTime"`
}

func (ChatMessageModel) TableName() string { return "chat_messages" }

// NoteModel 笔记
type NoteModel struct {
	ID         int       `gorm:"primaryKey;autoIncrement"`
	UserID     string    `gorm:"type:uuid;index;not null"`
	Title      string    `gorm:"type:text;not null"`
	Content    string    `gorm:"type:text"`
	SourceType string    `gorm:"type:varchar(30);default:'manual'"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime"`
	// Embedding vector(1536) — 由 AI 服务写入
}

func (NoteModel) TableName() string { return "notes" }

// NoteKnowledgeLinkModel 笔记与知识点关联
type NoteKnowledgeLinkModel struct {
	ID             int       `gorm:"primaryKey;autoIncrement"`
	NoteID         int       `gorm:"index;not null"`
	KnowledgeID    int       `gorm:"index;not null"`
	RelevanceScore float64   `gorm:"type:float;not null;default:0"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`
}

func (NoteKnowledgeLinkModel) TableName() string { return "note_knowledge_links" }
