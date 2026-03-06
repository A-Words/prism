import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  getKnowledgeNode,
  computeLearningPath,
} from "@/lib/knowledge-graph";
import { buildKnowledgeContext, isAIConfigured } from "@/lib/ai/context";

const LearningPathNodeSchema = z.object({
  knowledgeId: z.string(),
  order: z.number(),
  estimatedMinutes: z.number(),
  learningObjectives: z.array(z.string()),
  suggestedResources: z.array(z.string()),
});

const LearningPathSchema = z.object({
  targetKnowledge: z.string(),
  path: z.array(LearningPathNodeSchema),
  totalEstimatedMinutes: z.number(),
  description: z.string(),
});

export async function POST(request: Request) {
  try {
    const { targetId, studentMastery } = await request.json();

    if (!targetId) {
      return NextResponse.json(
        { error: "请提供目标知识点 ID" },
        { status: 400 }
      );
    }

    const targetNode = getKnowledgeNode(targetId);
    if (!targetNode) {
      return NextResponse.json(
        { error: "知识点不存在" },
        { status: 404 }
      );
    }

    // Compute base learning path from graph
    const pathIds = computeLearningPath(targetId);

    if (!isAIConfigured()) {
      // Return computed path without AI enrichment
      const path = pathIds.map((id, i) => ({
        knowledgeId: id,
        order: i + 1,
        estimatedMinutes: 15,
        learningObjectives: [getKnowledgeNode(id)?.description || ""],
        suggestedResources: [],
      }));

      return NextResponse.json({
        targetKnowledge: targetId,
        path,
        totalEstimatedMinutes: path.length * 15,
        description: `学习"${targetNode.name}"需要掌握 ${pathIds.length} 个知识点。`,
      });
    }

    const knowledgeContext = buildKnowledgeContext();

    const { object } = await generateObject({
      model: openai(process.env.OPENAI_MODEL || "gpt-4o"),
      schema: LearningPathSchema,
      prompt: `你是一位经验丰富的高中数学教学规划师。请为学生制定学习"${targetNode.name}"的个性化学习路径。

${knowledgeContext}

## 目标知识点
${targetNode.name} (ID: ${targetId})
描述：${targetNode.description}

## 计算出的前置知识路径
${pathIds.map((id) => {
  const kn = getKnowledgeNode(id);
  return `- ${kn?.name} (${id}): ${kn?.description}`;
}).join("\n")}

## 学生当前掌握情况
${studentMastery ? JSON.stringify(studentMastery) : "未提供（假设从零开始）"}

## 要求
1. 为每个知识点提供学习目标和预估时间
2. 考虑学生已掌握的内容，可以跳过已完全掌握的知识点
3. 提供每个节点的学习建议
4. 路径应该由浅入深、循序渐进`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Learn path API error:", error);
    return NextResponse.json(
      { error: "生成学习路径时出错，请稍后重试" },
      { status: 500 }
    );
  }
}
