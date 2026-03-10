// ============================================================
// Prism 类型定义
// ============================================================

// ---- 知识图谱 ----

export type KnowledgeCategory =
  | "algebra"      // 代数
  | "geometry"     // 几何
  | "trigonometry" // 三角
  | "probability"  // 概率统计
  | "analysis"     // 分析（导数）
  | "vector"       // 向量
  | "sequence";    // 数列

export interface KnowledgeNode {
  id: string;
  name: string;
  category: KnowledgeCategory;
  description: string;
  prerequisites: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  keywords: string[];
  /** 高中数学模块归属 */
  module: string;
}

export type MasteryLevel = "none" | "low" | "medium" | "high" | "full";

export interface StudentKnowledge {
  nodeId: string;
  mastery: MasteryLevel;
  lastPracticed?: string; // ISO date
  correctCount: number;
  totalCount: number;
}

// ---- 解题路径 ----

export type SolutionStepType =
  | "analysis"      // 审题分析
  | "strategy"      // 策略选择
  | "computation"   // 计算推导
  | "reasoning"     // 逻辑推理
  | "verification"  // 验证检查
  | "conclusion";   // 得出结论

/** 解题节点的交互状态 */
export type SolutionStepState = "locked" | "hinted" | "attempted" | "offtrack";

export type SolutionBranchType = "main" | "mistake";
export type SolutionEdgeType = "main" | "mistake_branch" | "return_main";

export interface SolutionPortrait {
  stage: string;
  problemType: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  knowledgePoints: {
    id: string;
    name: string;
    category: KnowledgeCategory;
  }[];
  prerequisites: {
    id: string;
    name: string;
    why: string;
  }[];
}

/** 节点内嵌的互动提问 */
export interface InteractionPoint {
  question: string;       // "下一步你会先判断什么？"
  options?: string[];     // 可选：选择题
  hint: string;           // 尝试后揭示的提示
  correctOption?: string;
  correctFeedback?: string;
  wrongFeedback?: string;
  mistakeKnowledgeId?: string;
  recommendedLearningPathTargetId?: string;
  recommendedRecoveryNodeId?: string;
  recommendedLearnTargetId?: string;
  recommendedLearnQuery?: string;
  branchStepId?: string;
}

export interface SolutionStep {
  id: string;
  title: string;
  content: string;       // 支持 LaTeX
  explanation: string;   // 详细解释
  knowledgePoints: string[]; // 关联的知识点 ID
  type: SolutionStepType;
  /** 为什么先做这一步 */
  whyThisStep?: string;
  /** 如果走错会错在哪 */
  commonMistake?: string;
  /** 有没有替代路线 */
  alternativeApproach?: string;
  /** 节点内互动点 */
  interactionPoint?: InteractionPoint;
  branchType?: SolutionBranchType;
  branchFromStepId?: string;
  branchRecoveryHint?: string;
}

export interface SolutionEdge {
  source: string;
  target: string;
  label?: string;
  type?: SolutionEdgeType;
}

/** 解题引导面板数据 */
export interface ProblemGuide {
  problemType: string;
  typeExplanation: string; // 支持 LaTeX
  prerequisites: { id: string; name: string; why: string }[];
  commonMistakes: { description: string; why: string }[];
  stepHints: string[];   // 递进式提示，支持 LaTeX
}

export interface ApiResponseMeta {
  source: "ai" | "rule";
  degraded: boolean;
  provider?: string;
  model?: string;
  reason?: string;
  requestId: string;
}

export interface SolutionPath {
  problem: string;
  problemType: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  portrait: SolutionPortrait;
  steps: SolutionStep[];
  edges: SolutionEdge[];
  summary: string;
  relatedKnowledge: string[];
  /** 解题引导面板 */
  guide?: ProblemGuide;
  /** 响应元数据 */
  meta?: ApiResponseMeta;
}

// ---- 学习规划 ----

export type LearningBaseLevel = "zero" | "basic" | "sprint";
export type LearningGoalLevel = "concept" | "basic-problems" | "comprehensive";
export type LearningGenerationMode = "quick" | "assessment";

/** AI 学习规划器输出的单个节点 */
export interface LearningPlanNode {
  knowledgeId: string;
  phase: number;
  phaseLabel: string;
  estimatedMinutes: number;
  objectives: string[]; // 支持 LaTeX
  /** 卡住时退回到哪个节点 */
  backtrackTo?: string;
  /** 为什么把这个节点加入计划 */
  reason: string; // 支持 LaTeX
  /** 这一节点重点学什么 */
  learnWhat?: string; // 支持 LaTeX
  /** 达到什么标准算学会 */
  masteryChecks?: string[]; // 支持 LaTeX
  /** 常见卡点 */
  commonMistakes?: string[]; // 支持 LaTeX
  /** 明示的前置节点 */
  prerequisiteIds?: string[];
}

/** 学习规划的阶段描述 */
export interface LearningPhase {
  phase: number;
  label: string;       // "基础准备" / "核心学习" / "目标掌握"
  description: string;
}

/** AI 学习规划器的完整输出 */
export interface LearningPlan {
  /** AI 解读后的学习目标 */
  goal: string; // 支持 LaTeX
  /** AI 对用户意图的理解 */
  interpretation: string; // 支持 LaTeX
  /** 分阶段信息 */
  phases: LearningPhase[];
  /** 学习节点（含阶段、退路） */
  nodes: LearningPlanNode[];
  /** 节点间的关系 */
  edges: {
    source: string;
    target: string;
    type: "progress" | "backtrack";
    label?: string;
  }[];
  totalEstimatedMinutes: number;
  /** 个性化建议 */
  advice: string; // 支持 LaTeX
  /** mock 场景 ID */
  sceneId?: string;
  /** 当前目标知识点 */
  targetKnowledgeId?: string;
  /** 推荐起点 */
  recommendedStartId?: string;
  /** 当前执行节点 */
  currentNodeId?: string;
  /** 学习基础 */
  baseLevel?: LearningBaseLevel;
  /** 学习目标层级 */
  goalLevel?: LearningGoalLevel;
  /** 生成模式 */
  generationMode?: LearningGenerationMode;
  /** 为什么从这里开始 */
  whyStartHere?: string; // 支持 LaTeX
  /** 每日学习安排 */
  sessionPlan?: string; // 支持 LaTeX
  /** 当前里程碑 */
  nextCheckpoint?: string; // 支持 LaTeX
  /** 响应元数据 */
  meta?: ApiResponseMeta;
}

// 保留旧类型作兼容
export interface LearningPathNode {
  knowledgeId: string;
  order: number;
  estimatedMinutes: number;
  learningObjectives: string[];
  suggestedResources: string[];
}

export interface LearningPath {
  targetKnowledge: string;
  path: LearningPathNode[];
  totalEstimatedMinutes: number;
  description: string;
}

// ---- 练习与诊断 ----

export interface PracticeQuestion {
  id: string;
  problem: string;          // LaTeX
  options?: string[];        // 选择题选项
  correctAnswer: string;
  knowledgePoints: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  type: "choice" | "fill" | "proof";
  hints: string[];
}

/** 错误分类 */
export type ErrorCategory =
  | "concept"       // 概念没掌握
  | "formula"       // 公式选错/记错
  | "condition"     // 条件识别错误
  | "computation"   // 计算稳定性不足
  | "logic"         // 逻辑推理错误
  | "careless";     // 粗心大意

/** 补救微练习 */
export interface MicroExercise {
  id: string;
  problem: string;          // LaTeX
  options?: string[];
  correctAnswer: string;
  /** 为什么选这道题来练 */
  purpose: string; // 支持 LaTeX
}

/** 四段式诊断结果 */
export interface DiagnosticResult {
  questionId: string;
  isCorrect: boolean;
  studentAnswer: string;

  // ---- 第一段：你错在哪里 ----
  /** 一句话定位错误（不是"答案错了"，而是具体的错误动作） */
  errorPinpoint: string; // 支持 LaTeX
  /** 错在哪一步 */
  errorStep?: string; // 支持 LaTeX

  // ---- 第二段：为什么会错 ----
  /** 错误分类 */
  errorCategory: ErrorCategory;
  /** 错误分类的中文标签 */
  errorCategoryLabel: string;
  /** 为什么会犯这个错误（1-2 句话） */
  whyWrong: string; // 支持 LaTeX

  // ---- 第三段：要补哪一层 ----
  /** 需要补的前置知识点（1-2 个，不贪多） */
  prerequisitesToFix: {
    id: string;
    name: string;
    reason: string; // 支持 LaTeX
  }[];
  /** 回溯的知识点路径 */
  backtrackPath: string[];

  // ---- 第四段：现在就补 ----
  /** 超短讲解（核心概念的 2-3 句话精讲） */
  miniLesson: string; // 支持 LaTeX
  /** 2 道微练习 */
  microExercises: MicroExercise[];
  /** 1 道回测题 */
  retestQuestion: MicroExercise;

  // ---- 保留旧字段兼容 ----
  errorAnalysis?: string;
  missingKnowledge: string[];
  suggestedReview: string[];
  explanation: string; // 支持 LaTeX
  /** 诊断后建议回到哪个学习场景 */
  recommendedLearnTargetId?: string;
  /** 诊断后跳转时默认使用的查询词 */
  recommendedLearnQuery?: string;
  /** 首页或诊断卡片展示标题 */
  recoveryTitle?: string; // 支持 LaTeX
  /** 响应元数据 */
  meta?: ApiResponseMeta;
}

export type DiagnosisRecordStatus =
  | "pending_recovery"
  | "recovering"
  | "retested_passed"
  | "retested_failed"
  | "dismissed";

export interface DiagnosisSubmissionResult {
  answer: string;
  isCorrect: boolean;
  submittedAt: string;
}

export interface DiagnosisRecord {
  id: string;
  questionId: string;
  createdAt: string;
  updatedAt: string;
  status: DiagnosisRecordStatus;
  diagnosis: DiagnosticResult;
  recommendedTargetId?: string;
  recommendedQuery?: string;
  recoveryLearningPathTargetId?: string;
  recoveryNodeId?: string;
  recoveryStartedAt?: string;
  completedAt?: string;
  microExerciseResults: Record<string, DiagnosisSubmissionResult>;
  retestResult?: DiagnosisSubmissionResult;
}

export interface SolutionStepAttempt {
  stepId: string;
  answer?: string;
  isDirectionCorrect: boolean;
  knowledgeIds: string[];
  recommendedLearningPathTargetId?: string;
  recommendedRecoveryNodeId?: string;
  recommendedLearnTargetId?: string;
  recommendedLearnQuery?: string;
  branchStepId?: string;
  submittedAt: string;
}

export interface SolutionAttemptSession {
  problemKey: string;
  problem: string;
  pathSnapshot: SolutionPath;
  activeStepId?: string;
  stepStates: Record<string, SolutionStepState>;
  selectedAnswers: Record<string, string | null>;
  attempts: Record<string, SolutionStepAttempt>;
  highlightedBranchStepIds: string[];
  updatedAt: string;
}

export const ERROR_CATEGORY_LABELS: Record<ErrorCategory, string> = {
  concept: "概念未掌握",
  formula: "公式选错/记错",
  condition: "条件识别错误",
  computation: "计算不稳定",
  logic: "逻辑推理错误",
  careless: "粗心大意",
};

export const ERROR_CATEGORY_COLORS: Record<ErrorCategory, string> = {
  concept: "#ef4444",
  formula: "#f59e0b",
  condition: "#8b5cf6",
  computation: "#3b82f6",
  logic: "#06b6d4",
  careless: "#64748b",
};

export const DIAGNOSIS_STATUS_LABELS: Record<DiagnosisRecordStatus, string> = {
  pending_recovery: "待回补",
  recovering: "回补中",
  retested_passed: "已通过",
  retested_failed: "待继续回补",
  dismissed: "已忽略",
};

export interface LearningPathProgress {
  targetId: string;
  targetName: string;
  currentNodeId: string;
  currentStep: number;
  totalSteps: number;
  completedNodeIds: string[];
  startedAt: string;
  updatedAt: string;
  status: "active" | "completed";
  activeDiagnosisQuestionId?: string;
  activeSolveProblemKey?: string;
}

export interface StudentProgress {
  knowledge: Record<string, StudentKnowledge>;
  practiceHistory: {
    questionId: string;
    answer: string;
    isCorrect: boolean;
    timestamp: string;
  }[];
  learningPaths: LearningPathProgress[];
  diagnosisRecords: DiagnosisRecord[];
  solutionAttempts: SolutionAttemptSession[];
}

// ---- UI 状态 ----

export interface AppState {
  // 学生进度
  progress: StudentProgress;
  updateMastery: (nodeId: string, correct: boolean) => void;
  addPracticeRecord: (record: StudentProgress["practiceHistory"][0]) => void;
  upsertLearningPath: (path: LearningPathProgress) => void;
  completeLearningPathStep: (targetId: string, completedNodeId: string, nextNodeId?: string) => void;
  recordDiagnosis: (diagnosis: DiagnosticResult) => DiagnosisRecord;
  submitDiagnosisMicroExercise: (
    questionId: string,
    exerciseId: string,
    answer: string,
    isCorrect: boolean
  ) => void;
  submitDiagnosisRetest: (
    questionId: string,
    answer: string,
    isCorrect: boolean
  ) => void;
  startDiagnosisRecovery: (questionId: string) => string | undefined;
  upsertSolutionAttemptSession: (session: SolutionAttemptSession) => void;
  startSolutionRecovery: (params: {
    problemKey: string;
    knowledgeIds: string[];
    recommendedLearningPathTargetId?: string;
    recommendedRecoveryNodeId?: string;
    recommendedLearnTargetId?: string;
    recommendedLearnQuery?: string;
  }) => string | undefined;
  getMastery: (nodeId: string) => MasteryLevel;
  getMasteryScore: (nodeId: string) => number;

  // 当前视图状态
  selectedKnowledgeId: string | null;
  setSelectedKnowledgeId: (id: string | null) => void;

  // 解题路径
  currentSolutionPath: SolutionPath | null;
  setCurrentSolutionPath: (path: SolutionPath | null) => void;

  // 诊断状态
  currentDiagnosis: DiagnosticResult | null;
  setCurrentDiagnosis: (result: DiagnosticResult | null) => void;
}

export interface MockLearningScenario {
  id: string;
  title: string;
  queryAliases: string[];
  targetId: string;
  dashboardTitle: string;
  dashboardReason: string;
  dashboardTask: string;
  plan: LearningPlan;
}

export interface MockDiagnosisScenario {
  questionId: string;
  title: string;
  result: DiagnosticResult;
}

// ---- 颜色映射 ----

export const CATEGORY_COLORS: Record<KnowledgeCategory, string> = {
  algebra: "#3b82f6",
  geometry: "#10b981",
  trigonometry: "#f59e0b",
  probability: "#8b5cf6",
  analysis: "#ef4444",
  vector: "#06b6d4",
  sequence: "#ec4899",
};

export const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  algebra: "代数",
  geometry: "几何",
  trigonometry: "三角",
  probability: "概率统计",
  analysis: "分析",
  vector: "向量",
  sequence: "数列",
};

export const MASTERY_COLORS: Record<MasteryLevel, string> = {
  none: "#e5e7eb",
  low: "#fca5a5",
  medium: "#fde047",
  high: "#86efac",
  full: "#22c55e",
};

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  none: "未学习",
  low: "初步了解",
  medium: "部分掌握",
  high: "基本掌握",
  full: "完全掌握",
};

export const STEP_TYPE_LABELS: Record<SolutionStepType, string> = {
  analysis: "审题分析",
  strategy: "策略选择",
  computation: "计算推导",
  reasoning: "逻辑推理",
  verification: "验证检查",
  conclusion: "得出结论",
};

export const STEP_TYPE_COLORS: Record<SolutionStepType, string> = {
  analysis: "#3b82f6",
  strategy: "#8b5cf6",
  computation: "#f59e0b",
  reasoning: "#10b981",
  verification: "#06b6d4",
  conclusion: "#ef4444",
};

export const SOLUTION_STATE_LABELS: Record<SolutionStepState, string> = {
  locked: "未展开",
  hinted: "已提示",
  attempted: "方向正确",
  offtrack: "方向偏离",
};
