import { z } from "zod";

const difficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const learningBaseLevelSchema = z.enum(["zero", "basic", "sprint"]);
const learningGoalLevelSchema = z.enum([
  "concept",
  "basic-problems",
  "comprehensive",
]);
const learningGenerationModeSchema = z.enum(["quick", "assessment"]);
const solutionStepTypeSchema = z.enum([
  "analysis",
  "strategy",
  "computation",
  "reasoning",
  "verification",
  "conclusion",
]);
const solutionBranchTypeSchema = z.enum(["main", "mistake"]);
const solutionEdgeTypeSchema = z.enum(["main", "mistake_branch", "return_main"]);
const errorCategorySchema = z.enum([
  "concept",
  "formula",
  "condition",
  "computation",
  "logic",
  "careless",
]);

export const apiMetaSchema = z.object({
  source: z.enum(["ai", "rule"]),
  degraded: z.boolean(),
  provider: z.string().optional(),
  model: z.string().optional(),
  reason: z.string().optional(),
  requestId: z.string().min(1),
});

export const interactionPointSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  hint: z.string().min(1),
  correctOption: z.string().optional(),
  correctFeedback: z.string().optional(),
  wrongFeedback: z.string().optional(),
  mistakeKnowledgeId: z.string().optional(),
  recommendedLearningPathTargetId: z.string().optional(),
  recommendedRecoveryNodeId: z.string().optional(),
  recommendedLearnTargetId: z.string().optional(),
  recommendedLearnQuery: z.string().optional(),
  branchStepId: z.string().optional(),
});

export const solutionStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  explanation: z.string().min(1),
  knowledgePoints: z.array(z.string().min(1)).min(1),
  type: solutionStepTypeSchema,
  whyThisStep: z.string().optional(),
  commonMistake: z.string().optional(),
  alternativeApproach: z.string().optional(),
  interactionPoint: interactionPointSchema.optional(),
  branchType: solutionBranchTypeSchema.optional(),
  branchFromStepId: z.string().optional(),
  branchRecoveryHint: z.string().optional(),
});

export const solutionEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  type: solutionEdgeTypeSchema.optional(),
});

export const problemGuideSchema = z.object({
  problemType: z.string().min(1),
  typeExplanation: z.string().min(1),
  prerequisites: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        why: z.string().min(1),
      })
    )
    .min(1),
  commonMistakes: z
    .array(
      z.object({
        description: z.string().min(1),
        why: z.string().min(1),
      })
    )
    .min(1),
  stepHints: z.array(z.string().min(1)).min(3),
});

export const solutionPortraitSchema = z.object({
  stage: z.string().min(1),
  problemType: z.string().min(1),
  difficulty: difficultySchema,
  knowledgePoints: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        category: z.enum([
          "algebra",
          "geometry",
          "trigonometry",
          "probability",
          "analysis",
          "vector",
          "sequence",
        ]),
      })
    )
    .min(1),
  prerequisites: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        why: z.string().min(1),
      })
    )
    .min(1),
});

export const solutionPathSchema = z.object({
  problem: z.string().min(1),
  problemType: z.string().min(1),
  difficulty: difficultySchema,
  portrait: solutionPortraitSchema,
  steps: z.array(solutionStepSchema).min(7).max(12),
  edges: z.array(solutionEdgeSchema).min(4),
  summary: z.string().min(1),
  relatedKnowledge: z.array(z.string().min(1)).min(1),
  guide: problemGuideSchema.optional(),
  meta: apiMetaSchema.optional(),
});

export const learningPlanNodeSchema = z.object({
  knowledgeId: z.string().min(1),
  phase: z.number().int().min(1),
  phaseLabel: z.string().min(1),
  estimatedMinutes: z.number().int().min(5),
  objectives: z.array(z.string().min(1)).min(1),
  backtrackTo: z.string().optional(),
  reason: z.string().min(1),
  learnWhat: z.string().optional(),
  masteryChecks: z.array(z.string().min(1)).optional(),
  commonMistakes: z.array(z.string().min(1)).optional(),
  prerequisiteIds: z.array(z.string().min(1)).optional(),
  verificationQuestion: z
    .object({
      id: z.string().min(1),
      problem: z.string().min(1),
      options: z.array(z.string().min(1)).length(4),
      correctAnswer: z.string().min(1),
      explanation: z.string().min(1),
      purpose: z.enum(["assessment", "verification"]),
      knowledgeId: z.string().min(1),
      goalLevel: learningGoalLevelSchema,
    })
    .optional(),
});

export const learningPhaseSchema = z.object({
  phase: z.number().int().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
});

export const learningPlanSchema = z.object({
  goal: z.string().min(1),
  interpretation: z.string().min(1),
  phases: z.array(learningPhaseSchema).min(1),
  nodes: z.array(learningPlanNodeSchema).min(2).max(7),
  edges: z
    .array(
      z.object({
        source: z.string().min(1),
        target: z.string().min(1),
        type: z.enum(["progress", "backtrack"]),
        label: z.string().optional(),
      })
    )
    .min(1),
  totalEstimatedMinutes: z.number().int().min(10),
  advice: z.string().min(1),
  sceneId: z.string().optional(),
  targetKnowledgeId: z.string().optional(),
  recommendedStartId: z.string().optional(),
  currentNodeId: z.string().optional(),
  baseLevel: learningBaseLevelSchema.optional(),
  goalLevel: learningGoalLevelSchema.optional(),
  generationMode: learningGenerationModeSchema.optional(),
  whyStartHere: z.string().optional(),
  sessionPlan: z.string().optional(),
  nextCheckpoint: z.string().optional(),
  assessmentQuestions: z
    .array(
      z.object({
        id: z.string().min(1),
        problem: z.string().min(1),
        options: z.array(z.string().min(1)).length(4),
        correctAnswer: z.string().min(1),
        explanation: z.string().min(1),
        purpose: z.enum(["assessment", "verification"]),
        knowledgeId: z.string().min(1),
        goalLevel: learningGoalLevelSchema,
      })
    )
    .length(3)
    .optional(),
  assessmentSummary: z.string().optional(),
  meta: apiMetaSchema.optional(),
});

export const learningQuestionBankSchema = z.object({
  assessmentQuestions: z
    .array(
      z.object({
        id: z.string().min(1),
        problem: z.string().min(1),
        options: z.array(z.string().min(1)).length(4),
        correctAnswer: z.string().min(1),
        explanation: z.string().min(1),
        purpose: z.literal("assessment"),
        knowledgeId: z.string().min(1),
        goalLevel: learningGoalLevelSchema,
      })
    )
    .length(3),
  verificationQuestions: z
    .array(
      z.object({
        knowledgeId: z.string().min(1),
        question: z.object({
          id: z.string().min(1),
          problem: z.string().min(1),
          options: z.array(z.string().min(1)).length(4),
          correctAnswer: z.string().min(1),
          explanation: z.string().min(1),
          purpose: z.literal("verification"),
          knowledgeId: z.string().min(1),
          goalLevel: learningGoalLevelSchema,
        }),
      })
    )
    .min(2)
    .max(7),
});

export const microExerciseSchema = z.object({
  id: z.string().min(1),
  problem: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  correctAnswer: z.string().min(1),
  purpose: z.string().min(1),
});

export const diagnosticResultSchema = z.object({
  questionId: z.string().min(1),
  isCorrect: z.boolean(),
  studentAnswer: z.string().min(1),
  errorPinpoint: z.string().min(1),
  errorStep: z.string().optional(),
  errorCategory: errorCategorySchema,
  errorCategoryLabel: z.string().min(1),
  whyWrong: z.string().min(1),
  prerequisitesToFix: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        reason: z.string().min(1),
      })
    )
    .min(1),
  backtrackPath: z.array(z.string().min(1)).min(1),
  miniLesson: z.string().min(1),
  microExercises: z.array(microExerciseSchema).length(2),
  retestQuestion: microExerciseSchema,
  errorAnalysis: z.string().optional(),
  missingKnowledge: z.array(z.string().min(1)),
  suggestedReview: z.array(z.string().min(1)),
  explanation: z.string().min(1),
  recommendedLearnTargetId: z.string().optional(),
  recommendedLearnQuery: z.string().optional(),
  recoveryTitle: z.string().optional(),
  meta: apiMetaSchema.optional(),
});

export const learningPlanCopySchema = z.object({
  goal: z.string().min(1),
  interpretation: z.string().min(1),
  advice: z.string().min(1),
  whyStartHere: z.string().min(1),
  sessionPlan: z.string().min(1),
  nextCheckpoint: z.string().min(1),
  nodes: z
    .array(
      z.object({
        knowledgeId: z.string().min(1),
        reason: z.string().min(1),
        learnWhat: z.string().min(1),
        masteryChecks: z.array(z.string().min(1)).min(2).max(3),
        commonMistakes: z.array(z.string().min(1)).min(1).max(3),
      })
    )
    .min(2)
    .max(7),
});

export const solutionPathAiSchema = solutionPathSchema
  .omit({
    edges: true,
    meta: true,
  })
  .extend({
    guide: problemGuideSchema,
  });

export const diagnosisEnrichmentSchema = z.object({
  errorPinpoint: z.string().min(1),
  errorStep: z.string().optional(),
  whyWrong: z.string().min(1),
  miniLesson: z.string().min(1),
  recoveryTitle: z.string().optional(),
  microExercises: z.array(microExerciseSchema).length(2),
  retestQuestion: microExerciseSchema,
});
