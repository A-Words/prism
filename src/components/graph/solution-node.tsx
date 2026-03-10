"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MathText } from "@/components/ui/math-renderer";
import {
  SOLUTION_STATE_LABELS,
  STEP_TYPE_COLORS,
  STEP_TYPE_LABELS,
  type InteractionPoint,
  type SolutionBranchType,
  type SolutionStepAttempt,
  type SolutionStepState,
  type SolutionStepType,
} from "@/types";
import {
  AlertTriangle,
  ArrowRightLeft,
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
  explanation: string;
  stepType: SolutionStepType;
  knowledgePoints: string[];
  isExpanded?: boolean;
  onToggle?: () => void;
  stepState?: SolutionStepState;
  whyThisStep?: string;
  commonMistake?: string;
  alternativeApproach?: string;
  interactionPoint?: InteractionPoint;
  branchType?: SolutionBranchType;
  branchRecoveryHint?: string;
  submittedAttempt?: SolutionStepAttempt;
};

function SolutionNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as SolutionNodeData;
  const {
    title,
    content,
    stepType,
    isExpanded,
    explanation,
    onToggle,
    stepState = "locked",
    whyThisStep,
    commonMistake,
    alternativeApproach,
    interactionPoint,
    branchType = "main",
    branchRecoveryHint,
    submittedAttempt,
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
      style={{
        borderColor: isExpanded ? color : undefined,
      }}
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

      {isExpanded && whyThisStep && branchType !== "mistake" && (
        <div className="mt-3 flex items-start gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg p-2.5">
          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <MathText text={whyThisStep} />
          </span>
        </div>
      )}

      {isExpanded && explanation && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 leading-relaxed">
            <MathText text={explanation} />
          </div>
        </div>
      )}

      {isExpanded && commonMistake && branchType !== "mistake" && (
        <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">易错点：</span>
            <MathText text={commonMistake} />
          </div>
        </div>
      )}

      {isExpanded && alternativeApproach && branchType !== "mistake" && (
        <div className="mt-2 flex items-start gap-2 text-xs text-cyan-700 bg-cyan-50 rounded-lg p-2.5">
          <ArrowRightLeft className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">替代路线：</span>
            <MathText text={alternativeApproach} />
          </div>
        </div>
      )}

      {isExpanded && interactionPoint && branchType !== "mistake" && (
        <div className="mt-3 rounded-lg bg-indigo-50 px-3 py-2.5 text-xs text-indigo-700">
          <span className="font-semibold">试一步：</span>
          <MathText text={interactionPoint.question} />
        </div>
      )}

      {isExpanded && submittedAttempt && branchType !== "mistake" && (
        <div
          className="mt-2 rounded-lg px-3 py-2.5 text-xs"
          style={
            submittedAttempt.isDirectionCorrect
              ? {
                  background: "#ecfdf5",
                  color: "#047857",
                }
              : {
                  background: "#fff7ed",
                  color: "#c2410c",
                }
          }
        >
          {submittedAttempt.isDirectionCorrect ? "已在右侧完成这一步。" : "这一步曾偏离，先看右侧回正提示。"}
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
