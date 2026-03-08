import { NextResponse } from "next/server";
import { getMockLearningPlan, resolveMockLearningScenario } from "@/lib/mock-data";

export async function POST(request: Request) {
  try {
    const {
      query,
      targetId,
      baseLevel,
      goalLevel,
      generationMode,
    } = await request.json();

    if (
      (!query || typeof query !== "string" || query.trim().length === 0) &&
      (!targetId || typeof targetId !== "string")
    ) {
      return NextResponse.json(
        { error: "请输入学习目标，或提供 targetId" },
        { status: 400 }
      );
    }

    const scenario = resolveMockLearningScenario({
      query: typeof query === "string" ? query : undefined,
      targetId: typeof targetId === "string" ? targetId : undefined,
    });

    const plan = getMockLearningPlan({
      query: typeof query === "string" ? query : scenario.title,
      targetId: scenario.targetId,
      baseLevel,
      goalLevel,
      generationMode,
    });

    return NextResponse.json(plan);
  } catch {
    return NextResponse.json(
      { error: "生成学习计划时出错，请稍后重试" },
      { status: 500 }
    );
  }
}
