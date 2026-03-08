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
  LearningPlan,
} from "@/types";
import { CATEGORY_COLORS, MASTERY_COLORS, MASTERY_LABELS } from "@/types";

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
  const upsertLearningPath = useAppStore((state) => state.upsertLearningPath);
  const completeLearningPathStep = useAppStore(
    (state) => state.completeLearningPathStep
  );

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

  const currentSavedPath = useMemo(() => {
    if (!plan?.targetKnowledgeId) {
      return undefined;
    }
    return [...progress.learningPaths]
      .reverse()
      .find((item) => item.targetId === plan.targetKnowledgeId);
  }, [plan?.targetKnowledgeId, progress.learningPaths]);

  const loadPlan = useCallback(
    async ({
      queryText,
      targetId,
      syncUrl = true,
    }: {
      queryText?: string;
      targetId?: string;
      syncUrl?: boolean;
    }) => {
      const trimmedQuery = queryText?.trim();
      if (!trimmedQuery && !targetId) {
        return;
      }

      setLoading(true);
      setError(null);
      setFeedback(null);

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
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "学习路径加载失败");
        }

        const data: LearningPlan = await response.json();
        const resolvedQuery = trimmedQuery || searchParams.get("query") || data.goal;
        const restoredNodeId =
          currentSavedPath?.currentNodeId ||
          data.currentNodeId ||
          data.recommendedStartId ||
          data.nodes[0]?.knowledgeId ||
          null;

        setQuery(resolvedQuery);
        setPlan(data);
        setActiveNodeId(restoredNodeId);
        setActivePhase(null);

        if (syncUrl && data.targetKnowledgeId) {
          const params = new URLSearchParams();
          params.set("target", data.targetKnowledgeId);
          params.set("query", resolvedQuery);
          router.replace(`/learn?${params.toString()}`, { scroll: false });
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "发生错误，请重试");
        setPlan(null);
      } finally {
        setLoading(false);
      }
    },
    [
      baseLevel,
      currentSavedPath?.currentNodeId,
      generationMode,
      goalLevel,
      router,
      searchParams,
    ]
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

  const visibleNodes = useMemo(() => {
    if (!plan) {
      return [];
    }
    return activePhase === null
      ? plan.nodes
      : plan.nodes.filter((node) => node.phase === activePhase);
  }, [activePhase, plan]);

  const currentNode = useMemo(() => {
    if (!plan) {
      return null;
    }
    return (
      plan.nodes.find((node) => node.knowledgeId === activeNodeId) ||
      plan.nodes.find((node) => node.knowledgeId === plan.currentNodeId) ||
      plan.nodes[0] ||
      null
    );
  }, [activeNodeId, plan]);

  const currentNodeIndex = useMemo(() => {
    if (!plan || !currentNode) {
      return -1;
    }
    return plan.nodes.findIndex((node) => node.knowledgeId === currentNode.knowledgeId);
  }, [currentNode, plan]);

  const handleSubmit = useCallback(
    async (overrideQuery?: string) => {
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
    lastBootstrapKey.current = null;
    router.replace("/learn", { scroll: false });
  }, [router]);

  const handleStartLearning = useCallback(() => {
    if (!plan || !currentNode || !plan.targetKnowledgeId) {
      return;
    }
    const targetName =
      getKnowledgeNode(plan.targetKnowledgeId)?.name || plan.goal;
    const now = new Date().toISOString();

    upsertLearningPath({
      targetId: plan.targetKnowledgeId,
      targetName,
      currentNodeId: currentNode.knowledgeId,
      currentStep: Math.max(1, currentNodeIndex + 1),
      totalSteps: plan.nodes.length,
      completedNodeIds: currentSavedPath?.completedNodeIds || [],
      startedAt: currentSavedPath?.startedAt || now,
      updatedAt: now,
      status: currentSavedPath?.status || "active",
    });
    setFeedback(`已开始「${targetName}」路径，当前节点：${getKnowledgeNode(currentNode.knowledgeId)?.name}`);
  }, [currentNode, currentNodeIndex, currentSavedPath, plan, upsertLearningPath]);

  const advanceNode = useCallback(
    (modeLabel: string) => {
      if (!plan || !currentNode || !plan.targetKnowledgeId) {
        return;
      }

      const nextNode = plan.nodes[currentNodeIndex + 1];
      completeLearningPathStep(
        plan.targetKnowledgeId,
        currentNode.knowledgeId,
        nextNode?.knowledgeId
      );
      setActiveNodeId(nextNode?.knowledgeId || currentNode.knowledgeId);
      setFeedback(
        nextNode
          ? `${modeLabel}已记录，下一步建议学习「${getKnowledgeNode(nextNode.knowledgeId)?.name}」`
          : `已完成整条路径，可以回到首页继续今日任务。`
      );
    },
    [completeLearningPathStep, currentNode, currentNodeIndex, plan]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <Compass className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">学习规划器</h1>
          <p className="text-sm text-slate-500">
            输入学习目标后，系统会生成路径、推荐起点和当前节点执行区。
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
            onChange={(value) =>
              setGenerationMode(value as LearningGenerationMode)
            }
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
      {plan && currentNode && (
        <PlanView
          plan={plan}
          activePhase={activePhase}
          setActivePhase={setActivePhase}
          activeNodeId={activeNodeId}
          setActiveNodeId={setActiveNodeId}
          currentNodeId={currentNode.knowledgeId}
          getMastery={getMastery}
          onStartLearning={handleStartLearning}
          onSelfCheck={() => advanceNode("自测通过")}
          onBacktrack={() => {
            if (currentNode.backtrackTo) {
              setActiveNodeId(currentNode.backtrackTo);
              setFeedback(
                `已切回前置节点「${getKnowledgeNode(currentNode.backtrackTo)?.name}」`
              );
            }
          }}
          onLater={() => {
            setFeedback("已标记为稍后再学，首页会继续保留这条任务。");
          }}
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
        {generationMode === "assessment" ? "正在准备起点测试建议…" : "正在生成学习路径…"}
      </h3>
      <p className="text-sm text-slate-400">
        匹配场景、装载路径摘要、定位当前推荐节点
      </p>
    </div>
  );
}

function PlanView({
  plan,
  activePhase,
  setActivePhase,
  activeNodeId,
  setActiveNodeId,
  currentNodeId,
  getMastery,
  onStartLearning,
  onSelfCheck,
  onBacktrack,
  onLater,
}: {
  plan: LearningPlan;
  activePhase: number | null;
  setActivePhase: (phase: number | null) => void;
  activeNodeId: string | null;
  setActiveNodeId: (nodeId: string) => void;
  currentNodeId: string;
  getMastery: (id: string) => "none" | "low" | "medium" | "high" | "full";
  onStartLearning: () => void;
  onSelfCheck: () => void;
  onBacktrack: () => void;
  onLater: () => void;
}) {
  const currentNode =
    plan.nodes.find((node) => node.knowledgeId === currentNodeId) || plan.nodes[0];

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
                <MathText text={plan.whyStartHere || ""} />
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <MetricCard label="知识点" value={String(plan.nodes.length)} />
          <MetricCard label="预计分钟" value={String(plan.totalEstimatedMinutes)} />
          <MetricCard label="当前模式" value={plan.generationMode === "assessment" ? "起点测试" : "快速生成"} />
          <MetricCard label="里程碑" value={plan.nextCheckpoint || "完成当前节点"} compact />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          title="推荐起点"
          icon={Play}
          content={getKnowledgeNode(plan.recommendedStartId || "")?.name || "当前节点"}
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
          caption={currentNode.reason}
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
          {plan.nodes
            .filter((node) => activePhase === null || node.phase === activePhase)
            .map((node) => {
              const nodeMeta = getKnowledgeNode(node.knowledgeId);
              const isActive = node.knowledgeId === currentNode.knowledgeId;
              return (
                <button
                  key={node.knowledgeId}
                  onClick={() => setActiveNodeId(node.knowledgeId)}
                  className={`w-full rounded-2xl border bg-white p-4 text-left transition-all ${
                    isActive
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
                  {node.commonMistakes?.[0] && (
                    <p className="mt-2 text-xs text-amber-600">
                      易错点：<MathText text={node.commonMistakes[0]} />
                    </p>
                  )}
                </button>
              );
            })}
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              <h4 className="font-bold text-slate-800">当前节点学习卡</h4>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  {getKnowledgeNode(currentNode.knowledgeId)?.name || currentNode.knowledgeId}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  掌握度：{MASTERY_LABELS[getMastery(currentNode.knowledgeId)]}
                </div>
              </div>
              <SectionBlock title="学什么" content={currentNode.learnWhat || currentNode.reason} />
              <ListBlock title="学会标准" items={currentNode.masteryChecks || currentNode.objectives} />
              <ListBlock title="常见错误" items={currentNode.commonMistakes || ["先看题型，再做动作。"]} />
              <ListBlock
                title="前置节点"
                items={
                  (currentNode.prerequisiteIds || []).map(
                    (id) => getKnowledgeNode(id)?.name || id
                  ).length > 0
                    ? (currentNode.prerequisiteIds || []).map(
                        (id) => getKnowledgeNode(id)?.name || id
                      )
                    : ["当前节点可以直接开始。"]
                }
              />
            </div>
          </div>

          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <TestTubeDiagonal className="h-4 w-4 text-indigo-500" />
              节点动作
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={onStartLearning} className="btn-primary text-sm py-2.5">
                <Play className="h-4 w-4" />
                开始学习
              </button>
              <button onClick={onSelfCheck} className="btn-secondary text-sm py-2.5">
                <TestTubeDiagonal className="h-4 w-4" />
                直接自测
              </button>
              <button onClick={onBacktrack} className="btn-secondary text-sm py-2.5">
                <Undo2 className="h-4 w-4" />
                展开前置知识
              </button>
              <button onClick={onLater} className="btn-secondary text-sm py-2.5">
                <RotateCcw className="h-4 w-4" />
                标记稍后再学
              </button>
            </div>
          </div>
        </div>
      </div>
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
  activePhase,
  activeNodeId,
  getMastery,
  onSelectNode,
}: {
  plan: LearningPlan;
  activePhase: number | null;
  activeNodeId: string | null;
  getMastery: (id: string) => "none" | "low" | "medium" | "high" | "full";
  onSelectNode: (nodeId: string) => void;
}) {
  const { flowNodes, flowEdges } = useMemo(() => {
    const filteredNodes =
      activePhase === null
        ? plan.nodes
        : plan.nodes.filter((node) => node.phase === activePhase);
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
  }, [activeNodeId, activePhase, getMastery, plan.edges, plan.nodes]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    nodes.forEach((node) => {
      if (node.id === activeNodeId) {
        onSelectNode(node.id);
      }
    });
  }, [activeNodeId, nodes, onSelectNode]);

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
