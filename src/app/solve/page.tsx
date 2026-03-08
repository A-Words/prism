"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Route,
  Send,
  Loader2,
  Sparkles,
  BookOpen,
  ChevronRight,
  PanelRightOpen,
  PanelRightClose,
  GraduationCap,
  Eye,
  EyeOff,
  Footprints,
  RotateCcw,
} from "lucide-react";
import { SolutionNode } from "@/components/graph/solution-node";
import type { SolutionNodeData } from "@/components/graph/solution-node";
import { MathText } from "@/components/ui/math-renderer";
import { mockSolutionPath } from "@/lib/mock-data";
import { getKnowledgeNode } from "@/lib/knowledge-graph";
import {
  STEP_TYPE_COLORS,
  STEP_TYPE_LABELS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type SolutionPath,
  type SolutionStepState,
} from "@/types";

const nodeTypes = { solutionStep: SolutionNode };
const EXAMPLE_PROBLEMS = [
  "解不等式 x² - 3x + 2 < 0",
  "已知 sin x + cos x = √2，求 sin 2x 的值",
  "若 P(A)=0.6，P(B)=0.5，P(A∩B)=0.3，求 P(A|B)",
];

export default function SolvePage() {
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [solutionPath, setSolutionPath] = useState<SolutionPath | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [stepStates, setStepStates] = useState<Record<string, SolutionStepState>>({});

  const handleSolve = useCallback(async () => {
    if (!problem.trim()) return;
    setLoading(true);
    setExpandedStep(null);
    setStepStates({});

    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: problem.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setSolutionPath(data);
        // Initialize: only first step is "hinted", rest locked
        if (data.steps?.length > 0) {
          const initial: Record<string, SolutionStepState> = {};
          data.steps.forEach((s: { id: string }, i: number) => {
            initial[s.id] = i === 0 ? "hinted" : "locked";
          });
          setStepStates(initial);
        }
      } else {
        setSolutionPath(mockSolutionPath);
        initMockStates();
      }
    } catch {
      setSolutionPath(mockSolutionPath);
      initMockStates();
    } finally {
      setLoading(false);
    }
  }, [problem]);

  const initMockStates = () => {
    const initial: Record<string, SolutionStepState> = {};
    mockSolutionPath.steps.forEach((s, i) => {
      initial[s.id] = i === 0 ? "hinted" : "locked";
    });
    setStepStates(initial);
  };

  const handleDemo = useCallback(() => {
    setProblem("解不等式 x² - 3x + 2 < 0");
    setSolutionPath(mockSolutionPath);
    setExpandedStep(null);
    initMockStates();
  }, []);

  const handleReset = useCallback(() => {
    setProblem("");
    setSolutionPath(null);
    setExpandedStep(null);
    setStepStates({});
  }, []);

  const handleStepStateChange = useCallback(
    (stepId: string, newState: SolutionStepState) => {
      setStepStates((prev) => {
        const updated = { ...prev, [stepId]: newState };

        // When a step is attempted, unlock the next one
        if (newState === "attempted" && solutionPath) {
          const idx = solutionPath.steps.findIndex((s) => s.id === stepId);
          if (idx >= 0 && idx < solutionPath.steps.length - 1) {
            const nextId = solutionPath.steps[idx + 1].id;
            if (updated[nextId] === "locked") {
              updated[nextId] = "hinted";
            }
          }
        }

        return updated;
      });
    },
    [solutionPath]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
          <Route className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">解题路径图</h1>
          <p className="text-sm text-slate-500">
            输入题目后生成步骤图，并联动右侧题型识别、前置知识和分步提示。
          </p>
        </div>
      </div>

      {/* Problem Input */}
      <div className="glass-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="badge bg-cyan-100 text-cyan-700">结构化生成</span>
          <span className="text-xs text-slate-400">
            后端会优先调用 AI 生成路径，超时或失败时自动回退到规则模板。
          </span>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="输入数学题目，例如：解不等式 x² - 3x + 2 < 0"
              className="input-field min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSolve();
                }
              }}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="space-y-2">
                <span className="text-xs text-slate-400 block">
                  支持 LaTeX 语法，Ctrl+Enter 提交
                </span>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROBLEMS.map((example) => (
                    <button
                      key={example}
                      onClick={() => setProblem(example)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 transition-colors hover:border-cyan-200 hover:text-cyan-700"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {solutionPath && (
                  <button
                    onClick={handleReset}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置视图
                  </button>
                )}
                <button
                  onClick={handleDemo}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  <Sparkles className="w-4 h-4" />
                  查看示例
                </button>
                <button
                  onClick={handleSolve}
                  disabled={!problem.trim() || loading}
                  className="btn-primary text-sm py-2 px-4"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  生成路径图
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!solutionPath && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-cyan-500" />
              <h2 className="text-base font-bold text-slate-900">如何使用这个页面</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-500">
              <p>1. 先点“查看示例”或选择一个示例题目，快速生成一条路径图。</p>
              <p>2. 展开节点查看“为什么这样做、常见错误、互动问题”。</p>
              <p>3. 右侧引导区会同步展示题型识别、前置知识、易错点和分步提示。</p>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-900">当前页面能力</h2>
            </div>
            <div className="space-y-2 text-sm text-slate-500">
              <p>统一消费结构化结果：步骤图、whyThisStep、interactionPoint、guide。</p>
              <p>AI 和规则模板都会落到同一返回结构，页面交互保持一致。</p>
            </div>
          </div>
        </div>
      )}

      {/* Solution Path visualization + Guide Sidebar */}
      {solutionPath && (
        <SolutionPathView
          path={solutionPath}
          expandedStep={expandedStep}
          onToggleStep={(id) =>
            setExpandedStep(expandedStep === id ? null : id)
          }
          stepStates={stepStates}
          onStepStateChange={handleStepStateChange}
        />
      )}
    </div>
  );
}

function SolutionPathView({
  path,
  expandedStep,
  onToggleStep,
  stepStates,
  onStepStateChange,
}: {
  path: SolutionPath;
  expandedStep: string | null;
  onToggleStep: (id: string) => void;
  stepStates: Record<string, SolutionStepState>;
  onStepStateChange: (stepId: string, state: SolutionStepState) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeHintLevel, setActiveHintLevel] = useState(0);

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const nodes: Node[] = path.steps.map((step, i) => ({
      id: step.id,
      type: "solutionStep",
      position: { x: 250, y: i * 240 },
      data: {
        title: step.title,
        content: step.content,
        explanation: step.explanation,
        stepType: step.type,
        knowledgePoints: step.knowledgePoints,
        isExpanded: expandedStep === step.id,
        onToggle: () => onToggleStep(step.id),
        stepState: stepStates[step.id] || "locked",
        onStateChange: (state: SolutionStepState) =>
          onStepStateChange(step.id, state),
        whyThisStep: step.whyThisStep,
        commonMistake: step.commonMistake,
        alternativeApproach: step.alternativeApproach,
        interactionPoint: step.interactionPoint,
      } satisfies SolutionNodeData,
    }));

    const edges: Edge[] = path.edges.map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      animated: true,
      style: {
        stroke: "#a5b4fc",
        strokeWidth: 2,
      },
      label: e.label,
      labelStyle: { fontSize: 11, fill: "#94a3b8" },
    }));

    return { nodes, edges };
  }, [path, expandedStep, onToggleStep, stepStates, onStepStateChange]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  // Progress stats
  const totalSteps = path.steps.length;
  const attemptedSteps = Object.values(stepStates).filter(
    (s) => s === "attempted"
  ).length;
  const hintedSteps = Object.values(stepStates).filter(
    (s) => s === "hinted"
  ).length;

  // Get unique step types for legend
  const stepTypes = useMemo(() => {
    const types = new Set(path.steps.map((s) => s.type));
    return Array.from(types);
  }, [path]);

  // Get related knowledge
  const relatedKnowledge = useMemo(() => {
    return path.relatedKnowledge
      .map((id) => getKnowledgeNode(id))
      .filter(Boolean);
  }, [path]);

  const guide = path.guide;

  return (
    <div className="space-y-5">
      {/* Problem summary + Progress bar */}
      <div className="glass-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge bg-indigo-100 text-indigo-700">
                {path.problemType}
              </span>
              <span className="badge bg-slate-100 text-slate-600">
                难度 {"★".repeat(path.difficulty)}
                {"☆".repeat(5 - path.difficulty)}
              </span>
              <span className="badge bg-emerald-100 text-emerald-700">
                <Footprints className="w-3 h-3" />
                {attemptedSteps}/{totalSteps} 步已探索
              </span>
            </div>
            <div className="text-lg font-semibold text-slate-800 mb-2">
              <MathText text={path.problem} />
            </div>
            <div className="text-sm text-slate-500">
              <MathText text={path.summary} />
            </div>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
            {path.steps.map((step) => {
              const state = stepStates[step.id] || "locked";
              return (
                <div
                  key={step.id}
                  className="h-full transition-all duration-300"
                  style={{
                    flex: 1,
                    backgroundColor:
                      state === "attempted"
                        ? "#10b981"
                        : state === "hinted"
                          ? "#f59e0b"
                          : "#e5e7eb",
                  }}
                />
              );
            })}
          </div>
          <span className="text-xs text-slate-400">
            {attemptedSteps === totalSteps
              ? "🎉 全部完成"
              : `${attemptedSteps} / ${totalSteps}`}
          </span>
        </div>
      </div>

      {/* Graph + Sidebar layout */}
      <div className="flex gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Graph */}
        <div
          className="relative transition-all duration-300"
          style={{
            height: "650px",
            flex: sidebarOpen ? "1 1 0%" : "1 1 100%",
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.3}
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

          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            {sidebarOpen ? (
              <>
                <PanelRightClose className="w-4 h-4" />
                收起引导
              </>
            ) : (
              <>
                <PanelRightOpen className="w-4 h-4" />
                展开引导
              </>
            )}
          </button>
        </div>

        {/* Guide Sidebar */}
        {sidebarOpen && (
          <div
            className="guide-sidebar shrink-0 animate-slide-in"
            style={{ width: 320 }}
          >
            {guide ? (
              <>
                {/* 题型识别 */}
                <div className="guide-section">
                  <div className="guide-section-title">📋 题型识别</div>
                  <div className="text-sm font-semibold text-slate-800 mb-1">
                    {guide.problemType}
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    <MathText text={guide.typeExplanation} />
                  </div>
                </div>

                {/* 前置知识 */}
                <div className="guide-section">
                  <div className="guide-section-title">📚 前置知识</div>
                  <div className="space-y-2">
                    {guide.prerequisites.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-start gap-2 text-xs"
                      >
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-700">
                            {p.name}
                          </span>
                          <span className="text-slate-500">
                            {" — "}
                            <MathText text={p.why} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 易错点 */}
                <div className="guide-section">
                  <div className="guide-section-title">⚠️ 易错点</div>
                  <div className="space-y-2">
                    {guide.commonMistakes.map((m, i) => (
                      <div
                        key={i}
                        className="text-xs bg-amber-50 rounded-lg p-2.5"
                      >
                        <div className="font-semibold text-amber-800 mb-0.5">
                          <MathText text={m.description} />
                        </div>
                        <div className="text-amber-600">
                          <MathText text={m.why} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 分步提示 */}
                <div className="guide-section">
                  <div className="guide-section-title">💡 分步提示</div>
                  <div className="space-y-1.5">
                    {guide.stepHints.map((hint, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {i <= activeHintLevel ? (
                          <div className="flex items-start gap-2 text-xs animate-fade-in">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-slate-600">
                              <MathText text={hint} />
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold shrink-0">
                              {i + 1}
                            </span>
                            <span>· · ·</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {activeHintLevel < guide.stepHints.length - 1 && (
                    <button
                      onClick={() => setActiveHintLevel((l) => l + 1)}
                      className="mt-3 text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      显示下一步提示
                    </button>
                  )}
                  {activeHintLevel >= guide.stepHints.length - 1 &&
                    guide.stepHints.length > 1 && (
                      <button
                        onClick={() => setActiveHintLevel(0)}
                        className="mt-3 text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        收起提示
                      </button>
                    )}
                </div>

                {/* 我来试一步 */}
                <div className="guide-section">
                  <div className="guide-section-title">✏️ 我来试一步</div>
                  <p className="text-xs text-slate-500 mb-2">
                    点击路径图中的节点展开详情，尝试回答互动问题。每完成一步，下一步会自动解锁。
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                      未展开
                    </span>
                    <span className="flex items-center gap-1 text-amber-500">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      已提示
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      已尝试
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Fallback when no guide data */
              <div className="guide-section">
                <div className="guide-section-title">📋 解题信息</div>
                <div className="text-xs text-slate-500">
                  点击路径图中的节点查看详细解析。
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend & Related Knowledge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Step types legend */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            步骤类型
          </h3>
          <div className="flex flex-wrap gap-2">
            {stepTypes.map((type) => (
              <span
                key={type}
                className="badge"
                style={{
                  backgroundColor: `${STEP_TYPE_COLORS[type]}15`,
                  color: STEP_TYPE_COLORS[type],
                }}
              >
                {STEP_TYPE_LABELS[type]}
              </span>
            ))}
          </div>
        </div>

        {/* Related knowledge */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-slate-400" />
            涉及知识点
          </h3>
          <div className="flex flex-wrap gap-2">
            {relatedKnowledge.map((node) =>
              node ? (
                <span
                  key={node.id}
                  className="badge"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[node.category]}15`,
                    color: CATEGORY_COLORS[node.category],
                  }}
                >
                  {CATEGORY_LABELS[node.category]} · {node.name}
                </span>
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
