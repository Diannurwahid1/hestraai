"use client";

import { Background, Handle, NodeProps, Position, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AskHestraButton } from "@/components/shared/ui";
import type { ChatContext } from "@/types";

type Graph = { nodes: { id: string; type: string; label: string; detail?: string; source_reference?: string }[]; edges: { source: string; target: string }[] };
function ContextNode({ data, selected }: NodeProps) {
  const d = data as { label: string; detail?: string; center?: boolean; context: ChatContext };
  return <div className={`graph-node ${d.center ? "center" : ""} ${selected ? "selected" : ""}`}><Handle type="target" position={Position.Left}/><strong>{d.label}</strong><small>{d.detail || "Source detail unavailable"}</small>{selected && <AskHestraButton context={d.context} prompt={`Explain the verified ${d.label} context for ${d.context.entity}.`}/>}<Handle type="source" position={Position.Right}/></div>;
}
export function ContextGraph({ graph, ticker }: { graph: Graph; ticker: string }) {
  if (!graph.nodes.length) return <p>Verified context graph unavailable.</p>;
  const nodes = graph.nodes.map((node, index) => ({ id: node.id, type: "context", position: { x: 20 + (index % 3) * 230, y: 20 + Math.floor(index / 3) * 135 }, data: { ...node, center: node.id.toUpperCase() === ticker.toUpperCase(), context: { id: `company.${ticker}.${node.id}`, type: "company" as const, title: `${ticker} · ${node.label}`, entity: ticker, payload: { source_reference: node.source_reference, detail: node.detail } } } }));
  const edges = graph.edges.map((edge, index) => ({ id: `edge-${index}`, source: edge.source, target: edge.target, style: { stroke: "#1479ff", strokeWidth: 1.5 } }));
  return <div className="context-graph"><ReactFlow nodes={nodes} edges={edges} nodeTypes={{ context: ContextNode }} fitView minZoom={.65} maxZoom={1.2} nodesDraggable={false} panOnDrag={false} zoomOnScroll={false}><Background color="#132330" gap={22} size={1}/></ReactFlow></div>;
}
