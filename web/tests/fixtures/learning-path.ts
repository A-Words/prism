import {
  AssessmentQuestion,
  ColdStartSubmitResponse,
  CreateSessionResponse,
  HomeworkGradeResponse,
  KnowledgePointDTO,
  LearningPathDTO,
  PredictionDTO,
} from "@/lib/types/learning-path"

export const knowledgePointsFixture: KnowledgePointDTO[] = [
  { id: 101, subject: "math", title: "一元一次方程", content: "..." },
  { id: 102, subject: "math", title: "二次函数", content: "..." },
  { id: 103, subject: "math", title: "相似三角形", content: "..." },
]

export const assessmentQuestionsFixture: AssessmentQuestion[] = [
  {
    id: 1,
    knowledgeId: 101,
    difficulty: 0.3,
    question: "x + 3 = 7，x = ?",
    options: ["2", "3", "4", "5"],
  },
]

export const createSessionFixture: CreateSessionResponse = {
  sessionId: 2001,
  subject: "math",
  targetDate: "2026-02-22",
  questions: assessmentQuestionsFixture,
}

export const learningPathFixture: LearningPathDTO = {
  pathId: 3001,
  subject: "math",
  targetDate: "2026-02-22",
  currentIndex: 0,
  nodes: [
    {
      id: 101,
      title: "一元一次方程",
      subject: "math",
      status: "pending",
      mastery: 0.35,
      prerequisiteIds: [],
      isCurrent: true,
      isSkipped: false,
      predictedImproveProb: 0.7,
    },
    {
      id: 102,
      title: "二次函数",
      subject: "math",
      status: "review",
      mastery: 0.55,
      prerequisiteIds: [101],
      isCurrent: false,
      isSkipped: false,
      predictedImproveProb: 0.5,
    },
  ],
  edges: [{ from: 101, to: 102 }],
  overallImproveProb: 0.62,
  adjustmentEvents: [
    {
      eventType: "insert_prerequisite",
      payload: { knowledgeId: 101 },
      createdAt: "2026-02-15T12:00:00Z",
    },
  ],
}

export const coldStartSubmitFixture: ColdStartSubmitResponse = {
  weakPoints: [
    {
      knowledgeId: 102,
      title: "二次函数",
      weakScore: 0.78,
      reason: "函数图像理解不足",
    },
  ],
  learningPath: learningPathFixture,
}

export const predictionFixture: PredictionDTO = {
  overallProbability: 0.81,
  rationale: "最近 7 天练习稳定，预计掌握率持续提升。",
  nodeProbabilities: [
    { knowledgeId: 101, title: "一元一次方程", probability: 0.86 },
    { knowledgeId: 102, title: "二次函数", probability: 0.73 },
  ],
}

export const homeworkGradeFixture: HomeworkGradeResponse = {
  uploadId: 5001,
  imageUrl: "https://example.com/homework.png",
  ocrText: "题目一：x+3=7 ...",
  gradedItems: [
    {
      question: "x + 3 = 7",
      studentAnswer: "4",
      correctAnswer: "4",
      isCorrect: true,
      knowledgeIds: [101],
      feedback: "计算正确",
      confidence: 0.98,
    },
  ],
  weakPoints: coldStartSubmitFixture.weakPoints,
}
