# Prism — AI 高中数学学习导航系统

> 把题目转成「解题路径图」，把目标知识转成「学习路径图」，依据学生作答动态回溯前置知识，提供可解释的个性化学习支持。

## 核心功能

### 1. 解题路径图 `/solve`
输入数学题目，AI 将其分解为结构化的解题步骤，生成可交互的路径图。每个节点标注步骤类型（审题分析、策略选择、计算推导、逻辑推理、验证检查、得出结论），揭示解题的完整思维链。

### 2. 学习路径图 `/learn`
选择目标知识点，系统自动计算从前置知识到目标的最优学习路径。路径图标注各节点的掌握程度（颜色编码），帮助学生识别需要补强的环节。

### 3. 练习诊断 `/practice`
智能练习系统，答错后 AI 精确分析错因、定位缺失知识点，并生成**知识回溯路径图**——从出错点追溯到需要巩固的前置知识，提供可解释的诊断结果。

### 4. 知识掌握总览 `/`
仪表盘展示 7 大模块（代数、几何、三角、概率统计、分析、向量、数列）共 50+ 知识点的掌握状态，以色条矩阵可视化学习进度。

## 技术架构

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router, Server Components) |
| UI | Tailwind CSS 4, Lucide Icons, 毛玻璃设计语言 |
| 图可视化 | React Flow (@xyflow/react v12) |
| 数学渲染 | KaTeX |
| AI | Vercel AI SDK + OpenAI Compatible Provider (结构化输出) |
| 状态 | Zustand (持久化到 localStorage) |
| 类型 | TypeScript 5, Zod Schema |

## 知识图谱

内置高中数学知识图谱（基于人教版新课标），涵盖：
- **集合与逻辑** — 集合概念、集合运算、命题与逻辑
- **不等式** — 一元二次不等式、基本不等式
- **函数** — 概念、性质、二次/指数/对数/幂函数、零点
- **三角函数** — 定义、图像、恒等变换、解三角形
- **向量** — 概念、运算、坐标表示、数量积
- **数列** — 等差/等比数列、求和方法
- **立体几何** — 空间几何体、位置关系、角与距离、向量法
- **解析几何** — 直线、圆、椭圆、双曲线、抛物线
- **概率统计** — 计数原理、排列组合、概率、分布、回归
- **导数** — 概念、运算、单调性、极值最值、综合应用

每个知识点定义了前置依赖关系，支持自动拓扑排序生成学习路径。

## 快速开始

```bash
# 安装依赖
npm install

# 配置 AI（可选，不配置则自动走规则兜底）
cp .env.local.example .env.local
# 编辑 .env.local 填入 OpenAI 或兼容接口的配置

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可使用。

## 目录结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局 + 侧边栏
│   ├── page.tsx                # 首页仪表盘
│   ├── solve/page.tsx          # 解题路径图
│   ├── learn/page.tsx          # 学习路径图
│   ├── practice/page.tsx       # 练习诊断
│   └── api/
│       ├── solve/route.ts      # AI 解题 API
│       ├── learn-path/route.ts # 学习路径 API
│       └── diagnose/route.ts   # 诊断回溯 API
├── components/
│   ├── graph/
│   │   ├── solution-node.tsx   # 解题步骤节点
│   │   ├── knowledge-node.tsx  # 知识点节点
│   │   └── diagnostic-node.tsx # 诊断节点
│   ├── nav/sidebar.tsx         # 侧边导航
│   └── ui/math-renderer.tsx    # KaTeX 数学渲染
├── lib/
│   ├── knowledge-graph.ts      # 知识图谱数据与算法
│   ├── mock-data.ts            # 题库 / 规则兜底 / 演示数据
│   ├── store.ts                # Zustand 状态管理
│   ├── utils.ts                # 工具函数
│   ├── ai/context.ts           # AI 上下文构建
│   ├── ai/provider.ts          # OpenAI 兼容 Provider 抽象
│   ├── ai/schemas.ts           # 结构化输出 Schema
│   └── services/               # learn-path / solve / diagnose 服务层
└── types/index.ts              # TypeScript 类型定义
```

## AI 模式

| 模式 | 条件 | 行为 |
|------|------|------|
| **AI 模式** | 配置了 `OPENAI_API_KEY` | 三条 API 优先走结构化 AI 生成，失败时自动回退到规则层 |
| **规则兜底模式** | 未配置 API Key | 学习路径、解题路径、诊断均返回可用的结构化规则结果 |

两种模式下 UI 完全一致。所有响应都会附带 `meta` 字段，标记当前结果来自 `ai` 还是 `rule`，以及是否发生降级。

## License

MIT
