import type {
  DiagnosticResult,
  ErrorCategory,
  MicroExercise,
  PracticeQuestion,
} from "@/types";
import { buildFocusedKnowledgeContext } from "@/lib/ai/context";
import { getAIProvider } from "@/lib/ai/provider";
import {
  diagnosisEnrichmentSchema,
  diagnosticResultSchema,
} from "@/lib/ai/schemas";
import {
  getAllPrerequisites,
  getKnowledgeNode,
} from "@/lib/knowledge-graph";
import {
  getMockDiagnosisByQuestionId,
  getMockQuestionById,
} from "@/lib/mock-data";
import { buildMeta, withMeta } from "@/lib/services/meta";
import type { GenerateDiagnosisInput } from "@/lib/services/types";
import { ERROR_CATEGORY_LABELS } from "@/types";

export class NoDiagnosisNeededError extends Error {
  constructor() {
    super("当前答案无需诊断");
    this.name = "NoDiagnosisNeededError";
  }
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function chooseErrorCategory(question: PracticeQuestion): ErrorCategory {
  const text = question.problem;
  if (text.includes("\\ln") || text.includes("\\sqrt") || text.includes("定义域")) {
    return "condition";
  }
  if (text.includes("\\sin") || text.includes("\\cos")) {
    return "formula";
  }
  if (text.includes("等差数列")) {
    return "logic";
  }
  if (text.includes("椭圆")) {
    return "concept";
  }
  return "concept";
}

function buildQuestionBasedExercises(
  question: PracticeQuestion,
  primaryKnowledgeId: string
) {
  const nodeName = getKnowledgeNode(primaryKnowledgeId)?.name || "这个知识点";
  const options = question.options?.slice(0, 4) || [
    "先列条件",
    "先看题型",
    "直接代公式",
    "先做边界检查",
  ];

  const microExercises: MicroExercise[] = [
    {
      id: `${question.id}-fallback-m1`,
      problem: `做这类 ${nodeName} 题时，第一步最应该先确认什么？`,
      options,
      correctAnswer: options[0],
      purpose: `先把 ${nodeName} 的第一步入口动作练稳。`,
    },
    {
      id: `${question.id}-fallback-m2`,
      problem: `如果你在 ${nodeName} 题里已经列出了关键条件，下一步最该做什么？`,
      options: [
        "统一表达并检查约束",
        "直接跳到答案",
        "忽略边界",
        "换一个无关公式",
      ],
      correctAnswer: "统一表达并检查约束",
      purpose: "训练从条件进入稳定主线，而不是边做边改口。",
    },
  ];

  const retestQuestion: MicroExercise = {
    id: `${question.id}-fallback-r1`,
    problem: `回到 ${nodeName} 的同类题时，你应该优先保留哪一个动作？`,
    options: [
      "先看条件和题型入口",
      "先硬算一遍",
      "先跳结论",
      "先记答案形式",
    ],
    correctAnswer: "先看条件和题型入口",
    purpose: "确认你已经形成了正确的解题起手式。",
  };

  return {
    microExercises,
    retestQuestion,
  };
}

function buildRuleDiagnosis(question: PracticeQuestion, studentAnswer: string) {
  const primaryKnowledgeId = question.knowledgePoints[0];
  const primaryKnowledge = getKnowledgeNode(primaryKnowledgeId);
  const secondaryKnowledgeId =
    primaryKnowledge?.prerequisites[0] || primaryKnowledgeId;
  const secondaryKnowledge = getKnowledgeNode(secondaryKnowledgeId);
  const errorCategory = chooseErrorCategory(question);
  const knowledgeTargets = [secondaryKnowledge, primaryKnowledge].filter(
    (item): item is NonNullable<typeof item> => Boolean(item)
  );
  const backtrackPath = unique([
    ...knowledgeTargets.flatMap((node) => getAllPrerequisites(node.id)),
    ...knowledgeTargets.map((node) => node.id),
  ]);
  const exercises = buildQuestionBasedExercises(question, primaryKnowledgeId);

  return {
    questionId: question.id,
    isCorrect: false,
    studentAnswer,
    errorPinpoint: `你当前在「${primaryKnowledge?.name || "核心知识点"}」这一步没有形成稳定动作，导致答案虽然看起来接近，但关键判断没有站稳。`,
    errorStep: `先回看 ${primaryKnowledge?.name || "目标知识点"} 相关的题型入口，再组织后续计算。`,
    errorCategory,
    errorCategoryLabel: ERROR_CATEGORY_LABELS[errorCategory],
    whyWrong: `这道题更像是 ${primaryKnowledge?.name || "当前知识点"} 的动作链没串顺，而不是单个算式失误。先把入口和检查点练稳，后面的正确率会明显提升。`,
    prerequisitesToFix: knowledgeTargets.map((node) => ({
      id: node.id,
      name: node.name,
      reason: `先补 ${node.name}，把这类题最先要判断的动作和条件接稳。`,
    })),
    backtrackPath,
    miniLesson: `${primaryKnowledge?.name || "当前知识点"} 的稳定做法是：先看题型入口，再把关键条件单独列清，最后再推进计算。不要让“会做一点”替代“动作完整”。`,
    microExercises: exercises.microExercises,
    retestQuestion: exercises.retestQuestion,
    errorAnalysis: `${primaryKnowledge?.name || "当前知识点"} 动作链不稳。`,
    missingKnowledge: unique(knowledgeTargets.map((node) => node.id)),
    suggestedReview: unique(knowledgeTargets.map((node) => node.id)),
    explanation: `正确答案是 ${question.correctAnswer}。更重要的是先稳住 ${primaryKnowledge?.name || "当前知识点"} 这条主线，再回到原题。`,
    recommendedLearnTargetId: primaryKnowledgeId,
    recommendedLearnQuery: `${primaryKnowledge?.name || "这个知识点"} 总是做不稳`,
    recoveryTitle: `先回补 ${primaryKnowledge?.name || "这个知识点"}，再回来做同类题。`,
  } satisfies DiagnosticResult;
}

async function tryEnhanceDiagnosis(
  baseDiagnosis: DiagnosticResult,
  question: PracticeQuestion
) {
  const provider = getAIProvider();
  if (!provider.isConfigured()) {
    throw new Error("AI provider is not configured");
  }

  const focusedKnowledgeContext = buildFocusedKnowledgeContext({
    knowledgeIds: unique([
      ...question.knowledgePoints,
      ...baseDiagnosis.backtrackPath,
      ...baseDiagnosis.prerequisitesToFix.map((item) => item.id),
      ...(baseDiagnosis.recommendedLearnTargetId
        ? [baseDiagnosis.recommendedLearnTargetId]
        : []),
    ]),
  });

  const { object, provider: providerName, model } =
    await provider.generateStructured({
      system: [
        "你是高中数学错因诊断助手。",
        "你只能补写诊断文案和微练习，不要修改 questionId、错误分类、前置知识、回溯链和推荐学习目标。",
        "输出必须适合学生阅读，避免空泛鼓励。",
        "聚焦当前题目的关键误区，不要展开无关知识图谱。",
        "输出必须是纯文本 JSON 字段内容，不要使用 Markdown 代码块。",
        "不要输出 LaTeX 命令或反斜杠写法；例如用 A∩B、{2}、x^2，禁止 \\cap、\\{、\\sqrt 这类写法。",
      ].join("\n"),
      prompt: [
        `题目：${question.problem}`,
        question.options?.length
          ? `选项：${question.options.slice(0, 4).join(" | ")}`
          : "",
        question.hints?.length
          ? `题目提示：${question.hints.slice(0, 2).join("；")}`
          : "",
        `学生答案：${baseDiagnosis.studentAnswer}`,
        `正确答案：${question.correctAnswer}`,
        `错误分类：${baseDiagnosis.errorCategoryLabel}`,
        `涉及知识点：${question.knowledgePoints.join(", ")}`,
        "",
        "知识图谱上下文：",
        focusedKnowledgeContext,
        "",
        "写作约束：所有字符串都用自然语言纯文本，不要包含反斜杠或 LaTeX 命令。",
        "",
        "规则骨架：",
        `- questionId: ${baseDiagnosis.questionId}`,
        `- errorCategory: ${baseDiagnosis.errorCategory}`,
        `- prerequisitesToFix: ${baseDiagnosis.prerequisitesToFix
          .map((item) => `${item.id}(${item.name})`)
          .join(", ")}`,
        `- backtrackPath: ${baseDiagnosis.backtrackPath.join(" -> ")}`,
        `- recommendedLearnTargetId: ${baseDiagnosis.recommendedLearnTargetId || ""}`,
        `- recommendedLearnQuery: ${baseDiagnosis.recommendedLearnQuery || ""}`,
      ]
        .filter(Boolean)
        .join("\n"),
      schema: diagnosisEnrichmentSchema,
      temperature: 0.25,
      timeoutMs: 45_000,
    });

  return {
    diagnosis: diagnosticResultSchema.parse({
      ...baseDiagnosis,
      errorPinpoint: object.errorPinpoint,
      errorStep: object.errorStep || baseDiagnosis.errorStep,
      whyWrong: object.whyWrong,
      miniLesson: object.miniLesson,
      recoveryTitle: object.recoveryTitle || baseDiagnosis.recoveryTitle,
      microExercises: object.microExercises,
      retestQuestion: object.retestQuestion,
    }),
    providerName,
    model,
  };
}

export async function generateDiagnosis(input: GenerateDiagnosisInput) {
  const question = getMockQuestionById(input.question.id);
  if (!question) {
    throw new Error("当前题目不在后端支持范围内");
  }

  if (input.studentAnswer.trim() === question.correctAnswer) {
    throw new NoDiagnosisNeededError();
  }

  const ruleDiagnosis =
    getMockDiagnosisByQuestionId(question.id, input.studentAnswer) ||
    buildRuleDiagnosis(question, input.studentAnswer);

  try {
    const aiResult = await tryEnhanceDiagnosis(ruleDiagnosis, question);
    return withMeta(
      aiResult.diagnosis,
      buildMeta({
        requestId: input.requestId,
        source: "ai",
        degraded: false,
        provider: aiResult.providerName,
        model: aiResult.model,
      })
    );
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "AI enrichment was unavailable";

    return withMeta(
      diagnosticResultSchema.parse(ruleDiagnosis),
      buildMeta({
        requestId: input.requestId,
        source: "rule",
        degraded: true,
        reason,
      })
    );
  }
}
