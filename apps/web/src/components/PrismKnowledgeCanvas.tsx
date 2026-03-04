import type { KnowledgeOutlineJSON } from "@prism/contracts";
import { PrismCard } from "./ui";
import ReactFlow, { Background, Controls, MiniMap, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";

type Props = {
  outline: KnowledgeOutlineJSON | null;
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
};

function toNodes(outline: KnowledgeOutlineJSON, selectedNodeId: string | null): Node[] {
  return outline.nodes.map((item, index) => ({
    id: item.id,
    data: { label: item.title },
    position: { x: 80 + (index % 3) * 260, y: 50 + Math.floor(index / 3) * 130 },
    style: {
      borderRadius: 12,
      padding: 8,
      border: item.id === selectedNodeId ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
      background: "var(--color-panel)",
      color: "var(--color-text)",
      minWidth: 180,
      textAlign: "center",
    },
  }));
}

function toEdges(outline: KnowledgeOutlineJSON): Edge[] {
  return outline.edges.map((edge, index) => ({
    id: `e-${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.relation,
    animated: false,
    style: { stroke: "var(--color-primary-soft)" },
    labelStyle: { fill: "var(--color-text-muted)", fontSize: 11 },
  }));
}

export function PrismKnowledgeCanvas({ outline, selectedNodeId, onNodeSelect }: Props) {
  if (!outline) {
    return <PrismCard className="knowledge-empty">等待探索结果...</PrismCard>;
  }

  return (
    <PrismCard className="knowledge-canvas" data-testid="knowledge-canvas">
      <ReactFlow
        nodes={toNodes(outline, selectedNodeId)}
        edges={toEdges(outline)}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background gap={18} size={1} />
      </ReactFlow>
    </PrismCard>
  );
}
