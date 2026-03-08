import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateDiagnosis,
  NoDiagnosisNeededError,
} from "@/lib/services/diagnose";
import { createRequestId } from "@/lib/services/meta";

const requestSchema = z.object({
  question: z.object({
    id: z.string().min(1),
  }),
  studentAnswer: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const requestId = createRequestId();
    const { question, studentAnswer } = requestSchema.parse(await request.json());
    const questionId = question.id;

    if (!questionId || !studentAnswer) {
      return NextResponse.json(
        { error: "请提供题目和学生答案" },
        { status: 400 }
      );
    }

    const diagnosis = await generateDiagnosis({
      question,
      studentAnswer,
      requestId,
    });

    return NextResponse.json(diagnosis);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请提供题目和学生答案" },
        { status: 400 }
      );
    }
    if (error instanceof NoDiagnosisNeededError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (
      error instanceof Error &&
      error.message.includes("不在后端支持范围")
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "诊断生成失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}
