import type {
  DiagnosticResult,
  LearningGenerationMode,
  LearningGoalLevel,
  LearningPlan,
  LearningPlanNode,
  MockDiagnosisScenario,
  MockLearningScenario,
  PracticeQuestion,
  SolutionPath,
} from "@/types";
import { getKnowledgeNode } from "@/lib/knowledge-graph";

type MockPlanSeed = {
  sceneId: string;
  targetId: string;
  goal: string;
  interpretation: string;
  whyStartHere: string;
  sessionPlan: string;
  nextCheckpoint: string;
  advice: string;
  recommendedStartId: string;
  currentNodeId: string;
  nodes: LearningPlanNode[];
};

const PHASE_META: Record<number, { label: string; description: string }> = {
  1: {
    label: "基础准备",
    description: "先把关键前置知识补齐，避免后面一直卡在概念层。",
  },
  2: {
    label: "核心突破",
    description: "围绕主方法建立稳定解题动作，开始形成可复用套路。",
  },
  3: {
    label: "综合巩固",
    description: "用更复杂的题型验证迁移能力，避免只会模板题。",
  },
};

function createLearningPlan(
  seed: MockPlanSeed,
  options?: {
    baseLevel?: LearningPlan["baseLevel"];
    goalLevel?: LearningGoalLevel;
    generationMode?: LearningGenerationMode;
  }
): LearningPlan {
  const phases = [...new Set(seed.nodes.map((node) => node.phase))]
    .sort((a, b) => a - b)
    .map((phase) => ({
      phase,
      label: PHASE_META[phase]?.label || `阶段 ${phase}`,
      description: PHASE_META[phase]?.description || "按当前节奏推进。",
    }));

  const edges = seed.nodes.flatMap((node, index) => {
    const progressEdge =
      index < seed.nodes.length - 1
        ? [
            {
              source: node.knowledgeId,
              target: seed.nodes[index + 1].knowledgeId,
              type: "progress" as const,
              label: index === 0 ? "先补地基" : "继续推进",
            },
          ]
        : [];
    const backtrackEdge = node.backtrackTo
      ? [
          {
            source: node.knowledgeId,
            target: node.backtrackTo,
            type: "backtrack" as const,
            label: "卡住时复习",
          },
        ]
      : [];

    return [...progressEdge, ...backtrackEdge];
  });

  const totalEstimatedMinutes = seed.nodes.reduce(
    (sum, node) => sum + node.estimatedMinutes,
    0
  );

  const generationMode = options?.generationMode || "quick";
  const modeAdvice =
    generationMode === "assessment"
      ? "本次按起点测试视角展示，建议先做一轮短测再进入当前节点。"
      : "本次按快速生成视角展示，直接从推荐节点开始。";
  const baseAdvice = seed.advice
    .replace(/\s*本次按起点测试视角展示，建议先做一轮短测再进入当前节点。/g, "")
    .replace(/\s*本次按快速生成视角展示，直接从推荐节点开始。/g, "")
    .trim();

  return {
    sceneId: seed.sceneId,
    goal: seed.goal,
    interpretation: seed.interpretation,
    phases,
    nodes: seed.nodes,
    edges,
    totalEstimatedMinutes,
    advice: `${baseAdvice} ${modeAdvice}`,
    targetKnowledgeId: seed.targetId,
    recommendedStartId: seed.recommendedStartId,
    currentNodeId: seed.currentNodeId,
    baseLevel: options?.baseLevel || "basic",
    goalLevel: options?.goalLevel || "basic-problems",
    generationMode,
    whyStartHere: seed.whyStartHere,
    sessionPlan: seed.sessionPlan,
    nextCheckpoint: seed.nextCheckpoint,
  };
}

function createNode(
  knowledgeId: string,
  phase: number,
  estimatedMinutes: number,
  reason: string,
  learnWhat: string,
  masteryChecks: string[],
  commonMistakes: string[],
  backtrackTo?: string
): LearningPlanNode {
  return {
    knowledgeId,
    phase,
    phaseLabel: PHASE_META[phase]?.label || `阶段 ${phase}`,
    estimatedMinutes,
    objectives: [getKnowledgeNode(knowledgeId)?.description || learnWhat],
    reason,
    learnWhat,
    masteryChecks,
    commonMistakes,
    prerequisiteIds: getKnowledgeNode(knowledgeId)?.prerequisites || [],
    backtrackTo,
  };
}

// ============================================================
// 解题路径示例
// ============================================================

export const mockSolutionPath: SolutionPath = {
  problem: "解不等式 $x^2 - 3x + 2 < 0$",
  problemType: "一元二次不等式",
  difficulty: 2,
  steps: [
    {
      id: "s1",
      title: "判断题型与目标",
      content:
        "识别这是一个一元二次不等式，目标是找到使 $x^2 - 3x + 2 < 0$ 成立的 $x$ 的范围。",
      explanation:
        "先看清题型，再选方法。这里求的不是一个数，而是一段满足条件的解集。",
      knowledgePoints: ["inequality-basic"],
      type: "analysis",
      whyThisStep:
        "题型判断会直接决定后续是走图像思路、代数思路还是分类讨论。",
      commonMistake:
        "把“解不等式”误当成“解方程”，只求出根却没有继续判断区间。",
      interactionPoint: {
        question: "看到这个式子，你第一步最该确认什么？",
        options: [
          "先因式分解",
          "先判断题型和目标",
          "先把所有项移到右边",
          "先代入特殊值",
        ],
        hint: "先确认是一元二次不等式，目标是求解集，而不是单个根。",
      },
    },
    {
      id: "s2",
      title: "选择解题策略",
      content:
        "把不等式转成对应方程求根，再借助二次函数图像判断在哪些区间内小于 0。",
      explanation:
        "一元二次不等式的标准动作是：求根、看开口、定区间。",
      knowledgePoints: ["inequality-basic", "function-quadratic"],
      type: "strategy",
      whyThisStep: "先选策略，后做计算，能减少试错和低级失误。",
      commonMistake: "会因式分解，但不知道为什么还要看开口方向。",
      alternativeApproach:
        "如果不会因式分解，也可以用求根公式先找到两个临界点。",
      interactionPoint: {
        question: "这道题最省力的主策略是什么？",
        options: ["先求根再看图像", "直接列区间", "直接背口诀", "强行代入 4 个值"],
        hint: "先把临界点找出来，图像和数轴判断才有抓手。",
      },
    },
    {
      id: "s3",
      title: "定位临界点（求根）",
      content: "$x^2 - 3x + 2 = (x - 1)(x - 2) = 0$，所以临界点是 $1$ 和 $2$。",
      explanation:
        "两个根把数轴切成三段，每一段里函数值符号保持不变。",
      knowledgePoints: ["function-quadratic", "function-zero"],
      type: "computation",
      whyThisStep: "没有临界点，就无法把数轴拆成可判断的区间。",
      commonMistake: "因式分解时把中间项符号拆错。",
      interactionPoint: {
        question: "两个根会把数轴分成几段？",
        options: ["2 段", "3 段", "4 段"],
        hint: "两个点把数轴切成三段：左边、中间、右边。",
      },
    },
    {
      id: "s4",
      title: "利用开口方向判断区间符号",
      content:
        "$a = 1 > 0$，图像开口向上，所以两根之间函数值在 $x$ 轴下方。",
      explanation:
        "开口向上意味着图像中间低、两边高，因此“小于 0”时取中间。",
      knowledgePoints: ["function-quadratic", "function-properties"],
      type: "reasoning",
      whyThisStep: "这是二次不等式真正的核心判断，不是机械套公式。",
      commonMistake: "把“大于取两边，小于取中间”的适用前提忘掉了。",
      alternativeApproach:
        "也可以在每个区间各取一个测试点代入做保险验证。",
      interactionPoint: {
        question: "为什么这一步可以不逐段代入？",
        hint: "因为二次函数图像的开口方向已经决定了区间符号变化。",
      },
    },
    {
      id: "s5",
      title: "检查边界是否可取",
      content:
        "题目是严格小于 $0$，所以端点 $x = 1$ 和 $x = 2$ 都不能取。",
      explanation:
        "严格不等号对应开区间，含等号时才考虑把端点并进去。",
      knowledgePoints: ["inequality-basic", "set-operations"],
      type: "verification",
      whyThisStep: "很多题不是不会做，而是边界写错。",
      commonMistake: "把开区间写成闭区间，或者括号和方括号混用。",
      interactionPoint: {
        question: "如果改成 $\\leq 0$，区间会怎样变化？",
        options: ["仍是 $(1, 2)$", "变成 $[1, 2]$", "变成 $(1, 2]$"],
        hint: "含等号时，两个根也满足条件，所以会变成闭区间。",
      },
    },
    {
      id: "s6",
      title: "组织答案并验证",
      content:
        "解集是 $\\{x \\mid 1 < x < 2\\}$，也可以写成开区间 $(1, 2)$。",
      explanation:
        "写出规范答案后，再代一个区间内点验证，是完整的解题闭环。",
      knowledgePoints: ["set-operations"],
      type: "conclusion",
      whyThisStep: "最后一步不是重复，而是把思路收束成标准得分表达。",
      interactionPoint: {
        question: "除了代入 $1.5$，你还能怎么验证？",
        hint: "可以再代一个区间外的值，验证它确实不满足不等式。",
      },
    },
  ],
  edges: [
    { source: "s1", target: "s2", label: "明确题型后" },
    { source: "s2", target: "s3", label: "确定方法后" },
    { source: "s3", target: "s4", label: "找到根后" },
    { source: "s4", target: "s5", label: "判断区间后" },
    { source: "s5", target: "s6", label: "确认边界后" },
  ],
  summary:
    "这题的关键不是会不会算，而是能不能把“求根 + 开口方向 + 区间判断”串成一个完整动作。",
  relatedKnowledge: [
    "inequality-basic",
    "function-quadratic",
    "function-zero",
    "function-properties",
    "set-operations",
  ],
  guide: {
    problemType: "一元二次不等式",
    typeExplanation:
      "一元二次不等式的常规套路是：求根、看开口、定区间，再检查端点是否可取。",
    prerequisites: [
      {
        id: "function-quadratic",
        name: "二次函数",
        why: "需要知道图像开口方向和两根位置如何影响函数正负。",
      },
      {
        id: "inequality-basic",
        name: "不等式的性质",
        why: "需要理解解集、区间与严格不等号的表达。",
      },
      {
        id: "set-operations",
        name: "集合的运算",
        why: "最后要把结果用集合或区间规范写出来。",
      },
    ],
    commonMistakes: [
      {
        description: "只求出根，没有继续判断区间",
        why: "把不等式题做成了方程题，漏掉了最关键的一步。",
      },
      {
        description: "开口方向记反，导致区间取反",
        why: "对图像和符号的对应关系不熟，容易机械套错口诀。",
      },
      {
        description: "边界写错成闭区间",
        why: "没有检查题目是否包含等号。",
      },
    ],
    stepHints: [
      "先判断这是不是一元二次不等式。",
      "把它转成对应方程，先找两个临界点。",
      "确定二次项系数的正负，看图像开口方向。",
      "再判断“小于 0”时应该取中间还是两边。",
      "最后确认端点是否要包含。",
      "用一个区间内值做快速验证。",
    ],
  },
};

// ============================================================
// 练习题
// ============================================================

export const mockQuestions: PracticeQuestion[] = [
  {
    id: "q1",
    problem:
      "已知集合 $A = \\{x \\mid x^2 - 5x + 6 = 0\\}$，$B = \\{x \\mid x^2 - 3x + 2 = 0\\}$，则 $A \\cap B$ 等于",
    options: ["$\\{2\\}$", "$\\{3\\}$", "$\\{1, 2\\}$", "$\\{2, 3\\}$"],
    correctAnswer: "$\\{2\\}$",
    knowledgePoints: ["set-operations", "function-quadratic"],
    difficulty: 2,
    type: "choice",
    hints: [
      "先分别求出两个集合的元素。",
      "把两个二次方程都化成因式分解形式会更快。",
      "交集只看公共元素，不要把两个集合直接并在一起。",
    ],
  },
  {
    id: "q2",
    problem: "函数 $f(x) = \\ln(x-1) + \\sqrt{3-x}$ 的定义域为",
    options: ["$(1, 3]$", "$[1, 3]$", "$(1, 3)$", "$[1, 3)$"],
    correctAnswer: "$(1, 3]$",
    knowledgePoints: ["function-concept", "function-logarithmic", "inequality-basic"],
    difficulty: 2,
    type: "choice",
    hints: [
      "对数部分要求 $x - 1 > 0$。",
      "根号部分要求 $3 - x \\ge 0$。",
      "最后别忘了取两个条件的交集。",
    ],
  },
  {
    id: "q3",
    problem:
      "若 $\\sin\\alpha = \\frac{3}{5}$，$\\alpha \\in (\\frac{\\pi}{2}, \\pi)$，则 $\\cos 2\\alpha$ 的值为",
    options: [
      "$\\frac{7}{25}$",
      "$-\\frac{7}{25}$",
      "$\\frac{24}{25}$",
      "$-\\frac{24}{25}$",
    ],
    correctAnswer: "$\\frac{7}{25}$",
    knowledgePoints: ["trig-identity", "trig-transform"],
    difficulty: 3,
    type: "choice",
    hints: [
      "已知 $\\sin\\alpha$ 时，优先想 $\\cos 2\\alpha = 1 - 2\\sin^2\\alpha$。",
      "这样就不需要先求 $\\cos\\alpha$。",
      "代入后直接化简即可。",
    ],
  },
  {
    id: "q4",
    problem:
      "等差数列 $\\{a_n\\}$ 中，$a_3 = 7$，$a_7 = 19$，则 $a_{10}$ 的值为",
    options: ["$25$", "$28$", "$31$", "$34$"],
    correctAnswer: "$28$",
    knowledgePoints: ["seq-arithmetic"],
    difficulty: 2,
    type: "choice",
    hints: [
      "等差数列先找公差。",
      "$a_7 - a_3$ 对应 4 个公差。",
      "求出 $a_1$ 后再代回通项公式。",
    ],
  },
  {
    id: "q5",
    problem:
      "已知椭圆 $\\frac{x^2}{4} + \\frac{y^2}{3} = 1$ 的左焦点为 $F_1$，右焦点为 $F_2$，点 $P$ 在椭圆上且 $|PF_1| = 3$，则 $|PF_2|$ 等于",
    options: ["$1$", "$2$", "$3$", "$4$"],
    correctAnswer: "$1$",
    knowledgePoints: ["analytic-ellipse"],
    difficulty: 3,
    type: "choice",
    hints: [
      "椭圆定义里有一个固定和：$|PF_1| + |PF_2| = 2a$。",
      "从标准方程里先读出 $a$。",
      "再用固定和减去已知距离。",
    ],
  },
];

// ============================================================
// 诊断场景
// ============================================================

const diagnosisScenarios: MockDiagnosisScenario[] = [
  {
    questionId: "q1",
    title: "集合交集混淆",
    result: {
      questionId: "q1",
      isCorrect: false,
      studentAnswer: "$\\{2, 3\\}$",
      errorPinpoint:
        "你把两个集合的公共元素和其中一个集合本身混在一起了，结果像是在做“并集式抄写”。",
      errorStep: "先分别求出 $A = \\{2, 3\\}$、$B = \\{1, 2\\}$ 之后，交集只应保留共同出现的 $2$。",
      errorCategory: "concept",
      errorCategoryLabel: "概念未掌握",
      whyWrong:
        "集合运算最容易出错的地方不是求元素，而是搞混“交集 / 并集 / 补集”的定义。你已经算出元素了，说明问题主要出在运算意义没盯紧。",
      prerequisitesToFix: [
        {
          id: "set-concept",
          name: "集合的概念",
          reason: "先把“元素属于集合”这件事看清，后面交并补才不会混乱。",
        },
        {
          id: "set-operations",
          name: "集合的运算",
          reason: "重点补“交集只取公共元素”的判断动作。",
        },
      ],
      backtrackPath: ["set-concept", "set-operations"],
      miniLesson:
        "交集 $A \\cap B$ 只保留 **同时属于** 两个集合的元素。做题时先把两个集合展开，再逐个检查元素是否“两边都在”，不要靠感觉看图形。",
      microExercises: [
        {
          id: "q1-m1",
          problem:
            "若 $A = \\{1, 2, 4\\}$，$B = \\{2, 3, 4\\}$，则 $A \\cap B$ 等于",
          options: ["$\\{2, 4\\}$", "$\\{1, 2, 3, 4\\}$", "$\\{1, 3\\}$", "$\\{4\\}$"],
          correctAnswer: "$\\{2, 4\\}$",
          purpose: "训练“公共元素”识别，不掺并集思维。",
        },
        {
          id: "q1-m2",
          problem:
            "若 $A = \\{x \\mid x < 3\\}$，$B = \\{x \\mid x > 1\\}$，则它们的公共整数元素个数是",
          options: ["1", "2", "3", "4"],
          correctAnswer: "1",
          purpose: "把交集放到数轴场景里，强化“同时满足”的理解。",
        },
      ],
      retestQuestion: {
        id: "q1-r1",
        problem:
          "已知集合 $A = \\{1, 2, 5\\}$，$B = \\{2, 4, 5\\}$，则 $A \\cap B$ 等于",
        options: ["$\\{2, 5\\}$", "$\\{1, 2, 4, 5\\}$", "$\\{5\\}$", "$\\{2\\}$"],
        correctAnswer: "$\\{2, 5\\}$",
        purpose: "验证你是否真正能稳定取出公共元素。",
      },
      errorAnalysis: "交集概念混淆。",
      missingKnowledge: ["set-concept", "set-operations"],
      suggestedReview: ["set-operations"],
      explanation:
        "先解得 $A = \\{2, 3\\}$，$B = \\{1, 2\\}$，所以公共元素只有 $2$，因此 $A \\cap B = \\{2\\}$。",
      recommendedLearnTargetId: "set-operations",
      recommendedLearnQuery: "集合交并补总是搞混",
      recoveryTitle: "先回补集合交并补，再回来做集合题。",
    },
  },
  {
    questionId: "q2",
    title: "定义域条件漏交集",
    result: {
      questionId: "q2",
      isCorrect: false,
      studentAnswer: "$(1, 3)$",
      errorPinpoint:
        "你已经意识到要分别列条件了，但在最后合并时把根号端点 $x = 3$ 漏掉了。",
      errorStep:
        "$\\ln(x-1)$ 给出 $x > 1$，$\\sqrt{3-x}$ 给出 $x \\le 3$，交集应是 $(1, 3]$。",
      errorCategory: "condition",
      errorCategoryLabel: "条件识别错误",
      whyWrong:
        "定义域题常见失分点不是不会列条件，而是最后一步没检查严格不等号和非严格不等号的边界差异。你少看的就是这一步。",
      prerequisitesToFix: [
        {
          id: "inequality-basic",
          name: "不等式的性质",
          reason: "定义域题最终靠不等式条件合并，边界判断必须稳定。",
        },
        {
          id: "function-logarithmic",
          name: "对数函数",
          reason: "要形成“真数必须大于 0”的条件反射。",
        },
      ],
      backtrackPath: ["set-concept", "inequality-basic", "function-concept", "function-logarithmic"],
      miniLesson:
        "定义域题固定分两步：先给每一部分各自列出合法条件，再做交集。对数看“真数 $> 0$”，根号看“被开方数 $\\ge 0$”，最后单独检查端点谁能取、谁不能取。",
      microExercises: [
        {
          id: "q2-m1",
          problem: "函数 $y = \\sqrt{5-x}$ 的定义域是",
          options: ["$x < 5$", "$x \\le 5$", "$x > 5$", "$x \\ge 5$"],
          correctAnswer: "$x \\le 5$",
          purpose: "单独练根号条件，稳住边界是否可取。",
        },
        {
          id: "q2-m2",
          problem: "函数 $y = \\ln(x+2)$ 的定义域是",
          options: ["$x > -2$", "$x \\ge -2$", "$x < -2$", "$x \\le -2$"],
          correctAnswer: "$x > -2$",
          purpose: "单独练对数真数条件，区分严格不等号。",
        },
      ],
      retestQuestion: {
        id: "q2-r1",
        problem: "函数 $f(x) = \\ln(x+1) + \\sqrt{4-x}$ 的定义域为",
        options: ["$(-1, 4)$", "$(-1, 4]$", "$[-1, 4]$", "$(-1, +\\infty)$"],
        correctAnswer: "$(-1, 4]$",
        purpose: "检查你能否把两个条件正确取交集并保住端点。",
      },
      errorAnalysis: "边界和交集处理不稳。",
      missingKnowledge: ["inequality-basic", "function-logarithmic"],
      suggestedReview: ["function-concept", "function-logarithmic"],
      explanation:
        "$\\ln(x-1)$ 要求 $x > 1$，$\\sqrt{3-x}$ 要求 $x \\le 3$，两者交集为 $(1, 3]$。",
      recommendedLearnTargetId: "function-logarithmic",
      recommendedLearnQuery: "定义域题总在边界上丢分",
      recoveryTitle: "先把定义域条件合并练稳，再回来做复合函数。",
    },
  },
  {
    questionId: "q3",
    title: "三角恒等变换选路不稳",
    result: {
      questionId: "q3",
      isCorrect: false,
      studentAnswer: "$-\\frac{7}{25}$",
      errorPinpoint:
        "你绕了一圈去求 $\\cos\\alpha$，结果在象限符号上翻车了，其实这题完全可以直接代二倍角公式。",
      errorStep:
        "已知 $\\sin\\alpha$ 时，优先用 $\\cos 2\\alpha = 1 - 2\\sin^2\\alpha$，这样就不会被第二象限的符号干扰。",
      errorCategory: "formula",
      errorCategoryLabel: "公式选错/记错",
      whyWrong:
        "你不是不会做，而是公式选路不够稳。三角题一旦多绕一步，象限、符号、平方根正负都会一起放大风险。",
      prerequisitesToFix: [
        {
          id: "trig-identity",
          name: "同角三角函数关系",
          reason: "要先把三角基本关系和象限符号盯牢。",
        },
        {
          id: "trig-transform",
          name: "三角恒等变换",
          reason: "核心是学会按已知条件选最省力的公式。",
        },
      ],
      backtrackPath: ["trig-angle", "trig-definition", "trig-identity", "trig-transform"],
      miniLesson:
        "遇到二倍角题，先看已知量再选公式。已知 $\\sin\\alpha$，优先想 $\\cos 2\\alpha = 1 - 2\\sin^2\\alpha$；已知 $\\cos\\alpha$，优先想 $2\\cos^2\\alpha - 1$。少绕一步，就少一个出错点。",
      microExercises: [
        {
          id: "q3-m1",
          problem: "若 $\\sin\\alpha = \\frac{4}{5}$，则 $\\cos 2\\alpha$ 等于",
          options: [
            "$-\\frac{7}{25}$",
            "$\\frac{7}{25}$",
            "$\\frac{24}{25}$",
            "$-\\frac{24}{25}$",
          ],
          correctAnswer: "$-\\frac{7}{25}$",
          purpose: "训练“已知正弦，直接选 $1 - 2\\sin^2\\alpha$”的反射。",
        },
        {
          id: "q3-m2",
          problem: "若 $\\cos\\alpha = \\frac{3}{5}$，则 $\\cos 2\\alpha$ 等于",
          options: [
            "$-\\frac{7}{25}$",
            "$\\frac{7}{25}$",
            "$\\frac{24}{25}$",
            "$-\\frac{24}{25}$",
          ],
          correctAnswer: "$-\\frac{7}{25}$",
          purpose: "对比两种已知量，练会按条件挑公式。",
        },
      ],
      retestQuestion: {
        id: "q3-r1",
        problem:
          "若 $\\sin\\alpha = \\frac{4}{5}$，$\\alpha \\in (\\frac{\\pi}{2}, \\pi)$，则 $\\cos 2\\alpha$ 的值为",
        options: [
          "$-\\frac{7}{25}$",
          "$\\frac{7}{25}$",
          "$\\frac{24}{25}$",
          "$-\\frac{24}{25}$",
        ],
        correctAnswer: "$-\\frac{7}{25}$",
        purpose: "确认你回到原型题时还能选对公式而不是绕路。",
      },
      errorAnalysis: "公式选路不稳。",
      missingKnowledge: ["trig-identity", "trig-transform"],
      suggestedReview: ["trig-transform"],
      explanation:
        "已知 $\\sin\\alpha = \\frac{3}{5}$，直接用 $\\cos 2\\alpha = 1 - 2\\sin^2\\alpha = 1 - 2 \\times \\frac{9}{25} = \\frac{7}{25}$。",
      recommendedLearnTargetId: "trig-transform",
      recommendedLearnQuery: "三角恒等变换总是记混公式",
      recoveryTitle: "回去补公式选路，再做同类三角题。",
    },
  },
  {
    questionId: "q4",
    title: "等差数列公差断档",
    result: {
      questionId: "q4",
      isCorrect: false,
      studentAnswer: "$31$",
      errorPinpoint:
        "你把 $a_7 - a_3$ 当成跨了 3 个公差，少算了一段，所以后面的项全跟着偏大。",
      errorStep:
        "$a_7$ 和 $a_3$ 的下标差是 $4$，所以应该有 $a_7 - a_3 = 4d$。",
      errorCategory: "logic",
      errorCategoryLabel: "逻辑推理错误",
      whyWrong:
        "数列题的坑往往不在公式，而在“下标差对应几段公差”这件事上。如果这个映射一松，后面的计算再熟也会整体偏掉。",
      prerequisitesToFix: [
        {
          id: "seq-concept",
          name: "数列的概念",
          reason: "先把“项数、下标、相邻差”之间的关系理顺。",
        },
        {
          id: "seq-arithmetic",
          name: "等差数列",
          reason: "把通项公式和公差理解成“固定步长”会更稳。",
        },
      ],
      backtrackPath: ["function-concept", "seq-concept", "seq-arithmetic"],
      miniLesson:
        "等差数列里，下标差几，就跨了几段公差。最稳的做法不是死背公式，而是先写成 $a_n = a_1 + (n-1)d$，这样每一步都能看见“差了几段”。",
      microExercises: [
        {
          id: "q4-m1",
          problem: "等差数列中，$a_6 - a_2$ 等于几段公差？",
          options: ["2 段", "3 段", "4 段", "5 段"],
          correctAnswer: "4 段",
          purpose: "先把下标差和公差段数对应稳住。",
        },
        {
          id: "q4-m2",
          problem:
            "若等差数列中 $a_2 = 5$，$a_5 = 14$，则公差 $d$ 等于",
          options: ["2", "3", "4", "5"],
          correctAnswer: "3",
          purpose: "在最短链路里练“差值除以下标差”。",
        },
      ],
      retestQuestion: {
        id: "q4-r1",
        problem:
          "等差数列 $\\{a_n\\}$ 中，$a_2 = 4$，$a_6 = 16$，则 $a_9$ 的值为",
        options: ["22", "25", "28", "31"],
        correctAnswer: "25",
        purpose: "验证你是否能把“先求公差，再求指定项”完整做对。",
      },
      errorAnalysis: "下标差与公差段数对应出错。",
      missingKnowledge: ["seq-concept", "seq-arithmetic"],
      suggestedReview: ["seq-arithmetic"],
      explanation:
        "$a_7 - a_3 = 4d = 19 - 7 = 12$，所以 $d = 3$。再由 $a_3 = a_1 + 2d$ 得 $a_1 = 1$，于是 $a_{10} = 1 + 9 \\times 3 = 28$。",
      recommendedLearnTargetId: "seq-arithmetic",
      recommendedLearnQuery: "等差数列总是把下标差看错",
      recoveryTitle: "先回补等差数列的公差节奏，再做数列题。",
    },
  },
  {
    questionId: "q5",
    title: "椭圆定义没真正落地",
    result: {
      questionId: "q5",
      isCorrect: false,
      studentAnswer: "$2$",
      errorPinpoint:
        "你看到了焦点信息，但没有立刻调用椭圆定义里的“到两焦点距离和为定值”。",
      errorStep:
        "标准方程里 $a^2 = 4$，所以 $2a = 4$。既然 $|PF_1| = 3$，那 $|PF_2| = 1$。",
      errorCategory: "concept",
      errorCategoryLabel: "概念未掌握",
      whyWrong:
        "圆锥曲线题一旦只盯方程，不盯几何定义，就容易把最短解法错过。椭圆最值、焦点距离、弦长题都靠这个定义起步。",
      prerequisitesToFix: [
        {
          id: "analytic-circle",
          name: "圆的方程",
          reason: "先把平面解析几何坐标感补稳，椭圆标准式才不容易漂。",
        },
        {
          id: "analytic-ellipse",
          name: "椭圆",
          reason: "核心要补“椭圆定义 + 标准方程 + $a,b,c$ 关系”。",
        },
      ],
      backtrackPath: ["analytic-line", "analytic-circle", "analytic-ellipse"],
      miniLesson:
        "椭圆题第一反应先看定义：椭圆上任一点到两焦点的距离和恒等于 $2a$。只要题目给出焦点和标准方程，很多题都不需要联立方程，直接由定义切入更快。",
      microExercises: [
        {
          id: "q5-m1",
          problem:
            "椭圆 $\\frac{x^2}{9} + \\frac{y^2}{4} = 1$ 上一点到两焦点距离之和等于",
          options: ["3", "5", "6", "9"],
          correctAnswer: "6",
          purpose: "强化“距离和 = 2a”的第一反应。",
        },
        {
          id: "q5-m2",
          problem:
            "已知椭圆上点 $P$ 满足 $|PF_1| = 4$，且该椭圆的 $2a = 10$，则 $|PF_2|$ 等于",
          options: ["4", "5", "6", "10"],
          correctAnswer: "6",
          purpose: "把定义直接转成距离计算，不拐弯。",
        },
      ],
      retestQuestion: {
        id: "q5-r1",
        problem:
          "已知椭圆 $\\frac{x^2}{9} + \\frac{y^2}{5} = 1$ 的焦点为 $F_1,F_2$，点 $P$ 在椭圆上且 $|PF_1| = 2$，则 $|PF_2|$ 等于",
        options: ["2", "3", "4", "5"],
        correctAnswer: "4",
        purpose: "验证你是否会优先调用椭圆定义而不是硬算。",
      },
      errorAnalysis: "椭圆定义调用不及时。",
      missingKnowledge: ["analytic-circle", "analytic-ellipse"],
      suggestedReview: ["analytic-ellipse"],
      explanation:
        "由椭圆标准方程得 $a = 2$，因此 $|PF_1| + |PF_2| = 2a = 4$。已知 $|PF_1| = 3$，所以 $|PF_2| = 1$。",
      recommendedLearnTargetId: "analytic-ellipse",
      recommendedLearnQuery: "椭圆焦点题总是没有思路",
      recoveryTitle: "先回补椭圆定义，再做焦点距离题。",
    },
  },
];

// ============================================================
// 学习路径场景
// ============================================================

const learningScenariosSeed: MockLearningScenario[] = [
  {
    id: "scene-derivative",
    title: "导数大题完全不会，从哪开始",
    queryAliases: ["导数大题完全不会，从哪开始", "导数不会", "导数", "导数压轴", "含参导数题"],
    targetId: "derivative-comprehensive",
    dashboardTitle: "导数综合应用",
    dashboardReason: "适合把导数主线从概念一路补到压轴题。",
    dashboardTask: "先把导数概念和求导法则重新串起来。",
    plan: createLearningPlan({
      sceneId: "scene-derivative",
      targetId: "derivative-comprehensive",
      goal: "从零梳理导数主线，最终能上手综合压轴题",
      interpretation:
        "你不是只缺一道题的技巧，而是整条导数链路还没真正搭起来，所以需要按“概念 → 运算 → 单调性 → 最值 → 综合应用”补一遍。",
      whyStartHere:
        "先从函数性质接进导数概念，而不是直接冲压轴题，这样后面的单调性和最值才有依据。",
      sessionPlan: "建议拆成 5 次 30-40 分钟学习，每次只推进 1 个主节点。",
      nextCheckpoint: "当你能稳定用导数判断单调区间时，再进入最值和含参题。",
      advice:
        "先稳住求导和单调性，不要一上来就刷最难的导数综合题；导数最怕中间断档。",
      recommendedStartId: "function-properties",
      currentNodeId: "derivative-concept",
      nodes: [
        createNode("function-properties", 1, 20, "先把函数增减性、图像变化和后面的导数意义接起来。", "回顾单调性、极值点和图像变化的直观含义。", ["能从图像口头描述函数的增减变化", "能说出“单调”与“切线斜率变化”的关系"], ["只会背定义，不会看图像变化"], "function-concept"),
        createNode("derivative-concept", 1, 30, "这是导数所有后续动作的起点。", "理解导数的定义、几何意义和“瞬时变化率”直觉。", ["能解释导数为什么表示局部变化快慢", "能判断某点导数正负的意义"], ["把导数当成新公式，没有和图像建立联系"], "function-properties"),
        createNode("derivative-rules", 2, 35, "没有稳定的求导动作，后面所有题都会卡壳。", "补齐基本求导公式、和差积商、链式法则。", ["能在 3 分钟内完成常见函数求导", "能看出复合函数的外层和内层"], ["链式法则漏乘内导", "指数、对数函数公式混淆"], "derivative-concept"),
        createNode("derivative-monotonicity", 2, 30, "导数真正开始服务于解题，就从单调性判断开始。", "练习用导数正负和临界点拆区间判断单调性。", ["能完整写出增减区间表", "能解释为什么需要先找临界点"], ["只会算导数，不会做符号表"], "derivative-rules"),
        createNode("derivative-extremum", 3, 30, "最值题是导数主线里的第一个综合节点。", "学会从单调性过渡到极值、最值与参数讨论。", ["能区分极值和最值", "能用导数法完成常规最值题"], ["导数为 0 就直接认定极值", "区间端点检查不完整"], "derivative-monotonicity"),
        createNode("derivative-comprehensive", 3, 35, "最后把含参讨论、不等式证明和零点问题串起来。", "建立导数综合题的标准审题顺序和拆解框架。", ["能识别题目是在考单调性、最值还是构造函数", "能写出一版完整的压轴题骨架"], ["一看到导数压轴题就直接硬算", "不会先判断题型主线"], "derivative-extremum"),
      ],
    }),
  },
  {
    id: "scene-probability",
    title: "概率老是算错，该怎么补",
    queryAliases: ["概率老是算错，该怎么补", "概率老错", "概率", "条件概率", "排列组合概率"],
    targetId: "prob-conditional",
    dashboardTitle: "条件概率",
    dashboardReason: "适合把“分类计数 + 概率模型 + 条件概率”连成一条线。",
    dashboardTask: "先把计数和古典概型的底层动作练稳。",
    plan: createLearningPlan({
      sceneId: "scene-probability",
      targetId: "prob-conditional",
      goal: "把概率题从“会代公式”提升到“能先建模型再计算”",
      interpretation:
        "你说概率总算错，通常不是只差一个公式，而是前面的样本空间、分类计数和条件筛选没有形成统一动作。",
      whyStartHere:
        "先从计数原理和基础概率开始，把样本空间搭对，后面的条件概率和分布表才不容易乱。",
      sessionPlan: "建议 4 次学习：计数、基础概率、排列组合、条件概率。",
      nextCheckpoint: "当你能先写出事件空间再下手算式时，就可以做更综合的题。",
      advice:
        "概率题最怕边算边改口，先写事件和样本空间，再动公式，正确率会明显提升。",
      recommendedStartId: "prob-counting",
      currentNodeId: "prob-basic",
      nodes: [
        createNode("prob-counting", 1, 20, "概率题的第一步是把“有多少种可能”数清楚。", "补齐加法原理、乘法原理和分类 / 分步的区别。", ["能判断该用分类还是分步", "能写出样本空间总数"], ["重复计数", "分类和分步混用"]),
        createNode("prob-basic", 1, 25, "古典概型是高中概率题的底层模型。", "理解随机事件、样本空间、古典概型和几何概型。", ["能先写“总情况 / 有利情况”再列式", "能区分事件与结果"], ["只记公式，不写事件定义"], "prob-counting"),
        createNode("prob-permutation", 2, 25, "很多概率题卡在不会数，有时根源就在排列组合。", "补齐排列、组合和“是否有顺序”的判断。", ["能稳定判断该用 $A$ 还是 $C$", "能说明为什么要除重或不除重"], ["有顺序和无顺序混掉"], "prob-counting"),
        createNode("prob-conditional", 2, 30, "条件概率会把原来的样本空间缩小，核心不是硬套公式。", "理解“在已知条件下重新看样本空间”的动作。", ["能口头解释条件概率分母为什么变了", "能正确写出条件事件"], ["把条件概率当普通概率直接算"], "prob-basic"),
        createNode("prob-distribution", 3, 30, "最后再进入期望、方差和分布表，形成完整概率链路。", "练习从事件模型转入随机变量和期望。", ["能读懂分布表", "能独立算期望并解释它的意义"], ["事件概率和随机变量分布表混淆"], "prob-conditional"),
      ],
    }),
  },
  {
    id: "scene-ellipse",
    title: "我想学椭圆，但感觉解析几何基础不好",
    queryAliases: ["我想学椭圆，但感觉解析几何基础不好", "椭圆", "椭圆不会", "焦点题", "圆锥曲线"],
    targetId: "analytic-ellipse",
    dashboardTitle: "椭圆",
    dashboardReason: "适合从直线圆过渡到椭圆定义、标准方程与焦点题。",
    dashboardTask: "先把解析几何坐标感和圆的标准式找回来。",
    plan: createLearningPlan({
      sceneId: "scene-ellipse",
      targetId: "analytic-ellipse",
      goal: "先补解析几何地基，再稳定上手椭圆定义和焦点题",
      interpretation:
        "你已经意识到问题不只在椭圆本身，而是前面的坐标表达、圆的方程和图形感还不够稳，所以需要先补基础再进主线。",
      whyStartHere:
        "椭圆不是孤立知识点，它吃解析几何坐标感和函数图像理解，先补这两层效率更高。",
      sessionPlan: "建议 4 次学习：函数性质、直线方程、圆的方程、椭圆。",
      nextCheckpoint: "当你能熟练读出 $a,b,c$ 并调用椭圆定义时，再去做焦点和弦长综合题。",
      advice:
        "不要把椭圆只当成一个方程模板，真正稳定的是“定义 + 标准方程 + 几何意义”三件套。",
      recommendedStartId: "analytic-line",
      currentNodeId: "analytic-circle",
      nodes: [
        createNode("function-properties", 1, 20, "先把图像、对称和变化直觉带回来，后面看圆锥曲线会更顺。", "补回图像对称性和几何直观。", ["能从图形角度描述对称轴和开口", "能把代数式和图像联系起来"], ["只记公式，不看图像"]),
        createNode("analytic-line", 1, 20, "解析几何的坐标语言要先顺起来。", "回顾斜率、点斜式和直线位置关系。", ["能在坐标系里写出常见直线方程", "能看懂几何信息如何转成方程"], ["点斜式和一般式来回切换不稳"], "function-concept"),
        createNode("analytic-circle", 2, 25, "椭圆之前先把圆的标准式和几何量对应练熟。", "补齐圆心、半径和标准式的来回转换。", ["看到方程能迅速读出圆心半径", "能从几何条件反写圆方程"], ["配方和圆心半径提取不稳"], "analytic-line"),
        createNode("analytic-ellipse", 2, 35, "进入椭圆主线：定义、标准方程、焦点和离心率。", "掌握 $a,b,c$ 关系和焦点距离和的定义。", ["能从标准式读出焦点位置", "能用椭圆定义直接解焦点距离题"], ["只背方程，不会调定义"], "analytic-circle"),
        createNode("analytic-comprehensive", 3, 30, "最后把直线和椭圆联动起来，进入综合题视角。", "练弦长、面积和联立方程的基本框架。", ["能判断是定义切入还是联立方程切入", "能写出一版综合题骨架"], ["一上来就硬算，忽略图形关系"], "analytic-ellipse"),
      ],
    }),
  },
  {
    id: "scene-trig-transform",
    title: "三角恒等变换总是记混公式",
    queryAliases: ["三角恒等变换总是记混公式", "三角恒等变换", "三角公式混乱", "二倍角", "三角"],
    targetId: "trig-transform",
    dashboardTitle: "三角恒等变换",
    dashboardReason: "适合把任意角、定义、同角关系和恒等变换串成一条稳定路线。",
    dashboardTask: "先补单位圆和同角关系，再进公式变形。",
    plan: createLearningPlan({
      sceneId: "scene-trig-transform",
      targetId: "trig-transform",
      goal: "把三角公式从“死背”改成“按条件选公式”",
      interpretation:
        "你会混公式，说明问题不只是记忆，而是前面的单位圆、符号和同角关系还没完全内化，所以公式一多就乱。",
      whyStartHere:
        "三角恒等变换的地基不是公式本身，而是角的表示、函数定义和同角关系。",
      sessionPlan: "建议 4 次学习：任意角、三角定义、同角关系、恒等变换。",
      nextCheckpoint: "当你能根据已知条件主动挑选最短公式时，再去做综合三角题。",
      advice:
        "少背一堆孤立公式，多练“已知什么就选哪条路”的条件判断，三角题会一下子顺很多。",
      recommendedStartId: "trig-angle",
      currentNodeId: "trig-identity",
      nodes: [
        createNode("trig-angle", 1, 20, "先把任意角和象限位置看熟，后面的符号判断才不飘。", "回顾弧度制、象限角和终边位置。", ["能根据角判断所在象限", "能快速说出常见角的象限和符号"], ["角度和弧度切换不稳"]),
        createNode("trig-definition", 1, 20, "三角函数定义决定了后面所有符号和关系式。", "补齐单位圆视角下的正弦、余弦、正切定义。", ["能用单位圆解释正弦余弦符号", "能看角度判断函数正负"], ["只记三角形定义，不会迁移到任意角"], "trig-angle"),
        createNode("trig-identity", 2, 25, "同角关系是公式选路的中转站。", "掌握 $\\sin^2\\alpha + \\cos^2\\alpha = 1$ 和商数关系。", ["能从一个三角函数值反推出另一个", "会先检查象限符号再开号"], ["忽略平方根正负", "象限符号丢失"], "trig-definition"),
        createNode("trig-transform", 2, 35, "把和差、二倍角和辅助角的主套路练顺。", "重点训练“已知正弦 / 余弦 / 正切时该选哪条公式”。", ["能按已知量主动选公式", "能把恒等变换压缩成 2-3 步"], ["公式会背但不会选", "越变越复杂"], "trig-identity"),
      ],
    }),
  },
  {
    id: "scene-set-operations",
    title: "集合交并补总是搞混",
    queryAliases: ["集合交并补总是搞混", "集合运算", "交集并集", "集合"],
    targetId: "set-operations",
    dashboardTitle: "集合的运算",
    dashboardReason: "适合快速补集合表示、元素关系和交并补。",
    dashboardTask: "先把集合表示法和元素关系找准。",
    plan: createLearningPlan({
      sceneId: "scene-set-operations",
      targetId: "set-operations",
      goal: "把集合运算做成稳定的“先展开、再比较、最后表达”流程",
      interpretation:
        "你现在的问题更像是集合运算概念不稳，而不是题目计算量大，所以只需要一条短路径把概念和运算补齐。",
      whyStartHere:
        "先把集合的表示和元素关系稳住，交并补才不会只靠感觉判断。",
      sessionPlan: "建议 2 次学习：先补概念，再做交并补。",
      nextCheckpoint: "当你能把集合题写成元素列表或区间后再做运算，就算稳定入门。",
      advice:
        "集合题先别急着做符号运算，先把元素写出来，很多错误会直接消失。",
      recommendedStartId: "set-concept",
      currentNodeId: "set-operations",
      nodes: [
        createNode("set-concept", 1, 15, "集合运算的前提是看清元素和表示法。", "补齐列举法、描述法和元素属于关系。", ["能把题目中的集合正确展开", "能分清元素和集合本身"], ["把元素和子集关系混掉"]),
        createNode("set-operations", 2, 20, "交并补是集合题的核心动作。", "练“交集取公共、并集取所有、补集看全集”的稳定流程。", ["能快速判断该保留哪些元素", "能把结果写成集合或区间"], ["把交集当并集", "看到符号就想当然"], "set-concept"),
      ],
    }),
  },
  {
    id: "scene-function-domain",
    title: "定义域题总在边界上丢分",
    queryAliases: ["定义域题总在边界上丢分", "定义域", "对数函数", "函数的概念", "函数定义域"],
    targetId: "function-logarithmic",
    dashboardTitle: "函数定义域与对数函数",
    dashboardReason: "适合补“列条件 + 取交集 + 查边界”的定义域主线。",
    dashboardTask: "先把不等式条件和函数定义统一起来。",
    plan: createLearningPlan({
      sceneId: "scene-function-domain",
      targetId: "function-logarithmic",
      goal: "把定义域题做成稳定的条件合并流程",
      interpretation:
        "你目前最容易丢分的不是计算，而是条件列完以后不会合并边界，所以需要从函数定义和不等式条件重新梳理。",
      whyStartHere:
        "定义域题本质是函数合法性和不等式条件的组合，先把这两层接起来最有效。",
      sessionPlan: "建议 3-4 次学习：集合、不等式、函数概念、对数函数。",
      nextCheckpoint: "当你看到对数、根号、分式时都能立刻列条件并检查边界，就可以进入综合定义域题。",
      advice:
        "定义域不是背答案，而是拆条件。每次都按“列条件 → 取交集 → 查端点”做，正确率会很稳。",
      recommendedStartId: "inequality-basic",
      currentNodeId: "function-concept",
      nodes: [
        createNode("set-concept", 1, 10, "定义域最终要写成集合或区间，先把表达方式接上。", "回顾区间、集合表示和交集含义。", ["能用区间写合法取值范围", "能解释交集表示“同时满足”"], ["不会把条件结果写成标准区间"]),
        createNode("inequality-basic", 1, 20, "定义域条件最后都会落到不等式上。", "补齐严格 / 非严格不等号和区间边界。", ["能分清 $>$ 和 $\\ge$ 对端点的影响", "能把多个条件转成区间"], ["边界判断不稳"], "set-concept"),
        createNode("function-concept", 2, 25, "函数定义决定了什么叫“合法输入”。", "理解定义域、值域和表达式合法性的关系。", ["能看到表达式就主动想合法条件", "能先列部分条件再合并"], ["只会算，不会先判合法性"], "inequality-basic"),
        createNode("function-logarithmic", 2, 25, "把对数函数的真数条件练成反射。", "重点补“真数必须大于 0”和综合定义域题。", ["能看到 $\\ln(\\cdot)$ 立刻列真数大于 0", "能和根号条件一起取交集"], ["对数条件常写成大于等于 0"], "function-concept"),
      ],
    }),
  },
  {
    id: "scene-sequence",
    title: "等差数列总是把下标差看错",
    queryAliases: ["等差数列总是把下标差看错", "等差数列", "数列", "数列求项"],
    targetId: "seq-arithmetic",
    dashboardTitle: "等差数列",
    dashboardReason: "适合补“下标差 = 公差段数”的基础动作。",
    dashboardTask: "先把数列项和公差节奏重新连起来。",
    plan: createLearningPlan({
      sceneId: "scene-sequence",
      targetId: "seq-arithmetic",
      goal: "把等差数列做成“先找公差，再回推项”的稳定路径",
      interpretation:
        "你在数列里更像是节奏感不稳，而不是公式不会，所以需要先把下标差、公差和通项的关系重新理一遍。",
      whyStartHere:
        "先把数列概念和通项表达稳住，等差数列就不会只是背公式。",
      sessionPlan: "建议 3 次学习：数列概念、等差数列、数列求和。",
      nextCheckpoint: "当你能先写 $a_n = a_1 + (n-1)d$ 再做题，基本就稳了。",
      advice:
        "等差数列不要急着套现成结论，先写出项与公差的关系，错误会大幅减少。",
      recommendedStartId: "seq-concept",
      currentNodeId: "seq-arithmetic",
      nodes: [
        createNode("seq-concept", 1, 20, "先补“第几项”和“相邻差”的数列直觉。", "理解通项公式、递推和下标含义。", ["能说出 $a_n$ 和 $a_{n+1}$ 的关系", "能看下标差判断跨了几项"], ["把项数和间隔搞混"], "function-concept"),
        createNode("seq-arithmetic", 2, 25, "等差数列核心就是固定步长。", "补齐公差、通项公式和中项关系。", ["能用下标差求公差", "能在已知某两项时回推指定项"], ["下标差和公差段数对不上"], "seq-concept"),
        createNode("seq-sum-methods", 3, 20, "补完求项后，顺手把求和视角也接上。", "了解等差 / 等比和基础求和套路。", ["能区分求项题和求和题", "知道什么时候需要前 $n$ 项和"], ["求项和求和混为一谈"], "seq-arithmetic"),
      ],
    }),
  },
  {
    id: "scene-quadratic",
    title: "二次函数图像和性质总是串不起来",
    queryAliases: ["二次函数", "二次函数不会", "函数图像", "二次函数图像"],
    targetId: "function-quadratic",
    dashboardTitle: "二次函数",
    dashboardReason: "适合补函数主线，为不等式、零点、导数打地基。",
    dashboardTask: "先把函数概念和性质连接到图像上。",
    plan: createLearningPlan({
      sceneId: "scene-quadratic",
      targetId: "function-quadratic",
      goal: "把二次函数从“背图像结论”变成“会看参数和图像”",
      interpretation:
        "二次函数是很多后续模块的中枢，如果这里图像、性质和参数关系不稳，后面不等式和导数都会反复卡住。",
      whyStartHere:
        "先补集合和不等式，再接函数概念，最后看二次函数，逻辑链更完整。",
      sessionPlan: "建议 4 次学习：集合、不等式、函数概念、二次函数。",
      nextCheckpoint: "当你能从解析式直接说出开口、对称轴和最值位置，就可以进入零点和不等式。",
      advice:
        "二次函数别只背顶点式和图像结论，要练从参数看图像变化，这样迁移最强。",
      recommendedStartId: "set-concept",
      currentNodeId: "function-concept",
      nodes: [
        createNode("set-concept", 1, 10, "函数前先补集合，是为了把定义域和值域说清楚。", "回顾元素、集合和对应关系表达。", ["能理解函数是特殊对应关系", "能看懂定义域是一个集合"], ["集合概念太虚，后面定义域总漂"]),
        createNode("inequality-basic", 1, 20, "不等式帮助你理解区间和函数取值范围。", "补齐区间表示、解集和简单不等式。", ["能用区间描述取值范围", "能看懂函数值大于 / 小于某数的意义"], ["区间表达不稳"], "set-concept"),
        createNode("function-concept", 2, 25, "函数概念是二次函数之前必须走的一层。", "补回定义域、值域和对应关系。", ["能说明自变量、函数值和图像的关系", "能看懂函数解析式在说什么"], ["只会代值，不会看结构"], "inequality-basic"),
        createNode("function-properties", 2, 25, "先把单调性、奇偶性等性质视角装上。", "建立图像变化和函数性质之间的联系。", ["能通过图像描述单调区间", "能口头解释对称性"], ["图像和性质脱节"], "function-concept"),
        createNode("function-quadratic", 3, 30, "最后再集中补二次函数图像、对称轴和最值。", "训练从 $a,b,c$ 直接看图像和关键特征。", ["能由式子判断开口和顶点趋势", "能根据图像判断零点和最值"], ["会画图但不会解释参数作用"], "function-properties"),
      ],
    }),
  },
];

const learningScenarioMap = new Map(
  learningScenariosSeed.map((scenario) => [scenario.id, scenario])
);

export const mockLearningScenarios = learningScenariosSeed;
export const featuredLearningSceneIds = [
  "scene-derivative",
  "scene-probability",
  "scene-ellipse",
  "scene-trig-transform",
];

function normalizeText(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, "");
}

export function getMockQuestionById(questionId: string) {
  return mockQuestions.find((question) => question.id === questionId);
}

export function getMockDiagnosisByQuestionId(
  questionId: string,
  studentAnswer?: string
) {
  const scenario = diagnosisScenarios.find((item) => item.questionId === questionId);
  if (!scenario) {
    return undefined;
  }

  return {
    ...scenario.result,
    studentAnswer: studentAnswer || scenario.result.studentAnswer,
  };
}

export function getLatestDiagnosisSummary(questionId?: string) {
  const scenario = diagnosisScenarios.find((item) => item.questionId === questionId);
  return scenario?.result;
}

export function getFeaturedLearningScenarios() {
  return featuredLearningSceneIds
    .map((id) => learningScenarioMap.get(id))
    .filter((scenario): scenario is MockLearningScenario => Boolean(scenario));
}

export function resolveMockLearningScenario(params?: {
  query?: string;
  targetId?: string;
}) {
  const targetId = params?.targetId?.trim();
  if (targetId) {
    const exactTarget =
      learningScenariosSeed.find((scenario) => scenario.targetId === targetId) ||
      learningScenariosSeed.find((scenario) =>
        scenario.plan.nodes.some((node) => node.knowledgeId === targetId)
      );
    if (exactTarget) {
      return exactTarget;
    }
  }

  const query = params?.query?.trim();
  if (query) {
    const normalized = normalizeText(query);
    const scored = learningScenariosSeed
      .map((scenario) => {
        const haystacks = [
          scenario.title,
          scenario.dashboardTitle,
          scenario.targetId,
          ...scenario.queryAliases,
          ...scenario.plan.nodes.map(
            (node) =>
              `${node.knowledgeId}${getKnowledgeNode(node.knowledgeId)?.name || ""}`
          ),
        ];

        const score = haystacks.reduce((sum, candidate) => {
          const normalizedCandidate = normalizeText(candidate);
          if (normalizedCandidate === normalized) {
            return sum + 10;
          }
          if (
            normalizedCandidate.includes(normalized) ||
            normalized.includes(normalizedCandidate)
          ) {
            return sum + 4;
          }
          return sum;
        }, 0);

        return { scenario, score };
      })
      .sort((a, b) => b.score - a.score);

    if (scored[0] && scored[0].score > 0) {
      return scored[0].scenario;
    }
  }

  return learningScenarioMap.get("scene-derivative") || learningScenariosSeed[0];
}

export function getMockLearningPlan(params?: {
  query?: string;
  targetId?: string;
  baseLevel?: LearningPlan["baseLevel"];
  goalLevel?: LearningGoalLevel;
  generationMode?: LearningGenerationMode;
}) {
  const scenario = resolveMockLearningScenario(params);
  return createLearningPlan(
    {
      sceneId: scenario.plan.sceneId || scenario.id,
      targetId: scenario.plan.targetKnowledgeId || scenario.targetId,
      goal: scenario.plan.goal,
      interpretation: scenario.plan.interpretation,
      whyStartHere: scenario.plan.whyStartHere || "",
      sessionPlan: scenario.plan.sessionPlan || "",
      nextCheckpoint: scenario.plan.nextCheckpoint || "",
      advice: scenario.plan.advice,
      recommendedStartId:
        scenario.plan.recommendedStartId ||
        scenario.plan.nodes[0]?.knowledgeId ||
        scenario.targetId,
      currentNodeId:
        scenario.plan.currentNodeId ||
        scenario.plan.nodes[0]?.knowledgeId ||
        scenario.targetId,
      nodes: scenario.plan.nodes,
    },
    {
      baseLevel: params?.baseLevel,
      goalLevel: params?.goalLevel,
      generationMode: params?.generationMode,
    }
  );
}

export function getLearnHref(targetId: string, query?: string) {
  const scene = resolveMockLearningScenario({ targetId, query });
  const q = query || scene.title;
  return `/learn?target=${scene.targetId}&query=${encodeURIComponent(q)}`;
}

export function getDashboardLearningCards() {
  return getFeaturedLearningScenarios().map((scenario) => ({
    id: scenario.targetId,
    name: scenario.dashboardTitle,
    reason: scenario.dashboardReason,
    task: scenario.dashboardTask,
    href: getLearnHref(scenario.targetId, scenario.title),
  }));
}
