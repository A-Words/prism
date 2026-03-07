import type { SolutionPath, PracticeQuestion, DiagnosticResult } from "@/types";

/**
 * 示例解题路径：解一元二次不等式 x² - 3x + 2 < 0
 * 节点为"思维动作"而非"运算步骤"
 */
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
        `面对不等式，第一步不是急着算，而是先看清楚「要我求什么」。这里要求的是一个 $x$ 的集合——满足不等式的所有值。认出「一元二次不等式」这个题型，就能调动对应的解题策略。`,
      knowledgePoints: ["inequality-basic"],
      type: "analysis",
      whyThisStep:
        `做题第一步永远是审题，明确「问什么」才能选对方法。很多失分都源于没看清题型就动笔。`,
      commonMistake:
        `直接开始因式分解，忘记确定不等号的方向（< 还是 >），或混淆「解方程」与「解不等式」的区别。`,
      interactionPoint: {
        question: "看到这个不等式，你第一反应该做什么？",
        options: [
          "直接因式分解",
          "先判断题型和目标",
          "两边同时移项",
          "画函数图像",
        ],
        hint: '先判断题型（一元二次不等式）和目标（求解集），这样才能选对接下来的策略。"先理解再动手"是数学思维的核心习惯。',
      },
    },
    {
      id: "s2",
      title: "选择解题策略",
      content:
        "对一元二次不等式，核心策略：先化为对应方程求根，再结合二次函数图像判断区间。可选方法：因式分解法或判别式法。",
      explanation:
        `一元二次不等式的标准解法是「三步曲」：① 求根 ② 看开口 ③ 定区间。这里二次项系数 $a=1>0$，判别式 $\\Delta = 9 - 8 = 1 > 0$，有两个不等实根，适合因式分解法。`,
      knowledgePoints: ["inequality-basic", "function-quadratic"],
      type: "strategy",
      whyThisStep:
        "确认策略后再动手计算，避免走弯路。不同的系数、判别式情况会导致不同的求解路径。",
      commonMistake:
        "不检查 $\\Delta$ 直接分解，如果 $\\Delta < 0$，分解就行不通了。",
      alternativeApproach:
        "也可以用求根公式 $x = \\frac{3 \\pm \\sqrt{1}}{2}$ 来求根，不一定非要因式分解。",
      interactionPoint: {
        question: "对于 $x^2 - 3x + 2 < 0$，你倾向用什么方法求根？",
        options: ["因式分解", "求根公式", "配方法"],
        hint: `因式分解是最快的——找两个数，乘积为 2，和为 3。但「求根公式」是万能保底方案。`,
      },
    },
    {
      id: "s3",
      title: "定位临界点（求根）",
      content:
        "$x^2 - 3x + 2 = (x-1)(x-2) = 0$ → 根为 $x_1 = 1,\\ x_2 = 2$",
      explanation:
        `临界点就是不等式的「分界线」——在这些点上等号成立。它们把数轴分成三段，每一段的不等式符号是确定的。找到根就是找到地图上的「标记点」。`,
      knowledgePoints: ["function-quadratic", "function-zero"],
      type: "computation",
      whyThisStep:
        `根是数轴的「分界线」，找到它们才能确定在哪些区间内不等式成立。`,
      commonMistake:
        "因式分解符号出错：$x^2 - 3x + 2 \\neq (x+1)(x+2)$。要注意乘积为正、和为负时两个因子都是负数。",
      interactionPoint: {
        question:
          "找到根 $x=1$ 和 $x=2$ 后，它们把数轴分成了几个区间？",
        options: ["2 个", "3 个", "4 个"],
        hint: "两个根把数轴分成三段：$(-\\infty, 1)$、$(1, 2)$、$(2, +\\infty)$。每段内不等式的正负号不变。",
      },
    },
    {
      id: "s4",
      title: "利用开口方向判断区间符号",
      content:
        "$a = 1 > 0$（开口朝上），抛物线在两根之间位于 $x$ 轴下方 → 该区间内 $f(x) < 0$。",
      explanation:
        '这是最容易出错的一步。"开口朝上"意味着函数图像两头高、中间低，所以两根之间函数值为负。这个判断不需要代入计算，只需要理解二次函数的图形特征。',
      knowledgePoints: ["function-quadratic", "function-properties"],
      type: "reasoning",
      whyThisStep:
        "通过图像定性判断，避免逐区间代入试算。这是一元二次不等式的核心推理环节。",
      commonMistake:
        '记反了：开口朝上时"两根之间为负"。口诀："大于取两边，小于取中间"（对 $a>0$ 的情况）。',
      alternativeApproach:
        "如果不确定，可以在每个区间取一个测试点代入验证。",
      interactionPoint: {
        question:
          '为什么不用在每个区间都代入一个数来验证呢？',
        hint: '可以代入验算，但理解"开口方向决定区间正负"更高效，也是后续求解含参不等式的基础。不过考试时代入检验是好的"保险策略"。',
      },
    },
    {
      id: "s5",
      title: "检查边界是否可取",
      content:
        "不等号是严格 $<$（不含等号），因此端点 $x=1$ 和 $x=2$ 不在解集中。解集为开区间 $(1, 2)$。",
      explanation:
        "这一步经常被忽略！$<$ 和 $\\leq$ 的解集不同——前者用开区间，后者用闭区间。检查边界是拿分的关键细节。",
      knowledgePoints: ["inequality-basic", "set-operations"],
      type: "verification",
      whyThisStep:
        "开区间和闭区间的区别是常见失分点。养成每次都检查不等号是否含等号的习惯。",
      commonMistake:
        "把 $<$ 的解集写成 $[1, 2]$ 或混用圆括号和方括号。",
      interactionPoint: {
        question:
          "如果题目改成 $x^2 - 3x + 2 \\leq 0$，解集会怎么变？",
        options: ["$(1, 2)$", "$[1, 2]$", "$(1, 2]$"],
        hint: "$\\leq$ 包含等号，所以端点也满足条件。解集变为闭区间 $[1, 2]$。",
      },
    },
    {
      id: "s6",
      title: "组织答案并验证",
      content:
        "解集 $\\{x \\mid 1 < x < 2\\}$，即 $(1, 2)$。\n\n验证：取 $x = 1.5$：$(1.5)^2 - 3(1.5) + 2 = -0.25 < 0$ ✓",
      explanation:
        "最终答案要用规范的集合或区间形式书写。取一个点代入验证是良好的做题习惯，尤其在考试中能避免低级错误。",
      knowledgePoints: ["set-operations"],
      type: "conclusion",
      whyThisStep:
        "验证是思维闭环的最后一步。好的数学习惯 = 做完后花 10 秒验证。",
      interactionPoint: {
        question: "除了代入 $x=1.5$，你觉得还能怎么验证？",
        hint: "可以再取一个区间外的点（如 $x=0$ 或 $x=3$），确认这些点不满足不等式。双重验证更可靠。",
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
    '解题思路："判题型 → 选策略 → 找根 → 看开口定区间 → 查边界 → 验证"。核心是将不等式问题转化为图像问题，通过二次函数的"开口方向"快速判断解集。',
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
      `形如 $ax^2 + bx + c > 0$ 或 $< 0$ 的不等式。解法核心是「三步曲」：求根 → 看开口 → 定区间。适用于所有一元二次不等式，包括含参数的情况。`,
    prerequisites: [
      {
        id: "function-quadratic",
        name: "二次函数",
        why: "需要理解抛物线的开口方向和与 x 轴的交点关系",
      },
      {
        id: "inequality-basic",
        name: "不等式基础",
        why: "需要掌握不等式的基本性质和解集的表示方法",
      },
      {
        id: "set-operations",
        name: "集合运算",
        why: "解集需要用区间或集合形式表达",
      },
    ],
    commonMistakes: [
      {
        description: '开口方向判断反了——"大于取两边"还是"取中间"记混',
        why: "未建立二次函数图像与不等式解集的对应关系。建议画草图辅助。",
      },
      {
        description: "忘记检查不等号是否含等号，把 $<$ 写成 $\\leq$",
        why: "对开区间与闭区间的区别不够敏感。每次做完都检查一下不等号。",
      },
      {
        description: "因式分解符号出错",
        why: '分解时要同时满足"两数之积 = c"和"两数之和 = b"，注意正负号。',
      },
    ],
    stepHints: [
      "先看一下这个不等式长什么样——是一元二次的形式吗？",
      '想想"一元二次不等式"的标准解法是什么？三个关键步骤是？',
      "试着把左边因式分解，或者用求根公式求出根。",
      "画一个简单的抛物线草图——开口朝上还是朝下？两根在哪？",
      "在草图上标出需要的区域，确定开区间还是闭区间。",
      "取一个解集内的点代入验证一下。",
    ],
  },
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
 * 示例诊断结果（四段式）
 */
export const mockDiagnosis: DiagnosticResult = {
  questionId: "q3",
  isCorrect: false,
  studentAnswer: "$-\\frac{7}{25}$",

  // ---- 第一段：你错在哪里 ----
  errorPinpoint:
    "你选对了公式，但在求 $\\cos\\alpha$ 时把符号搞反了——第二象限的余弦应该是负值，你可能代入了正值。",
  errorStep:
    "在使用 $\\cos 2\\alpha = 2\\cos^2\\alpha - 1$ 时，先求 $\\cos\\alpha$，此时应注意 $\\alpha$ 在第二象限，$\\cos\\alpha < 0$。",

  // ---- 第二段：为什么会错 ----
  errorCategory: "condition",
  errorCategoryLabel: "条件识别错误",
  whyWrong:
    "题目给了 $\\alpha \\in (\\frac{\\pi}{2}, \\pi)$，这决定了 $\\cos\\alpha$ 的符号。你在计算中忽略了象限对三角函数符号的约束——这是三角函数题中最常见的失分点。",

  // ---- 第三段：要补哪一层 ----
  prerequisitesToFix: [
    {
      id: "trig-identity",
      name: "同角三角函数关系",
      reason:
        "需要熟练掌握 $\\sin^2\\alpha + \\cos^2\\alpha = 1$ 以及各象限的符号规则",
    },
    {
      id: "trig-transform",
      name: "三角恒等变换",
      reason:
        "二倍角公式有三种形式，要学会根据已知条件选最省力的那一个",
    },
  ],
  backtrackPath: ["trig-definition", "trig-identity", "trig-transform"],

  // ---- 第四段：现在就补 ----
  miniLesson:
    "**核心要点**：二倍角公式 $\\cos 2\\alpha$ 有三种等价形式：\n\n1. $\\cos 2\\alpha = \\cos^2\\alpha - \\sin^2\\alpha$\n2. $\\cos 2\\alpha = 2\\cos^2\\alpha - 1$\n3. $\\cos 2\\alpha = 1 - 2\\sin^2\\alpha$\n\n**选择技巧**：已知 $\\sin\\alpha$ 就用第 3 个，已知 $\\cos\\alpha$ 就用第 2 个——**直接代入，不需要先求另一个函数值**。这样既快又不会被象限符号绊倒。",

  microExercises: [
    {
      id: "micro-1",
      problem:
        "若 $\\cos\\alpha = -\\frac{4}{5}$，$\\alpha \\in (\\pi, \\frac{3\\pi}{2})$，则 $\\cos 2\\alpha$ = ?",
      options: [
        "$\\frac{7}{25}$",
        "$-\\frac{7}{25}$",
        "$\\frac{24}{25}$",
        "$-\\frac{24}{25}$",
      ],
      correctAnswer: "$\\frac{7}{25}$",
      purpose: "练习直接用 $\\cos 2\\alpha = 2\\cos^2\\alpha - 1$，无需求 $\\sin\\alpha$",
    },
    {
      id: "micro-2",
      problem:
        "若 $\\sin\\alpha = \\frac{5}{13}$，$\\alpha \\in (0, \\frac{\\pi}{2})$，则 $\\sin 2\\alpha$ = ?",
      options: [
        "$\\frac{120}{169}$",
        "$\\frac{60}{169}$",
        "$\\frac{119}{169}$",
        "$-\\frac{120}{169}$",
      ],
      correctAnswer: "$\\frac{120}{169}$",
      purpose: "综合运用：需要先求 $\\cos\\alpha$（注意象限），再用 $\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha$",
    },
  ],

  retestQuestion: {
    id: "retest-1",
    problem:
      "若 $\\sin\\alpha = \\frac{4}{5}$，$\\alpha \\in (\\frac{\\pi}{2}, \\pi)$，则 $\\cos 2\\alpha$ 的值为",
    options: [
      "$\\frac{7}{25}$",
      "$-\\frac{7}{25}$",
      "$\\frac{24}{25}$",
      "$-\\frac{24}{25}$",
    ],
    correctAnswer: "$-\\frac{7}{25}$",
    purpose: "回测：与原题结构相同但数值不同，检验是否真正掌握",
  },

  // ---- 兼容旧字段 ----
  errorAnalysis:
    "你选择了 $-\\frac{7}{25}$，答案的绝对值正确，但符号有误。",
  missingKnowledge: ["trig-transform", "trig-identity"],
  suggestedReview: ["trig-identity", "trig-transform"],
  explanation:
    "**正确解法**：\n\n1. 已知 $\\sin\\alpha = \\frac{3}{5}$，$\\alpha \\in (\\frac{\\pi}{2}, \\pi)$\n2. 使用二倍角公式 $\\cos 2\\alpha = 1 - 2\\sin^2\\alpha$\n3. 代入：$\\cos 2\\alpha = 1 - 2 \\times \\frac{9}{25} = 1 - \\frac{18}{25} = \\frac{7}{25}$\n\n**关键点**：这里直接使用 $\\cos 2\\alpha = 1 - 2\\sin^2\\alpha$ 最为简便，因为已知条件直接给出了 $\\sin\\alpha$ 的值，无需额外求 $\\cos\\alpha$。",
};
