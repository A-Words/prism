import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestId } from "@/lib/services/meta";
import { generateLearningPlan } from "@/lib/services/learn-path";

const requestSchema = z.object({
  query: z.string().optional(),
  targetId: z.string().optional(),
  baseLevel: z.enum(["zero", "basic", "sprint"]).optional(),
  goalLevel: z.enum(["concept", "basic-problems", "comprehensive"]).optional(),
  generationMode: z.enum(["quick", "assessment"]).optional(),
  assessmentResults: z
    .array(
      z.object({
        questionId: z.string().min(1),
        knowledgeId: z.string().min(1),
        answer: z.string().min(1),
        isCorrect: z.boolean(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const requestId = createRequestId();
    const {
      query,
      targetId,
      baseLevel,
      goalLevel,
      generationMode,
      assessmentResults,
    } = requestSchema.parse(await request.json());

    if (
      (!query || typeof query !== "string" || query.trim().length === 0) &&
      (!targetId || typeof targetId !== "string")
    ) {
      return NextResponse.json(
        { error: "请输入学习目标，或提供 targetId" },
        { status: 400 }
      );
    }

    const plan = await generateLearningPlan({
      query: typeof query === "string" ? query : undefined,
      targetId: typeof targetId === "string" ? targetId : undefined,
      baseLevel,
      goalLevel,
      generationMode,
      assessmentResults,
      requestId,
    });

    return NextResponse.json(plan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "学习路径请求参数不合法" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "生成学习计划时出错，请稍后重试",
      },
      { status: 500 }
    );
  }
}
