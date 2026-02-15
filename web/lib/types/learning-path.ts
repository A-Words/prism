export type NodeStatus = "mastered" | "pending" | "review"

export type AssessmentQuestion = {
  id: number
  knowledgeId: number
  difficulty: number
  question: string
  options: string[]
}

export type CreateSessionResponse = {
  sessionId: number
  subject: string
  targetDate: string
  questions: AssessmentQuestion[]
}

export type AnswerSubmission = {
  questionId: number
  answer: string
  durationSec: number
}

export type WeakPointDTO = {
  knowledgeId: number
  title: string
  weakScore: number
  reason: string
}

export type PathNodeDTO = {
  id: number
  title: string
  subject: string
  status: NodeStatus
  mastery: number
  prerequisiteIds: number[]
  isCurrent: boolean
  isSkipped: boolean
  predictedImproveProb: number
}

export type PathEdgeDTO = {
  from: number
  to: number
}

export type PathAdjustmentEventDTO = {
  eventType: string
  payload: Record<string, unknown>
  createdAt: string
}

export type LearningPathDTO = {
  pathId: number
  subject: string
  targetDate: string
  currentIndex: number
  nodes: PathNodeDTO[]
  edges: PathEdgeDTO[]
  overallImproveProb: number
  adjustmentEvents?: PathAdjustmentEventDTO[]
}

export type ColdStartSubmitResponse = {
  weakPoints: WeakPointDTO[]
  learningPath: LearningPathDTO
}

export type HomeworkGradedItemDTO = {
  question: string
  studentAnswer: string
  correctAnswer: string
  isCorrect: boolean
  knowledgeIds: number[]
  feedback: string
  confidence: number
}

export type HomeworkGradeResponse = {
  uploadId: number
  imageUrl: string
  ocrText: string
  gradedItems: HomeworkGradedItemDTO[]
  weakPoints: WeakPointDTO[]
}

export type PracticeAttemptPayload = {
  questionId: number
  knowledgeId: number
  answer: string
  durationSec: number
  source: string
}

export type KnowledgePointDTO = {
  id: number
  subject: string
  title: string
  content: string
}

export type PredictionNodeProbability = {
  knowledgeId: number
  title: string
  probability: number
}

export type PredictionDTO = {
  overallProbability: number
  nodeProbabilities: PredictionNodeProbability[]
  rationale: string
}
