"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  MASTERY_COLORS,
  type KnowledgeCategory,
  type MasteryLevel,
} from "@/types";

export type KnowledgeNodeData = {
  name: string;
  category: KnowledgeCategory;
  difficulty: number;
  mastery: MasteryLevel;
  isTarget?: boolean;
  onClick?: () => void;
};

function KnowledgeNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as KnowledgeNodeData;
  const { name, category, difficulty, mastery, isTarget, onClick } = nodeData;
  const categoryColor = CATEGORY_COLORS[category];
  const categoryLabel = CATEGORY_LABELS[category];
  const masteryColor = MASTERY_COLORS[mastery];

  return (
    <div
      className="knowledge-node"
      style={{
        borderColor: isTarget ? categoryColor : `${categoryColor}60`,
        boxShadow: isTarget
          ? `0 0 0 3px ${categoryColor}20, 0 4px 16px ${categoryColor}15`
          : undefined,
      }}
      onClick={onClick}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2" />

      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: categoryColor }}
        />
        <span className="text-[11px] font-medium" style={{ color: categoryColor }}>
          {categoryLabel}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: i < difficulty ? categoryColor : "#e2e8f0",
              }}
            />
          ))}
        </div>
      </div>

      <div className="text-sm font-semibold text-slate-800">{name}</div>

      {/* Mastery indicator */}
      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              backgroundColor: masteryColor,
              width:
                mastery === "none"
                  ? "0%"
                  : mastery === "low"
                  ? "25%"
                  : mastery === "medium"
                  ? "50%"
                  : mastery === "high"
                  ? "75%"
                  : "100%",
            }}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2" />
    </div>
  );
}

export const KnowledgeGraphNode = memo(KnowledgeNodeComponent);
