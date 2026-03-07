"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Compass,
  Send,
  Clock,
  BookOpen,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Loader2,
  Target,
  ArrowDownRight,
  Lightbulb,
  MessageCircle,
} from "lucide-react";
import { KnowledgeGraphNode } from "@/components/graph/knowledge-node";
import type { KnowledgeNodeData } from "@/components/graph/knowledge-node";
import { getKnowledgeNode } from "@/lib/knowledge-graph";
import { useAppStore } from "@/lib/store";
import {
  CATEGORY_COLORS,
  MASTERY_COLORS,
  type LearningPlan,
} from "@/types";

const nodeTypes = { knowledgeNode: KnowledgeGraphNode };

/** Example prompts to inspire the user */
const EXAMPLE_PROMPTS = [
  { icon: "📐", text: "我想学椭圆，但感觉解析几何基础不好" },
  { icon: "📊", text: "概率老是算错，该怎么补" },
  { icon: "🔢", text: "导数大题完全不会，从哪开始" },
  { icon: "📈", text: "数列求和有哪几种方法，我想系统学一下" },
  { icon: "🔺", text: "三角恒等变换总是记混公式" },
  { icon: "🧊", text: "立体几何想用向量法，需要先学什么" },
];

export default function LearnPage() {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = useAppStore((s) => s.progress);
  const getMastery = useAppStore((s) => s.getMastery);

  const handleSubmit = useCallback(
    async (text?: string) => {
      const q = (text || query).trim();
      if (!q) return;
      setQuery(q);
      setLoading(true);
      setError(null);
      setPlan(null);

      try {
        const res = await fetch("/api/learn-path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            studentMastery: progress.knowledge,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "请求失败");
        }
        const data: LearningPlan = await res.json();
        setPlan(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "发生错误，请重试");
      } finally {
        setLoading(false);
      }
    },
    [query, progress.knowledge]
  );

  const handleReset = () => {
    setPlan(null);
    setQuery("");
    setError(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <Compass className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            学习规划器
          </h1>
          <p className="text-sm text-slate-500">
            告诉我你想学什么，AI 帮你规划从哪开始、按什么顺序、卡住时退回哪里
          </p>
        </div>
      </div>

      {/* Input Area */}
      <div className="glass-card p-6">
        <div className="planner-input-wrapper">
          <MessageCircle className="absolute left-4 top-4 w-5 h-5 text-slate-300 pointer-events-none" />
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="用你自己的话说，想学什么……&#10;比如「导数大题完全不会，从哪开始」"
            className="planner-textarea"
            rows={2}
            disabled={loading}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            {plan && (
              <button onClick={handleReset} className="btn-icon" title="重新规划">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !query.trim()}
              className="btn-primary !py-2.5 !px-5 !text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              规划
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">
            {error}
          </div>
        )}
      </div>

      {/* Content: either examples or plan */}
      {!plan && !loading && <ExamplePrompts onSelect={handleSubmit} />}
      {loading && <LoadingState />}
      {plan && <PlanView plan={plan} getMastery={getMastery} />}
    </div>
  );
}

// ---- Example Prompts ----

function ExamplePrompts({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Lightbulb className="w-4 h-4" />
        <span>试试这些：</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {EXAMPLE_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => onSelect(p.text)}
            className="example-prompt-card"
          >
            <span className="text-lg">{p.icon}</span>
            <span className="text-sm text-slate-600 text-left leading-relaxed">
              {p.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Loading State ----

function LoadingState() {
  return (
    <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-6">
        <Compass className="w-12 h-12 text-emerald-400 animate-spin" style={{ animationDuration: "3s" }} />
        <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        正在分析你的学习需求…
      </h3>
      <p className="text-sm text-slate-400">
        匹配知识点、计算前置路径、生成分阶段计划
      </p>
    </div>
  );
}

// ---- Plan View ----

function PlanView({
  plan,
  getMastery,
}: {
  plan: LearningPlan;
  getMastery: (id: string) => "none" | "low" | "medium" | "high" | "full";
}) {
  const [activePhase, setActivePhase] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* AI Interpretation Card */}
      <div className="glass-card p-5 border-l-4 border-emerald-400">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-slate-900 mb-1">{plan.goal}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {plan.interpretation}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">
            {plan.nodes.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">知识点</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {plan.phases.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">阶段</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">
            {plan.totalEstimatedMinutes}
          </div>
          <div className="text-xs text-slate-500 mt-1">预计分钟</div>
        </div>
      </div>

      {/* Phase Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActivePhase(null)}
          className={`phase-tab ${activePhase === null ? "phase-tab-active" : ""}`}
        >
          全部
        </button>
        {plan.phases.map((p) => (
          <button
            key={p.phase}
            onClick={() => setActivePhase(p.phase)}
            className={`phase-tab ${activePhase === p.phase ? "phase-tab-active" : ""}`}
          >
            <span className="phase-dot" data-phase={p.phase} />
            {p.label}
          </button>
        ))}
      </div>

      {/* Graph */}
      <PlanGraph
        plan={plan}
        getMastery={getMastery}
        activePhase={activePhase}
      />

      {/* Phase Details + Node List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Node List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            学习节点
          </h3>
          {plan.nodes
            .filter((n) => activePhase === null || n.phase === activePhase)
            .map((node, idx) => {
              const kn = getKnowledgeNode(node.knowledgeId);
              if (!kn) return null;
              const mastery = getMastery(node.knowledgeId);
              const color = CATEGORY_COLORS[kn.category];
              const masteryColor = MASTERY_COLORS[mastery];
              const isTarget = idx === plan.nodes.length - 1 && activePhase === null;

              return (
                <div
                  key={node.knowledgeId}
                  className={`plan-node-card ${isTarget ? "plan-node-target" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="plan-phase-badge" data-phase={node.phase}>
                      {node.phaseLabel}
                    </div>
                    <span className="font-semibold text-slate-800 flex-1">
                      {kn.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: masteryColor }}
                      />
                      <span className="text-xs text-slate-400">
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {node.estimatedMinutes}m
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">
                    {node.reason}
                  </p>
                  {node.objectives.length > 0 && (
                    <ul className="text-xs text-slate-500 space-y-0.5">
                      {node.objectives.map((obj, j) => (
                        <li key={j} className="flex items-start gap-1.5">
                          <ChevronRight className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  )}
                  {node.backtrackTo && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                      <RotateCcw className="w-3 h-3" />
                      卡住时退回：
                      <span className="font-medium">
                        {getKnowledgeNode(node.backtrackTo)?.name || node.backtrackTo}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Right: Advice + Phase Descriptions */}
        <div className="space-y-4">
          {/* Advice */}
          <div className="glass-card p-5" style={{ background: "linear-gradient(135deg, #ecfdf5, #f0fdf4)" }}>
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-800 mb-1">
                  学习建议
                </h4>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  {plan.advice}
                </p>
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="glass-card p-5">
            <h4 className="text-sm font-bold text-slate-700 mb-3">阶段说明</h4>
            <div className="space-y-3">
              {plan.phases.map((p) => (
                <div key={p.phase} className="flex items-start gap-3">
                  <div className="plan-phase-badge shrink-0 mt-0.5" data-phase={p.phase}>
                    {p.label}
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="glass-card p-5">
            <h4 className="text-sm font-bold text-slate-700 mb-3">图例</h4>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-indigo-400 rounded" />
                <span>前进路线（学习依赖关系）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-amber-400 rounded" style={{ borderTop: "2px dashed #f59e0b" }} />
                <span>退回路线（卡住时复习方向）</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-slate-400" />
                <span>节点颜色 = 知识分类，进度条 = 当前掌握度</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Plan Graph (React Flow) ----

function PlanGraph({
  plan,
  getMastery,
  activePhase,
}: {
  plan: LearningPlan;
  getMastery: (id: string) => "none" | "low" | "medium" | "high" | "full";
  activePhase: number | null;
}) {
  const { flowNodes, flowEdges } = useMemo(() => {
    const filteredNodes =
      activePhase === null
        ? plan.nodes
        : plan.nodes.filter((n) => n.phase === activePhase);

    const nodeSet = new Set(filteredNodes.map((n) => n.knowledgeId));

    // Layout: group by phase, spread within phase
    const phaseGroups = new Map<number, typeof filteredNodes>();
    for (const n of filteredNodes) {
      const group = phaseGroups.get(n.phase) || [];
      group.push(n);
      phaseGroups.set(n.phase, group);
    }

    const xSpacing = 240;
    const yPhaseSpacing = 200;

    const nodes: Node[] = [];
    let phaseRow = 0;

    for (const [, group] of [...phaseGroups.entries()].sort(
      (a, b) => a[0] - b[0]
    )) {
      const nodesPerRow = Math.min(group.length, 4);
      const totalWidth = (nodesPerRow - 1) * xSpacing;
      const startX = -totalWidth / 2;

      group.forEach((planNode, i) => {
        const kn = getKnowledgeNode(planNode.knowledgeId);
        if (!kn) return;
        const row = Math.floor(i / 4);
        const col = i % 4;

        nodes.push({
          id: planNode.knowledgeId,
          type: "knowledgeNode",
          position: {
            x: startX + col * xSpacing,
            y: phaseRow * yPhaseSpacing + row * 160,
          },
          data: {
            name: kn.name,
            category: kn.category,
            difficulty: kn.difficulty,
            mastery: getMastery(planNode.knowledgeId),
            isTarget:
              planNode.knowledgeId ===
              plan.nodes[plan.nodes.length - 1]?.knowledgeId,
          } satisfies KnowledgeNodeData,
        });
      });

      const rows = Math.ceil(group.length / 4);
      phaseRow += rows;
    }

    // Edges
    const edges: Edge[] = [];
    for (const e of plan.edges) {
      if (!nodeSet.has(e.source) || !nodeSet.has(e.target)) continue;

      if (e.type === "progress") {
        edges.push({
          id: `prog-${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: "#818cf8", strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#818cf8",
            width: 16,
            height: 16,
          },
          label: e.label,
          labelStyle: { fontSize: 11, fill: "#94a3b8" },
        });
      } else {
        // backtrack
        edges.push({
          id: `back-${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          animated: false,
          style: {
            stroke: "#f59e0b",
            strokeWidth: 1.5,
            strokeDasharray: "6 4",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#f59e0b",
            width: 14,
            height: 14,
          },
          label: e.label,
          labelStyle: { fontSize: 10, fill: "#d97706" },
        });
      }
    }

    return { flowNodes: nodes, flowEdges: edges };
  }, [plan, getMastery, activePhase]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  return (
    <div className="glass-card overflow-hidden" style={{ height: "480px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#e2e8f0"
        />
      </ReactFlow>
    </div>
  );
}
