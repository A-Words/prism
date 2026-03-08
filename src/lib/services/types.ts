import type {
  LearningBaseLevel,
  LearningGenerationMode,
  LearningGoalLevel,
  PracticeQuestion,
} from "@/types";

export interface GenerateLearningPlanInput {
  query?: string;
  targetId?: string;
  baseLevel?: LearningBaseLevel;
  goalLevel?: LearningGoalLevel;
  generationMode?: LearningGenerationMode;
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
