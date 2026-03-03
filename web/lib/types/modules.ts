// ——— 跨场景适配 ———

export type SceneType = "classroom" | "self-study" | "exam-prep"

export type SceneStrategy = {
  pathMode: string
  interventionLevel: string
  tutorMode: string
}

export type SwitchSceneResponse = {
  currentScene: SceneType
  strategy: SceneStrategy
}

export type GetCurrentSceneResponse = {
  currentScene: SceneType
  strategy: SceneStrategy
}

// ——— 健康管理 ———

export type HealthAlertType = "fatigue" | "posture" | "break_needed" | "stress"

export type HealthAlertDTO = {
  id: number
  userId: string
  alertType: HealthAlertType
  message: string
  acknowledged: boolean
  createdAt: string
}

export type AckAlertResponse = {
  acknowledged: boolean
}

export type TrendPoint = {
  ts: string
  value: number
}

export type PostureDistribution = {
  status: string
  ratio: number
}

export type HealthSummaryResponse = {
  focusTrend: TrendPoint[]
  fatigueTrend: TrendPoint[]
  postureDistribution: PostureDistribution[]
}

// ——— 情绪干预 ———

export type EmotionType = "focused" | "confused" | "anxious" | "frustrated" | "tired"

export type InterventionAction = "adjust_difficulty" | "encourage" | "suggest_break" | "posture_reminder"

export type InterventionEvalRequest = {
  emotion: EmotionType
  focusScore: number
  fatigueLevel: number
  postureStatus: string
  scene: SceneType
}

export type InterventionEvalResponse = {
  action: InterventionAction
  message: string
  urgency: string
}

// ——— 虚拟助教 ———

export type ChatSessionDTO = {
  id: number
  userId: string
  title: string
  createdAt: string
  updatedAt: string
}

export type ChatMessageDTO = {
  id: number
  sessionId: number
  role: "user" | "assistant"
  content: string
  relatedKnowledgeIds: number[]
  createdAt: string
}

export type CreateChatSessionRequest = {
  title: string
}

export type SendMessageRequest = {
  content: string
  scene?: SceneType
}

// ——— 智能笔记 ———

export type NoteSourceType = "manual" | "voice" | "ocr" | "auto-generated"

export type NoteDTO = {
  id: number
  userId: string
  title: string
  content: string
  sourceType: NoteSourceType
  createdAt: string
  updatedAt: string
}

export type CreateNoteRequest = {
  title: string
  content: string
  sourceType: NoteSourceType
}

export type TranscribeResponse = {
  text: string
}

export type SearchResultItem = {
  id: number
  title: string
  content: string
  score: number
}

export type SearchResponse = {
  results: SearchResultItem[]
}

export type OCRNoteResponse = {
  note: NoteDTO
  structured: Record<string, unknown>
  relatedKnowledgeIds: number[]
}
