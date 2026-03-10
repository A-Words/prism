"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Flag,
  Lightbulb,
  Loader2,
  MessageCircle,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  TestTubeDiagonal,
  Undo2,
  XCircle,
} from "lucide-react";
import { KnowledgeGraphNode } from "@/components/graph/knowledge-node";
import type { KnowledgeNodeData } from "@/components/graph/knowledge-node";
import { MathText } from "@/components/ui/math-renderer";
import { getKnowledgeNode } from "@/lib/knowledge-graph";
import { useAppStore } from "@/lib/store";
import type {
  LearningBaseLevel,
  LearningGenerationMode,
  LearningGoalLevel,
  LearningNodeExecutionState,
  LearningPathProgress,
  LearningPlan,
  LearningPlanNode,
  LearningQuestion,
  LearningQuestionSubmissionResult,
} from "@/types";
import { MASTERY_LABELS } from "@/types";

const nodeTypes = { knowledgeNode: KnowledgeGraphNode };

const EXAMPLE_PROMPTS = [
  { icon: "🔢", text: "导数大题完全不会，从哪开始" },
  { icon: "📊", text: "概率老是算错，该怎么补" },
  { icon: "📐", text: "我想学椭圆，但感觉解析几何基础不好" },
  { icon: "🔺", text: "三角恒等变换总是记混公式" },
  { icon: "📘", text: "定义域题总在边界上丢分" },
  { icon: "📈", text: "等差数列总是把下标差看错" },
];

const BASE_LEVELS: { value: LearningBaseLevel; label: string }[] = [
  { value: "zero", label: "从零开始" },
  { value: "basic", label: "有一点基础" },
  { value: "sprint", label: "冲题型" },
];

const GOAL_LEVELS: { value: LearningGoalLevel; label: string }[] = [
  { value: "concept", label: "理解概念" },
  { value: "basic-problems", label: "会做基础题" },
  { value: "comprehensive", label: "冲综合题" },
];

const GENERATION_MODES: { value: LearningGenerationMode; label: string }[] = [
  { value: "quick", label: "快速生成" },
  { value: "assessment", label: "先做起点测试" },
];

const NODE_STATE_LABELS: Record<LearningNodeExecutionState, string> = {
  locked: "未展开",
  current: "当前节点",
  learning: "学习中",
  verifying: "验证中",
  passed: "已通过",
  failed: "待回退",
  backtracking: "回补中",
  skipped: "已跳过",
};

function findSavedPath(
  learningPaths: LearningPathProgress[],
  targetId?: string | null
) {
  if (!targetId) {
    return undefined;
  }

  return [...learningPaths].reverse().find((item) => item.targetId === targetId);
}

function getRecommendedStartId(
  plan: LearningPlan,
  savedPath?: LearningPathProgress
) {
  return (
    savedPath?.session?.assessment?.recommendedStartId ||
    plan.recommendedStartId ||
    plan.nodes[0]?.knowledgeId
  );
}

function createNodeStates(params: {
  plan: LearningPlan;
  currentNodeId: string;
  completedNodeIds: string[];
  recommendedStartId?: string;
  existingStates?: Record<string, LearningNodeExecutionState>;
  activeNodeMode?: "learning" | "verifying";
}) {
  const {
    plan,
    currentNodeId,
    completedNodeIds,
    recommendedStartId,
    existingStates,
    activeNodeMode,
  } = params;
  const completedSet = new Set(completedNodeIds);
  const recommendedStartIndex = Math.max(
    0,
    plan.nodes.findIndex((node) => node.knowledgeId === recommendedStartId)
  );

  return Object.fromEntries(
    plan.nodes.map((node, index) => {
      let nextState: LearningNodeExecutionState;
      if (completedSet.has(node.knowledgeId)) {
        nextState = index < recommendedStartIndex ? "skipped" : "passed";
      } else if (node.knowledgeId === currentNodeId) {
        nextState =
          activeNodeMode === "learning"
            ? "learning"
            : activeNodeMode === "verifying"
            ? "verifying"
            : existingStates?.[node.knowledgeId] === "backtracking"
            ? "backtracking"
            : "current";
      } else if (existingStates?.[node.knowledgeId] === "failed") {
        nextState = "failed";
      } else {
        nextState = "locked";
      }

      return [node.knowledgeId, nextState];
    })
  ) as Record<string, LearningNodeExecutionState>;
}

function getVisibleNodeIds(plan: LearningPlan, savedPath?: LearningPathProgress) {
  const recommendedStartId = getRecommendedStartId(plan, savedPath);
  const startIndex = Math.max(
    0,
    plan.nodes.findIndex((node) => node.knowledgeId === recommendedStartId)
  );
  const visible = new Set(
    plan.nodes.slice(startIndex).map((node) => node.knowledgeId)
  );

  savedPath?.completedNodeIds.forEach((nodeId) => visible.add(nodeId));
  savedPath?.session?.revealedRemedialNodeIds.forEach((nodeId) => visible.add(nodeId));
  if (savedPath?.currentNodeId) {
    visible.add(savedPath.currentNodeId);
  }

  return visible;
}

function walkBacktrackNode(plan: LearningPlan, nodeId: string, depth: number) {
  let current = plan.nodes.find((node) => node.knowledgeId === nodeId);
  let nextId = current?.backtrackTo;
  let remaining = depth;

  while (current && nextId && remaining > 1) {
    current = plan.nodes.find((node) => node.knowledgeId === nextId);
    nextId = current?.backtrackTo;
    remaining -= 1;
  }

  return nextId || nodeId;
}

function getRemedialNodeIds(
  plan: LearningPlan,
  fromNodeId: string,
  toNodeId: string
) {
  const fromIndex = plan.nodes.findIndex((node) => node.knowledgeId === fromNodeId);
  const toIndex = plan.nodes.findIndex((node) => node.knowledgeId === toNodeId);
  if (fromIndex < 0 || toIndex < 0) {
    return [toNodeId];
  }

  const [start, end] =
    fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
  return plan.nodes.slice(start, end + 1).map((node) => node.knowledgeId);
}

function buildLearningPathRecord(params: {
  plan: LearningPlan;
  existingPath?: LearningPathProgress;
  currentNodeId: string;
  completedNodeIds: string[];
  recommendedStartId?: string;
  targetName: string;
  sessionOverrides?: Partial<NonNullable<LearningPathProgress["session"]>>;
  status?: LearningPathProgress["status"];
}) {
  const {
    plan,
    existingPath,
    currentNodeId,
    completedNodeIds,
    recommendedStartId,
    targetName,
    sessionOverrides,
    status,
  } = params;
  const now = new Date().toISOString();
  const nextSession = {
    assessment:
      sessionOverrides?.assessment !== undefined
        ? sessionOverrides.assessment
        : existingPath?.session?.assessment,
    nodeStates:
      sessionOverrides?.nodeStates ||
      createNodeStates({
        plan,
        currentNodeId,
        completedNodeIds,
        recommendedStartId,
        existingStates: existingPath?.session?.nodeStates,
        activeNodeMode: sessionOverrides?.activeNodeMode,
      }),
    verificationResults: {
      ...(existingPath?.session?.verificationResults || {}),
      ...(sessionOverrides?.verificationResults || {}),
    },
    failureCounts: {
      ...(existingPath?.session?.failureCounts || {}),
      ...(sessionOverrides?.failureCounts || {}),
    },
    revealedRemedialNodeIds: Array.from(
      new Set([
        ...(existingPath?.session?.revealedRemedialNodeIds || []),
        ...(sessionOverrides?.revealedRemedialNodeIds || []),
      ])
    ),
    repairedNodeIds: Array.from(
      new Set([
        ...(existingPath?.session?.repairedNodeIds || []),
        ...(sessionOverrides?.repairedNodeIds || []),
      ])
    ),
    activeNodeMode: sessionOverrides?.activeNodeMode,
  };

  return {
    targetId: plan.targetKnowledgeId || existingPath?.targetId || "",
    targetName: existingPath?.targetName || targetName,
    currentNodeId,
    currentStep: Math.max(
      1,
      plan.nodes.findIndex((node) => node.knowledgeId === currentNodeId) + 1
    ),
    totalSteps: plan.nodes.length,
    completedNodeIds,
    startedAt: existingPath?.startedAt || now,
    updatedAt: now,
    status: status || existingPath?.status || "active",
    activeDiagnosisQuestionId: existingPath?.activeDiagnosisQuestionId,
    activeSolveProblemKey: existingPath?.activeSolveProblemKey,
    session: nextSession,
  } satisfies LearningPathProgress;
}

export default function LearnPage() {
  return (
    <Suspense fallback={<LoadingState generationMode="quick" />}>
      <LearnPageContent />
    </Suspense>
  );
}

function LearnPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastBootstrapKey = useRef<string | null>(null);

  const progress = useAppStore((state) => state.progress);
  const getMastery = useAppStore((state) => state.getMastery);
  const updateMastery = useAppStore((state) => state.updateMastery);
  const upsertLearningPath = useAppStore((state) => state.upsertLearningPath);

  const [query, setQuery] = useState("");
  const [baseLevel, setBaseLevel] = useState<LearningBaseLevel>("basic");
  const [goalLevel, setGoalLevel] =
    useState<LearningGoalLevel>("basic-problems");
  const [generationMode, setGenerationMode] =
    useState<LearningGenerationMode>("quick");
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [activePhase, setActivePhase] = useState<number | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draftVerificationAnswer, setDraftVerificationAnswer] = useState("");

  const currentSavedPath = useMemo(
    () => findSavedPath(progress.learningPaths, plan?.targetKnowledgeId),
    [plan?.targetKnowledgeId, progress.learningPaths]
  );

  const loadPlan = useCallback(
    async ({
      queryText,
      targetId,
      syncUrl = true,
      assessmentResults,
    }: {
      queryText?: string;
      targetId?: string;
      syncUrl?: boolean;
      assessmentResults?: Array<
        Pick<
          LearningQuestionSubmissionResult,
          "questionId" | "knowledgeId" | "answer" | "isCorrect"
        >
      >;
    }) => {
      const trimmedQuery = queryText?.trim();
      if (!trimmedQuery && !targetId) {
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/learn-path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmedQuery,
            targetId,
            baseLevel,
            goalLevel,
            generationMode,
            assessmentResults,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "学习路径加载失败");
        }

        const data: LearningPlan = await response.json();
        const resolvedQuery = trimmedQuery || searchParams.get("query") || data.goal;
        const restoredPath = findSavedPath(progress.learningPaths, data.targetKnowledgeId);
        const restoredNodeId =
          restoredPath?.currentNodeId ||
          data.currentNodeId ||
          data.recommendedStartId ||
          data.nodes[0]?.knowledgeId ||
          null;

        setQuery(resolvedQuery);
        setPlan(data);
        setActiveNodeId(restoredNodeId);
        setActivePhase(null);
        setDraftVerificationAnswer("");

        if (syncUrl && data.targetKnowledgeId) {
          const params = new URLSearchParams();
          params.set("target", data.targetKnowledgeId);
          params.set("query", resolvedQuery);
          router.replace(`/learn?${params.toString()}`, { scroll: false });
        }

        return data;
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "发生错误，请重试");
        setPlan(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseLevel, generationMode, goalLevel, progress.learningPaths, router, searchParams]
  );

  useEffect(() => {
    const target = searchParams.get("target") || undefined;
    const urlQuery = searchParams.get("query") || undefined;
    const key = `${target || ""}|${urlQuery || ""}`;

    if (!target && !urlQuery) {
      return;
    }
    if (lastBootstrapKey.current === key) {
      return;
    }

    lastBootstrapKey.current = key;
    setQuery(urlQuery || "");
    void loadPlan({
      targetId: target,
      queryText: urlQuery,
      syncUrl: false,
    });
  }, [loadPlan, searchParams]);

  useEffect(() => {
    if (!plan || !plan.targetKnowledgeId) {
      return;
    }

    const existingPath = findSavedPath(progress.learningPaths, plan.targetKnowledgeId);
    if (
      generationMode === "assessment" &&
      plan.assessmentQuestions?.length &&
      !existingPath?.session?.assessment
    ) {
      const targetName =
        getKnowledgeNode(plan.targetKnowledgeId)?.name || plan.goal;
      upsertLearningPath(
        buildLearningPathRecord({
          plan,
          existingPath,
          currentNodeId:
            plan.currentNodeId || plan.recommendedStartId || plan.nodes[0].knowledgeId,
          completedNodeIds: [],
          recommendedStartId: plan.recommendedStartId,
          targetName,
          sessionOverrides: {
            assessment: {
              status: "in_progress",
              currentIndex: 0,
              answers: {},
              results: [],
            },
            activeNodeMode: undefined,
          },
        })
      );
    }
  }, [generationMode, plan, progress.learningPaths, upsertLearningPath]);

  useEffect(() => {
    if (!plan) {
      return;
    }
    const fallbackNodeId =
      currentSavedPath?.currentNodeId ||
      plan.currentNodeId ||
      plan.recommendedStartId ||
      plan.nodes[0]?.knowledgeId ||
      null;
    setActiveNodeId((current) => current || fallbackNodeId);
  }, [currentSavedPath?.currentNodeId, plan]);

  const visibleNodeIds = useMemo(
    () => (plan ? getVisibleNodeIds(plan, currentSavedPath) : new Set<string>()),
    [currentSavedPath, plan]
  );

  const currentNodeId =
    currentSavedPath?.currentNodeId ||
    plan?.currentNodeId ||
    plan?.recommendedStartId ||
    plan?.nodes[0]?.knowledgeId ||
    null;

  const currentNode = useMemo(() => {
    if (!plan || !currentNodeId) {
      return null;
    }
    return (
      plan.nodes.find((node) => node.knowledgeId === currentNodeId) ||
      plan.nodes[0] ||
      null
    );
  }, [currentNodeId, plan]);

  const selectedNode = useMemo(() => {
    if (!plan) {
      return null;
    }
    return (
      plan.nodes.find((node) => node.knowledgeId === activeNodeId) ||
      currentNode ||
      plan.nodes[0] ||
      null
    );
  }, [activeNodeId, currentNode, plan]);

  const isAssessmentPending =
    generationMode === "assessment" &&
    Boolean(plan?.assessmentQuestions?.length) &&
    currentSavedPath?.session?.assessment?.status !== "completed";

  const assessmentState = currentSavedPath?.session?.assessment;
  const assessmentQuestion =
    plan?.assessmentQuestions?.[assessmentState?.currentIndex || 0] || null;

  const handleSubmit = useCallback(
    async (overrideQuery?: string) => {
      setFeedback(null);
      await loadPlan({
        queryText: overrideQuery || query,
        targetId: searchParams.get("target") || undefined,
      });
    },
    [loadPlan, query, searchParams]
  );

  const handleReset = useCallback(() => {
    setPlan(null);
    setQuery("");
    setError(null);
    setFeedback(null);
    setActiveNodeId(null);
    setDraftVerificationAnswer("");
    lastBootstrapKey.current = null;
    router.replace("/learn", { scroll: false });
  }, [router]);

  const handleAssessmentAnswerChange = useCallback(
    (question: LearningQuestion, answer: string) => {
      if (!plan?.targetKnowledgeId || !currentSavedPath) {
        return;
      }

      upsertLearningPath(
        buildLearningPathRecord({
          plan,
          existingPath: currentSavedPath,
          currentNodeId:
            currentSavedPath.currentNodeId ||
            plan.currentNodeId ||
            plan.nodes[0].knowledgeId,
          completedNodeIds: currentSavedPath.completedNodeIds,
          recommendedStartId: getRecommendedStartId(plan, currentSavedPath),
          targetName: currentSavedPath.targetName,
          sessionOverrides: {
            assessment: {
              status: currentSavedPath.session?.assessment?.status || "in_progress",
              currentIndex: currentSavedPath.session?.assessment?.currentIndex || 0,
              answers: {
                ...(currentSavedPath.session?.assessment?.answers || {}),
                [question.id]: answer,
              },
              results: currentSavedPath.session?.assessment?.results || [],
            },
            activeNodeMode: currentSavedPath.session?.activeNodeMode,
          },
        })
      );
    },
    [currentSavedPath, plan, upsertLearningPath]
  );

  const handleAssessmentSubmit = useCallback(async () => {
    if (!plan || !plan.targetKnowledgeId || !assessmentQuestion || !currentSavedPath) {
      return;
    }

    const answer =
      currentSavedPath.session?.assessment?.answers?.[assessmentQuestion.id];
    if (!answer) {
      setFeedback("请先选择一个答案，再提交当前起点测试题。");
      return;
    }

    const result: LearningQuestionSubmissionResult = {
      questionId: assessmentQuestion.id,
      knowledgeId: assessmentQuestion.knowledgeId,
      answer,
      isCorrect: answer === assessmentQuestion.correctAnswer,
      submittedAt: new Date().toISOString(),
    };
    const existingResults =
      currentSavedPath.session?.assessment?.results.filter(
        (item) => item.questionId !== assessmentQuestion.id
      ) || [];
    const nextResults = [...existingResults, result];
    const nextIndex = (assessmentState?.currentIndex || 0) + 1;
    const nextStatus =
      nextIndex >= (plan.assessmentQuestions?.length || 0) ? "completed" : "in_progress";

    upsertLearningPath(
      buildLearningPathRecord({
        plan,
        existingPath: currentSavedPath,
        currentNodeId:
          currentSavedPath.currentNodeId ||
          plan.currentNodeId ||
          plan.nodes[0].knowledgeId,
        completedNodeIds: currentSavedPath.completedNodeIds,
        recommendedStartId: getRecommendedStartId(plan, currentSavedPath),
        targetName: currentSavedPath.targetName,
        sessionOverrides: {
          assessment: {
            status: nextStatus,
            currentIndex: Math.min(nextIndex, (plan.assessmentQuestions?.length || 1) - 1),
            answers: currentSavedPath.session?.assessment?.answers || {},
            results: nextResults,
            completedAt:
              nextStatus === "completed" ? new Date().toISOString() : undefined,
          },
          activeNodeMode: undefined,
        },
      })
    );

    if (nextStatus !== "completed") {
      setFeedback(result.isCorrect ? "当前测试题通过。" : "当前测试题未通过，继续完成后系统会重算起点。");
      return;
    }

    const nextPlan = await loadPlan({
      queryText: query,
      targetId: plan.targetKnowledgeId,
      syncUrl: true,
      assessmentResults: nextResults.map((item) => ({
        questionId: item.questionId,
        knowledgeId: item.knowledgeId,
        answer: item.answer,
        isCorrect: item.isCorrect,
      })),
    });
    if (!nextPlan) {
      return;
    }

    const targetName =
      getKnowledgeNode(nextPlan.targetKnowledgeId || "")?.name || nextPlan.goal;
    const recommendedStartId =
      nextPlan.recommendedStartId || nextPlan.nodes[0]?.knowledgeId;
    const startIndex = Math.max(
      0,
      nextPlan.nodes.findIndex((node) => node.knowledgeId === recommendedStartId)
    );
    const completedNodeIds = nextPlan.nodes
      .slice(0, startIndex)
      .map((node) => node.knowledgeId);
    const nextCurrentNodeId =
      nextPlan.currentNodeId || recommendedStartId || nextPlan.nodes[0].knowledgeId;

    upsertLearningPath(
      buildLearningPathRecord({
        plan: nextPlan,
        existingPath: findSavedPath(progress.learningPaths, nextPlan.targetKnowledgeId),
        currentNodeId: nextCurrentNodeId,
        completedNodeIds,
        recommendedStartId,
        targetName,
        sessionOverrides: {
          assessment: {
            status: "completed",
            currentIndex: nextPlan.assessmentQuestions?.length || 3,
            answers: currentSavedPath.session?.assessment?.answers || {},
            results: nextResults,
            recommendedStartId,
            summary: nextPlan.assessmentSummary,
            completedAt: new Date().toISOString(),
          },
          nodeStates: createNodeStates({
            plan: nextPlan,
            currentNodeId: nextCurrentNodeId,
            completedNodeIds,
            recommendedStartId,
          }),
          activeNodeMode: undefined,
        },
      })
    );

    setActiveNodeId(nextCurrentNodeId);
    setFeedback(nextPlan.assessmentSummary || "起点测试完成，已定位新的推荐起点。");
  }, [
    assessmentQuestion,
    assessmentState?.currentIndex,
    currentSavedPath,
    loadPlan,
    plan,
    progress.learningPaths,
    query,
    upsertLearningPath,
  ]);

  const handleStartLearning = useCallback(() => {
    if (!plan || !currentNode || !plan.targetKnowledgeId) {
      return;
    }

    const targetName =
      getKnowledgeNode(plan.targetKnowledgeId)?.name || plan.goal;
    const recommendedStartId = getRecommendedStartId(plan, currentSavedPath);
    const existingPath = currentSavedPath;
    const completedNodeIds =
      existingPath?.completedNodeIds.length
        ? existingPath.completedNodeIds
        : plan.nodes
            .slice(
              0,
              Math.max(
                0,
                plan.nodes.findIndex((node) => node.knowledgeId === recommendedStartId)
              )
            )
            .map((node) => node.knowledgeId);

    upsertLearningPath(
      buildLearningPathRecord({
        plan,
        existingPath,
        currentNodeId: currentNode.knowledgeId,
        completedNodeIds,
        recommendedStartId,
        targetName,
        sessionOverrides: {
          nodeStates: createNodeStates({
            plan,
            currentNodeId: currentNode.knowledgeId,
            completedNodeIds,
            recommendedStartId,
            existingStates: existingPath?.session?.nodeStates,
            activeNodeMode: "learning",
          }),
          activeNodeMode: "learning",
        },
      })
    );
    setFeedback(`已进入「${getKnowledgeNode(currentNode.knowledgeId)?.name || currentNode.knowledgeId}」学习态。`);
  }, [currentNode, currentSavedPath, plan, upsertLearningPath]);

  const handleEnterVerification = useCallback(() => {
    if (!plan || !currentNode || !currentSavedPath) {
      return;
    }

    upsertLearningPath(
      buildLearningPathRecord({
        plan,
        existingPath: currentSavedPath,
        currentNodeId: currentNode.knowledgeId,
        completedNodeIds: currentSavedPath.completedNodeIds,
        recommendedStartId: getRecommendedStartId(plan, currentSavedPath),
        targetName: currentSavedPath.targetName,
        sessionOverrides: {
          nodeStates: createNodeStates({
            plan,
            currentNodeId: currentNode.knowledgeId,
            completedNodeIds: currentSavedPath.completedNodeIds,
            recommendedStartId: getRecommendedStartId(plan, currentSavedPath),
            existingStates: currentSavedPath.session?.nodeStates,
            activeNodeMode: "verifying",
          }),
          activeNodeMode: "verifying",
        },
      })
    );
    setDraftVerificationAnswer("");
    setFeedback("已进入节点验证。");
  }, [currentNode, currentSavedPath, plan, upsertLearningPath]);

  const handleVerificationSubmit = useCallback(() => {
    if (
      !plan ||
      !currentNode ||
      !currentSavedPath ||
      !currentNode.verificationQuestion ||
      !draftVerificationAnswer
    ) {
      setFeedback("请先选择验证题答案。");
      return;
    }

    const question = currentNode.verificationQuestion;
    const isCorrect = draftVerificationAnswer === question.correctAnswer;
    const result: LearningQuestionSubmissionResult = {
      questionId: question.id,
      knowledgeId: question.knowledgeId,
      answer: draftVerificationAnswer,
      isCorrect,
      submittedAt: new Date().toISOString(),
    };
    const recommendedStartId = getRecommendedStartId(plan, currentSavedPath);
    const currentIndex = Math.max(
      0,
      plan.nodes.findIndex((node) => node.knowledgeId === currentNode.knowledgeId)
    );

    if (isCorrect) {
      updateMastery(currentNode.knowledgeId, true);
      const nextNode = plan.nodes[currentIndex + 1];
      const completedNodeIds = Array.from(
        new Set([...currentSavedPath.completedNodeIds, currentNode.knowledgeId])
      );
      const nextNodeId = nextNode?.knowledgeId || currentNode.knowledgeId;
      upsertLearningPath(
        buildLearningPathRecord({
          plan,
          existingPath: currentSavedPath,
          currentNodeId: nextNodeId,
          completedNodeIds,
          recommendedStartId,
          targetName: currentSavedPath.targetName,
          status: nextNode ? "active" : "completed",
          sessionOverrides: {
            verificationResults: {
              [question.id]: result,
            },
            nodeStates: createNodeStates({
              plan,
              currentNodeId: nextNodeId,
              completedNodeIds,
              recommendedStartId,
              existingStates: {
                ...(currentSavedPath.session?.nodeStates || {}),
                [currentNode.knowledgeId]: "passed",
              },
            }),
            repairedNodeIds: [currentNode.knowledgeId],
            activeNodeMode: undefined,
          },
        })
      );
      setActiveNodeId(nextNodeId);
      setDraftVerificationAnswer("");
      setFeedback(
        nextNode
          ? `验证通过，已推进到「${getKnowledgeNode(nextNodeId)?.name || nextNodeId}」。`
          : "整条学习路径已完成。"
      );
      return;
    }

    updateMastery(currentNode.knowledgeId, false);
    const previousFailures =
      currentSavedPath.session?.failureCounts?.[currentNode.knowledgeId] || 0;
    const nextFailureCount = previousFailures + 1;
    const backtrackDepth = nextFailureCount >= 2 ? 2 : 1;
    const backtrackNodeId = walkBacktrackNode(
      plan,
      currentNode.knowledgeId,
      backtrackDepth
    );
    const revealedRemedialNodeIds = getRemedialNodeIds(
      plan,
      currentNode.knowledgeId,
      backtrackNodeId
    );

    upsertLearningPath(
      buildLearningPathRecord({
        plan,
        existingPath: currentSavedPath,
        currentNodeId: backtrackNodeId,
        completedNodeIds: currentSavedPath.completedNodeIds,
        recommendedStartId,
        targetName: currentSavedPath.targetName,
        sessionOverrides: {
          verificationResults: {
            [question.id]: result,
          },
          failureCounts: {
            [currentNode.knowledgeId]: nextFailureCount,
          },
          nodeStates: createNodeStates({
            plan,
            currentNodeId: backtrackNodeId,
            completedNodeIds: currentSavedPath.completedNodeIds,
            recommendedStartId,
            existingStates: {
              ...(currentSavedPath.session?.nodeStates || {}),
              [currentNode.knowledgeId]: "failed",
              [backtrackNodeId]: "backtracking",
            },
          }),
          revealedRemedialNodeIds,
          activeNodeMode: undefined,
        },
      })
    );
    setActiveNodeId(backtrackNodeId);
    setDraftVerificationAnswer("");
    setFeedback(
      `验证未通过，已按回退规则切回「${getKnowledgeNode(backtrackNodeId)?.name || backtrackNodeId}」。`
    );
  }, [currentNode, currentSavedPath, draftVerificationAnswer, plan, updateMastery, upsertLearningPath]);

  const handleBacktrackReveal = useCallback(() => {
    if (!plan || !currentNode || !currentSavedPath || !currentNode.backtrackTo) {
      return;
    }

    const remedialNodeIds = getRemedialNodeIds(
      plan,
      currentNode.knowledgeId,
      currentNode.backtrackTo
    );
    upsertLearningPath(
      buildLearningPathRecord({
        plan,
        existingPath: currentSavedPath,
        currentNodeId: currentNode.backtrackTo,
        completedNodeIds: currentSavedPath.completedNodeIds,
        recommendedStartId: getRecommendedStartId(plan, currentSavedPath),
        targetName: currentSavedPath.targetName,
        sessionOverrides: {
          revealedRemedialNodeIds: remedialNodeIds,
          nodeStates: createNodeStates({
            plan,
            currentNodeId: currentNode.backtrackTo,
            completedNodeIds: currentSavedPath.completedNodeIds,
            recommendedStartId: getRecommendedStartId(plan, currentSavedPath),
            existingStates: {
              ...(currentSavedPath.session?.nodeStates || {}),
              [currentNode.backtrackTo]: "backtracking",
            },
          }),
          activeNodeMode: undefined,
        },
      })
    );
    setActiveNodeId(currentNode.backtrackTo);
    setFeedback(`已展开回补分支，切回「${getKnowledgeNode(currentNode.backtrackTo)?.name || currentNode.backtrackTo}」。`);
  }, [currentNode, currentSavedPath, plan, upsertLearningPath]);

  const handleLater = useCallback(() => {
    setFeedback("已标记稍后再学，首页会继续保留这条路径。");
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <Compass className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">学习规划器</h1>
          <p className="text-sm text-slate-500">
            支持快速生成，也支持先做 3 题起点测试后再进入主干学习与节点验证。
          </p>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="planner-input-wrapper">
          <MessageCircle className="absolute left-4 top-4 h-5 w-5 text-slate-300 pointer-events-none" />
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="用你自己的话说，想学什么……"
            className="planner-textarea"
            rows={2}
            disabled={loading}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            {plan && (
              <button onClick={handleReset} className="btn-icon" title="重新规划">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => void handleSubmit()}
              disabled={loading || (!query.trim() && !searchParams.get("target"))}
              className="btn-primary !py-2.5 !px-5 !text-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              规划
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <SelectField
            label="我的基础"
            value={baseLevel}
            onChange={(value) => setBaseLevel(value as LearningBaseLevel)}
            options={BASE_LEVELS}
          />
          <SelectField
            label="目标层级"
            value={goalLevel}
            onChange={(value) => setGoalLevel(value as LearningGoalLevel)}
            options={GOAL_LEVELS}
          />
          <SelectField
            label="生成方式"
            value={generationMode}
            onChange={(value) => setGenerationMode(value as LearningGenerationMode)}
            options={GENERATION_MODES}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {feedback && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {feedback}
          </div>
        )}
      </div>

      {!plan && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Lightbulb className="h-4 w-4" />
            <span>试试这些示例目标：</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt.text}
                onClick={() => void handleSubmit(prompt.text)}
                className="example-prompt-card"
              >
                <span className="text-lg">{prompt.icon}</span>
                <span className="text-sm text-slate-600 text-left leading-relaxed">
                  {prompt.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <LoadingState generationMode={generationMode} />}

      {plan && isAssessmentPending && assessmentQuestion && currentSavedPath && (
        <AssessmentView
          plan={plan}
          assessmentState={assessmentState}
          question={assessmentQuestion}
          selectedAnswer={
            currentSavedPath.session?.assessment?.answers?.[assessmentQuestion.id] || ""
          }
          onSelectAnswer={(answer) =>
            handleAssessmentAnswerChange(assessmentQuestion, answer)
          }
          onSubmit={handleAssessmentSubmit}
        />
      )}

      {plan && currentNode && !isAssessmentPending && selectedNode && (
        <PlanView
          plan={plan}
          savedPath={currentSavedPath}
          visibleNodeIds={visibleNodeIds}
          activePhase={activePhase}
          setActivePhase={setActivePhase}
          activeNodeId={activeNodeId}
          setActiveNodeId={setActiveNodeId}
          currentNode={currentNode}
          selectedNode={selectedNode}
          getMastery={getMastery}
          draftVerificationAnswer={draftVerificationAnswer}
          setDraftVerificationAnswer={setDraftVerificationAnswer}
          onStartLearning={handleStartLearning}
          onEnterVerification={handleEnterVerification}
          onSubmitVerification={handleVerificationSubmit}
          onBacktrackReveal={handleBacktrackReveal}
          onLater={handleLater}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-field"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoadingState({
  generationMode,
}: {
  generationMode: LearningGenerationMode;
}) {
  return (
    <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-6">
        <Compass className="h-12 w-12 animate-spin text-emerald-400" style={{ animationDuration: "3s" }} />
        <Sparkles className="absolute -right-1 -top-1 h-5 w-5 animate-pulse text-amber-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-700">
        {generationMode === "assessment" ? "正在准备起点测试…" : "正在生成学习路径…"}
      </h3>
      <p className="text-sm text-slate-400">
        匹配学习场景、生成评估题和节点验证、定位推荐起点
      </p>
    </div>
  );
}

function AssessmentView({
  plan,
  assessmentState,
  question,
  selectedAnswer,
  onSelectAnswer,
  onSubmit,
}: {
  plan: LearningPlan;
  assessmentState?: NonNullable<LearningPathProgress["session"]>["assessment"];
  question: LearningQuestion;
  selectedAnswer: string;
  onSelectAnswer: (answer: string) => void;
  onSubmit: () => void;
}) {
  const currentIndex = assessmentState?.currentIndex || 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-5 border-l-4 border-indigo-400">
          <div className="flex items-start gap-3">
            <TestTubeDiagonal className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900">3 题起点测试</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                完成后系统会根据你的表现重算推荐起点，并解释为什么从这一层开始。
              </p>
              <p className="text-xs text-indigo-700">
                当前目标层级：
                <span className="ml-1 font-semibold">
                  {plan.goalLevel === "concept"
                    ? "理解概念"
                    : plan.goalLevel === "comprehensive"
                    ? "冲综合题"
                    : "会做基础题"}
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(plan.assessmentQuestions || []).map((item, index) => {
            const passed = assessmentState?.results.some(
              (result) => result.questionId === item.id && result.isCorrect
            );
            const failed = assessmentState?.results.some(
              (result) => result.questionId === item.id && !result.isCorrect
            );
            return (
              <div
                key={item.id}
                className={`glass-card p-4 text-center ${
                  index === currentIndex ? "ring-2 ring-indigo-100 border-indigo-200" : ""
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Q{index + 1}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {passed ? "已通过" : failed ? "未通过" : "待完成"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="text-sm font-semibold text-slate-800">
          <MathText text={question.problem} />
        </div>
        <div className="grid gap-3">
          {question.options.map((option) => (
            <button
              key={option}
              onClick={() => onSelectAnswer(option)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                selectedAnswer === option
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <MathText text={option} />
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <button onClick={onSubmit} className="btn-primary text-sm py-2.5">
            <TestTubeDiagonal className="h-4 w-4" />
            提交当前测试题
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanView({
  plan,
  savedPath,
  visibleNodeIds,
  activePhase,
  setActivePhase,
  activeNodeId,
  setActiveNodeId,
  currentNode,
  selectedNode,
  getMastery,
  draftVerificationAnswer,
  setDraftVerificationAnswer,
  onStartLearning,
  onEnterVerification,
  onSubmitVerification,
  onBacktrackReveal,
  onLater,
}: {
  plan: LearningPlan;
  savedPath?: LearningPathProgress;
  visibleNodeIds: Set<string>;
  activePhase: number | null;
  setActivePhase: (phase: number | null) => void;
  activeNodeId: string | null;
  setActiveNodeId: (nodeId: string) => void;
  currentNode: LearningPlanNode;
  selectedNode: LearningPlanNode;
  getMastery: (id: string) => "none" | "low" | "medium" | "high" | "full";
  draftVerificationAnswer: string;
  setDraftVerificationAnswer: (value: string) => void;
  onStartLearning: () => void;
  onEnterVerification: () => void;
  onSubmitVerification: () => void;
  onBacktrackReveal: () => void;
  onLater: () => void;
}) {
  const currentNodeState =
    savedPath?.session?.nodeStates?.[currentNode.knowledgeId] || "current";
  const selectedNodeState =
    savedPath?.session?.nodeStates?.[selectedNode.knowledgeId] || "locked";
  const verificationResult = selectedNode.verificationQuestion
    ? savedPath?.session?.verificationResults?.[selectedNode.verificationQuestion.id]
    : undefined;
  const visibleNodes = plan.nodes.filter(
    (node) =>
      visibleNodeIds.has(node.knowledgeId) &&
      (activePhase === null || node.phase === activePhase)
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="glass-card p-5 border-l-4 border-emerald-400">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900">
                <MathText text={plan.goal} />
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                <MathText text={plan.interpretation} />
              </p>
              <p className="text-xs text-emerald-700">
                <MathText
                  text={
                    savedPath?.session?.assessment?.summary ||
                    plan.assessmentSummary ||
                    plan.whyStartHere ||
                    ""
                  }
                />
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <MetricCard label="知识点" value={String(plan.nodes.length)} />
          <MetricCard label="预计分钟" value={String(plan.totalEstimatedMinutes)} />
          <MetricCard
            label="当前模式"
            value={plan.generationMode === "assessment" ? "起点测试后执行" : "快速生成"}
          />
          <MetricCard label="里程碑" value={plan.nextCheckpoint || "完成当前节点"} compact />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          title="推荐起点"
          icon={Play}
          content={
            getKnowledgeNode(
              savedPath?.session?.assessment?.recommendedStartId ||
                plan.recommendedStartId ||
                ""
            )?.name || "当前节点"
          }
          caption={plan.sessionPlan}
        />
        <InfoCard
          title="目标层级"
          icon={Target}
          content={
            plan.goalLevel === "concept"
              ? "理解概念"
              : plan.goalLevel === "comprehensive"
              ? "冲综合题"
              : "会做基础题"
          }
          caption={plan.advice}
        />
        <InfoCard
          title="当前节点"
          icon={Flag}
          content={getKnowledgeNode(currentNode.knowledgeId)?.name || currentNode.knowledgeId}
          caption={NODE_STATE_LABELS[currentNodeState]}
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActivePhase(null)}
          className={`phase-tab ${activePhase === null ? "phase-tab-active" : ""}`}
        >
          全部
        </button>
        {plan.phases.map((phase) => (
          <button
            key={phase.phase}
            onClick={() => setActivePhase(phase.phase)}
            className={`phase-tab ${activePhase === phase.phase ? "phase-tab-active" : ""}`}
          >
            {phase.label}
          </button>
        ))}
      </div>

      <PlanGraph
        plan={plan}
        savedPath={savedPath}
        visibleNodeIds={visibleNodeIds}
        activePhase={activePhase}
        activeNodeId={activeNodeId}
        getMastery={getMastery}
        onSelectNode={setActiveNodeId}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <BookOpen className="h-4 w-4" />
            路径目录
          </div>
          {visibleNodes.map((node) => {
            const nodeMeta = getKnowledgeNode(node.knowledgeId);
            const nodeState =
              savedPath?.session?.nodeStates?.[node.knowledgeId] || "locked";
            const isSelected = node.knowledgeId === selectedNode.knowledgeId;
            return (
              <button
                key={node.knowledgeId}
                onClick={() => setActiveNodeId(node.knowledgeId)}
                className={`w-full rounded-2xl border bg-white p-4 text-left transition-all ${
                  isSelected
                    ? "border-emerald-300 shadow-sm ring-2 ring-emerald-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="plan-phase-badge" data-phase={node.phase}>
                    {node.phaseLabel}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {nodeMeta?.name || node.knowledgeId}
                  </span>
                  <span className="ml-auto text-xs text-slate-400">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {node.estimatedMinutes}m
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  <MathText text={node.learnWhat || node.reason} />
                </p>
                <div className="mt-2 text-xs text-slate-500">{NODE_STATE_LABELS[nodeState]}</div>
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              <h4 className="font-bold text-slate-800">节点执行卡</h4>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  {getKnowledgeNode(selectedNode.knowledgeId)?.name || selectedNode.knowledgeId}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  掌握度：{MASTERY_LABELS[getMastery(selectedNode.knowledgeId)]} · 状态：
                  {NODE_STATE_LABELS[selectedNodeState]}
                </div>
              </div>
              <SectionBlock title="学什么" content={selectedNode.learnWhat || selectedNode.reason} />
              <ListBlock title="学会标准" items={selectedNode.masteryChecks || selectedNode.objectives} />
              <ListBlock title="常见错误" items={selectedNode.commonMistakes || ["先看条件，再决定动作。"]} />
              <ListBlock
                title="前置节点"
                items={
                  (selectedNode.prerequisiteIds || []).length > 0
                    ? (selectedNode.prerequisiteIds || []).map(
                        (id) => getKnowledgeNode(id)?.name || id
                      )
                    : ["当前节点可以直接开始。"]
                }
              />
            </div>
          </div>

          <NodeActionCard
            currentNode={currentNode}
            selectedNode={selectedNode}
            currentNodeState={currentNodeState}
            verificationResult={verificationResult}
            draftVerificationAnswer={draftVerificationAnswer}
            setDraftVerificationAnswer={setDraftVerificationAnswer}
            onStartLearning={onStartLearning}
            onEnterVerification={onEnterVerification}
            onSubmitVerification={onSubmitVerification}
            onBacktrackReveal={onBacktrackReveal}
            onLater={onLater}
          />
        </div>
      </div>
    </div>
  );
}

function NodeActionCard({
  currentNode,
  selectedNode,
  currentNodeState,
  verificationResult,
  draftVerificationAnswer,
  setDraftVerificationAnswer,
  onStartLearning,
  onEnterVerification,
  onSubmitVerification,
  onBacktrackReveal,
  onLater,
}: {
  currentNode: LearningPlanNode;
  selectedNode: LearningPlanNode;
  currentNodeState: LearningNodeExecutionState;
  verificationResult?: LearningQuestionSubmissionResult;
  draftVerificationAnswer: string;
  setDraftVerificationAnswer: (value: string) => void;
  onStartLearning: () => void;
  onEnterVerification: () => void;
  onSubmitVerification: () => void;
  onBacktrackReveal: () => void;
  onLater: () => void;
}) {
  const isCurrentNode = selectedNode.knowledgeId === currentNode.knowledgeId;

  if (!isCurrentNode || !selectedNode.verificationQuestion) {
    return (
      <div className="glass-card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
          <Undo2 className="h-4 w-4 text-amber-500" />
          当前节点补救分支
        </div>
        <ListBlock
          title="回退提示"
          items={
            selectedNode.backtrackTo
              ? [
                  `卡住时回退到 ${
                    getKnowledgeNode(selectedNode.backtrackTo)?.name ||
                    selectedNode.backtrackTo
                  }`,
                ]
              : ["当前节点没有更早前置，优先重新看学会标准。"]
          }
        />
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <TestTubeDiagonal className="h-4 w-4 text-indigo-500" />
        节点验证
      </div>
      {currentNodeState !== "verifying" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button onClick={onStartLearning} className="btn-primary text-sm py-2.5">
            <Play className="h-4 w-4" />
            {currentNodeState === "learning" ? "继续学习中" : "开始学习"}
          </button>
          <button onClick={onEnterVerification} className="btn-secondary text-sm py-2.5">
            <TestTubeDiagonal className="h-4 w-4" />
            我学完了，进入验证
          </button>
          <button onClick={onBacktrackReveal} className="btn-secondary text-sm py-2.5">
            <Undo2 className="h-4 w-4" />
            展开补救分支
          </button>
          <button onClick={onLater} className="btn-secondary text-sm py-2.5">
            <RotateCcw className="h-4 w-4" />
            标记稍后再学
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <MathText text={selectedNode.verificationQuestion.problem} />
          </div>
          <div className="grid gap-3">
            {selectedNode.verificationQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => setDraftVerificationAnswer(option)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  draftVerificationAnswer === option
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <MathText text={option} />
              </button>
            ))}
          </div>
          <button onClick={onSubmitVerification} className="btn-primary text-sm py-2.5">
            <TestTubeDiagonal className="h-4 w-4" />
            提交验证
          </button>
        </div>
      )}
      {verificationResult && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            verificationResult.isCorrect
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <div className="mb-1 flex items-center gap-2 font-semibold">
            {verificationResult.isCorrect ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {verificationResult.isCorrect ? "验证通过" : "验证未通过"}
          </div>
          <MathText text={selectedNode.verificationQuestion.explanation} />
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="glass-card p-4 text-center">
      <div className={`font-bold text-slate-900 ${compact ? "text-sm" : "text-2xl"}`}>
        <MathText text={value} />
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function InfoCard({
  title,
  content,
  caption,
  icon: Icon,
}: {
  title: string;
  content: string;
  caption?: string;
  icon: typeof Sparkles;
}) {
  return (
    <div className="glass-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon className="h-4 w-4 text-indigo-500" />
        {title}
      </div>
      <div className="text-sm font-semibold text-slate-900">{content}</div>
      {caption && (
        <div className="mt-1 text-xs text-slate-500">
          <MathText text={caption} />
        </div>
      )}
    </div>
  );
}

function SectionBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </div>
      <div className="mt-1 text-sm text-slate-700">
        <MathText text={content} />
      </div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            <span>
              <MathText text={item} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanGraph({
  plan,
  savedPath,
  visibleNodeIds,
  activePhase,
  activeNodeId,
  getMastery,
  onSelectNode,
}: {
  plan: LearningPlan;
  savedPath?: LearningPathProgress;
  visibleNodeIds: Set<string>;
  activePhase: number | null;
  activeNodeId: string | null;
  getMastery: (id: string) => "none" | "low" | "medium" | "high" | "full";
  onSelectNode: (nodeId: string) => void;
}) {
  const { flowNodes, flowEdges } = useMemo(() => {
    const filteredNodes = plan.nodes.filter(
      (node) =>
        visibleNodeIds.has(node.knowledgeId) &&
        (activePhase === null || node.phase === activePhase)
    );
    const nodeSet = new Set(filteredNodes.map((node) => node.knowledgeId));

    const nodes: Node[] = filteredNodes.map((node, index) => {
      const meta = getKnowledgeNode(node.knowledgeId);
      return {
        id: node.knowledgeId,
        type: "knowledgeNode",
        position: {
          x: (index % 3) * 240,
          y: Math.floor(index / 3) * 170,
        },
        data: {
          name: meta?.name || node.knowledgeId,
          category: meta?.category || "algebra",
          difficulty: meta?.difficulty || 2,
          mastery: getMastery(node.knowledgeId),
          isTarget: node.knowledgeId === activeNodeId,
        } satisfies KnowledgeNodeData,
      };
    });

    const edges: Edge[] = plan.edges
      .filter((edge) => nodeSet.has(edge.source) && nodeSet.has(edge.target))
      .filter((edge) => {
        if (edge.type === "progress") {
          return true;
        }
        return (
          Boolean(savedPath?.session?.revealedRemedialNodeIds.length) ||
          savedPath?.session?.nodeStates?.[edge.source] === "failed"
        );
      })
      .map((edge) => ({
        id: `${edge.type}-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        animated: edge.type === "progress",
        style:
          edge.type === "progress"
            ? { stroke: "#818cf8", strokeWidth: 2 }
            : { stroke: "#f59e0b", strokeWidth: 1.5, strokeDasharray: "6 4" },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edge.type === "progress" ? "#818cf8" : "#f59e0b",
          width: 14,
          height: 14,
        },
        label: edge.label,
        labelStyle: {
          fontSize: 11,
          fill: edge.type === "progress" ? "#94a3b8" : "#d97706",
        },
      }));

    return { flowNodes: nodes, flowEdges: edges };
  }, [
    activeNodeId,
    activePhase,
    getMastery,
    plan.edges,
    plan.nodes,
    savedPath?.session?.nodeStates,
    savedPath?.session?.revealedRemedialNodeIds.length,
    visibleNodeIds,
  ]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  return (
    <div className="glass-card overflow-hidden" style={{ height: "440px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        minZoom={0.3}
        maxZoom={1.4}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
      </ReactFlow>
    </div>
  );
}
