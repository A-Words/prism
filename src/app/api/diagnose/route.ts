import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildKnowledgeContext, isAIConfigured } from "@/lib/ai/context";
import { mockDiagnosis } from "@/lib/mock-data";

const DiagnosticResultSchema = z.object({
  questionId: z.string(),
  isCorrect: z.boolean(),
  studentAnswer: z.string(),
  errorAnalysis: z.string().describe("错误原因分析，支持 LaTeX"),
  missingKnowledge: z.array(z.string()).describe("缺失的知识点 ID"),
  suggestedReview: z.array(z.string()).describe("建议复习的知识点 ID，按顺序排列"),
  backtrackPath: z.array(z.string()).describe("回溯路径，从基础到薄弱知识点"),
  explanation: z
    .string()
    .describe("完整的正确解法和解释，支持 LaTeX 和 Markdown"),
});

export async function POST(request: Request) {
  try {
    const { question, studentAnswer } = await request.json();

    if (!question || !studentAnswer) {
      return NextResponse.json(
        { error: "请提供题目和学生答案" },
        { status: 400 }
      );
    }

    if (!isAIConfigured()) {
      return NextResponse.json(mockDiagnosis);
    }

    const knowledgeContext = buildKnowledgeContext();

    const { object } = await generateObject({
      model: openai(process.env.OPENAI_MODEL || "gpt-4o"),
      schema: DiagnosticResultSchema,
      prompt: `你是一位善于诊断学生错误的高中数学教师。请分析学生的错误答案，进行诊断并提供回溯方案。

${knowledgeContext}

## 题目信息
题目：${question.problem}
正确答案：${question.correctAnswer}
涉及知识点：${question.knowledgePoints.join(", ")}
题目难度：${question.difficulty}

## 学生答案
${studentAnswer}

## 诊断要求
1. **错误分析**：精准识别学生犯了什么错误，分析错误原因（计算错误、概念理解偏差、方法选择不当等）
2. **缺失知识**：从知识图谱中找出学生未掌握或掌握不牢固的知识点 ID
3. **回溯路径**：从最基础的前置知识开始，列出通向薄弱知识点的完整路径
4. **建议复习**：按学习顺序排列建议复习的知识点
5. **正确解法**：提供详细的正确解题过程，使用 LaTeX 和 Markdown 格式
6. 所有知识点 ID 必须从知识图谱中选取有效值

请进行详细、有建设性的诊断分析。语气要鼓励学生，指出改进方向。`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Diagnose API error:", error);
    return NextResponse.json(mockDiagnosis);
  }
}
