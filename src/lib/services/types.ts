import type {
  LearningBaseLevel,
  LearningGenerationMode,
  LearningGoalLevel,
  LearningQuestionSubmissionResult,
  PracticeQuestion,
} from "@/types";

export interface GenerateLearningPlanInput {
  query?: string;
  targetId?: string;
  baseLevel?: LearningBaseLevel;
  goalLevel?: LearningGoalLevel;
  generationMode?: LearningGenerationMode;
  assessmentResults?: Array<
    Pick<
      LearningQuestionSubmissionResult,
      "questionId" | "knowledgeId" | "answer" | "isCorrect"
    >
  >;
  requestId: string;
}

export interface GenerateSolutionPathInput {
  problem: string;
  requestId: string;
}

export interface GenerateDiagnosisInput {
  question: Pick<PracticeQuestion, "id"> & Partial<PracticeQuestion>;
  studentAnswer: string;
  requestId: string;
}
