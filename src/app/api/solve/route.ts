import { NextResponse } from "next/server";
import { mockSolutionPath } from "@/lib/mock-data";

export async function POST(request: Request) {
  try {
    const { problem } = await request.json();

    if (!problem || typeof problem !== "string") {
      return NextResponse.json(
        { error: "请提供有效的题目" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ...mockSolutionPath,
      problem: problem.trim() || mockSolutionPath.problem,
    });
  } catch {
    return NextResponse.json(
      { error: "生成解题路径失败，请稍后重试" },
      { status: 500 }
    );
  }
}
