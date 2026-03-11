import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestId } from "@/lib/services/meta";
import { generateSolutionPath } from "@/lib/services/solve";

const requestSchema = z.object({
  problem: z.string().min(1),
});

function extractProblem(body: unknown) {
  if (typeof body === "string") {
    return body.trim();
  }

  if (!body || typeof body !== "object") {
    return "";
  }

  const record = body as {
    problem?: unknown;
    question?: unknown;
  };

  if (typeof record.problem === "string") {
    return record.problem.trim();
  }

  if (typeof record.question === "string") {
    return record.question.trim();
  }

  if (
    record.question &&
    typeof record.question === "object" &&
    "problem" in record.question &&
    typeof record.question.problem === "string"
  ) {
    return record.question.problem.trim();
  }

  return "";
}

async function parseRequestBody(request: Request) {
  const rawText = await request.text();
  if (!rawText.trim()) {
    return { rawText, body: {} };
  }

  try {
    return {
      rawText,
      body: JSON.parse(rawText) as unknown,
    };
  } catch {
    const params = new URLSearchParams(rawText);
    const problem =
      params.get("problem") ||
      params.get("question") ||
      params.get("question[problem]");

    if (problem) {
      return {
        rawText,
        body: { problem },
      };
    }

    return {
      rawText,
      body: rawText,
    };
  }
}

export async function POST(request: Request) {
  let body: unknown = {};

  try {
    const requestId = createRequestId();
    const parsed = await parseRequestBody(request);
    body = parsed.body;
    const { problem } = requestSchema.parse({
      problem: extractProblem(body),
    });

    const solutionPath = await generateSolutionPath({
      problem,
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
