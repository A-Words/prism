import type {
  KnowledgeNode,
  LearningPlan,
  LearningPlanNode,
  MockLearningScenario,
} from "@/types";
import { buildKnowledgeContext } from "@/lib/ai/context";
import { getAIProvider } from "@/lib/ai/provider";
import { learningPlanCopySchema, learningPlanSchema } from "@/lib/ai/schemas";
import {
  computeLearningPath,
  getKnowledgeNode,
  knowledgeNodes,
  searchKnowledge,
} from "@/lib/knowledge-graph";
import {
  getMockLearningPlan,
  mockLearningScenarios,
} from "@/lib/mock-data";
import { buildMeta, withMeta } from "@/lib/services/meta";
import type { GenerateLearningPlanInput } from "@/lib/services/types";

const PHASE_META: Record<number, { label: string; description: string }> = {
  1: {
    label: "基础准备",
    description: "先把关键前置知识串起来，避免后面一直卡在概念层。",
  },
  2: {
    label: "核心突破",
    description: "围绕目标方法建立稳定动作，形成可复用的题感。",
  },
  3: {
    label: "综合巩固",
    description: "通过更完整的迁移任务确认你已经能稳定使用这条路径。",
  },
};

type TargetResolution = {
  target: KnowledgeNode;
  scenario?: MockLearningScenario;
  matchedBy: "targetId" | "knowledge" | "scenario" | "fallback";
};

function normalizeText(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, "");
}

function scoreKnowledgeNode(node: KnowledgeNode, query: string) {
  const normalized = normalizeText(query);
  let score = 0;

  const candidates = [node.id, node.name, node.module, ...node.keywords].map(
    normalizeText
  );

  for (const candidate of candidates) {
    if (candidate === normalized) {
      score = Math.max(score, 12);
      continue;
    }
    if (candidate.includes(normalized) && normalized.length >= 2) {
      score = Math.max(score, 7);
    }
    if (normalized.includes(candidate) && candidate.length >= 2) {
      score = Math.max(score, 5);
    }
  }

  return score;
}

function scoreScenario(query: string, scenario: MockLearningScenario) {
  const normalized = normalizeText(query);
  const haystacks = [
    scenario.title,
    scenario.dashboardTitle,
    ...scenario.queryAliases,
  ].map(normalizeText);

  let score = 0;
  for (const candidate of haystacks) {
    if (candidate === normalized) {
      score = Math.max(score, 14);
      continue;
    }
    if (candidate.includes(normalized) || normalized.includes(candidate)) {
      score = Math.max(score, 6);
    }
  }
  return score;
}

function resolveLearningTarget(input: GenerateLearningPlanInput): TargetResolution {
  const targetId = input.targetId?.trim();
  if (targetId) {
    const exactNode = getKnowledgeNode(targetId);
    if (exactNode) {
      return {
        target: exactNode,
        scenario: mockLearningScenarios.find((item) => item.targetId === targetId),
        matchedBy: "targetId",
      };
    }
  }

  const query = input.query?.trim();
  if (query) {
    const knowledgeMatch = knowledgeNodes
      .map((node) => ({ node, score: scoreKnowledgeNode(node, query) }))
      .sort((a, b) => b.score - a.score)[0];

    if (knowledgeMatch && knowledgeMatch.score >= 6) {
      return {
        target: knowledgeMatch.node,
        scenario: mockLearningScenarios.find(
          (item) => item.targetId === knowledgeMatch.node.id
        ),
        matchedBy: "knowledge",
      };
    }

    const scenarioMatch = mockLearningScenarios
      .map((scenario) => ({ scenario, score: scoreScenario(query, scenario) }))
      .sort((a, b) => b.score - a.score)[0];

    if (scenarioMatch && scenarioMatch.score > 0) {
      const scenarioTarget =
        getKnowledgeNode(scenarioMatch.scenario.targetId) ||
        getKnowledgeNode("derivative-comprehensive");
      if (scenarioTarget) {
        return {
          target: scenarioTarget,
          scenario: scenarioMatch.scenario,
          matchedBy: "scenario",
        };
      }
    }

    const fuzzyKnowledge = searchKnowledge(query)[0];
    if (fuzzyKnowledge) {
      return {
        target: fuzzyKnowledge,
        scenario: mockLearningScenarios.find(
          (item) => item.targetId === fuzzyKnowledge.id
        ),
        matchedBy: "knowledge",
      };
    }
  }

  return {
    target: getKnowledgeNode("derivative-comprehensive")!,
    scenario: mockLearningScenarios.find(
      (item) => item.targetId === "derivative-comprehensive"
    ),
    matchedBy: "fallback",
  };
}

function getDesiredNodeCount(input: GenerateLearningPlanInput) {
  const baseScores = {
    zero: 6,
    basic: 5,
    sprint: 4,
  } as const;
  const goalBonus = {
    concept: 0,
    "basic-problems": 1,
    comprehensive: 2,
  } as const;

  const baseLevel = input.baseLevel || "basic";
  const goalLevel = input.goalLevel || "basic-problems";
  return Math.max(
    4,
    Math.min(7, baseScores[baseLevel] + goalBonus[goalLevel] - 1)
  );
}

function compressPath(path: string[], desired: number) {
  if (path.length <= desired) {
    return path;
  }

  const indexes = new Set<number>([0, path.length - 1]);
  for (let index = 1; index < desired - 1; index += 1) {
    indexes.add(Math.round((index * (path.length - 1)) / (desired - 1)));
  }

  return [...indexes]
    .sort((a, b) => a - b)
    .map((index) => path[index]);
}

function trimPath(path: string[], input: GenerateLearningPlanInput) {
  const desired = getDesiredNodeCount(input);
  if (path.length <= desired) {
    return path;
  }

  if ((input.baseLevel || "basic") === "sprint") {
    const tail = path.slice(-Math.max(3, desired - 1));
    return [...new Set([path[0], ...tail])].slice(-desired);
  }

  return compressPath(path, desired);
}

function getPhase(index: number, total: number) {
  if (index < Math.ceil(total * 0.34)) {
    return 1;
  }
  if (index < Math.ceil(total * 0.67)) {
    return 2;
  }
  return 3;
}

function buildReason(node: KnowledgeNode, target: KnowledgeNode, phase: number) {
  if (node.id === target.id) {
    return `把 ${node.name} 作为当前目标节点，确保最后能稳定落到你想解决的核心能力上。`;
  }
  if (phase === 1) {
    return `先补 ${node.name}，把后面会反复用到的基础动作和判断条件接稳。`;
  }
  if (phase === 2) {
    return `${node.name} 是从基础过渡到主方法的关键一层，补齐后路径会明显顺很多。`;
  }
  return `把 ${node.name} 放在最后一段，用来确认你已经能把前面的方法迁移到更完整的问题里。`;
}

function buildLearnWhat(node: KnowledgeNode, target: KnowledgeNode) {
  if (node.id === target.id) {
    return `围绕 ${node.name} 建立完整题型入口，做到看到条件就能知道先判断什么、再做什么。`;
  }
  return node.description;
}

function buildMasteryChecks(
  node: KnowledgeNode,
  input: GenerateLearningPlanInput
) {
  const goalLevel = input.goalLevel || "basic-problems";
  const checks = [
    `能用自己的话解释 ${node.name} 的核心概念或判断依据。`,
    `能独立完成 1 道围绕 ${node.name} 的基础小题。`,
  ];

  if (goalLevel !== "concept") {
    checks.push(`能把 ${node.name} 用到和当前目标相关的题型里。`);
  }

  return checks.slice(0, goalLevel === "comprehensive" ? 3 : 2);
}

function buildCommonMistakes(node: KnowledgeNode) {
  const mistakes = [
    `做 ${node.name} 相关题时只记结论，不先判断适用条件。`,
  ];

  if (node.prerequisites.length > 0) {
    mistakes.push(`没有先回看前置节点，导致 ${node.name} 的动作链中途断掉。`);
  }

  if (node.difficulty >= 4) {
    mistakes.push(`一上来就硬算，忽略了 ${node.name} 更适合先做结构判断。`);
  }

  return mistakes.slice(0, 3);
}

function buildRuleNodes(
  path: string[],
  target: KnowledgeNode,
  input: GenerateLearningPlanInput
): LearningPlanNode[] {
  return path.map((knowledgeId, index, all) => {
    const node = getKnowledgeNode(knowledgeId)!;
    const phase = getPhase(index, all.length);
    const previous = all[index - 1];
    const difficultyFactor = input.baseLevel === "zero" ? 8 : 6;

    return {
      knowledgeId,
      phase,
      phaseLabel: PHASE_META[phase].label,
      estimatedMinutes: Math.max(15, node.difficulty * difficultyFactor),
      objectives: [node.description],
      backtrackTo: previous,
      reason: buildReason(node, target, phase),
      learnWhat: buildLearnWhat(node, target),
      masteryChecks: buildMasteryChecks(node, input),
      commonMistakes: buildCommonMistakes(node),
      prerequisiteIds: node.prerequisites,
    };
  });
}

function buildPhases(nodes: LearningPlanNode[]) {
  return [...new Set(nodes.map((node) => node.phase))]
    .sort((a, b) => a - b)
    .map((phase) => ({
      phase,
      label: PHASE_META[phase].label,
      description: PHASE_META[phase].description,
    }));
}

function buildEdges(nodes: LearningPlanNode[]) {
  return nodes.flatMap((node, index) => {
    const progress =
      index < nodes.length - 1
        ? [
            {
              source: node.knowledgeId,
              target: nodes[index + 1].knowledgeId,
              type: "progress" as const,
              label: index === 0 ? "先补地基" : "继续推进",
            },
          ]
        : [];
    const backtrack = node.backtrackTo
      ? [
          {
            source: node.knowledgeId,
            target: node.backtrackTo,
            type: "backtrack" as const,
            label: "卡住时回看",
          },
        ]
      : [];

    return [...progress, ...backtrack];
  });
}

function getRecommendedStart(
  nodes: LearningPlanNode[],
  input: GenerateLearningPlanInput
) {
  if ((input.baseLevel || "basic") === "sprint") {
    return nodes[Math.max(0, nodes.length - 2)]?.knowledgeId || nodes[0].knowledgeId;
  }
  if ((input.baseLevel || "basic") === "basic") {
    return nodes[Math.min(1, nodes.length - 1)]?.knowledgeId || nodes[0].knowledgeId;
  }
  return nodes[0].knowledgeId;
}

function buildRulePlan(
  input: GenerateLearningPlanInput,
  resolution: TargetResolution
): LearningPlan {
  if (resolution.scenario && resolution.matchedBy === "scenario") {
    return getMockLearningPlan({
      query: input.query,
      targetId: resolution.scenario.targetId,
      baseLevel: input.baseLevel,
      goalLevel: input.goalLevel,
      generationMode: input.generationMode,
    });
  }

  const fullPath = computeLearningPath(resolution.target.id);
  const trimmedPath = trimPath(
    fullPath.length > 0 ? fullPath : [resolution.target.id],
    input
  );
  const nodes = buildRuleNodes(trimmedPath, resolution.target, input);
  const recommendedStartId = getRecommendedStart(nodes, input);
  const startIndex = nodes.findIndex(
    (node) => node.knowledgeId === recommendedStartId
  );
  const currentNodeId =
    input.generationMode === "assessment"
      ? nodes[Math.max(0, startIndex - 1)]?.knowledgeId || recommendedStartId
      : recommendedStartId;
  const totalEstimatedMinutes = nodes.reduce(
    (sum, node) => sum + node.estimatedMinutes,
    0
  );

  const queryLabel = input.query?.trim() || resolution.target.name;
  const goalLevel = input.goalLevel || "basic-problems";
  const generationMode = input.generationMode || "quick";
  const checkpointNode =
    nodes[Math.min(nodes.length - 1, 1)]?.knowledgeId || resolution.target.id;

  return {
    goal:
      goalLevel === "comprehensive"
        ? `围绕「${queryLabel}」建立一条可迁移到综合题的学习路径`
        : `围绕「${queryLabel}」生成一条可执行的学习路径`,
    interpretation: `系统把你的目标落到了「${resolution.target.name}」这条主线上，并根据前置依赖裁剪出 ${nodes.length} 个主干节点，避免一次暴露整张图谱。`,
    phases: buildPhases(nodes),
    nodes,
    edges: buildEdges(nodes),
    totalEstimatedMinutes,
    advice:
      generationMode === "assessment"
        ? "本次按起点测试视角组织路径，建议先确认推荐起点是否真的是你当前最容易卡住的一层。"
        : "先推进主干节点，不要一上来把所有相关题型都混在一起刷。",
    targetKnowledgeId: resolution.target.id,
    recommendedStartId,
    currentNodeId,
    baseLevel: input.baseLevel || "basic",
    goalLevel,
    generationMode,
    whyStartHere:
      recommendedStartId === resolution.target.id
        ? `你当前目标已经足够聚焦，所以直接从 ${resolution.target.name} 起步更高效。`
        : `推荐先从 ${getKnowledgeNode(recommendedStartId)?.name || recommendedStartId} 起步，因为它是通向 ${resolution.target.name} 的最近稳定支点。`,
    sessionPlan: `建议拆成 ${Math.max(2, nodes.length)} 次短学习，每次推进 1 个节点并做 1 次自测。`,
    nextCheckpoint: `当你能稳定完成「${getKnowledgeNode(checkpointNode)?.name || resolution.target.name}」相关小题后，再继续压到最终目标。`,
  };
}

type LearningCopy = {
  goal: string;
  interpretation: string;
  advice: string;
  whyStartHere: string;
  sessionPlan: string;
  nextCheckpoint: string;
  nodes: Array<{
    knowledgeId: string;
    reason: string;
    learnWhat: string;
    masteryChecks: string[];
    commonMistakes: string[];
  }>;
};

function mergeLearningCopy(plan: LearningPlan, copy: LearningCopy) {
  const nodeCopyMap = new Map(copy.nodes.map((node) => [node.knowledgeId, node]));
  return {
    ...plan,
    goal: copy.goal,
    interpretation: copy.interpretation,
    advice: copy.advice,
    whyStartHere: copy.whyStartHere,
    sessionPlan: copy.sessionPlan,
    nextCheckpoint: copy.nextCheckpoint,
    nodes: plan.nodes.map((node) => {
      const patch = nodeCopyMap.get(node.knowledgeId);
      if (!patch) {
        return node;
      }
      return {
        ...node,
        reason: patch.reason,
        learnWhat: patch.learnWhat,
        masteryChecks: patch.masteryChecks,
        commonMistakes: patch.commonMistakes,
      };
    }),
  };
}

async function tryEnhanceLearningPlan(
  basePlan: LearningPlan,
  input: GenerateLearningPlanInput,
  resolution: TargetResolution
) {
  const provider = getAIProvider();
  if (!provider.isConfigured()) {
    throw new Error("AI provider is not configured");
  }

  const { object, provider: providerName, model } =
    await provider.generateStructured({
      system: [
        "你是高中数学学习规划助手。",
        "你只能润色和补全学习路径文案，不能修改知识点 ID、节点顺序、phase、edge、estimatedMinutes。",
        "输出必须是中文，简洁、可执行、学生可理解。",
      ].join("\n"),
      prompt: [
        `学习目标：${input.query?.trim() || resolution.target.name}`,
        `目标知识点：${resolution.target.name} (${resolution.target.id})`,
        `学生基础：${input.baseLevel || "basic"}`,
        `目标层级：${input.goalLevel || "basic-problems"}`,
        `生成方式：${input.generationMode || "quick"}`,
        "",
        "知识图谱上下文：",
        buildKnowledgeContext(),
        "",
        "请只改写以下学习计划中的文案字段，不要新增或删除节点：",
        JSON.stringify(
          {
            goal: basePlan.goal,
            interpretation: basePlan.interpretation,
            advice: basePlan.advice,
            whyStartHere: basePlan.whyStartHere,
            sessionPlan: basePlan.sessionPlan,
            nextCheckpoint: basePlan.nextCheckpoint,
            nodes: basePlan.nodes.map((node) => ({
              knowledgeId: node.knowledgeId,
              reason: node.reason,
              learnWhat: node.learnWhat,
              masteryChecks: node.masteryChecks,
              commonMistakes: node.commonMistakes,
            })),
          },
          null,
          2
        ),
      ].join("\n"),
      schema: learningPlanCopySchema,
      temperature: 0.4,
    });

  return {
    plan: learningPlanSchema.parse(
      mergeLearningCopy(basePlan, object as LearningCopy)
    ),
    providerName,
    model,
  };
}

export async function generateLearningPlan(input: GenerateLearningPlanInput) {
  const resolution = resolveLearningTarget(input);
  const rulePlan = buildRulePlan(input, resolution);

  try {
    const aiResult = await tryEnhanceLearningPlan(rulePlan, input, resolution);
    return withMeta(
      aiResult.plan,
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
      learningPlanSchema.parse(rulePlan),
      buildMeta({
        requestId: input.requestId,
        source: "rule",
        degraded: true,
        reason,
      })
    );
  }
}
