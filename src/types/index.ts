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
export type SolutionStepState = "locked" | "hinted" | "attempted";

/** 节点内嵌的互动提问 */
export interface InteractionPoint {
  question: string;       // "下一步你会先判断什么？"
  options?: string[];     // 可选：选择题
  hint: string;           // 尝试后揭示的提示
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
}

export interface SolutionEdge {
  source: string;
  target: string;
  label?: string;
}

/** 解题引导面板数据 */
export interface ProblemGuide {
  problemType: string;
  typeExplanation: string;
  prerequisites: { id: string; name: string; why: string }[];
  commonMistakes: { description: string; why: string }[];
  stepHints: string[];   // 递进式提示
}

export interface SolutionPath {
  problem: string;
  problemType: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  steps: SolutionStep[];
  edges: SolutionEdge[];
  summary: string;
  relatedKnowledge: string[];
  /** 解题引导面板 */
  guide?: ProblemGuide;
}

// ---- 学习规划 ----

/** AI 学习规划器输出的单个节点 */
export interface LearningPlanNode {
  knowledgeId: string;
  phase: number;
  phaseLabel: string;
  estimatedMinutes: number;
  objectives: string[];
  /** 卡住时退回到哪个节点 */
  backtrackTo?: string;
  /** 为什么把这个节点加入计划 */
  reason: string;
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
  goal: string;
  /** AI 对用户意图的理解 */
  interpretation: string;
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
  advice: string;
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
  purpose: string;
}

/** 四段式诊断结果 */
export interface DiagnosticResult {
  questionId: string;
  isCorrect: boolean;
  studentAnswer: string;

  // ---- 第一段：你错在哪里 ----
  /** 一句话定位错误（不是"答案错了"，而是具体的错误动作） */
  errorPinpoint: string;
  /** 错在哪一步 */
  errorStep?: string;

  // ---- 第二段：为什么会错 ----
  /** 错误分类 */
  errorCategory: ErrorCategory;
  /** 错误分类的中文标签 */
  errorCategoryLabel: string;
  /** 为什么会犯这个错误（1-2 句话） */
  whyWrong: string;

  // ---- 第三段：要补哪一层 ----
  /** 需要补的前置知识点（1-2 个，不贪多） */
  prerequisitesToFix: {
    id: string;
    name: string;
    reason: string;
  }[];
  /** 回溯的知识点路径 */
  backtrackPath: string[];

  // ---- 第四段：现在就补 ----
  /** 超短讲解（核心概念的 2-3 句话精讲） */
  miniLesson: string;
  /** 2 道微练习 */
  microExercises: MicroExercise[];
  /** 1 道回测题 */
  retestQuestion: MicroExercise;

  // ---- 保留旧字段兼容 ----
  errorAnalysis?: string;
  missingKnowledge: string[];
  suggestedReview: string[];
  explanation: string;
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

export interface StudentProgress {
  knowledge: Record<string, StudentKnowledge>;
  practiceHistory: {
    questionId: string;
    answer: string;
    isCorrect: boolean;
    timestamp: string;
  }[];
  learningPaths: {
    targetId: string;
    currentStep: number;
    startedAt: string;
  }[];
}

// ---- UI 状态 ----

export interface AppState {
  // 学生进度
  progress: StudentProgress;
  updateMastery: (nodeId: string, correct: boolean) => void;
  addPracticeRecord: (record: StudentProgress["practiceHistory"][0]) => void;
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
