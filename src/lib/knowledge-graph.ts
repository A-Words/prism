import type { KnowledgeNode } from "@/types";

/**
 * 高中数学知识图谱
 * 基于人教版新课标，涵盖必修和选择性必修核心知识点
 */
export const knowledgeNodes: KnowledgeNode[] = [
  // ============ 集合与逻辑 ============
  {
    id: "set-concept",
    name: "集合的概念",
    category: "algebra",
    description: "集合的含义、元素与集合的关系、集合的表示方法",
    prerequisites: [],
    difficulty: 1,
    keywords: ["集合", "元素", "属于", "列举法", "描述法"],
    module: "集合与常用逻辑用语",
  },
  {
    id: "set-operations",
    name: "集合的运算",
    category: "algebra",
    description: "交集、并集、补集的定义与运算",
    prerequisites: ["set-concept"],
    difficulty: 2,
    keywords: ["交集", "并集", "补集", "子集", "真子集"],
    module: "集合与常用逻辑用语",
  },
  {
    id: "proposition",
    name: "命题与逻辑",
    category: "algebra",
    description: "命题、充分条件、必要条件、充要条件",
    prerequisites: ["set-concept"],
    difficulty: 2,
    keywords: ["命题", "充分条件", "必要条件", "充要条件", "逆否命题"],
    module: "集合与常用逻辑用语",
  },

  // ============ 不等式 ============
  {
    id: "inequality-basic",
    name: "不等式的性质",
    category: "algebra",
    description: "不等式的基本性质与一元二次不等式",
    prerequisites: ["set-concept"],
    difficulty: 2,
    keywords: ["不等式", "一元二次不等式", "解集"],
    module: "一元二次不等式",
  },
  {
    id: "inequality-mean",
    name: "基本不等式",
    category: "algebra",
    description: "均值不等式及其应用：a+b ≥ 2√(ab)",
    prerequisites: ["inequality-basic"],
    difficulty: 3,
    keywords: ["基本不等式", "均值不等式", "最值", "一正二定三相等"],
    module: "一元二次不等式",
  },

  // ============ 函数 ============
  {
    id: "function-concept",
    name: "函数的概念",
    category: "algebra",
    description: "函数的定义、定义域、值域、对应关系",
    prerequisites: ["set-concept", "inequality-basic"],
    difficulty: 2,
    keywords: ["函数", "定义域", "值域", "对应关系", "映射"],
    module: "函数的概念与性质",
  },
  {
    id: "function-properties",
    name: "函数的性质",
    category: "algebra",
    description: "单调性、奇偶性、周期性",
    prerequisites: ["function-concept"],
    difficulty: 3,
    keywords: ["单调性", "奇偶性", "周期性", "对称性"],
    module: "函数的概念与性质",
  },
  {
    id: "function-quadratic",
    name: "二次函数",
    category: "algebra",
    description: "二次函数的图像、性质与应用",
    prerequisites: ["function-properties"],
    difficulty: 2,
    keywords: ["二次函数", "顶点", "对称轴", "开口方向", "判别式"],
    module: "函数的概念与性质",
  },
  {
    id: "function-exponential",
    name: "指数函数",
    category: "algebra",
    description: "指数运算、指数函数的图像与性质",
    prerequisites: ["function-properties"],
    difficulty: 3,
    keywords: ["指数", "指数函数", "指数运算", "单调性"],
    module: "指数函数与对数函数",
  },
  {
    id: "function-logarithmic",
    name: "对数函数",
    category: "algebra",
    description: "对数运算、对数函数的图像与性质",
    prerequisites: ["function-exponential"],
    difficulty: 3,
    keywords: ["对数", "对数函数", "换底公式", "自然对数"],
    module: "指数函数与对数函数",
  },
  {
    id: "function-power",
    name: "幂函数",
    category: "algebra",
    description: "幂函数的概念、图像与性质",
    prerequisites: ["function-properties"],
    difficulty: 2,
    keywords: ["幂函数", "图像", "性质"],
    module: "指数函数与对数函数",
  },
  {
    id: "function-zero",
    name: "函数的零点",
    category: "algebra",
    description: "零点存在定理、二分法",
    prerequisites: ["function-properties", "function-quadratic"],
    difficulty: 3,
    keywords: ["零点", "零点存在定理", "二分法", "方程的根"],
    module: "函数的概念与性质",
  },

  // ============ 三角函数 ============
  {
    id: "trig-angle",
    name: "角的概念推广",
    category: "trigonometry",
    description: "任意角、弧度制",
    prerequisites: [],
    difficulty: 2,
    keywords: ["任意角", "弧度制", "象限角", "终边"],
    module: "三角函数",
  },
  {
    id: "trig-definition",
    name: "三角函数定义",
    category: "trigonometry",
    description: "正弦、余弦、正切的定义",
    prerequisites: ["trig-angle"],
    difficulty: 2,
    keywords: ["正弦", "余弦", "正切", "单位圆", "三角函数线"],
    module: "三角函数",
  },
  {
    id: "trig-identity",
    name: "同角三角函数关系",
    category: "trigonometry",
    description: "sin²α + cos²α = 1, tanα = sinα/cosα 等基本关系",
    prerequisites: ["trig-definition"],
    difficulty: 2,
    keywords: ["同角关系", "平方关系", "商数关系"],
    module: "三角函数",
  },
  {
    id: "trig-graph",
    name: "三角函数图像",
    category: "trigonometry",
    description: "正弦、余弦、正切函数的图像与性质",
    prerequisites: ["trig-definition", "function-properties"],
    difficulty: 3,
    keywords: ["正弦曲线", "振幅", "周期", "相位", "频率"],
    module: "三角函数",
  },
  {
    id: "trig-transform",
    name: "三角恒等变换",
    category: "trigonometry",
    description: "两角和差公式、二倍角公式、辅助角公式",
    prerequisites: ["trig-identity"],
    difficulty: 4,
    keywords: ["和差公式", "二倍角", "半角公式", "辅助角公式", "降幂"],
    module: "三角函数",
  },
  {
    id: "trig-solve-triangle",
    name: "解三角形",
    category: "trigonometry",
    description: "正弦定理、余弦定理及其应用",
    prerequisites: ["trig-transform"],
    difficulty: 3,
    keywords: ["正弦定理", "余弦定理", "面积公式", "解三角形"],
    module: "三角函数",
  },

  // ============ 平面向量 ============
  {
    id: "vector-concept",
    name: "向量的概念",
    category: "vector",
    description: "向量的定义、相等向量、共线向量",
    prerequisites: [],
    difficulty: 2,
    keywords: ["向量", "模", "方向", "相等向量", "共线"],
    module: "平面向量及其应用",
  },
  {
    id: "vector-operations",
    name: "向量的运算",
    category: "vector",
    description: "向量的加减法、数乘运算",
    prerequisites: ["vector-concept"],
    difficulty: 2,
    keywords: ["向量加法", "向量减法", "数乘", "平行四边形法则"],
    module: "平面向量及其应用",
  },
  {
    id: "vector-coordinate",
    name: "向量的坐标表示",
    category: "vector",
    description: "平面向量的坐标运算",
    prerequisites: ["vector-operations"],
    difficulty: 2,
    keywords: ["坐标", "坐标运算", "基向量"],
    module: "平面向量及其应用",
  },
  {
    id: "vector-dot-product",
    name: "向量的数量积",
    category: "vector",
    description: "数量积的定义、性质与应用",
    prerequisites: ["vector-coordinate", "trig-definition"],
    difficulty: 3,
    keywords: ["数量积", "点积", "夹角", "投影", "垂直"],
    module: "平面向量及其应用",
  },

  // ============ 数列 ============
  {
    id: "seq-concept",
    name: "数列的概念",
    category: "sequence",
    description: "数列的定义、通项公式、递推公式",
    prerequisites: ["function-concept"],
    difficulty: 2,
    keywords: ["数列", "通项公式", "递推公式", "有穷数列", "无穷数列"],
    module: "数列",
  },
  {
    id: "seq-arithmetic",
    name: "等差数列",
    category: "sequence",
    description: "等差数列的定义、通项公式、求和公式",
    prerequisites: ["seq-concept"],
    difficulty: 2,
    keywords: ["等差数列", "公差", "等差中项", "前n项和"],
    module: "数列",
  },
  {
    id: "seq-geometric",
    name: "等比数列",
    category: "sequence",
    description: "等比数列的定义、通项公式、求和公式",
    prerequisites: ["seq-concept"],
    difficulty: 3,
    keywords: ["等比数列", "公比", "等比中项", "前n项和"],
    module: "数列",
  },
  {
    id: "seq-sum-methods",
    name: "数列求和方法",
    category: "sequence",
    description: "分组求和、裂项求和、错位相减法等",
    prerequisites: ["seq-arithmetic", "seq-geometric"],
    difficulty: 4,
    keywords: ["分组求和", "裂项求和", "错位相减", "倒序相加"],
    module: "数列",
  },

  // ============ 立体几何 ============
  {
    id: "solid-basic",
    name: "空间几何体",
    category: "geometry",
    description: "棱柱、棱锥、棱台、圆柱、圆锥、球",
    prerequisites: [],
    difficulty: 2,
    keywords: ["棱柱", "棱锥", "圆柱", "圆锥", "球", "三视图"],
    module: "立体几何初步",
  },
  {
    id: "solid-position",
    name: "空间位置关系",
    category: "geometry",
    description: "点线面的位置关系、平行与垂直判定",
    prerequisites: ["solid-basic"],
    difficulty: 3,
    keywords: ["平行", "垂直", "线面关系", "面面关系", "异面直线"],
    module: "立体几何初步",
  },
  {
    id: "solid-angle-distance",
    name: "空间角与距离",
    category: "geometry",
    description: "线线角、线面角、二面角、点到面距离",
    prerequisites: ["solid-position", "vector-dot-product"],
    difficulty: 4,
    keywords: ["二面角", "线面角", "异面直线所成角", "距离"],
    module: "空间向量与立体几何",
  },
  {
    id: "solid-vector",
    name: "空间向量法",
    category: "geometry",
    description: "用空间向量求角度和距离",
    prerequisites: ["solid-angle-distance", "vector-dot-product"],
    difficulty: 4,
    keywords: ["空间向量", "法向量", "空间坐标系"],
    module: "空间向量与立体几何",
  },

  // ============ 解析几何 ============
  {
    id: "analytic-line",
    name: "直线方程",
    category: "geometry",
    description: "直线的各种方程形式、位置关系",
    prerequisites: ["function-concept", "vector-coordinate"],
    difficulty: 2,
    keywords: ["斜率", "点斜式", "两点式", "一般式", "截距式"],
    module: "直线和圆的方程",
  },
  {
    id: "analytic-circle",
    name: "圆的方程",
    category: "geometry",
    description: "圆的标准方程和一般方程",
    prerequisites: ["analytic-line"],
    difficulty: 2,
    keywords: ["圆的方程", "标准方程", "一般方程", "圆心", "半径"],
    module: "直线和圆的方程",
  },
  {
    id: "analytic-ellipse",
    name: "椭圆",
    category: "geometry",
    description: "椭圆的定义、标准方程与几何性质",
    prerequisites: ["analytic-circle", "function-properties"],
    difficulty: 4,
    keywords: ["椭圆", "焦点", "离心率", "长轴", "短轴", "准线"],
    module: "圆锥曲线的方程",
  },
  {
    id: "analytic-hyperbola",
    name: "双曲线",
    category: "geometry",
    description: "双曲线的定义、标准方程与几何性质",
    prerequisites: ["analytic-ellipse"],
    difficulty: 4,
    keywords: ["双曲线", "焦点", "离心率", "渐近线", "虚轴", "实轴"],
    module: "圆锥曲线的方程",
  },
  {
    id: "analytic-parabola",
    name: "抛物线",
    category: "geometry",
    description: "抛物线的定义、标准方程与几何性质",
    prerequisites: ["analytic-ellipse"],
    difficulty: 4,
    keywords: ["抛物线", "焦点", "准线", "焦半径"],
    module: "圆锥曲线的方程",
  },
  {
    id: "analytic-comprehensive",
    name: "圆锥曲线综合",
    category: "geometry",
    description: "直线与圆锥曲线的位置关系、弦长与面积",
    prerequisites: ["analytic-ellipse", "analytic-hyperbola", "analytic-parabola"],
    difficulty: 5,
    keywords: ["韦达定理", "弦长公式", "联立方程", "面积", "最值"],
    module: "圆锥曲线的方程",
  },

  // ============ 概率与统计 ============
  {
    id: "prob-counting",
    name: "计数原理",
    category: "probability",
    description: "加法原理、乘法原理",
    prerequisites: [],
    difficulty: 2,
    keywords: ["加法原理", "乘法原理", "分类", "分步"],
    module: "计数原理与概率",
  },
  {
    id: "prob-permutation",
    name: "排列组合",
    category: "probability",
    description: "排列数、组合数的计算与应用",
    prerequisites: ["prob-counting"],
    difficulty: 3,
    keywords: ["排列", "组合", "排列数", "组合数"],
    module: "计数原理与概率",
  },
  {
    id: "prob-binomial",
    name: "二项式定理",
    category: "probability",
    description: "二项式展开、二项式系数、特定项",
    prerequisites: ["prob-permutation"],
    difficulty: 3,
    keywords: ["二项式定理", "展开式", "通项", "二项式系数"],
    module: "计数原理与概率",
  },
  {
    id: "prob-basic",
    name: "概率基础",
    category: "probability",
    description: "随机事件、古典概型、几何概型",
    prerequisites: ["prob-counting"],
    difficulty: 2,
    keywords: ["概率", "古典概型", "几何概型", "随机事件"],
    module: "统计与概率",
  },
  {
    id: "prob-conditional",
    name: "条件概率",
    category: "probability",
    description: "条件概率、全概率公式、贝叶斯公式",
    prerequisites: ["prob-basic", "prob-permutation"],
    difficulty: 3,
    keywords: ["条件概率", "独立事件", "全概率", "贝叶斯"],
    module: "计数原理与概率",
  },
  {
    id: "prob-distribution",
    name: "离散型随机变量",
    category: "probability",
    description: "分布表、期望、方差、二项分布",
    prerequisites: ["prob-conditional"],
    difficulty: 4,
    keywords: ["随机变量", "分布表", "期望", "方差", "二项分布", "正态分布"],
    module: "计数原理与概率",
  },
  {
    id: "stat-basic",
    name: "统计基础",
    category: "probability",
    description: "抽样方法、频率分布、数字特征",
    prerequisites: [],
    difficulty: 2,
    keywords: ["抽样", "频率", "直方图", "平均数", "中位数", "方差"],
    module: "统计与概率",
  },
  {
    id: "stat-regression",
    name: "回归分析",
    category: "probability",
    description: "散点图、最小二乘法、回归直线",
    prerequisites: ["stat-basic", "analytic-line"],
    difficulty: 3,
    keywords: ["散点图", "回归", "最小二乘法", "相关系数"],
    module: "统计与概率",
  },

  // ============ 导数 ============
  {
    id: "derivative-concept",
    name: "导数的概念",
    category: "analysis",
    description: "导数的定义、几何意义、物理意义",
    prerequisites: ["function-properties"],
    difficulty: 3,
    keywords: ["导数", "极限", "切线", "变化率", "瞬时速度"],
    module: "一元函数的导数及其应用",
  },
  {
    id: "derivative-rules",
    name: "导数运算法则",
    category: "analysis",
    description: "基本求导公式、四则运算、复合函数求导",
    prerequisites: ["derivative-concept", "function-exponential", "function-logarithmic"],
    difficulty: 3,
    keywords: ["求导公式", "和差求导", "积商求导", "链式法则"],
    module: "一元函数的导数及其应用",
  },
  {
    id: "derivative-monotonicity",
    name: "导数与单调性",
    category: "analysis",
    description: "利用导数判断函数单调性",
    prerequisites: ["derivative-rules"],
    difficulty: 3,
    keywords: ["单调递增", "单调递减", "导数正负"],
    module: "一元函数的导数及其应用",
  },
  {
    id: "derivative-extremum",
    name: "导数与极值最值",
    category: "analysis",
    description: "极大值、极小值、最大值、最小值的求法",
    prerequisites: ["derivative-monotonicity"],
    difficulty: 4,
    keywords: ["极值", "最值", "极大值", "极小值", "驻点"],
    module: "一元函数的导数及其应用",
  },
  {
    id: "derivative-comprehensive",
    name: "导数综合应用",
    category: "analysis",
    description: "含参讨论、不等式证明、零点问题",
    prerequisites: ["derivative-extremum", "inequality-mean"],
    difficulty: 5,
    keywords: ["含参讨论", "恒成立", "存在性", "不等式证明", "零点"],
    module: "一元函数的导数及其应用",
  },

  // ============ 复数 ============
  {
    id: "complex-number",
    name: "复数",
    category: "algebra",
    description: "复数的概念、运算、几何意义",
    prerequisites: ["function-quadratic"],
    difficulty: 2,
    keywords: ["复数", "虚数", "实部", "虚部", "共轭", "模"],
    module: "复数",
  },
];

/**
 * 根据 ID 获取知识节点
 */
export function getKnowledgeNode(id: string): KnowledgeNode | undefined {
  return knowledgeNodes.find((n) => n.id === id);
}

/**
 * 获取某个知识点的所有前置知识（递归）
 */
export function getAllPrerequisites(nodeId: string): string[] {
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = getKnowledgeNode(current);
    if (!node) continue;

    for (const prereq of node.prerequisites) {
      if (!visited.has(prereq)) {
        visited.add(prereq);
        queue.push(prereq);
      }
    }
  }

  return Array.from(visited);
}

/**
 * 获取某个知识点的所有后继知识（谁依赖它）
 */
export function getDependents(nodeId: string): string[] {
  return knowledgeNodes
    .filter((n) => n.prerequisites.includes(nodeId))
    .map((n) => n.id);
}

/**
 * 获取从起点到目标的学习路径（拓扑排序）
 */
export function computeLearningPath(targetId: string): string[] {
  const allPrereqs = getAllPrerequisites(targetId);
  const relevant = [...allPrereqs, targetId];

  // 拓扑排序
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of relevant) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const id of relevant) {
    const node = getKnowledgeNode(id);
    if (!node) continue;
    for (const prereq of node.prerequisites) {
      if (relevant.includes(prereq)) {
        adj.get(prereq)?.push(id);
        inDegree.set(id, (inDegree.get(id) || 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    // 按难度排序，优先简单的
    queue.sort((a, b) => {
      const na = getKnowledgeNode(a);
      const nb = getKnowledgeNode(b);
      return (na?.difficulty || 0) - (nb?.difficulty || 0);
    });

    const current = queue.shift()!;
    sorted.push(current);

    for (const next of adj.get(current) || []) {
      const deg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  return sorted;
}

/**
 * 获取所有分类
 */
export function getCategories(): string[] {
  return [...new Set(knowledgeNodes.map((n) => n.category))];
}

/**
 * 按分类分组
 */
export function getNodesByCategory(): Map<string, KnowledgeNode[]> {
  const map = new Map<string, KnowledgeNode[]>();
  for (const node of knowledgeNodes) {
    const list = map.get(node.category) || [];
    list.push(node);
    map.set(node.category, list);
  }
  return map;
}

/**
 * 搜索知识点
 */
export function searchKnowledge(query: string): KnowledgeNode[] {
  const q = query.toLowerCase();
  return knowledgeNodes.filter(
    (n) =>
      n.name.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      n.keywords.some((k) => k.toLowerCase().includes(q)) ||
      n.module.toLowerCase().includes(q)
  );
}
