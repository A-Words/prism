import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildKnowledgeContext, isAIConfigured } from "@/lib/ai/context";
import { mockDiagnosis } from "@/lib/mock-data";

const MicroExerciseSchema = z.object({
  id: z.string(),
  problem: z.string().describe("题目，支持 LaTeX"),
  options: z.array(z.string()).optional().describe("选择题选项"),
  correctAnswer: z.string().describe("正确答案"),
  purpose: z.string().describe("为什么选这道微练习"),
});

const DiagnosticResultSchema = z.object({
  questionId: z.string(),
  isCorrect: z.boolean(),
  studentAnswer: z.string(),

  // 第一段：你错在哪里
  errorPinpoint: z.string().describe("一句话精准定位错误动作，不是笼统的'答案错了'，而是具体的错误操作"),
  errorStep: z.string().optional().describe("错在哪一步，简要描述"),

  // 第二段：为什么会错
  errorCategory: z.enum(["concept", "formula", "condition", "computation", "logic", "careless"])
    .describe("错误分类"),
  errorCategoryLabel: z.string().describe("错误分类的中文标签"),
  whyWrong: z.string().describe("为什么会犯这个错误，1-2 句话"),

  // 第三段：要补哪一层
  prerequisitesToFix: z.array(z.object({
    id: z.string().describe("知识点 ID"),
    name: z.string().describe("知识点名称"),
    reason: z.string().describe("为什么需要补这个"),
  })).min(1).max(2).describe("需要补的前置知识点，1-2 个，不贪多"),
  backtrackPath: z.array(z.string()).describe("回溯路径，从基础到薄弱知识点"),

  // 第四段：现在就补
  miniLesson: z.string().describe("超短讲解，核心概念 2-3 句话精讲，支持 LaTeX + Markdown"),
  microExercises: z.array(MicroExerciseSchema).length(2).describe("2 道针对性微练习"),
  retestQuestion: MicroExerciseSchema.describe("1 道回测题，与原题结构相似但数值不同"),

  // 兼容旧字段
  errorAnalysis: z.string().optional().describe("错误分析，兼容旧格式"),
  missingKnowledge: z.array(z.string()).describe("缺失知识点 ID"),
  suggestedReview: z.array(z.string()).describe("建议复习知识点 ID"),
  explanation: z.string().describe("完整正确解法，支持 LaTeX + Markdown"),
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
      prompt: `你是一位善于诊断学生错误的高中数学教师。请用"四段式"结构进行精准诊断。

${knowledgeContext}

## 题目信息
题目：${question.problem}
正确答案：${question.correctAnswer}
涉及知识点：${question.knowledgePoints.join(", ")}
题目难度：${question.difficulty}

## 学生答案
${studentAnswer}

## 四段式诊断要求

### 第一段：你错在哪里
- errorPinpoint：一句话定位具体的错误动作（不要写"答案错了"，要写"你在某一步做了什么"）
- errorStep：可选，指出错在哪一步

### 第二段：为什么会错
- errorCategory：从 concept/formula/condition/computation/logic/careless 中选一个
- errorCategoryLabel：对应中文标签
- whyWrong：1-2 句话解释错误根因

### 第三段：要补哪一层
- prerequisitesToFix：1-2 个需要补的前置知识点（从知识图谱选 ID），每个给出 name 和 reason
- backtrackPath：从基础到薄弱点的完整路径

### 第四段：现在就补
- miniLesson：2-3 句话超短讲解核心要点（支持 LaTeX），帮学生快速理解
- microExercises：生成 2 道针对性微练习（选择题），直接练习薄弱点
- retestQuestion：1 道回测题，结构与原题相同但数值不同，验证是否真正掌握

### 兼容字段
- explanation：完整正确解法
- missingKnowledge / suggestedReview：知识点 ID 列表

## 重要原则
- 所有知识点 ID 必须从知识图谱中选取
- 语气要鼓励学生，强调"这是可以突破的"
- 微练习和回测题必须有明确的选项和正确答案
- miniLesson 要精炼实用，不要冗长`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Diagnose API error:", error);
    return NextResponse.json(mockDiagnosis);
  }
}
