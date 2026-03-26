"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "sonner";
import { Save, Plus, GitBranch } from "lucide-react";
import { TriggerNode } from "./nodes/TriggerNode";
import { WaitNode } from "./nodes/WaitNode";
import { MessageNode } from "./nodes/MessageNode";
import { NodeEditor } from "./panels/NodeEditor";

interface WorkflowNode {
  id: string;
  type: "trigger" | "wait" | "message";
  config: Record<string, unknown>;
  nextId: string | null;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface WorkflowCanvasProps {
  workflowId: string;
  initialNodes: WorkflowNode[];
  triggerTagId?: string | null;
  tags: Tag[];
  onSave: (nodes: WorkflowNode[]) => Promise<void>;
}

const nodeTypes: NodeTypes = {
  trigger: TriggerNode as any,
  wait: WaitNode as any,
  message: MessageNode as any,
};

function workflowNodesToFlow(
  wfNodes: WorkflowNode[],
  tags: Tag[]
): { nodes: Node[]; edges: Edge[] } {
  const flowNodes: Node[] = wfNodes.map((node, index) => {
    const tag = tags.find((t) => t.id === node.config.tagId);
    let data: Record<string, unknown> = {};

    if (node.type === "trigger") {
      data = { tagName: tag?.name, tagColor: tag?.color };
    } else if (node.type === "wait") {
      data = { ...node.config };
    } else if (node.type === "message") {
      data = { template: node.config.template };
    }

    return {
      id: node.id,
      type: node.type,
      position: { x: 300, y: index * 180 },
      data,
    };
  });

  const flowEdges: Edge[] = wfNodes
    .filter((n) => n.nextId)
    .map((n) => ({
      id: `e-${n.id}-${n.nextId}`,
      source: n.id,
      target: n.nextId!,
      style: { stroke: "#6366F1", strokeWidth: 2 },
      animated: true,
    }));

  return { nodes: flowNodes, edges: flowEdges };
}

function flowToWorkflowNodes(
  flowNodes: Node[],
  flowEdges: Edge[],
  originalNodes: WorkflowNode[]
): WorkflowNode[] {
  const edgeMap = new Map<string, string>();
  flowEdges.forEach((e) => edgeMap.set(e.source, e.target));

  return flowNodes.map((fn) => {
    const original = originalNodes.find((n) => n.id === fn.id);
    return {
      id: fn.id,
      type: fn.type as WorkflowNode["type"],
      config: original?.config || {},
      nextId: edgeMap.get(fn.id) || null,
    };
  });
}

export function WorkflowCanvas({
  workflowId,
  initialNodes,
  triggerTagId,
  tags,
  onSave,
}: WorkflowCanvasProps) {
  const [wfNodes, setWfNodes] = useState<WorkflowNode[]>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { nodes: initFlowNodes, edges: initFlowEdges } = workflowNodesToFlow(initialNodes, tags);
  const [nodes, setNodes, onNodesChange] = useNodesState(initFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initFlowEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#6366F1", strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const selectedWfNode = wfNodes.find((n) => n.id === selectedNodeId);

  const updateNodeConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      const updated = wfNodes.map((n) => (n.id === nodeId ? { ...n, config } : n));
      setWfNodes(updated);

      // Update flow node data
      setNodes((nds) =>
        nds.map((fn) => {
          if (fn.id !== nodeId) return fn;
          const node = updated.find((n) => n.id === nodeId)!;
          let data: Record<string, unknown> = {};
          if (node.type === "trigger") {
            const tag = tags.find((t) => t.id === config.tagId);
            data = { tagName: tag?.name, tagColor: tag?.color };
          } else if (node.type === "wait") {
            data = { ...config };
          } else if (node.type === "message") {
            data = { template: config.template };
          }
          return { ...fn, data };
        })
      );
    },
    [wfNodes, tags, setNodes]
  );

  const addNode = (type: WorkflowNode["type"]) => {
    const id = String(Date.now());
    const defaultConfigs: Record<string, unknown> = {
      wait: { mode: "duration", duration: 1, unit: "days" },
      message: { template: "Olá {{first_name}}, tudo bem?" },
      trigger: { tagId: triggerTagId || "" },
    };

    const newWfNode: WorkflowNode = {
      id,
      type,
      config: defaultConfigs[type] as Record<string, unknown>,
      nextId: null,
    };

    setWfNodes([...wfNodes, newWfNode]);

    const { nodes: allFlowNodes } = workflowNodesToFlow([...wfNodes, newWfNode], tags);
    const newFlowNode = allFlowNodes.find((n) => n.id === id)!;
    newFlowNode.position = { x: 300, y: (nodes.length) * 180 + 50 };
    setNodes((nds) => [...nds, newFlowNode]);
  };

  const deleteNode = (nodeId: string) => {
    setWfNodes(wfNodes.filter((n) => n.id !== nodeId));
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const currentWfNodes = flowToWorkflowNodes(nodes, edges, wfNodes);
    try {
      await onSave(currentWfNodes);
      setWfNodes(currentWfNodes);
      toast.success("Workflow salvo");
    } catch {
      toast.error("Erro ao salvar workflow");
    }
    setSaving(false);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#0a0a0f]"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="#1a1a2e" gap={24} size={1} />
          <Controls className="!bg-[#1a1a2e] !border !border-white/10 !rounded-xl" />
          <MiniMap
            className="!bg-[#1a1a2e] !border !border-white/10 !rounded-xl"
            nodeColor="#6366F1"
            maskColor="rgba(0,0,0,0.5)"
          />

          <Panel position="top-left" className="flex gap-2">
            <button
              onClick={() => addNode("wait")}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-yellow-500/20 text-yellow-400 text-xs font-medium rounded-xl hover:border-yellow-500/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              + Espera
            </button>
            <button
              onClick={() => addNode("message")}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-green-500/20 text-green-400 text-xs font-medium rounded-xl hover:border-green-500/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              + Mensagem
            </button>
          </Panel>

          <Panel position="top-right">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 shadow-lg shadow-indigo-500/25"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Side Panel */}
      {selectedWfNode && (
        <div className="w-72 border-l border-white/5 bg-[#0f0f14] p-4 overflow-y-auto">
          <NodeEditor
            node={selectedWfNode}
            tags={tags}
            onUpdate={updateNodeConfig}
            onClose={() => setSelectedNodeId(null)}
            onDelete={deleteNode}
          />
        </div>
      )}

      {!selectedWfNode && (
        <div className="w-64 border-l border-white/5 bg-[#0f0f14] p-4 flex flex-col items-center justify-center text-center">
          <GitBranch className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-500">Clique em um nó para editá-lo</p>
          <p className="text-xs text-slate-600 mt-1">Conecte os nós arrastando da alça inferior para a superior</p>
        </div>
      )}
    </div>
  );
}
