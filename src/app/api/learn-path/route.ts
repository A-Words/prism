import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  knowledgeNodes,
  getKnowledgeNode,
  computeLearningPath,
  searchKnowledge,
} from "@/lib/knowledge-graph";
import { buildKnowledgeContext, isAIConfigured } from "@/lib/ai/context";
import type { LearningPlan } from "@/types";

// ---- Zod schema for AI structured output ----

const LearningPlanSchema = z.object({
  goal: z.string().describe("用一句话概括学习目标"),
  interpretation: z
    .string()
    .describe("对用户输入的理解：他想学什么、为什么、当前可能的水平"),
  phases: z.array(
    z.object({
      phase: z.number(),
      label: z.string(),
      description: z.string(),
    })
  ),
  nodes: z.array(
    z.object({
      knowledgeId: z.string().describe("必须是知识图谱中存在的 ID"),
      phase: z.number(),
      phaseLabel: z.string(),
      estimatedMinutes: z.number(),
      objectives: z.array(z.string()),
      backtrackTo: z.string().optional(),
      reason: z.string(),
    })
  ),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      type: z.enum(["progress", "backtrack"]),
      label: z.string().optional(),
    })
  ),
  totalEstimatedMinutes: z.number(),
  advice: z.string().describe("针对这个学习目标的个性化建议，1-3 句话"),
});

// ---- Fallback: local plan generation ----

function buildLocalPlan(
  query: string,
  studentMastery?: Record<string, { mastery: string }>
): LearningPlan {
  // Step 1: find target nodes from query
  let matchedNodes = searchKnowledge(query);

  // If no hits, try splitting and searching each word
  if (matchedNodes.length === 0) {
    const words = query
      .replace(/[，,。、？?！!]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    for (const w of words) {
      matchedNodes.push(...searchKnowledge(w));
    }
    // deduplicate
    const seen = new Set<string>();
    matchedNodes = matchedNodes.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }

  // Pick the most relevant (highest difficulty or last match)
  if (matchedNodes.length === 0) {
    matchedNodes = [getKnowledgeNode("function-quadratic")!];
  }

  // Use the most specific (highest difficulty) match as the target
  const target = matchedNodes.sort((a, b) => b.difficulty - a.difficulty)[0];
  const pathIds = computeLearningPath(target.id);

  // Partition into phases based on depth
  const totalSteps = pathIds.length;
  const phaseBreaks =
    totalSteps <= 3
      ? [totalSteps]
      : totalSteps <= 6
        ? [Math.ceil(totalSteps / 2), totalSteps]
        : [
            Math.ceil(totalSteps / 3),
            Math.ceil((totalSteps * 2) / 3),
            totalSteps,
          ];

  const phaseLabels = ["基础准备", "核心学习", "目标掌握"];
  const phaseDescs = [
    "夯实前置知识，确保地基牢固",
    "深入学习核心概念与方法",
    "掌握目标知识并融会贯通",
  ];

  let phaseIndex = 0;
  const nodes: LearningPlan["nodes"] = pathIds.map((id, i) => {
    while (
      phaseIndex < phaseBreaks.length - 1 &&
      i >= phaseBreaks[phaseIndex]
    ) {
      phaseIndex++;
    }
    const kn = getKnowledgeNode(id)!;
    const isMastered =
      studentMastery?.[id]?.mastery === "high" ||
      studentMastery?.[id]?.mastery === "full";

    return {
      knowledgeId: id,
      phase: phaseIndex + 1,
      phaseLabel: phaseLabels[phaseIndex] || "进阶",
      estimatedMinutes: isMastered ? 5 : kn.difficulty * 10,
      objectives: [kn.description],
      backtrackTo:
        kn.prerequisites.length > 0 ? kn.prerequisites[0] : undefined,
      reason:
        id === target.id
          ? "这是你的学习目标"
          : `学习「${target.name}」的前置知识`,
    };
  });

  // Build edges
  const edges: LearningPlan["edges"] = [];
  const pathSet = new Set(pathIds);

  for (const id of pathIds) {
    const kn = getKnowledgeNode(id);
    if (!kn) continue;
    for (const prereq of kn.prerequisites) {
      if (pathSet.has(prereq)) {
        edges.push({
          source: prereq,
          target: id,
          type: "progress" as const,
        });
      }
    }
    // backtrack edge
    if (kn.prerequisites.length > 0 && pathSet.has(kn.prerequisites[0])) {
      edges.push({
        source: id,
        target: kn.prerequisites[0],
        type: "backtrack" as const,
        label: "卡住时复习",
      });
    }
  }

  // Build phases array
  const usedPhases = [...new Set(nodes.map((n) => n.phase))];
  const phases: LearningPlan["phases"] = usedPhases.map((p) => ({
    phase: p,
    label: phaseLabels[p - 1] || `阶段 ${p}`,
    description: phaseDescs[p - 1] || "",
  }));

  const totalMin = nodes.reduce((s, n) => s + n.estimatedMinutes, 0);

  return {
    goal: `掌握「${target.name}」`,
    interpretation: `你想学习关于「${target.name}」的内容。这需要先掌握 ${pathIds.length - 1} 个前置知识点，分 ${phases.length} 个阶段逐步推进。`,
    phases,
    nodes,
    edges,
    totalEstimatedMinutes: totalMin,
    advice:
      "建议每天集中学习 30-45 分钟，按阶段顺序推进。遇到困难时回退到前置知识巩固，不要跳步。",
  };
}

// ---- Route handler ----

export async function POST(request: Request) {
  try {
    const { query, studentMastery } = await request.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "请输入你想学习的内容" },
        { status: 400 }
      );
    }

    // Fast path: no AI configured → local generation
    if (!isAIConfigured()) {
      const plan = buildLocalPlan(query, studentMastery);
      return NextResponse.json(plan);
    }

    // AI path
    const knowledgeContext = buildKnowledgeContext();
    const allIds = knowledgeNodes.map((n) => n.id).join(", ");

    const { object } = await generateObject({
      model: openai(process.env.OPENAI_MODEL || "gpt-4o"),
      schema: LearningPlanSchema,
      prompt: `你是 Prism——一位经验丰富的高中数学学习规划师。
学生用自然语言告诉你他想学什么，你要把他的话翻译成一个结构化的学习计划。

## 你的任务
1. **解读意图**：学生想学什么？可能的水平？
2. **确定目标节点**：从知识图谱中找到最匹配的目标
3. **规划路径**：从前置知识到目标，分阶段排列
4. **标注退路**：每个节点标注"卡住时退回哪一层"
5. **给出建议**：个性化学习建议

## 知识图谱（只能使用以下 ID）
合法的 knowledgeId 列表：${allIds}

${knowledgeContext}

## 学生当前掌握情况
${studentMastery ? JSON.stringify(studentMastery, null, 2) : "未提供（假设基础一般）"}

## 学生的原话
"${query.trim()}"

## 要求
- nodes 中的 knowledgeId 必须是上面列出的合法 ID
- 阶段分为：基础准备 → 核心学习 → 目标掌握（可多可少）
- 每个节点都要有 reason（为什么学这个）
- backtrackTo 指向"卡住时该退回复习"的节点 ID
- edges 包含 progress（前进）和 backtrack（退回）两类
- advice 要有温度、实用、1-3 句话
- 已掌握的知识点 estimatedMinutes 可以设小（5 分钟快速回顾）`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Learn-path API error:", error);

    // If AI fails, fallback to local
    try {
      const body = await request.clone().json();
      const plan = buildLocalPlan(body?.query || "二次函数", body?.studentMastery);
      return NextResponse.json(plan);
    } catch {
      return NextResponse.json(
        { error: "生成学习计划时出错，请稍后重试" },
        { status: 500 }
      );
    }
  }
}
