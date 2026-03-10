"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MathText } from "@/components/ui/math-renderer";
import {
  SOLUTION_STATE_LABELS,
  STEP_TYPE_COLORS,
  STEP_TYPE_LABELS,
  type SolutionBranchType,
  type SolutionStepState,
  type SolutionStepType,
} from "@/types";
import {
  AlertTriangle,
  Brain,
  Calculator,
  CheckCircle2,
  Eye,
  Flag,
  Lightbulb,
  Lock,
  Search,
  ShieldCheck,
} from "lucide-react";

const STEP_ICONS: Record<SolutionStepType, React.ElementType> = {
  analysis: Search,
  strategy: Lightbulb,
  computation: Calculator,
  reasoning: Brain,
  verification: ShieldCheck,
  conclusion: Flag,
};

const STATE_ICONS: Record<SolutionStepState, React.ElementType> = {
  locked: Lock,
  hinted: Eye,
  attempted: CheckCircle2,
  offtrack: AlertTriangle,
};

export type SolutionNodeData = {
  title: string;
  content: string;
  stepType: SolutionStepType;
  isActive?: boolean;
  onToggle?: () => void;
  stepState?: SolutionStepState;
  branchType?: SolutionBranchType;
  branchRecoveryHint?: string;
};

function SolutionNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as SolutionNodeData;
  const {
    title,
    content,
    stepType,
    isActive,
    onToggle,
    stepState = "locked",
    branchType = "main",
    branchRecoveryHint,
  } = nodeData;

  const color = branchType === "mistake" ? "#f97316" : STEP_TYPE_COLORS[stepType];
  const label = branchType === "mistake" ? "易错分支" : STEP_TYPE_LABELS[stepType];
  const Icon = branchType === "mistake" ? AlertTriangle : STEP_ICONS[stepType];
  const StateIcon = STATE_ICONS[stepState];

  return (
    <div
      className="solution-step-node"
      data-state={stepState}
      data-branch={branchType}
      data-active={isActive ? "true" : "false"}
      style={{ borderColor: isActive ? color : undefined }}
      onClick={onToggle}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-300 !w-2 !h-2"
      />

      <div className="flex items-center gap-2 mb-2">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium" style={{ color }}>
            {label}
          </div>
          <div className="text-sm font-semibold text-slate-800">{title}</div>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
          style={{
            backgroundColor:
              stepState === "attempted"
                ? "#ecfdf5"
                : stepState === "hinted"
                ? "#fffbeb"
                : stepState === "offtrack"
                ? "#fff7ed"
                : "#f1f5f9",
            color:
              stepState === "attempted"
                ? "#059669"
                : stepState === "hinted"
                ? "#d97706"
                : stepState === "offtrack"
                ? "#ea580c"
                : "#94a3b8",
          }}
        >
          <StateIcon className="w-3 h-3" />
          {SOLUTION_STATE_LABELS[stepState]}
        </div>
      </div>

      <div className="text-sm text-slate-600 leading-relaxed">
        <MathText text={content} />
      </div>

      {branchType === "mistake" && branchRecoveryHint && (
        <div className="mt-3 rounded-lg bg-orange-50 px-3 py-2.5 text-xs text-orange-700">
          <span className="font-semibold">回正动作：</span>
          <MathText text={branchRecoveryHint} />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-300 !w-2 !h-2"
      />
    </div>
  );
}

export const SolutionNode = memo(SolutionNodeComponent);
