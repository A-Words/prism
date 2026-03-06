import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildKnowledgeContext, isAIConfigured } from "@/lib/ai/context";
import { mockSolutionPath } from "@/lib/mock-data";

const SolutionStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().describe("解题步骤内容，支持 LaTeX（用 $ 包裹）"),
  explanation: z.string().describe("详细解释"),
  knowledgePoints: z.array(z.string()).describe("关联的知识点 ID，从知识图谱中选择"),
  type: z.enum(["analysis", "strategy", "computation", "reasoning", "verification", "conclusion"]),
});

const SolutionPathSchema = z.object({
  problem: z.string(),
  problemType: z.string(),
  difficulty: z.number().min(1).max(5),
  steps: z.array(SolutionStepSchema),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
    })
  ),
  summary: z.string().describe("解题总结，支持 LaTeX"),
  relatedKnowledge: z.array(z.string()).describe("所有涉及的知识点 ID"),
});

export async function POST(request: Request) {
  try {
    const { problem } = await request.json();

    if (!problem || typeof problem !== "string") {
      return NextResponse.json(
        { error: "请提供有效的题目" },
        { status: 400 }
      );
    }

    if (!isAIConfigured()) {
      // Return mock data when AI is not configured
      return NextResponse.json(mockSolutionPath);
    }

    const knowledgeContext = buildKnowledgeContext();

    const { object } = await generateObject({
      model: openai(process.env.OPENAI_MODEL || "gpt-4o"),
      schema: SolutionPathSchema,
      prompt: `你是一位经验丰富的高中数学教师。请分析以下数学题目，生成结构化的解题路径。

${knowledgeContext}

## 要求
1. 将解题过程分解为清晰的步骤节点
2. 每个步骤必须包含：标题、内容（支持 LaTeX）、解释、关联知识点
3. 步骤类型：analysis(审题分析)、strategy(策略选择)、computation(计算推导)、reasoning(逻辑推理)、verification(验证检查)、conclusion(得出结论)
4. 知识点 ID 必须从上方知识图谱中选择有效的 ID
5. 边(edges)描述步骤之间的逻辑依赖关系
6. LaTeX 公式使用 $...$ 包裹行内公式，$$...$$ 包裹块级公式

## 题目
${problem}

请生成完整的解题路径。`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Solve API error:", error);
    // Fallback to mock
    return NextResponse.json(mockSolutionPath);
  }
}
