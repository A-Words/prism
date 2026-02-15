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
