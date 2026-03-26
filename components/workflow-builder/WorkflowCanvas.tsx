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
  ReactFlowInstance,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "sonner";
import { Save, RefreshCw, Users } from "lucide-react";
import { TriggerNode } from "./nodes/TriggerNode";
import { WaitNode } from "./nodes/WaitNode";
import { MessageNode } from "./nodes/MessageNode";
import { NodeEditor } from "./panels/NodeEditor";
import { NodePalette } from "./NodePalette";
import { ContactOnNode } from "./nodes/ContactAvatars";

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

interface NodeContactsMap {
  [nodeId: string]: {
    waiting: ContactOnNode[];
    running: ContactOnNode[];
    sent: ContactOnNode[];
  };
}

interface WorkflowTotals {
  WAITING?: number;
  RUNNING?: number;
  COMPLETED?: number;
  FAILED?: number;
  CANCELLED?: number;
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

// Edge styles per source node type
const EDGE_STYLES: Record<string, object> = {
  trigger: { stroke: "#6366F1", strokeWidth: 2 },
  wait: { stroke: "#EAB308", strokeWidth: 2 },
  message: { stroke: "#22C55E", strokeWidth: 2 },
  default: { stroke: "#6366F1", strokeWidth: 2 },
};

function buildEdge(source: string, target: string, sourceType: string, hasActiveContacts: boolean): Edge {
  const style = EDGE_STYLES[sourceType] || EDGE_STYLES.default;
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    style,
    animated: hasActiveContacts,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: (style as any).stroke,
      width: 16,
      height: 16,
    },
  };
}

function wfNodesToFlow(
  wfNodes: WorkflowNode[],
  tags: Tag[],
  contactsByNode: NodeContactsMap
): { nodes: Node[]; edges: Edge[] } {
  const flowNodes: Node[] = wfNodes.map((node, index) => {
    const tag = tags.find((t) => t.id === node.config.tagId);
    const contacts = contactsByNode[node.id] || { waiting: [], running: [], sent: [] };
    let data: Record<string, unknown> = { nodeContacts: contacts };

    if (node.type === "trigger") {
      data = { ...data, tagName: tag?.name, tagColor: tag?.color };
    } else if (node.type === "wait") {
      data = { ...data, ...node.config };
    } else if (node.type === "message") {
      data = { ...data, template: node.config.template };
    }

    return {
      id: node.id,
      type: node.type,
      position: { x: 300, y: index * 220 },
      data,
    };
  });

  const edgeMap = new Map<string, string>();
  wfNodes.filter((n) => n.nextId).forEach((n) => edgeMap.set(n.id, n.nextId!));

  const flowEdges: Edge[] = wfNodes
    .filter((n) => n.nextId)
    .map((n) => {
      const contacts = contactsByNode[n.id] || { waiting: [], running: [], sent: [] };
      const hasActive = contacts.running.length > 0 || contacts.waiting.length > 0;
      return buildEdge(n.id, n.nextId!, n.type, hasActive);
    });

  return { nodes: flowNodes, edges: flowEdges };
}

function flowToWfNodes(flowNodes: Node[], flowEdges: Edge[], wfNodes: WorkflowNode[]): WorkflowNode[] {
  const edgeMap = new Map<string, string>();
  flowEdges.forEach((e) => edgeMap.set(e.source, e.target));

  return flowNodes.map((fn) => {
    const original = wfNodes.find((n) => n.id === fn.id);
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
  const [contactsByNode, setContactsByNode] = useState<NodeContactsMap>({});
  const [totals, setTotals] = useState<WorkflowTotals>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const { nodes: initFn, edges: initFe } = wfNodesToFlow(initialNodes, tags, {});
  const [nodes, setNodes, onNodesChange] = useNodesState(initFn);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initFe);

  // Fetch contacts by node
  const fetchContacts = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/contacts-by-node`);
      if (!res.ok) return;
      const data = await res.json();
      setContactsByNode(data.byNode || {});
      setTotals(data.totals || {});

      // Update node data with contacts
      setNodes((nds) =>
        nds.map((fn) => {
          const contacts = (data.byNode || {})[fn.id] || { waiting: [], running: [], sent: [] };
          return {
            ...fn,
            data: { ...fn.data, nodeContacts: contacts },
          };
        })
      );

      // Update edge animations
      setEdges((eds) =>
        eds.map((e) => {
          const contacts = (data.byNode || {})[e.source] || { waiting: [], running: [], sent: [] };
          const hasActive = contacts.running.length > 0 || contacts.waiting.length > 0;
          const sourceNode = nodes.find((n) => n.id === e.source);
          const style = EDGE_STYLES[sourceNode?.type || "default"] || EDGE_STYLES.default;
          return {
            ...e,
            animated: hasActive,
            style,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: (style as any).stroke,
              width: 16,
              height: 16,
            },
          };
        })
      );
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [workflowId, nodes, setNodes, setEdges]);

  // Initial fetch + auto-refresh every 15s
  useEffect(() => {
    fetchContacts();
    const interval = setInterval(() => fetchContacts(true), 15_000);
    return () => clearInterval(interval);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const style = EDGE_STYLES[sourceNode?.type || "default"] || EDGE_STYLES.default;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: false,
            style,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: (style as any).stroke,
              width: 16,
              height: 16,
            },
          },
          eds
        )
      );
    },
    [nodes, setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Drag from palette
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData("application/reactflow-type") as WorkflowNode["type"];
      if (!nodeType || !rfInstanceRef.current) return;

      const position = rfInstanceRef.current.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const id = String(Date.now());
      const defaultConfigs: Record<string, Record<string, unknown>> = {
        wait: { mode: "duration", duration: 1, unit: "days" },
        message: { template: "" },
      };

      const newWfNode: WorkflowNode = {
        id,
        type: nodeType,
        config: defaultConfigs[nodeType] || {},
        nextId: null,
      };

      const dataMap: Record<string, Record<string, unknown>> = {
        wait: { mode: "duration", duration: 1, unit: "days", nodeContacts: { waiting: [], running: [], sent: [] } },
        message: { template: "", nodeContacts: { waiting: [], running: [], sent: [] } },
      };

      setWfNodes((prev) => [...prev, newWfNode]);
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: nodeType,
          position,
          data: dataMap[nodeType] || {},
        },
      ]);

      setSelectedNodeId(id);
    },
    [setNodes]
  );

  const updateNodeConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setWfNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, config } : n)));

      setNodes((nds) =>
        nds.map((fn) => {
          if (fn.id !== nodeId) return fn;
          const contacts = contactsByNode[nodeId] || { waiting: [], running: [], sent: [] };
          let data: Record<string, unknown> = { ...fn.data, nodeContacts: contacts };

          if (fn.type === "trigger") {
            const tag = tags.find((t) => t.id === config.tagId);
            data = { ...data, tagName: tag?.name, tagColor: tag?.color };
          } else if (fn.type === "wait") {
            data = { ...data, ...config };
          } else if (fn.type === "message") {
            data = { ...data, template: config.template };
          }
          return { ...fn, data };
        })
      );
    },
    [contactsByNode, tags, setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setWfNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(null);
    },
    [setNodes, setEdges]
  );

  const handleSave = async () => {
    setSaving(true);
    const current = flowToWfNodes(nodes, edges, wfNodes);
    try {
      await onSave(current);
      setWfNodes(current);
      toast.success("Workflow salvo");
    } catch {
      toast.error("Erro ao salvar");
    }
    setSaving(false);
  };

  const selectedWfNode = wfNodes.find((n) => n.id === selectedNodeId);

  const totalWaiting = totals.WAITING ?? 0;
  const totalCompleted = totals.COMPLETED ?? 0;
  const totalRunning = totals.RUNNING ?? 0;

  return (
    <div className="flex h-full">
      {/* Left Palette */}
      <NodePalette />

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={(instance) => { rfInstanceRef.current = instance; }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          className="bg-[#0a0a0f]"
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            style: { strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="#1e1e2e"
            gap={24}
            size={1.5}
          />
          <Controls
            className="!bg-[#1a1a2e] !border !border-white/10 !rounded-xl !shadow-xl"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-[#1a1a2e] !border !border-white/10 !rounded-xl !shadow-xl"
            nodeColor={(n) => {
              if (n.type === "trigger") return "#6366F1";
              if (n.type === "wait") return "#EAB308";
              return "#22C55E";
            }}
            maskColor="rgba(0,0,0,0.6)"
          />

          {/* Top bar stats */}
          <Panel position="top-center">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a2e]/90 backdrop-blur border border-white/10 rounded-full shadow-xl">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-xs text-yellow-400 font-medium">{totalWaiting} aguardando</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-xs text-blue-400 font-medium">{totalRunning} executando</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-green-400 font-medium">{totalCompleted} enviados</span>
              </div>
            </div>
          </Panel>

          {/* Top right actions */}
          <Panel position="top-right" className="flex gap-2">
            <button
              onClick={() => fetchContacts()}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a2e] border border-white/10 text-slate-400 text-xs font-medium rounded-xl hover:border-white/20 transition-colors disabled:opacity-50"
              title="Atualizar posição dos pacientes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "..." : "Atualizar"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-60 shadow-lg shadow-indigo-500/25 transition-opacity"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Edit Panel */}
      <div
        className={`border-l border-white/5 bg-[#0f0f14] overflow-y-auto transition-all duration-300 ${
          selectedWfNode ? "w-72" : "w-0"
        }`}
      >
        {selectedWfNode && (
          <div className="p-4">
            <NodeEditor
              node={selectedWfNode}
              tags={tags}
              onUpdate={updateNodeConfig}
              onClose={() => setSelectedNodeId(null)}
              onDelete={deleteNode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
