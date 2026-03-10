import type { DiagnosticResult, LearningPlan, SolutionPath } from "@/types";

const VALID_JSON_ESCAPES = new Set([
  '"',
  "\\",
  "/",
  "b",
  "f",
  "n",
  "r",
  "t",
  "u",
]);

const LATEX_COMMAND_PATTERN =
  "\\\\(?:frac|sqrt|sin|cos|tan|ln|log|leq|geq|le|ge|neq|times|cdot|cap|cup|subseteq|subset|supseteq|infty|alpha|beta|gamma|theta|pi|left|right|mid|sum|prod|int|to|pm|mp|cdots|ldots|in|notin|approx|equiv|overline|underline|vec)";
const INLINE_LATEX_FRAGMENT_RE = new RegExp(
  `(^|[\\s(（\\[【,:：;；])([A-Za-z0-9()[\\]{}^_+\\-*/=<>|,. \\\\]*${LATEX_COMMAND_PATTERN}[A-Za-z0-9()[\\]{}^_+\\-*/=<>|,. \\\\]*)(?=[$\\s)）\\]】,，.。!?！？:：;；]|$)`,
  "g"
);
const MATH_BLOCK_RE = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g;

function isEscaped(text: string, index: number) {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

function extractJsonPayload(text: string) {
  const stripped = stripCodeFence(text);
  const objectStart = stripped.indexOf("{");
  const objectEnd = stripped.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    return stripped.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = stripped.indexOf("[");
  const arrayEnd = stripped.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return stripped.slice(arrayStart, arrayEnd + 1);
  }

  return stripped;
}

function escapeInvalidJsonBackslashes(text: string) {
  let result = "";
  let inString = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"' && !isEscaped(text, index)) {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString && char === "\\") {
      const next = text[index + 1];
      if (!next || !VALID_JSON_ESCAPES.has(next)) {
        result += "\\\\";
        continue;
      }
    }

    result += char;
  }

  return result;
}

export async function repairStructuredJsonText({
  text,
}: {
  text: string;
  error: unknown;
}) {
  const extracted = extractJsonPayload(text);
  const repaired = escapeInvalidJsonBackslashes(extracted);
  return repaired === extracted ? extracted : repaired;
}

function wrapDelimitedLatex(text: string) {
  return text
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, expr: string) => `$${expr.trim()}$`)
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expr: string) => `$$${expr.trim()}$$`);
}

function wrapBareLatexFragments(text: string) {
  return text.replace(
    INLINE_LATEX_FRAGMENT_RE,
    (match, prefix: string, fragment: string) => {
      if (!fragment || fragment.includes("$")) {
        return match;
      }

      const normalizedFragment = fragment.trim();
      if (!normalizedFragment) {
        return match;
      }

      const trailingWhitespace = /\s$/.test(match) ? " " : "";
      return `${prefix}$${normalizedFragment}$${trailingWhitespace}`;
    }
  );
}

export function normalizeRenderableText(text: string) {
  if (!text) {
    return text;
  }

  const normalized = wrapDelimitedLatex(text.trim());
  const parts = normalized.split(MATH_BLOCK_RE);
  return parts
    .map((part) => {
      if (!part || part.startsWith("$")) {
        return part;
      }
      return wrapBareLatexFragments(part);
    })
    .join("");
}

function normalizeOptionalText(text?: string) {
  return text ? normalizeRenderableText(text) : text;
}

export function normalizeLearningPlanLatex(plan: LearningPlan): LearningPlan {
  return {
    ...plan,
    goal: normalizeRenderableText(plan.goal),
    interpretation: normalizeRenderableText(plan.interpretation),
    advice: normalizeRenderableText(plan.advice),
    whyStartHere: normalizeOptionalText(plan.whyStartHere),
    sessionPlan: normalizeOptionalText(plan.sessionPlan),
    nextCheckpoint: normalizeOptionalText(plan.nextCheckpoint),
    phases: plan.phases.map((phase) => ({
      ...phase,
      description: normalizeRenderableText(phase.description),
    })),
    nodes: plan.nodes.map((node) => ({
      ...node,
      objectives: node.objectives.map(normalizeRenderableText),
      reason: normalizeRenderableText(node.reason),
      learnWhat: normalizeOptionalText(node.learnWhat),
      masteryChecks: node.masteryChecks?.map(normalizeRenderableText),
      commonMistakes: node.commonMistakes?.map(normalizeRenderableText),
    })),
  };
}

export function normalizeSolutionPathLatex(path: SolutionPath): SolutionPath {
  return {
    ...path,
    problem: normalizeRenderableText(path.problem),
    summary: normalizeRenderableText(path.summary),
    portrait: {
      ...path.portrait,
      problemType: normalizeRenderableText(path.portrait.problemType),
      prerequisites: path.portrait.prerequisites.map((item) => ({
        ...item,
        why: normalizeRenderableText(item.why),
      })),
    },
    steps: path.steps.map((step) => ({
      ...step,
      title: normalizeRenderableText(step.title),
      content: normalizeRenderableText(step.content),
      explanation: normalizeRenderableText(step.explanation),
      whyThisStep: normalizeOptionalText(step.whyThisStep),
      commonMistake: normalizeOptionalText(step.commonMistake),
      alternativeApproach: normalizeOptionalText(step.alternativeApproach),
      branchRecoveryHint: normalizeOptionalText(step.branchRecoveryHint),
      interactionPoint: step.interactionPoint
        ? {
            ...step.interactionPoint,
            question: normalizeRenderableText(step.interactionPoint.question),
            options: step.interactionPoint.options?.map(normalizeRenderableText),
            hint: normalizeRenderableText(step.interactionPoint.hint),
            correctOption: normalizeOptionalText(step.interactionPoint.correctOption),
            correctFeedback: normalizeOptionalText(step.interactionPoint.correctFeedback),
            wrongFeedback: normalizeOptionalText(step.interactionPoint.wrongFeedback),
            recommendedLearningPathTargetId: step.interactionPoint.recommendedLearningPathTargetId,
            recommendedRecoveryNodeId: step.interactionPoint.recommendedRecoveryNodeId,
            recommendedLearnQuery: normalizeOptionalText(
              step.interactionPoint.recommendedLearnQuery
            ),
          }
        : undefined,
    })),
    guide: path.guide
      ? {
          ...path.guide,
          typeExplanation: normalizeRenderableText(path.guide.typeExplanation),
          prerequisites: path.guide.prerequisites.map((item) => ({
            ...item,
            why: normalizeRenderableText(item.why),
          })),
          commonMistakes: path.guide.commonMistakes.map((item) => ({
            ...item,
            description: normalizeRenderableText(item.description),
            why: normalizeRenderableText(item.why),
          })),
          stepHints: path.guide.stepHints.map(normalizeRenderableText),
        }
      : undefined,
  };
}

export function normalizeDiagnosticLatex(
  diagnosis: DiagnosticResult
): DiagnosticResult {
  return {
    ...diagnosis,
    studentAnswer: normalizeRenderableText(diagnosis.studentAnswer),
    errorPinpoint: normalizeRenderableText(diagnosis.errorPinpoint),
    errorStep: normalizeOptionalText(diagnosis.errorStep),
    whyWrong: normalizeRenderableText(diagnosis.whyWrong),
    prerequisitesToFix: diagnosis.prerequisitesToFix.map((item) => ({
      ...item,
      reason: normalizeRenderableText(item.reason),
    })),
    miniLesson: normalizeRenderableText(diagnosis.miniLesson),
    microExercises: diagnosis.microExercises.map((exercise) => ({
      ...exercise,
      problem: normalizeRenderableText(exercise.problem),
      options: exercise.options?.map(normalizeRenderableText),
      correctAnswer: normalizeRenderableText(exercise.correctAnswer),
      purpose: normalizeRenderableText(exercise.purpose),
    })),
    retestQuestion: {
      ...diagnosis.retestQuestion,
      problem: normalizeRenderableText(diagnosis.retestQuestion.problem),
      options: diagnosis.retestQuestion.options?.map(normalizeRenderableText),
      correctAnswer: normalizeRenderableText(diagnosis.retestQuestion.correctAnswer),
      purpose: normalizeRenderableText(diagnosis.retestQuestion.purpose),
    },
    errorAnalysis: normalizeOptionalText(diagnosis.errorAnalysis),
    explanation: normalizeRenderableText(diagnosis.explanation),
    recoveryTitle: normalizeOptionalText(diagnosis.recoveryTitle),
  };
}
