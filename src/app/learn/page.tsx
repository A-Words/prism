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
  GraduationCap,
  Search,
  ChevronRight,
  Clock,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { KnowledgeGraphNode } from "@/components/graph/knowledge-node";
import type { KnowledgeNodeData } from "@/components/graph/knowledge-node";
import {
  knowledgeNodes,
  getKnowledgeNode,
  computeLearningPath,
  searchKnowledge,
} from "@/lib/knowledge-graph";
import { useAppStore } from "@/lib/store";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  MASTERY_LABELS,
  type KnowledgeCategory,
} from "@/types";

const nodeTypes = { knowledgeNode: KnowledgeGraphNode };

export default function LearnPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | "all">("all");
  const getMastery = useAppStore((s) => s.getMastery);

  const filteredNodes = useMemo(() => {
    let results = knowledgeNodes;
    if (searchQuery.trim()) {
      results = searchKnowledge(searchQuery);
    }
    if (activeCategory !== "all") {
      results = results.filter((n) => n.category === activeCategory);
    }
    return results;
  }, [searchQuery, activeCategory]);

  const learningPath = useMemo(() => {
    if (!selectedTarget) return null;
    return computeLearningPath(selectedTarget);
  }, [selectedTarget]);

  const targetNode = selectedTarget ? getKnowledgeNode(selectedTarget) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">学习路径图</h1>
          <p className="text-sm text-slate-500">
            选择目标知识点，生成个性化学习路径
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Knowledge Browser */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search */}
          <div className="glass-card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索知识点..."
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="glass-card p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory("all")}
                className={`badge cursor-pointer transition-all ${
                  activeCategory === "all"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                全部
              </button>
              {(Object.keys(CATEGORY_LABELS) as KnowledgeCategory[]).map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="badge cursor-pointer transition-all"
                    style={{
                      backgroundColor:
                        activeCategory === cat
                          ? `${CATEGORY_COLORS[cat]}20`
                          : "#f1f5f9",
                      color:
                        activeCategory === cat
                          ? CATEGORY_COLORS[cat]
                          : "#64748b",
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Knowledge List */}
          <div className="glass-card p-4 max-h-[500px] overflow-y-auto">
            <div className="space-y-1.5">
              {filteredNodes.map((node) => {
                const mastery = getMastery(node.id);
                const isSelected = selectedTarget === node.id;

                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedTarget(node.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all text-sm ${
                      isSelected
                        ? "bg-indigo-50 border-2 border-indigo-200"
                        : "hover:bg-slate-50 border-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: CATEGORY_COLORS[node.category],
                        }}
                      />
                      <span className="font-medium text-slate-800 flex-1">
                        {node.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {MASTERY_LABELS[mastery]}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 ml-4">
                      {node.module}
                    </div>
                  </button>
                );
              })}
              {filteredNodes.length === 0 && (
                <div className="text-sm text-slate-400 text-center py-8">
                  未找到匹配的知识点
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Learning Path Graph */}
        <div className="lg:col-span-2 space-y-4">
          {learningPath && targetNode ? (
            <LearningPathView
              pathIds={learningPath}
              targetId={selectedTarget!}
              getMastery={getMastery}
              onSelectNode={(id) => setSelectedTarget(id)}
            />
          ) : (
            <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
              <Sparkles className="w-12 h-12 text-slate-200 mb-4" />
              <h3 className="text-lg font-semibold text-slate-400 mb-2">
                选择一个目标知识点
              </h3>
              <p className="text-sm text-slate-400 max-w-sm">
                从左侧列表中选择你想学习的知识点，系统将自动生成从前置知识到目标的最优学习路径。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LearningPathView({
  pathIds,
  targetId,
  getMastery,
  onSelectNode,
}: {
  pathIds: string[];
  targetId: string;
  getMastery: (id: string) => "none" | "low" | "medium" | "high" | "full";
  onSelectNode: (id: string) => void;
}) {
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    // Layout: arrange nodes in a tree-like structure
    const nodesPerRow = 3;
    const xSpacing = 260;
    const ySpacing = 160;

    const nodes: Node[] = pathIds.map((id, i) => {
      const kn = getKnowledgeNode(id)!;
      const row = Math.floor(i / nodesPerRow);
      const col = i % nodesPerRow;
      const xOffset = row % 2 === 1 ? xSpacing / 2 : 0; // stagger rows

      return {
        id,
        type: "knowledgeNode",
        position: {
          x: col * xSpacing + xOffset,
          y: row * ySpacing,
        },
        data: {
          name: kn.name,
          category: kn.category,
          difficulty: kn.difficulty,
          mastery: getMastery(id),
          isTarget: id === targetId,
          onClick: () => onSelectNode(id),
        } satisfies KnowledgeNodeData,
      };
    });

    // Create edges based on knowledge prerequisites
    const edges: Edge[] = [];
    const pathSet = new Set(pathIds);

    for (const id of pathIds) {
      const kn = getKnowledgeNode(id);
      if (!kn) continue;
      for (const prereq of kn.prerequisites) {
        if (pathSet.has(prereq)) {
          edges.push({
            id: `e-${prereq}-${id}`,
            source: prereq,
            target: id,
            animated: true,
            style: { stroke: "#a5b4fc", strokeWidth: 2 },
          });
        }
      }
    }

    return { nodes, edges };
  }, [pathIds, targetId, getMastery, onSelectNode]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  const targetNode = getKnowledgeNode(targetId);
  const estimatedMinutes = pathIds.length * 15;

  return (
    <div className="space-y-4">
      {/* Path info */}
      {targetNode && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-900">
              学习路径：{targetNode.name}
            </h3>
          </div>
          <p className="text-sm text-slate-500 mb-3">{targetNode.description}</p>
          <div className="flex items-center gap-4">
            <span className="badge bg-emerald-50 text-emerald-700">
              <ChevronRight className="w-3 h-3" />
              {pathIds.length} 个知识点
            </span>
            <span className="badge bg-blue-50 text-blue-700">
              <Clock className="w-3 h-3" />
              约 {estimatedMinutes} 分钟
            </span>
          </div>

          {/* Path steps list */}
          <div className="mt-4 flex flex-wrap items-center gap-1">
            {pathIds.map((id, i) => {
              const kn = getKnowledgeNode(id)!;
              return (
                <span key={id} className="flex items-center gap-1">
                  <span
                    className="badge text-xs cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[kn.category]}15`,
                      color: CATEGORY_COLORS[kn.category],
                      fontWeight: id === targetId ? 700 : 500,
                      border:
                        id === targetId
                          ? `2px solid ${CATEGORY_COLORS[kn.category]}`
                          : undefined,
                    }}
                    onClick={() => onSelectNode(id)}
                  >
                    {kn.name}
                  </span>
                  {i < pathIds.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Graph */}
      <div className="glass-card overflow-hidden" style={{ height: "500px" }}>
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
    </div>
  );
}
