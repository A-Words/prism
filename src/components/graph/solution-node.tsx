"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MathText } from "@/components/ui/math-renderer";
import {
  STEP_TYPE_COLORS,
  STEP_TYPE_LABELS,
  type SolutionStepType,
} from "@/types";
import {
  Search,
  Lightbulb,
  Calculator,
  Brain,
  ShieldCheck,
  Flag,
} from "lucide-react";

const STEP_ICONS: Record<SolutionStepType, React.ElementType> = {
  analysis: Search,
  strategy: Lightbulb,
  computation: Calculator,
  reasoning: Brain,
  verification: ShieldCheck,
  conclusion: Flag,
};

export type SolutionNodeData = {
  title: string;
  content: string;
  explanation: string;
  stepType: SolutionStepType;
  knowledgePoints: string[];
  isExpanded?: boolean;
  onToggle?: () => void;
};

function SolutionNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as SolutionNodeData;
  const { title, content, stepType, isExpanded, explanation, onToggle } = nodeData;
  const color = STEP_TYPE_COLORS[stepType];
  const label = STEP_TYPE_LABELS[stepType];
  const Icon = STEP_ICONS[stepType];

  return (
    <div
      className="solution-step-node"
      style={{ borderColor: isExpanded ? color : undefined }}
      onClick={onToggle}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2" />

      <div className="flex items-center gap-2 mb-2">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-medium" style={{ color }}>
            {label}
          </div>
          <div className="text-sm font-semibold text-slate-800">{title}</div>
        </div>
      </div>

      <div className="text-sm text-slate-600 leading-relaxed">
        <MathText text={content} />
      </div>

      {isExpanded && explanation && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 leading-relaxed">
            <MathText text={explanation} />
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2" />
    </div>
  );
}

export const SolutionNode = memo(SolutionNodeComponent);
