import { NextResponse } from "next/server";
import { getMockDiagnosisByQuestionId } from "@/lib/mock-data";

export async function POST(request: Request) {
  try {
    const { question, studentAnswer } = await request.json();
    const questionId = question?.id;

    if (!questionId || !studentAnswer) {
      return NextResponse.json(
        { error: "请提供题目和学生答案" },
        { status: 400 }
      );
    }

    const diagnosis = getMockDiagnosisByQuestionId(questionId, studentAnswer);
    if (!diagnosis) {
      return NextResponse.json(
        { error: "当前题目还没有配置诊断场景" },
        { status: 404 }
      );
    }

    return NextResponse.json(diagnosis);
  } catch {
    return NextResponse.json(
      { error: "诊断生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}
