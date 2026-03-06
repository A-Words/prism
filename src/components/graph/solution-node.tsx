"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MathText } from "@/components/ui/math-renderer";
import {
  STEP_TYPE_COLORS,
  STEP_TYPE_LABELS,
  type SolutionStepType,
  type SolutionStepState,
  type InteractionPoint,
} from "@/types";
import {
  Search,
  Lightbulb,
  Calculator,
  Brain,
  ShieldCheck,
  Flag,
  Lock,
  Eye,
  CheckCircle2,
  MessageCircleQuestion,
  AlertTriangle,
  ArrowRightLeft,
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
};

const STATE_LABELS: Record<SolutionStepState, string> = {
  locked: "未展开",
  hinted: "已提示",
  attempted: "已尝试",
};

export type SolutionNodeData = {
  title: string;
  content: string;
  explanation: string;
  stepType: SolutionStepType;
  knowledgePoints: string[];
  isExpanded?: boolean;
  onToggle?: () => void;
  /** 节点交互状态 */
  stepState?: SolutionStepState;
  onStateChange?: (state: SolutionStepState) => void;
  /** 为什么先做这一步 */
  whyThisStep?: string;
  /** 常见错误 */
  commonMistake?: string;
  /** 替代路线 */
  alternativeApproach?: string;
  /** 互动提问 */
  interactionPoint?: InteractionPoint;
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
    onStateChange,
    whyThisStep,
    commonMistake,
    alternativeApproach,
    interactionPoint,
  } = nodeData;

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const color = STEP_TYPE_COLORS[stepType];
  const label = STEP_TYPE_LABELS[stepType];
  const Icon = STEP_ICONS[stepType];
  const StateIcon = STATE_ICONS[stepState];

  const handleInteractionAttempt = (option?: string) => {
    if (option) setSelectedOption(option);
    setShowHint(true);
    onStateChange?.("attempted");
  };

  return (
    <div
      className="solution-step-node"
      data-state={stepState}
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

      {/* Header */}
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
        {/* State indicator */}
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
          style={{
            backgroundColor:
              stepState === "attempted"
                ? "#ecfdf5"
                : stepState === "hinted"
                  ? "#fffbeb"
                  : "#f1f5f9",
            color:
              stepState === "attempted"
                ? "#059669"
                : stepState === "hinted"
                  ? "#d97706"
                  : "#94a3b8",
          }}
        >
          <StateIcon className="w-3 h-3" />
          {STATE_LABELS[stepState]}
        </div>
      </div>

      {/* Main content */}
      <div className="text-sm text-slate-600 leading-relaxed">
        <MathText text={content} />
      </div>

      {/* Why this step */}
      {isExpanded && whyThisStep && (
        <div className="mt-3 flex items-start gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg p-2.5">
          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{whyThisStep}</span>
        </div>
      )}

      {/* Explanation */}
      {isExpanded && explanation && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 leading-relaxed">
            <MathText text={explanation} />
          </div>
        </div>
      )}

      {/* Common mistake warning */}
      {isExpanded && commonMistake && (
        <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">易错点：</span>
            <MathText text={commonMistake} />
          </div>
        </div>
      )}

      {/* Alternative approach */}
      {isExpanded && alternativeApproach && (
        <div className="mt-2 flex items-start gap-2 text-xs text-cyan-700 bg-cyan-50 rounded-lg p-2.5">
          <ArrowRightLeft className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">替代路线：</span>
            <MathText text={alternativeApproach} />
          </div>
        </div>
      )}

      {/* Interaction point */}
      {isExpanded && interactionPoint && (
        <div className="interaction-bubble mt-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-2 mb-2">
            <MessageCircleQuestion className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span className="text-sm font-medium text-slate-700">
              {interactionPoint.question}
            </span>
          </div>

          {/* Options */}
          {interactionPoint.options && (
            <div className="space-y-1.5">
              {interactionPoint.options.map((opt) => (
                <button
                  key={opt}
                  className={`interaction-option ${selectedOption === opt ? "selected" : ""}`}
                  onClick={() => handleInteractionAttempt(opt)}
                >
                  <MathText text={opt} />
                </button>
              ))}
            </div>
          )}

          {/* No options — just a "think about it" button */}
          {!interactionPoint.options && !showHint && (
            <button
              className="interaction-option mt-1"
              onClick={() => handleInteractionAttempt()}
            >
              💡 想好了，看提示
            </button>
          )}

          {/* Hint reveal */}
          {showHint && (
            <div className="hint-reveal">
              <MathText text={interactionPoint.hint} />
            </div>
          )}
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
