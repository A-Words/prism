import {
  ColdStartSubmitResponse,
  CreateSessionResponse,
  KnowledgePointDTO,
  LearningPathDTO,
  PracticeAttemptPayload,
  PredictionDTO,
  HomeworkGradeResponse,
  WeakPointDTO,
  AnswerSubmission,
} from "@/lib/types/learning-path"
import {
  SwitchSceneResponse,
  GetCurrentSceneResponse,
  SceneType,
  HealthAlertDTO,
  AckAlertResponse,
  HealthSummaryResponse,
  InterventionEvalRequest,
  InterventionEvalResponse,
  ChatSessionDTO,
  ChatMessageDTO,
  NoteDTO,
  CreateNoteRequest,
  TranscribeResponse,
  SearchResponse,
} from "@/lib/types/modules"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1"

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : `API request failed: ${response.status}`
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

export async function createColdStartSession(
  token: string,
  payload: { subject: string; goalKnowledgeIds: number[]; targetDate: string }
): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>(
    "/assessment/cold-start/sessions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    token
  )
}

export async function submitColdStartSession(
  token: string,
  sessionId: number,
  answers: AnswerSubmission[]
): Promise<ColdStartSubmitResponse> {
  return request<ColdStartSubmitResponse>(
    `/assessment/cold-start/sessions/${sessionId}/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    },
    token
  )
}

export async function gradeHomework(token: string, formData: FormData): Promise<HomeworkGradeResponse> {
  return request<HomeworkGradeResponse>(
    "/assessment/homework/grade",
    {
      method: "POST",
      body: formData,
    },
    token
  )
}

export async function getCurrentLearningPath(token: string, subject: string): Promise<LearningPathDTO> {
  return request<LearningPathDTO>(`/learning-paths/current?subject=${encodeURIComponent(subject)}`, { method: "GET" }, token)
}

export async function submitPracticeAttempt(
  token: string,
  pathId: number,
  payload: PracticeAttemptPayload
): Promise<LearningPathDTO> {
  return request<LearningPathDTO>(
    `/learning-paths/${pathId}/attempts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    token
  )
}

export async function getPrediction(token: string, pathId: number): Promise<PredictionDTO> {
  return request<PredictionDTO>(`/learning-paths/${pathId}/prediction`, { method: "GET" }, token)
}

export async function getKnowledgePoints(token: string, subject: string): Promise<KnowledgePointDTO[]> {
  const data = await request<{ items: KnowledgePointDTO[] }>(`/knowledge-points?subject=${encodeURIComponent(subject)}`, { method: "GET" }, token)
  return data.items
}

export async function getWeaknesses(token: string, subject: string): Promise<WeakPointDTO[]> {
  const data = await request<{ items: WeakPointDTO[] }>(`/weaknesses?subject=${encodeURIComponent(subject)}`, { method: "GET" }, token)
  return data.items
}


// ——— 跨场景适配 ———

export async function switchScene(token: string, scene: SceneType): Promise<SwitchSceneResponse> {
  return request<SwitchSceneResponse>(
    "/scene",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene }),
    },
    token
  )
}

export async function getCurrentScene(token: string): Promise<GetCurrentSceneResponse> {
  return request<GetCurrentSceneResponse>("/scene", { method: "GET" }, token)
}

// ——— 健康管理 ———

export async function getHealthAlerts(token: string, acknowledged?: boolean): Promise<HealthAlertDTO[]> {
  const params = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : ""
  const data = await request<{ alerts: HealthAlertDTO[] }>(`/health-alerts${params}`, { method: "GET" }, token)
  return data.alerts
}

export async function acknowledgeHealthAlert(token: string, alertId: number): Promise<AckAlertResponse> {
  return request<AckAlertResponse>(
    `/health-alerts/${alertId}/ack`,
    { method: "POST" },
    token
  )
}

export async function getHealthSummary(token: string): Promise<HealthSummaryResponse> {
  return request<HealthSummaryResponse>("/health-summary", { method: "GET" }, token)
}

// ——— 情绪干预 ———

export async function evaluateIntervention(
  token: string,
  payload: InterventionEvalRequest
): Promise<InterventionEvalResponse> {
  return request<InterventionEvalResponse>(
    "/intervention/evaluate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    token
  )
}

// ——— 虚拟助教 ———

export async function createChatSession(token: string, title: string): Promise<ChatSessionDTO> {
  return request<ChatSessionDTO>(
    "/chat/sessions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    },
    token
  )
}

export async function listChatSessions(token: string): Promise<ChatSessionDTO[]> {
  const data = await request<{ sessions: ChatSessionDTO[] }>("/chat/sessions", { method: "GET" }, token)
  return data.sessions
}

export async function sendChatMessage(
  token: string,
  sessionId: number,
  content: string,
  scene?: SceneType
): Promise<ChatMessageDTO> {
  return request<ChatMessageDTO>(
    `/chat/sessions/${sessionId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, scene }),
    },
    token
  )
}

export async function listChatMessages(token: string, sessionId: number): Promise<ChatMessageDTO[]> {
  const data = await request<{ messages: ChatMessageDTO[] }>(`/chat/sessions/${sessionId}/messages`, { method: "GET" }, token)
  return data.messages
}

// ——— 智能笔记 ———

export async function createNote(token: string, payload: CreateNoteRequest): Promise<NoteDTO> {
  return request<NoteDTO>(
    "/notes",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    token
  )
}

export async function listNotes(token: string): Promise<NoteDTO[]> {
  const data = await request<{ notes: NoteDTO[] }>("/notes", { method: "GET" }, token)
  return data.notes
}

export async function getNote(token: string, noteId: number): Promise<NoteDTO> {
  return request<NoteDTO>(`/notes/${noteId}`, { method: "GET" }, token)
}

export async function transcribeAudio(token: string, audio: string, format: string): Promise<TranscribeResponse> {
  return request<TranscribeResponse>(
    "/notes/transcribe",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio, format }),
    },
    token
  )
}

export async function searchNotes(token: string, query: string, topK?: number): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query })
  if (topK) params.set("topK", String(topK))
  return request<SearchResponse>(`/notes/search?${params.toString()}`, { method: "GET" }, token)
}
