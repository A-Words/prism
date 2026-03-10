import type { ProblemGuide, SolutionPath, SolutionStep } from "@/types";
import { buildFocusedKnowledgeContext } from "@/lib/ai/context";
import { normalizeSolutionPathLatex } from "@/lib/ai/latex";
import { getAIProvider } from "@/lib/ai/provider";
import { solutionPathAiSchema, solutionPathSchema } from "@/lib/ai/schemas";
import { getKnowledgeNode } from "@/lib/knowledge-graph";
import { buildMeta, withMeta } from "@/lib/services/meta";
import type { GenerateSolutionPathInput } from "@/lib/services/types";

type TemplateId =
  | "quadratic-inequality"
  | "domain"
  | "trig-transform"
  | "conditional-probability"
  | "sequence"
  | "ellipse"
  | "generic";

type RuleSolutionPathDraft = Omit<SolutionPath, "portrait"> & {
  portrait?: SolutionPath["portrait"];
};

const VALID_STEP_TYPES = new Set([
  "analysis",
  "strategy",
  "computation",
  "reasoning",
  "verification",
  "conclusion",
] as const);

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function buildGuide(
  problemType: string,
  knowledgeIds: string[],
  commonMistakes: { description: string; why: string }[],
  stepHints: string[],
  typeExplanation: string
): ProblemGuide {
  return {
    problemType,
    typeExplanation,
    prerequisites: unique(knowledgeIds)
      .map((id) => getKnowledgeNode(id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node))
      .slice(0, 3)
      .map((node) => ({
        id: node.id,
        name: node.name,
        why: `这道题会直接调用 ${node.name} 的基本判断或表达方式。`,
      })),
    commonMistakes,
    stepHints,
  };
}

const INTERACTION_OVERRIDES: Partial<
  Record<
    TemplateId,
    Record<
      string,
      {
        correctOption?: string;
        question?: string;
        options?: string[];
        hint?: string;
        correctFeedback?: string;
        wrongFeedback?: string;
        recommendedLearningPathTargetId?: string;
        recommendedRecoveryNodeId?: string;
        recommendedLearnTargetId?: string;
        recommendedLearnQuery?: string;
        mistakeKnowledgeId?: string;
      }
    >
  >
> = {
  "quadratic-inequality": {
    s1: {
      question: "看到这个式子，第一步最该确认什么？",
      options: ["先因式分解", "先判断题型和目标", "先代几个值试试"],
      hint: "先确认它是一元二次不等式，目标是求解集而不是单个根。",
      correctOption: "先判断题型和目标",
      correctFeedback: "先把题型和目标看准，后面动作才不会跑偏。",
      wrongFeedback: "这一步先别急着算，先确认它是解不等式而不是解方程。",
      recommendedLearningPathTargetId: "function-quadratic",
      recommendedRecoveryNodeId: "inequality-basic",
      recommendedLearnTargetId: "inequality-basic",
      recommendedLearnQuery: "一元二次不等式总把解集和根混掉",
      mistakeKnowledgeId: "inequality-basic",
    },
    s2: {
      question: "这道题最稳的主策略是什么？",
      options: ["先求根再看图像", "直接背口诀写区间", "先随便代入几个值"],
      hint: "先找临界点，再用开口方向决定区间符号。",
      correctOption: "先求根再看图像",
      correctFeedback: "先找临界点再看开口方向，是这类题最稳的主线。",
      wrongFeedback: "直接背口诀或硬代值会让你失去区间判断的抓手。",
      recommendedLearningPathTargetId: "function-quadratic",
      recommendedRecoveryNodeId: "function-quadratic",
      recommendedLearnTargetId: "function-quadratic",
      recommendedLearnQuery: "二次函数图像和区间符号总连不起来",
      mistakeKnowledgeId: "function-quadratic",
    },
    s3: {
      question: "两个根会把数轴切成几段？",
      options: ["2 段", "3 段", "4 段"],
      hint: "两个临界点会把数轴切成左边、中间、右边三段。",
      correctOption: "3 段",
      correctFeedback: "两个临界点会把数轴切成三段，这是后面判断符号的底座。",
      wrongFeedback: "先把根和数轴分段连起来，别把求根停成孤立计算。",
      recommendedLearningPathTargetId: "function-quadratic",
      recommendedRecoveryNodeId: "function-zero",
      recommendedLearnTargetId: "function-zero",
      recommendedLearnQuery: "求根后总不会接数轴分段",
      mistakeKnowledgeId: "function-zero",
    },
    s5: {
      question: "如果原题改成 $\\le 0$，解集会怎么变？",
      options: ["仍是 $(1, 2)$", "变成 $[1, 2]$", "变成 $(1, 2]$"],
      hint: "含等号时，端点也满足条件，所以边界会并进去。",
      correctOption: "变成 $[1, 2]$",
      correctFeedback: "边界是否可取只由不等号是否含等号决定。",
      wrongFeedback: "最后一步别凭感觉，回到原不等号重新检查边界。",
      recommendedLearningPathTargetId: "set-operations",
      recommendedRecoveryNodeId: "set-operations",
      recommendedLearnTargetId: "set-operations",
      recommendedLearnQuery: "区间边界和集合表达总写错",
      mistakeKnowledgeId: "set-operations",
    },
  },
  domain: {
    s1: {
      question: "定义域题最稳的起手动作是什么？",
      options: ["先整体硬算", "先逐块列合法条件", "先猜答案区间"],
      hint: "定义域题要先对每一部分分别列条件，再统一合并。",
      correctOption: "先逐块列合法条件",
      correctFeedback: "先逐块列条件，后面的交集才有依据。",
      wrongFeedback: "如果先整体硬算，最容易漏掉某一部分的合法性约束。",
      recommendedLearningPathTargetId: "function-logarithmic",
      recommendedRecoveryNodeId: "function-concept",
      recommendedLearnTargetId: "function-concept",
      recommendedLearnQuery: "定义域题不知道先列条件还是先算",
      mistakeKnowledgeId: "function-concept",
    },
    s3: {
      question: "把条件列出来以后，下一步最该做什么？",
      options: ["直接写答案", "统一成区间再取交集", "只保留最严格的一个条件"],
      hint: "定义域题不是挑一个条件，而是把所有条件统一后取交集。",
      correctOption: "统一成区间再取交集",
      correctFeedback: "条件要先统一成区间，最后才能稳定做交集。",
      wrongFeedback: "定义域题别停在零散条件上，要把它们统一成区间再合并。",
      recommendedLearningPathTargetId: "function-logarithmic",
      recommendedRecoveryNodeId: "inequality-basic",
      recommendedLearnTargetId: "function-logarithmic",
      recommendedLearnQuery: "定义域题总在列条件和取交集时出错",
      mistakeKnowledgeId: "inequality-basic",
    },
  },
  "trig-transform": {
    s1: {
      question: "三角题一上来最该先看什么？",
      options: ["直接背一条熟悉公式", "先看已知量和目标量", "先设很多中间量"],
      hint: "先看已知什么、求什么，才能知道哪条公式路径最短。",
      correctOption: "先看已知量和目标量",
      correctFeedback: "先看已知量和目标量，公式选路会清晰很多。",
      wrongFeedback: "公式多不怕，怕的是没先看清条件和目标就乱套。",
      recommendedLearningPathTargetId: "trig-transform",
      recommendedRecoveryNodeId: "trig-transform",
      recommendedLearnTargetId: "trig-transform",
      recommendedLearnQuery: "三角恒等变换总会一上来乱套公式",
      mistakeKnowledgeId: "trig-transform",
    },
    s2: {
      question: "当已知量和目标量已经明确后，下一步最稳的动作是什么？",
      options: ["优先选最短公式路径", "把所有公式都试一遍", "先求出所有三角函数值"],
      hint: "优先选能直接把已知量送到目标量的公式，绕路越少越稳。",
      correctOption: "优先选最短公式路径",
      correctFeedback: "先看已知量和目标量，能直接连起来的公式优先。",
      wrongFeedback: "三角题一上来乱切公式，通常就是从这一步开始偏。",
      recommendedLearningPathTargetId: "trig-transform",
      recommendedRecoveryNodeId: "trig-transform",
      recommendedLearnTargetId: "trig-transform",
      recommendedLearnQuery: "三角恒等变换总会选错公式",
      mistakeKnowledgeId: "trig-transform",
    },
  },
  "conditional-probability": {
    s1: {
      question: "条件概率题先要分清什么？",
      options: ["目标事件和条件事件", "先把答案写成分数", "先套公式再解释"],
      hint: "先分清“求谁”和“已知谁”，样本空间才不会看错。",
      correctOption: "目标事件和条件事件",
      correctFeedback: "先把目标事件和条件事件分清，条件概率的入口就稳了。",
      wrongFeedback: "如果事件关系没拆开，后面的公式看起来对，实际会数错东西。",
      recommendedLearningPathTargetId: "prob-conditional",
      recommendedRecoveryNodeId: "prob-conditional",
      recommendedLearnTargetId: "prob-conditional",
      recommendedLearnQuery: "条件概率总分不清条件事件和目标事件",
      mistakeKnowledgeId: "prob-conditional",
    },
    s2: {
      question: "条件事件出现后，样本空间应该怎么处理？",
      options: ["保持原样不变", "重建为条件下的新样本空间", "只改分子不改分母"],
      hint: "条件概率的分母本质上就是条件事件对应的新观察范围。",
      correctOption: "重建为条件下的新样本空间",
      correctFeedback: "条件概率先缩小样本空间，方向就立住了。",
      wrongFeedback: "如果还在原样本空间里硬算，后面分子分母都会乱。",
      recommendedLearningPathTargetId: "prob-conditional",
      recommendedRecoveryNodeId: "prob-conditional",
      recommendedLearnTargetId: "prob-conditional",
      recommendedLearnQuery: "条件概率总把样本空间看错",
      mistakeKnowledgeId: "prob-conditional",
    },
  },
  sequence: {
    s1: {
      question: "等差数列题一开始最该看什么？",
      options: ["先看已知项和目标项的下标关系", "先背通项公式", "先猜公差大小"],
      hint: "先把第几项、求第几项和相差几段公差看清楚。",
      correctOption: "先看已知项和目标项的下标关系",
      correctFeedback: "先把下标关系看清，后面公差和目标项才不会一起偏。",
      wrongFeedback: "等差数列常见翻车点不是公式不会，而是下标差没看准。",
      recommendedLearningPathTargetId: "seq-arithmetic",
      recommendedRecoveryNodeId: "seq-concept",
      recommendedLearnTargetId: "seq-arithmetic",
      recommendedLearnQuery: "等差数列总把第几项和公差段数看混",
      mistakeKnowledgeId: "seq-arithmetic",
    },
    s2: {
      question: "确定它是等差数列后，下一步最稳的动作是什么？",
      options: ["先抓固定步长关系", "直接代目标项", "先列前 n 项和"],
      hint: "先用固定步长建立公差关系，再去回推目标项。",
      correctOption: "先抓固定步长关系",
      correctFeedback: "先抓固定步长，再回到通项，是等差数列最稳的节奏。",
      wrongFeedback: "下标差没看准时，后面的公差和目标项都会一起偏掉。",
      recommendedLearningPathTargetId: "seq-arithmetic",
      recommendedRecoveryNodeId: "seq-arithmetic",
      recommendedLearnTargetId: "seq-arithmetic",
      recommendedLearnQuery: "等差数列总把下标差看错",
      mistakeKnowledgeId: "seq-arithmetic",
    },
  },
  ellipse: {
    s1: {
      question: "椭圆题看到题目后，第一步最该判断什么？",
      options: ["直接联立方程", "先判断入口是定义、标准式还是焦点信息", "先把所有点坐标写出来"],
      hint: "椭圆题的关键是先判断入口，不是默认联立硬算。",
      correctOption: "先判断入口是定义、标准式还是焦点信息",
      correctFeedback: "先判断入口是标准式、定义还是焦点信息，比直接联立更稳。",
      wrongFeedback: "椭圆题一上来就硬算，通常会把本可直接用的定义浪费掉。",
      recommendedLearningPathTargetId: "analytic-ellipse",
      recommendedRecoveryNodeId: "analytic-ellipse",
      recommendedLearnTargetId: "analytic-ellipse",
      recommendedLearnQuery: "椭圆题总是找不到入口",
      mistakeKnowledgeId: "analytic-ellipse",
    },
  },
  generic: {
    s1: {
      question: "遇到陌生数学题时，第一步最稳的动作是什么？",
      options: ["先判断题型和目标", "先开始算", "先写最终答案的形式"],
      hint: "题型和目标决定后面该走哪条主线，先立方向再推进。",
      correctOption: "先判断题型和目标",
      correctFeedback: "先定题型和目标，才不会边算边改方向。",
      wrongFeedback: "不先定方向就开算，通常会把约束和主方法一起漏掉。",
      recommendedLearningPathTargetId: "function-quadratic",
      recommendedRecoveryNodeId: "function-concept",
      recommendedLearnTargetId: "function-concept",
      recommendedLearnQuery: "做题总是一上来就乱算",
      mistakeKnowledgeId: "function-concept",
    },
  },
};

function buildPortrait(
  problemType: string,
  difficulty: 1 | 2 | 3 | 4 | 5,
  knowledgeIds: string[],
  guide?: ProblemGuide
): SolutionPath["portrait"] {
  const uniqueKnowledge = unique(knowledgeIds)
    .map((id) => getKnowledgeNode(id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node));

  return {
    stage: "高中数学",
    problemType,
    difficulty,
    knowledgePoints: uniqueKnowledge.slice(0, 4).map((node) => ({
      id: node.id,
      name: node.name,
      category: node.category,
    })),
    prerequisites:
      guide?.prerequisites?.length
        ? guide.prerequisites.slice(0, 4)
        : uniqueKnowledge.slice(0, 3).map((node) => ({
            id: node.id,
            name: node.name,
            why: `这道题会调用 ${node.name} 的基础判断动作。`,
          })),
  };
}

function enrichRuleInteractions(template: TemplateId, steps: SolutionStep[]) {
  const overrides = INTERACTION_OVERRIDES[template] || {};
  return steps.map((step) => {
    const override = overrides[step.id];
    const interaction = step.interactionPoint || (override
      ? {
          question: override.question || "",
          options: override.options,
          hint: override.hint || "",
        }
      : undefined);
    if (!interaction) {
      return {
        ...step,
        branchType: step.branchType || "main",
      };
    }

    return {
      ...step,
      branchType: step.branchType || "main",
      interactionPoint: {
        ...interaction,
        question: interaction.question || override?.question || step.title,
        options: interaction.options || override?.options,
        hint:
          interaction.hint ||
          override?.hint ||
          "先回到当前节点的关键判断，不要直接跳到后面的运算。",
        correctOption:
          interaction.correctOption || override?.correctOption,
        correctFeedback:
          interaction.correctFeedback ||
          override?.correctFeedback ||
          "方向是对的，继续沿当前主线推进。",
        wrongFeedback:
          interaction.wrongFeedback ||
          override?.wrongFeedback ||
          "这一步已经偏离主线了，先回看当前节点的关键判断。",
        recommendedLearningPathTargetId:
          interaction.recommendedLearningPathTargetId ||
          override?.recommendedLearningPathTargetId ||
          interaction.recommendedLearnTargetId,
        recommendedRecoveryNodeId:
          interaction.recommendedRecoveryNodeId ||
          override?.recommendedRecoveryNodeId ||
          interaction.mistakeKnowledgeId ||
          override?.mistakeKnowledgeId ||
          step.knowledgePoints[0],
        recommendedLearnTargetId:
          interaction.recommendedLearnTargetId ||
          override?.recommendedLearnTargetId ||
          step.knowledgePoints[0],
        recommendedLearnQuery:
          interaction.recommendedLearnQuery ||
          override?.recommendedLearnQuery,
        mistakeKnowledgeId:
          interaction.mistakeKnowledgeId ||
          override?.mistakeKnowledgeId ||
          step.knowledgePoints[0],
      },
    } satisfies SolutionStep;
  });
}

function createSolutionEdges(steps: SolutionStep[]) {
  const mainSteps = steps.filter((step) => step.branchType !== "mistake");
  const mistakeSteps = steps.filter((step) => step.branchType === "mistake");

  const mainEdges = mainSteps.slice(0, -1).map((step, index) => ({
    source: step.id,
    target: mainSteps[index + 1].id,
    label: index === 0 ? "明确题型后" : "继续推进",
    type: "main" as const,
  }));

  const branchEdges = mistakeSteps.flatMap((step) => {
    if (!step.branchFromStepId) {
      return [];
    }
    return [
      {
        source: step.branchFromStepId,
        target: step.id,
        label: "若方向偏离",
        type: "mistake_branch" as const,
      },
      {
        source: step.id,
        target: step.branchFromStepId,
        label: "回到主线",
        type: "return_main" as const,
      },
    ];
  });

  return [...mainEdges, ...branchEdges];
}

function attachMistakeBranches(
  steps: SolutionStep[],
  guide?: ProblemGuide
) {
  const mainSteps = steps.map((step) => ({
    ...step,
    branchType: step.branchType || "main",
  }));
  const existingBranchSteps = mainSteps.filter(
    (step) => step.branchType === "mistake"
  );

  if (existingBranchSteps.length >= 2) {
    return {
      steps: mainSteps,
      edges: createSolutionEdges(mainSteps),
    };
  }

  const branchCandidates = mainSteps
    .filter(
      (step) =>
        step.branchType !== "mistake" &&
        step.commonMistake &&
        step.interactionPoint
    )
    .slice(0, Math.max(2, 2 - existingBranchSteps.length) + existingBranchSteps.length);

  const branchSteps = branchCandidates
    .filter(
      (step) =>
        !mainSteps.some(
          (item) =>
            item.branchType === "mistake" &&
            item.branchFromStepId === step.id
        )
    )
    .slice(0, 2)
    .map((step, index) => {
      const branchId = `${step.id}-mistake-${index + 1}`;
      const recoveryHint =
        step.branchRecoveryHint ||
        step.interactionPoint?.wrongFeedback ||
        `先回到「${step.title}」，把关键判断重新站稳，再继续主线。`;

      return {
        id: branchId,
        title: `易错分支：${step.title}`,
        content: `如果在这一步直接${step.commonMistake}，主线会从这里开始偏掉。`,
        explanation: `偏离原因：${step.commonMistake}`,
        knowledgePoints: [
          step.interactionPoint?.mistakeKnowledgeId || step.knowledgePoints[0],
        ].filter(Boolean),
        type: step.type,
        branchType: "mistake" as const,
        branchFromStepId: step.id,
        branchRecoveryHint: recoveryHint,
        whyThisStep: `这是一条高频错误路线，用来提醒你这一步最容易偏在哪里。`,
      } satisfies SolutionStep;
    });

  const allSteps = mainSteps
    .map((step) => {
      const branchStep = branchSteps.find(
        (item) => item.branchFromStepId === step.id
      );
      return branchStep && step.interactionPoint
        ? {
            ...step,
            interactionPoint: {
              ...step.interactionPoint,
              branchStepId: branchStep.id,
            },
          }
        : step;
    })
    .concat(branchSteps);

  return {
    steps: allSteps,
    edges: createSolutionEdges(allSteps),
  };
}

function finalizeSolutionPath(
  path: Omit<SolutionPath, "edges" | "portrait"> & {
    portrait?: SolutionPath["portrait"];
    edges?: SolutionPath["edges"];
  },
  template: TemplateId
): SolutionPath {
  const enrichedSteps = enrichRuleInteractions(template, path.steps);
  const withBranches = attachMistakeBranches(enrichedSteps, path.guide);
  const portrait =
    path.portrait ||
    buildPortrait(
      path.problemType,
      path.difficulty,
      unique([
        ...path.relatedKnowledge,
        ...withBranches.steps.flatMap((step) => step.knowledgePoints),
      ]),
      path.guide
    );

  return {
    ...path,
    portrait,
    steps: withBranches.steps,
    edges: path.edges?.length ? path.edges : withBranches.edges,
  };
}

function detectTemplate(problem: string): TemplateId {
  const text = problem.toLowerCase();

  if ((text.includes("x^2") || text.includes("x²")) && /[<>≤≥]/.test(text)) {
    return "quadratic-inequality";
  }
  if (text.includes("定义域") || text.includes("\\ln") || text.includes("\\sqrt")) {
    return "domain";
  }
  if (
    (text.includes("\\sin") || text.includes("\\cos") || text.includes("\\tan")) &&
    text.includes("2")
  ) {
    return "trig-transform";
  }
  if (text.includes("p(") && text.includes("|")) {
    return "conditional-probability";
  }
  if (text.includes("等差数列") || /a_\d/.test(text)) {
    return "sequence";
  }
  if (text.includes("椭圆") || /x\^2.*y\^2.*= ?1/.test(text)) {
    return "ellipse";
  }
  return "generic";
}

function buildRuleSolutionPath(
  problem: string,
  template: TemplateId
): RuleSolutionPathDraft {
  switch (template) {
    case "quadratic-inequality":
      return {
        problem,
        problemType: "一元二次不等式",
        difficulty: 2,
        steps: [
          {
            id: "s1",
            title: "判断题型与目标",
            content: `先确认这是一道一元二次不等式题，目标不是求单个根，而是求满足条件的解集：${problem}`,
            explanation: "先把题目看成“区间判断”而不是“方程求根”，后面的动作才会连贯。",
            knowledgePoints: ["inequality-basic"],
            type: "analysis",
            whyThisStep: "题型判断决定后面是走求根 + 图像，还是改走其他不等式策略。",
            commonMistake: "把不等式直接做成方程，只写出根却不写区间。",
          },
          {
            id: "s2",
            title: "选定标准解法",
            content: "把不等式转成对应方程，先找临界点，再结合二次函数图像判断区间符号。",
            explanation: "一元二次不等式的主线通常是：求根、看开口、定区间、查边界。",
            knowledgePoints: ["inequality-basic", "function-quadratic"],
            type: "strategy",
            whyThisStep: "先定策略，后做计算，能避免中途来回切解法。",
            commonMistake: "只会因式分解，但不知道为什么还要判断开口方向。",
            alternativeApproach: "如果不好分解，可以改用求根公式或测试点法。",
          },
          {
            id: "s3",
            title: "定位临界点",
            content: "把对应方程的根记成临界点，并用它们把数轴切成若干段。",
            explanation: "二次函数在相邻临界点之间符号稳定，所以先把“分段边界”找出来。",
            knowledgePoints: ["function-quadratic", "function-zero"],
            type: "computation",
            whyThisStep: "没有临界点，就无法判断区间内函数值的符号。",
            commonMistake: "根算对了，但没有把它们转成后续区间判断的抓手。",
          },
          {
            id: "s4",
            title: "判断区间符号",
            content: "利用二次项系数的正负判断开口方向，再确定“小于 0”或“大于 0”该取哪一段。",
            explanation: "这是二次不等式真正的核心动作，图像直觉比死背口诀更稳定。",
            knowledgePoints: ["function-quadratic", "function-properties"],
            type: "reasoning",
            whyThisStep: "同样的两个根，因为开口方向不同，解集会完全反过来。",
            commonMistake: "只记“中间 / 两边”的口诀，却忘了它依赖开口方向。",
          },
          {
            id: "s5",
            title: "检查端点",
            content: "回到题目的不等号，确认端点是否包含在解集中。",
            explanation: "严格不等号对应开区间，含等号时才考虑把临界点并进去。",
            knowledgePoints: ["inequality-basic", "set-operations"],
            type: "verification",
            whyThisStep: "很多失分不是不会做，而是最后边界写错。",
            commonMistake: "区间判断对了，但括号和方括号写反。",
          },
          {
            id: "s6",
            title: "组织答案并验证",
            content: "把最终结论写成规范区间或集合表达，并代一个代表值做快速验证。",
            explanation: "最后一步不是重复，而是把过程收束成稳定得分表达。",
            knowledgePoints: ["set-operations"],
            type: "conclusion",
            whyThisStep: "规范表达会把前面的判断真正落到答案上。",
          },
        ],
        edges: [],
        summary: "关键不是硬算，而是把求根、开口方向、区间符号和边界检查串成一条完整动作链。",
        relatedKnowledge: [
          "inequality-basic",
          "function-quadratic",
          "function-zero",
          "function-properties",
          "set-operations",
        ],
        guide: buildGuide(
          "一元二次不等式",
          ["inequality-basic", "function-quadratic", "function-zero", "set-operations"],
          [
            {
              description: "只求出根，没有继续判断区间",
              why: "把不等式题做成了方程题，漏掉最关键的符号判断。",
            },
            {
              description: "开口方向记反，区间整体取错",
              why: "没有把二次项系数和图像直觉对应起来。",
            },
            {
              description: "端点写错成闭区间或半开区间",
              why: "最后没有回看不等号是否包含等号。",
            },
          ],
          [
            "先确认这是一元二次不等式，而不是单纯求根。",
            "先找临界点，再想数轴分段。",
            "看二次项系数正负，判断开口方向。",
            "再确定解集是取中间还是两边。",
            "最后回到不等号检查端点。",
          ],
          "一元二次不等式的标准套路是：求根、看开口、定区间，再检查边界是否能取。"
        ),
      };
    case "domain":
      return {
        problem,
        problemType: "函数定义域",
        difficulty: 2,
        steps: [
          {
            id: "s1",
            title: "拆出每一部分的合法条件",
            content: `先把题目里的每个表达式单独看条件：${problem}`,
            explanation: "定义域题不是一口气看整体，而是先逐块列条件。",
            knowledgePoints: ["function-concept", "inequality-basic"],
            type: "analysis",
          },
          {
            id: "s2",
            title: "识别特殊表达式规则",
            content: "对数看真数大于 0，根号看被开方数大于等于 0，分式看分母不为 0。",
            explanation: "这些规则是定义域题最稳定的底层动作。",
            knowledgePoints: ["function-logarithmic", "inequality-basic"],
            type: "strategy",
          },
          {
            id: "s3",
            title: "把条件转成区间",
            content: "把每个合法条件分别写成区间或不等式范围。",
            explanation: "定义域的中间层不是直接写答案，而是形成若干待合并的条件。",
            knowledgePoints: ["inequality-basic", "set-operations"],
            type: "computation",
          },
          {
            id: "s4",
            title: "做交集并检查端点",
            content: "把所有条件取交集，尤其检查严格不等号和非严格不等号带来的端点差异。",
            explanation: "定义域题最容易丢分的往往就是最后这一步。",
            knowledgePoints: ["set-operations", "inequality-basic"],
            type: "reasoning",
          },
          {
            id: "s5",
            title: "回代做快速验证",
            content: "用区间内、边界上和区间外的代表值检查表达式是否合法。",
            explanation: "验证能快速暴露掉端点或交集写错的问题。",
            knowledgePoints: ["function-concept"],
            type: "verification",
          },
          {
            id: "s6",
            title: "写出规范定义域",
            content: "把最终合法输入范围写成标准区间或集合表达。",
            explanation: "最后一定要把“合法输入”写成完整答案，而不是停在零散条件上。",
            knowledgePoints: ["set-operations"],
            type: "conclusion",
          },
        ],
        edges: [],
        summary: "定义域题的主线很固定：逐块列条件、统一成区间、取交集、查端点。",
        relatedKnowledge: [
          "function-concept",
          "function-logarithmic",
          "inequality-basic",
          "set-operations",
        ],
        guide: buildGuide(
          "函数定义域",
          ["function-concept", "function-logarithmic", "inequality-basic", "set-operations"],
          [
            {
              description: "对数条件和根号条件写反",
              why: "不同表达式的合法性规则没有形成固定反射。",
            },
            {
              description: "条件都列了，但最后没取交集",
              why: "只看到了每个条件本身，没有抓住“同时满足”的本质。",
            },
            {
              description: "边界符号写错",
              why: "忽略了严格与非严格不等号的差异。",
            },
          ],
          [
            "先逐个表达式列合法条件。",
            "把每个条件转成区间或不等式。",
            "最后统一取交集，不要直接凭感觉写答案。",
            "对边界单独检查一次。",
          ],
          "定义域题本质是“合法输入条件”的交集问题，先列条件再合并比硬算更稳。"
        ),
      };
    case "trig-transform":
      return {
        problem,
        problemType: "三角恒等变换",
        difficulty: 3,
        steps: [
          {
            id: "s1",
            title: "判断已知量和目标量",
            content: `先看题目已知的是哪一个三角函数量，目标要化成什么：${problem}`,
            explanation: "三角题最怕一上来乱代公式，先看“已知什么、求什么”才知道最短路径。",
            knowledgePoints: ["trig-identity"],
            type: "analysis",
          },
          {
            id: "s2",
            title: "选最短公式路径",
            content: "优先选能直接把已知量送到目标量的公式，减少额外开号和象限判断。",
            explanation: "少绕一步，就少一个符号或平方根正负的风险点。",
            knowledgePoints: ["trig-transform", "trig-identity"],
            type: "strategy",
          },
          {
            id: "s3",
            title: "代入并化简",
            content: "把已知量直接代入对应公式，先得到主表达式，再做代数化简。",
            explanation: "让公式服务于结构，而不是一边变形一边临时改策略。",
            knowledgePoints: ["trig-transform"],
            type: "computation",
          },
          {
            id: "s4",
            title: "检查符号与象限",
            content: "如果中途需要由一个三角函数反推另一个，必须检查象限和正负号。",
            explanation: "平方根、象限和商数关系是三角题最常见的翻车点。",
            knowledgePoints: ["trig-definition", "trig-identity"],
            type: "reasoning",
          },
          {
            id: "s5",
            title: "回看结果是否最简",
            content: "检查结果是否已经符合题目要求的形式，并确认没有多余中间量。",
            explanation: "三角题做完不等于结束，还要看有没有留下本可避免的绕路痕迹。",
            knowledgePoints: ["trig-transform"],
            type: "verification",
          },
          {
            id: "s6",
            title: "总结公式选路",
            content: "回顾这题为什么选这条公式，形成下一次见到同类条件时的第一反应。",
            explanation: "三角题真正要积累的是“看到条件就会挑公式”的路径感。",
            knowledgePoints: ["trig-transform"],
            type: "conclusion",
          },
        ],
        edges: [],
        summary: "三角题最稳定的做法不是多背公式，而是先看已知量和目标量，再选最短变换路径。",
        relatedKnowledge: ["trig-definition", "trig-identity", "trig-transform"],
        guide: buildGuide(
          "三角恒等变换",
          ["trig-definition", "trig-identity", "trig-transform"],
          [
            {
              description: "公式能背，但不知道先用哪条",
              why: "没有先从“已知量 → 目标量”的方向判断最短路径。",
            },
            {
              description: "中途反推另一个三角函数时符号翻车",
              why: "忘了象限和平方根正负检查。",
            },
            {
              description: "表达式越变越复杂",
              why: "没有控制变形目标，公式切换太频繁。",
            },
          ],
          [
            "先判断已知量和目标量。",
            "优先选能直接连起来的公式。",
            "需要开号时一定回看象限。",
            "最后把结果整理成题目要求形式。",
          ],
          "三角恒等变换的关键是按条件选路，尽量少绕步骤，少制造额外符号风险。"
        ),
      };
    case "conditional-probability":
      return {
        problem,
        problemType: "条件概率",
        difficulty: 3,
        steps: [
          {
            id: "s1",
            title: "分清事件与条件",
            content: `先把题目里的事件和“已知条件”拆清楚：${problem}`,
            explanation: "条件概率不是在原样本空间里硬算，而是先明确条件缩小了什么。",
            knowledgePoints: ["prob-basic", "prob-conditional"],
            type: "analysis",
          },
          {
            id: "s2",
            title: "重建条件下的样本空间",
            content: "把“已知条件成立”看成新的观察范围，再在这个范围内讨论目标事件。",
            explanation: "条件概率的分母本质上是新样本空间的总量。",
            knowledgePoints: ["prob-conditional"],
            type: "strategy",
          },
          {
            id: "s3",
            title: "求交事件或有利情况",
            content: "先找出同时满足目标事件和条件事件的部分，再组织成可计算的数量或概率。",
            explanation: "条件概率常见的实操动作是先抓交集，再除以条件事件。",
            knowledgePoints: ["prob-basic", "set-operations"],
            type: "computation",
          },
          {
            id: "s4",
            title: "代入条件概率表达",
            content: "把交事件和条件事件放进对应表达式，确认分子分母都来自同一视角。",
            explanation: "公式本身不难，难的是每个量背后到底在数什么。",
            knowledgePoints: ["prob-conditional"],
            type: "reasoning",
          },
          {
            id: "s5",
            title: "检查结果范围与语义",
            content: "确认答案在 0 到 1 之间，并能用一句话解释它代表什么。",
            explanation: "概率题算完要回看语义，结果才不会只是一个孤立数字。",
            knowledgePoints: ["prob-basic"],
            type: "verification",
          },
          {
            id: "s6",
            title: "沉淀条件概率视角",
            content: "回顾这题里“条件缩小样本空间”的具体体现，形成下一次的第一反应。",
            explanation: "条件概率最重要的不是公式，而是“重新看样本空间”的意识。",
            knowledgePoints: ["prob-conditional"],
            type: "conclusion",
          },
        ],
        edges: [],
        summary: "条件概率的核心不是背公式，而是把“已知条件后重新看样本空间”的动作做稳。",
        relatedKnowledge: ["prob-basic", "prob-conditional", "set-operations"],
        guide: buildGuide(
          "条件概率",
          ["prob-basic", "prob-conditional", "set-operations"],
          [
            {
              description: "把条件概率当普通概率直接算",
              why: "忘了“已知条件”已经把样本空间缩小了。",
            },
            {
              description: "分子只算了目标事件，没算交事件",
              why: "没有抓住“同时满足条件和目标”的含义。",
            },
            {
              description: "结果算出来却说不清它代表什么",
              why: "只盯公式，没有回到事件语义。",
            },
          ],
          [
            "先分清目标事件和条件事件。",
            "把条件事件看成新的观察范围。",
            "优先找交事件，再写公式。",
            "最后检查结果是否在 0 到 1 之间。",
          ],
          "条件概率的本质是“在已知条件下重新统计”，不是把原公式硬套到原样本空间。"
        ),
      };
    case "sequence":
      return {
        problem,
        problemType: "等差数列",
        difficulty: 2,
        steps: [
          {
            id: "s1",
            title: "读清已知项与目标项",
            content: `先确认题目给了哪些项、要你求哪一项：${problem}`,
            explanation: "数列题最怕下标关系没看清，后面每一步都会跟着偏。",
            knowledgePoints: ["seq-concept"],
            type: "analysis",
          },
          {
            id: "s2",
            title: "确定主公式",
            content: "把等差数列写回通项公式或公差关系，明确每一段变化对应一个公差。",
            explanation: "固定步长是等差数列最稳定的视角。",
            knowledgePoints: ["seq-arithmetic"],
            type: "strategy",
          },
          {
            id: "s3",
            title: "求出公差或首项",
            content: "利用已知项之间的差值，把公差或首项先算出来。",
            explanation: "绝大多数等差数列题都要先把公差这一层稳住。",
            knowledgePoints: ["seq-arithmetic"],
            type: "computation",
          },
          {
            id: "s4",
            title: "回推目标项",
            content: "带着已经确定的公差和首项，回到目标项所在的位置做代入。",
            explanation: "这一步看似机械，实际是在检验前面的节奏感是否稳定。",
            knowledgePoints: ["seq-arithmetic", "seq-concept"],
            type: "reasoning",
          },
          {
            id: "s5",
            title: "检查下标与数量级",
            content: "回看结果是否与数列递增或递减趋势一致，并检查目标项下标有没有代错。",
            explanation: "数列题很适合做数量级检查，能快速发现明显偏差。",
            knowledgePoints: ["seq-concept"],
            type: "verification",
          },
          {
            id: "s6",
            title: "沉淀固定节奏",
            content: "把这题总结成“先看下标差，再求公差，再回推项”的固定流程。",
            explanation: "等差数列真正要练稳的是节奏，不是孤立公式。",
            knowledgePoints: ["seq-arithmetic"],
            type: "conclusion",
          },
        ],
        edges: [],
        summary: "等差数列题最稳的节奏是：看下标差、定公差、回推目标项、最后做趋势检查。",
        relatedKnowledge: ["seq-concept", "seq-arithmetic"],
        guide: buildGuide(
          "等差数列",
          ["seq-concept", "seq-arithmetic"],
          [
            {
              description: "把下标差看成少一段或多一段公差",
              why: "没有把“固定步长”的结构感建立起来。",
            },
            {
              description: "公差算出来了，但目标项代回仍代错",
              why: "公式和“第几项”的对应关系没真正咬合。",
            },
            {
              description: "答案不符合数列递增或递减趋势",
              why: "缺少最后的数量级和方向检查。",
            },
          ],
          [
            "先看清题目给的是第几项、要求第几项。",
            "下标差几，就跨了几段公差。",
            "先把公差算稳，再回推目标项。",
            "最后回看结果是否符合数列趋势。",
          ],
          "等差数列的核心不是套公式，而是先把“固定步长”看成一条清晰的节奏线。"
        ),
      };
    case "ellipse":
      return {
        problem,
        problemType: "椭圆基础",
        difficulty: 3,
        steps: [
          {
            id: "s1",
            title: "确认椭圆题入口",
            content: `先看题目给的是标准方程、焦点信息还是点的几何条件：${problem}`,
            explanation: "椭圆题不一定先联立方程，很多时候更快的入口是几何定义。",
            knowledgePoints: ["analytic-ellipse"],
            type: "analysis",
          },
          {
            id: "s2",
            title: "提取核心几何量",
            content: "从标准方程里读出 a、b 以及和焦点有关的关键信息。",
            explanation: "椭圆题的很多条件最终都要落回 a、b、c 或定义关系。",
            knowledgePoints: ["analytic-ellipse", "analytic-circle"],
            type: "strategy",
          },
          {
            id: "s3",
            title: "优先调用定义或标准性质",
            content: "若题目涉及焦点距离、离心率或点在椭圆上，优先检查能否直接调用椭圆定义。",
            explanation: "椭圆定义往往比联立方程更快、更稳。",
            knowledgePoints: ["analytic-ellipse"],
            type: "computation",
          },
          {
            id: "s4",
            title: "把几何关系翻译成代数",
            content: "如果定义不够，就把几何条件翻成坐标或方程关系，再组织计算。",
            explanation: "解析几何的难点不是算，而是把几何语言准确落成代数表达。",
            knowledgePoints: ["analytic-line", "analytic-ellipse"],
            type: "reasoning",
          },
          {
            id: "s5",
            title: "检查结果是否符合图形直觉",
            content: "回看数值、位置关系和对称性，确认答案没有违背椭圆基本图形特征。",
            explanation: "图形直觉能帮你快速发现很多代数计算中的离谱结果。",
            knowledgePoints: ["analytic-ellipse", "function-properties"],
            type: "verification",
          },
          {
            id: "s6",
            title: "总结这题的入口选择",
            content: "回顾这题为什么优先走定义、参数提取或代数翻译中的哪一条路径。",
            explanation: "椭圆题真正积累的是入口判断，而不是孤立结论。",
            knowledgePoints: ["analytic-ellipse"],
            type: "conclusion",
          },
        ],
        edges: [],
        summary: "椭圆题的关键不只是会算，而是先判断该走定义、参数关系还是坐标联立。",
        relatedKnowledge: ["analytic-line", "analytic-circle", "analytic-ellipse", "function-properties"],
        guide: buildGuide(
          "椭圆基础",
          ["analytic-line", "analytic-circle", "analytic-ellipse"],
          [
            {
              description: "看到方程就直接硬算",
              why: "没有先看椭圆定义或标准性质是否已经足够解题。",
            },
            {
              description: "a、b、c 和焦点位置总混",
              why: "参数和图形意义没有真正连起来。",
            },
            {
              description: "答案算出来却和图形直觉矛盾",
              why: "缺少最后的图形关系回查。",
            },
          ],
          [
            "先看题目给的是方程、焦点还是几何条件。",
            "从标准式先提参数和焦点信息。",
            "能用定义就优先用定义。",
            "最后用图形直觉回查答案。",
          ],
          "椭圆题最稳的入口通常是“标准式读参数 + 定义判断”，不是一上来就联立硬算。"
        ),
      };
    default:
      return {
        problem,
        problemType: "通用数学题",
        difficulty: 3,
        steps: [
          {
            id: "s1",
            title: "先判断题型和目标",
            content: `先明确这道题在考什么、要你最终给出什么：${problem}`,
            explanation: "题型判断是后续所有动作的入口，不先定方向就容易乱算。",
            knowledgePoints: ["function-concept"],
            type: "analysis",
          },
          {
            id: "s2",
            title: "提取已知条件",
            content: "把题目里的关键已知量、限制条件和隐含关系单独列出来。",
            explanation: "先把信息结构整理清楚，后面才知道该选哪条主线。",
            knowledgePoints: ["function-concept"],
            type: "strategy",
          },
          {
            id: "s3",
            title: "组织主方法",
            content: "根据题型决定主方法：是代数变形、函数分析、概率建模还是解析几何翻译。",
            explanation: "主方法一旦选错，后面计算量会被无意义地放大。",
            knowledgePoints: ["function-properties"],
            type: "computation",
          },
          {
            id: "s4",
            title: "检查关键约束",
            content: "在推进计算前，回看定义域、范围、边界、符号或几何位置关系等关键约束。",
            explanation: "很多错误不是不会算，而是忽略了约束。",
            knowledgePoints: ["inequality-basic"],
            type: "reasoning",
          },
          {
            id: "s5",
            title: "整理答案并验证",
            content: "把最终结果写成题目要求的形式，并做一次快速回查。",
            explanation: "答案不仅要算出来，还要和题意、条件、数量级一致。",
            knowledgePoints: ["set-operations"],
            type: "conclusion",
          },
        ],
        edges: [],
        summary: "当前规则层未识别到更具体的题型，因此返回一条保守的通用解题脚手架，重点帮助你先理清方向和检查点。",
        relatedKnowledge: ["function-concept", "function-properties", "inequality-basic", "set-operations"],
        guide: buildGuide(
          "通用数学题",
          ["function-concept", "function-properties", "inequality-basic", "set-operations"],
          [
            {
              description: "一上来就算，没有先判断题型",
              why: "主线没选定，后面很容易边算边改方向。",
            },
            {
              description: "中间条件没单独拎出来",
              why: "隐含约束没有显化，容易在后半段翻车。",
            },
            {
              description: "结果写出来但没回查题意",
              why: "缺少最后的验证动作。",
            },
          ],
          [
            "先明确题目到底在问什么。",
            "把已知条件和约束单独列出来。",
            "再决定主方法，不要边算边改。",
            "最后做一次边界和结果回查。",
          ],
          "当题型还不够明确时，先用一条保守的通用脚手架把思路立住，比直接硬算更稳。"
        ),
      };
  }
}

function sanitizeKnowledgePoints(knowledgePoints: string[], fallback: string[]) {
  const valid = unique(
    knowledgePoints.filter((id) => Boolean(getKnowledgeNode(id)))
  );
  return valid.length > 0 ? valid : fallback;
}

function sanitizeDifficulty(value: number | undefined, fallback: number) {
  if (value && value >= 1 && value <= 5) {
    return value as 1 | 2 | 3 | 4 | 5;
  }
  return fallback as 1 | 2 | 3 | 4 | 5;
}

function normalizePortrait(
  raw: SolutionPath["portrait"] | undefined,
  fallback: SolutionPath["portrait"]
) {
  if (!raw) {
    return fallback;
  }

  return {
    stage: raw.stage?.trim() || fallback.stage,
    problemType: raw.problemType?.trim() || fallback.problemType,
    difficulty: sanitizeDifficulty(raw.difficulty, fallback.difficulty),
    knowledgePoints:
      raw.knowledgePoints?.length
        ? raw.knowledgePoints
            .filter((item) => item.id && item.name)
            .slice(0, 4)
            .map((item) => {
              const node = getKnowledgeNode(item.id);
              return {
                id: item.id,
                name: item.name,
                category: node?.category || fallback.knowledgePoints[0]?.category || "algebra",
              };
            })
        : fallback.knowledgePoints,
    prerequisites:
      raw.prerequisites?.length
        ? raw.prerequisites
            .filter((item) => item.id && item.name && item.why)
            .slice(0, 4)
        : fallback.prerequisites,
  };
}

function normalizeGuide(raw: SolutionPath["guide"], fallback: ProblemGuide) {
  if (!raw) {
    return fallback;
  }

  return {
    problemType: raw.problemType?.trim() || fallback.problemType,
    typeExplanation: raw.typeExplanation?.trim() || fallback.typeExplanation,
    prerequisites:
      raw.prerequisites?.length
        ? raw.prerequisites
            .filter((item) => item.id && item.name && item.why)
            .slice(0, 4)
        : fallback.prerequisites,
    commonMistakes:
      raw.commonMistakes?.length
        ? raw.commonMistakes
            .filter((item) => item.description && item.why)
            .slice(0, 4)
        : fallback.commonMistakes,
    stepHints:
      raw.stepHints?.filter(Boolean).slice(0, 6) || fallback.stepHints,
  };
}

function normalizeSolutionPath(
  raw: Omit<SolutionPath, "edges" | "meta">,
  fallback: SolutionPath,
  problem: string
): SolutionPath {
  const steps = raw.steps
    .slice(0, 12)
    .map((step, index) => {
      const fallbackStep = fallback.steps[Math.min(index, fallback.steps.length - 1)];
      return {
        id: step.id?.trim() || `s${index + 1}`,
        title: step.title?.trim() || fallbackStep.title,
        content: step.content?.trim() || fallbackStep.content,
        explanation: step.explanation?.trim() || fallbackStep.explanation,
        knowledgePoints: sanitizeKnowledgePoints(
          step.knowledgePoints || [],
          fallbackStep.knowledgePoints
        ),
        type: VALID_STEP_TYPES.has(step.type) ? step.type : fallbackStep.type,
        whyThisStep: step.whyThisStep?.trim() || fallbackStep.whyThisStep,
        commonMistake: step.commonMistake?.trim() || fallbackStep.commonMistake,
        alternativeApproach:
          step.alternativeApproach?.trim() || fallbackStep.alternativeApproach,
        interactionPoint: step.interactionPoint
          ? {
              ...step.interactionPoint,
              correctOption:
                step.interactionPoint.correctOption?.trim() ||
                fallbackStep.interactionPoint?.correctOption,
              correctFeedback:
                step.interactionPoint.correctFeedback?.trim() ||
                fallbackStep.interactionPoint?.correctFeedback,
              wrongFeedback:
                step.interactionPoint.wrongFeedback?.trim() ||
                fallbackStep.interactionPoint?.wrongFeedback,
              mistakeKnowledgeId:
                step.interactionPoint.mistakeKnowledgeId?.trim() ||
                fallbackStep.interactionPoint?.mistakeKnowledgeId,
              recommendedLearningPathTargetId:
                step.interactionPoint.recommendedLearningPathTargetId?.trim() ||
                fallbackStep.interactionPoint?.recommendedLearningPathTargetId,
              recommendedRecoveryNodeId:
                step.interactionPoint.recommendedRecoveryNodeId?.trim() ||
                fallbackStep.interactionPoint?.recommendedRecoveryNodeId,
              recommendedLearnTargetId:
                step.interactionPoint.recommendedLearnTargetId?.trim() ||
                fallbackStep.interactionPoint?.recommendedLearnTargetId,
              recommendedLearnQuery:
                step.interactionPoint.recommendedLearnQuery?.trim() ||
                fallbackStep.interactionPoint?.recommendedLearnQuery,
              branchStepId:
                step.interactionPoint.branchStepId?.trim() ||
                fallbackStep.interactionPoint?.branchStepId,
            }
          : fallbackStep.interactionPoint,
        branchType: step.branchType || fallbackStep.branchType || "main",
        branchFromStepId:
          step.branchFromStepId?.trim() || fallbackStep.branchFromStepId,
        branchRecoveryHint:
          step.branchRecoveryHint?.trim() || fallbackStep.branchRecoveryHint,
      } satisfies SolutionStep;
    })
    .filter((step) => step.title && step.content && step.explanation);

  const mainStepCount = steps.filter((step) => step.branchType !== "mistake").length;

  if (mainStepCount < 5) {
    return fallback;
  }

  return finalizeSolutionPath(
    solutionPathSchema.parse({
    problem,
    problemType: raw.problemType?.trim() || fallback.problemType,
    difficulty: sanitizeDifficulty(raw.difficulty, fallback.difficulty),
    portrait: normalizePortrait(raw.portrait, fallback.portrait),
    steps,
    edges: createSolutionEdges(steps),
    summary: raw.summary?.trim() || fallback.summary,
    relatedKnowledge: unique([
      ...sanitizeKnowledgePoints(raw.relatedKnowledge || [], fallback.relatedKnowledge),
      ...steps.flatMap((step) => step.knowledgePoints),
    ]),
    guide: normalizeGuide(raw.guide, fallback.guide || fallback.guide!),
    }),
    detectTemplate(problem)
  );
}

async function tryGenerateAiSolution(
  input: GenerateSolutionPathInput,
  fallback: SolutionPath,
  template: TemplateId
) {
  const provider = getAIProvider();
  if (!provider.isConfigured()) {
    throw new Error("AI provider is not configured");
  }

  const focusedKnowledgeContext = buildFocusedKnowledgeContext({
    knowledgeIds: unique([
      ...fallback.relatedKnowledge,
      ...fallback.steps.flatMap((step) => step.knowledgePoints),
    ]),
  });

  const { object, provider: providerName, model } =
    await provider.generateStructured({
      system: [
        "你是高中数学解题路径助手。",
        "请输出 5 到 8 个主干思维节点，并补充至少 2 个易错分支节点。",
        "知识点 ID 必须来自给定知识图谱；如果不确定，优先使用更通用的已知 ID。",
        "必须包含结构化题目画像、前置知识、易错点、递进提示，以及可判方向的互动点。",
        "学生模式只反馈方向是否正确和简短提示，不直接给标准答案。",
        "涉及公式时优先使用 $...$ 或 $$...$$；如果偶尔输出裸 LaTeX 命令，系统会兼容处理。",
      ].join("\n"),
      prompt: [
        `题目：${input.problem}`,
        `规则层识别的题型模板：${template}`,
        "",
        "知识图谱上下文：",
        focusedKnowledgeContext,
        "",
        "请生成适合学生模式的解题路径，避免直接输出完整标准答案。",
        "必须返回 portrait，steps 中主干节点 branchType=main，易错分支节点 branchType=mistake，edges 会由系统补全。",
      ].join("\n"),
      schema: solutionPathAiSchema,
      temperature: 0.35,
      timeoutMs: 45_000,
      allowLatex: true,
      repairJson: true,
    });

  return {
    path: normalizeSolutionPathLatex(
      normalizeSolutionPath(object, fallback, input.problem)
    ),
    providerName,
    model,
  };
}

export async function generateSolutionPath(input: GenerateSolutionPathInput) {
  const template = detectTemplate(input.problem);
  const fallback = finalizeSolutionPath(
    buildRuleSolutionPath(input.problem, template),
    template
  );
  const rulePath = normalizeSolutionPathLatex(
    solutionPathSchema.parse({
      ...fallback,
      edges: createSolutionEdges(fallback.steps),
    })
  );

  try {
    const aiResult = await tryGenerateAiSolution(input, rulePath, template);
    return withMeta(
      aiResult.path,
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
      error instanceof Error ? error.message : "AI generation was unavailable";

    return withMeta(
      rulePath,
      buildMeta({
        requestId: input.requestId,
        source: "rule",
        degraded: true,
        reason,
      })
    );
  }
}
