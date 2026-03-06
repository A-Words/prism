"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

export type DiagnosticNodeData = {
  label: string;
  status: "correct" | "error" | "missing" | "review";
  detail?: string;
};

const STATUS_CONFIG = {
  correct: {
    color: "#22c55e",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    icon: CheckCircle,
    label: "已掌握",
  },
  error: {
    color: "#ef4444",
    bg: "#fef2f2",
    border: "#fecaca",
    icon: AlertTriangle,
    label: "出错点",
  },
  missing: {
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
    icon: HelpCircle,
    label: "缺失知识",
  },
  review: {
    color: "#3b82f6",
    bg: "#eff6ff",
    border: "#bfdbfe",
    icon: HelpCircle,
    label: "建议复习",
  },
};

function DiagnosticNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as DiagnosticNodeData;
  const { label, status, detail } = nodeData;
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className="diagnostic-node"
      style={{
        borderColor: config.border,
        backgroundColor: config.bg,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2" />

      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color: config.color }} />
        <span className="text-[11px] font-semibold" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>

      <div className="text-sm font-semibold text-slate-800">{label}</div>

      {detail && (
        <div className="mt-1.5 text-xs text-slate-500 leading-relaxed">
          {detail}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2" />
    </div>
  );
}

export const DiagnosticNode = memo(DiagnosticNodeComponent);
