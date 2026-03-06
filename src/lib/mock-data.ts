import type { SolutionPath, PracticeQuestion, DiagnosticResult } from "@/types";

/**
 * 示例解题路径：解一元二次不等式 x² - 3x + 2 < 0
 */
export const mockSolutionPath: SolutionPath = {
  problem: "解不等式 $x^2 - 3x + 2 < 0$",
  problemType: "一元二次不等式",
  difficulty: 2,
  steps: [
    {
      id: "s1",
      title: "审题分析",
      content: "识别题型：一元二次不等式，形如 $ax^2 + bx + c < 0$",
      explanation:
        "观察不等式的结构，确定这是一个标准的一元二次不等式问题。需要先求方程的根，再利用二次函数图像确定解集。",
      knowledgePoints: ["inequality-basic"],
      type: "analysis",
    },
    {
      id: "s2",
      title: "因式分解",
      content: "$x^2 - 3x + 2 = (x-1)(x-2)$",
      explanation:
        "将二次三项式分解因式。寻找两个数，使它们的乘积为 2，和为 -3。得到 -1 和 -2，因此 $x^2 - 3x + 2 = (x-1)(x-2)$。",
      knowledgePoints: ["function-quadratic"],
      type: "computation",
    },
    {
      id: "s3",
      title: "求方程的根",
      content: "令 $(x-1)(x-2) = 0$，得 $x_1 = 1, x_2 = 2$",
      explanation:
        "令不等式对应的方程等于零，分别解出两个根。这两个根将数轴划分为三个区间。",
      knowledgePoints: ["function-quadratic", "function-zero"],
      type: "computation",
    },
    {
      id: "s4",
      title: "分析二次函数图像",
      content:
        "因为 $a = 1 > 0$（开口朝上），函数在两根之间为负值",
      explanation:
        "二次函数 $y = x^2 - 3x + 2$ 的二次项系数 $a = 1 > 0$，图像开口朝上。根据抛物线的性质，函数值在两根之间小于零。",
      knowledgePoints: ["function-quadratic", "function-properties"],
      type: "reasoning",
    },
    {
      id: "s5",
      title: "写出解集",
      content: "解集为 $\\{x \\mid 1 < x < 2\\}$，即 $(1, 2)$",
      explanation:
        "因为需要 $(x-1)(x-2) < 0$，且二次项系数为正，所以解集为两根之间的开区间 $(1, 2)$。",
      knowledgePoints: ["inequality-basic", "set-operations"],
      type: "conclusion",
    },
    {
      id: "s6",
      title: "验证",
      content: "取 $x = 1.5$：$(1.5)^2 - 3(1.5) + 2 = 2.25 - 4.5 + 2 = -0.25 < 0$ ✓",
      explanation:
        "在解集中取一个特殊值验证结果的正确性，增强答案的可靠性。",
      knowledgePoints: [],
      type: "verification",
    },
  ],
  edges: [
    { source: "s1", target: "s2" },
    { source: "s2", target: "s3" },
    { source: "s3", target: "s4" },
    { source: "s4", target: "s5" },
    { source: "s5", target: "s6" },
  ],
  summary:
    "通过因式分解求根，结合二次函数图像（开口方向）确定不等号方向对应的区间，得到解集 $(1, 2)$。",
  relatedKnowledge: [
    "inequality-basic",
    "function-quadratic",
    "function-zero",
    "function-properties",
    "set-operations",
  ],
};

/**
 * 示例练习题
 */
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
      "先分别求出集合 A 和 B 的元素",
      "A = {2, 3}，B = {1, 2}",
      "交集是两个集合的公共元素",
    ],
  },
  {
    id: "q2",
    problem:
      "函数 $f(x) = \\ln(x-1) + \\sqrt{3-x}$ 的定义域为",
    options: ["$(1, 3]$", "$[1, 3]$", "$(1, 3)$", "$[1, 3)$"],
    correctAnswer: "$(1, 3]$",
    knowledgePoints: ["function-concept", "function-logarithmic", "inequality-basic"],
    difficulty: 2,
    type: "choice",
    hints: [
      "对数函数的真数必须大于 0：x - 1 > 0",
      "根号下的表达式必须非负：3 - x ≥ 0",
      "取交集：1 < x ≤ 3",
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
      "利用二倍角公式 cos2α = 1 - 2sin²α",
      "代入 sinα = 3/5",
      "cos2α = 1 - 2×(9/25) = 1 - 18/25 = 7/25",
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
      "设公差为 d，由 a₇ - a₃ = 4d 得 d = 3",
      "a₃ = a₁ + 2d = 7，所以 a₁ = 1",
      "a₁₀ = a₁ + 9d = 1 + 27 = 28",
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
      "椭圆的定义：|PF₁| + |PF₂| = 2a",
      "这里 a² = 4，所以 a = 2，2a = 4",
      "|PF₂| = 2a - |PF₁| = 4 - 3 = 1",
    ],
  },
];

/**
 * 示例诊断结果
 */
export const mockDiagnosis: DiagnosticResult = {
  questionId: "q3",
  isCorrect: false,
  studentAnswer: "$-\\frac{7}{25}$",
  errorAnalysis:
    "你选择了 $-\\frac{7}{25}$，答案的绝对值正确，但符号有误。问题出在没有正确使用二倍角公式。你可能使用了 $\\cos 2\\alpha = 2\\cos^2\\alpha - 1$ 但错误地计算了 $\\cos\\alpha$ 的值或符号。",
  missingKnowledge: ["trig-transform", "trig-identity"],
  suggestedReview: ["trig-identity", "trig-transform"],
  backtrackPath: ["trig-definition", "trig-identity", "trig-transform"],
  explanation:
    "**正确解法**：\n\n1. 已知 $\\sin\\alpha = \\frac{3}{5}$，$\\alpha \\in (\\frac{\\pi}{2}, \\pi)$\n2. 使用二倍角公式 $\\cos 2\\alpha = 1 - 2\\sin^2\\alpha$\n3. 代入：$\\cos 2\\alpha = 1 - 2 \\times \\frac{9}{25} = 1 - \\frac{18}{25} = \\frac{7}{25}$\n\n**关键点**：这里直接使用 $\\cos 2\\alpha = 1 - 2\\sin^2\\alpha$ 最为简便，因为已知条件直接给出了 $\\sin\\alpha$ 的值，无需额外求 $\\cos\\alpha$。",
};
