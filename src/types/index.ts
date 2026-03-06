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

// ---- 学习路径 ----

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

export interface DiagnosticResult {
  questionId: string;
  isCorrect: boolean;
  studentAnswer: string;
  errorAnalysis?: string;
  missingKnowledge: string[];
  suggestedReview: string[];
  backtrackPath: string[];   // 回溯的知识点路径
  explanation: string;
}

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
