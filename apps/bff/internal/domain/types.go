package domain

type KnowledgeNode struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Summary string `json:"summary"`
	Level   int    `json:"level"`
}

type KnowledgeEdge struct {
	Source   string `json:"source"`
	Target   string `json:"target"`
	Relation string `json:"relation"`
}

type KnowledgeOutline struct {
	Topic      string          `json:"topic"`
	Difficulty string          `json:"difficulty"`
	SourceType string          `json:"source_type"`
	Nodes      []KnowledgeNode `json:"nodes"`
	Edges      []KnowledgeEdge `json:"edges"`
}

type NoteSection struct {
	NodeID      string `json:"node_id"`
	Markdown    string `json:"markdown"`
	GeneratedBy string `json:"generated_by"`
	UpdatedAt   string `json:"updated_at"`
}

type VisionState struct {
	FocusLevel string  `json:"focus_level"`
	Emotion    string  `json:"emotion"`
	Posture    string  `json:"posture"`
	Confidence float64 `json:"confidence"`
	SampledAt  string  `json:"sampled_at"`
}

type InterventionEvent struct {
	EventID       string `json:"event_id"`
	TriggerReason string `json:"trigger_reason"`
	TriggerCount  int    `json:"trigger_count"`
	Message       string `json:"message"`
	ActionType    string `json:"action_type"`
	Accepted      *bool  `json:"accepted"`
	CreatedAt     string `json:"created_at"`
}
