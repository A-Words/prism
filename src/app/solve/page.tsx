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
  type SolutionStepType,
} from "@/types";

const nodeTypes = { solutionStep: SolutionNode };

export default function SolvePage() {
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [solutionPath, setSolutionPath] = useState<SolutionPath | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const handleSolve = useCallback(async () => {
    if (!problem.trim()) return;
    setLoading(true);
    setExpandedStep(null);

    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: problem.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setSolutionPath(data);
      } else {
        // Fallback to mock data
        setSolutionPath(mockSolutionPath);
      }
    } catch {
      // Use mock data when API unavailable
      setSolutionPath(mockSolutionPath);
    } finally {
      setLoading(false);
    }
  }, [problem]);

  const handleDemo = useCallback(() => {
    setProblem("解不等式 x² - 3x + 2 < 0");
    setSolutionPath(mockSolutionPath);
  }, []);

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
            输入数学题目，AI 为你生成可视化解题步骤
          </p>
        </div>
      </div>

      {/* Problem Input */}
      <div className="glass-card p-5">
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
              <span className="text-xs text-slate-400">
                支持 LaTeX 语法，Ctrl+Enter 提交
              </span>
              <div className="flex gap-2">
                <button onClick={handleDemo} className="btn-secondary text-sm py-2 px-4">
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

      {/* Solution Path visualization */}
      {solutionPath && (
        <SolutionPathView
          path={solutionPath}
          expandedStep={expandedStep}
          onToggleStep={(id) =>
            setExpandedStep(expandedStep === id ? null : id)
          }
        />
      )}
    </div>
  );
}

function SolutionPathView({
  path,
  expandedStep,
  onToggleStep,
}: {
  path: SolutionPath;
  expandedStep: string | null;
  onToggleStep: (id: string) => void;
}) {
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const nodes: Node[] = path.steps.map((step, i) => ({
      id: step.id,
      type: "solutionStep",
      position: { x: 250, y: i * 200 },
      data: {
        title: step.title,
        content: step.content,
        explanation: step.explanation,
        stepType: step.type,
        knowledgePoints: step.knowledgePoints,
        isExpanded: expandedStep === step.id,
        onToggle: () => onToggleStep(step.id),
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
    }));

    return { nodes, edges };
  }, [path, expandedStep, onToggleStep]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

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

  return (
    <div className="space-y-5">
      {/* Problem summary */}
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
            </div>
            <div className="text-lg font-semibold text-slate-800 mb-2">
              <MathText text={path.problem} />
            </div>
            <div className="text-sm text-slate-500">
              <MathText text={path.summary} />
            </div>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="glass-card overflow-hidden" style={{ height: "600px" }}>
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
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
        </ReactFlow>
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
