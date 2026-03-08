import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestId } from "@/lib/services/meta";
import { generateSolutionPath } from "@/lib/services/solve";

const requestSchema = z.object({
  problem: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const requestId = createRequestId();
    const { problem } = requestSchema.parse(await request.json());

    if (!problem || typeof problem !== "string") {
      return NextResponse.json(
        { error: "请提供有效的题目" },
        { status: 400 }
      );
    }

    const solutionPath = await generateSolutionPath({
      problem: problem.trim(),
      requestId,
    });

    return NextResponse.json(solutionPath);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请提供有效的题目" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "生成解题路径失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}
