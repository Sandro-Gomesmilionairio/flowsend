"use client";

import { Handle, Position } from "reactflow";
import { Tag, Zap } from "lucide-react";
import { NodeContactSection, ContactOnNode } from "./ContactAvatars";

interface TriggerNodeProps {
  data: {
    tagName?: string;
    tagColor?: string;
    nodeContacts?: {
      waiting: ContactOnNode[];
      running: ContactOnNode[];
      sent: ContactOnNode[];
    };
  };
  selected?: boolean;
}

export function TriggerNode({ data, selected }: TriggerNodeProps) {
  const contacts = data.nodeContacts;
  const totalActive = (contacts?.running?.length ?? 0) + (contacts?.waiting?.length ?? 0);

  return (
    <div
      className="min-w-[200px] max-w-[240px] rounded-2xl border-2 transition-all duration-200"
      style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)",
        backdropFilter: "blur(12px)",
        borderColor: selected ? "rgba(99,102,241,0.8)" : "rgba(99,102,241,0.25)",
        boxShadow: selected
          ? "0 0 0 3px rgba(99,102,241,0.15), 0 8px 32px rgba(99,102,241,0.2)"
          : "0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/30 flex items-center justify-center">
              <Zap className="w-3 h-3 text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Gatilho
            </span>
          </div>
          {totalActive > 0 && (
            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{totalActive}</span>
            </div>
          )}
        </div>

        <p className="text-sm font-semibold text-white mb-1.5">Tag aplicada</p>

        {data.tagName ? (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold"
            style={{
              background: (data.tagColor || "#6366F1") + "25",
              color: data.tagColor || "#6366F1",
              border: `1px solid ${data.tagColor || "#6366F1"}40`,
            }}
          >
            <Tag className="w-3 h-3" />
            {data.tagName}
          </div>
        ) : (
          <div className="px-2 py-1 rounded-lg bg-white/5 border border-dashed border-white/10 text-xs text-slate-500">
            Clique para escolher a tag →
          </div>
        )}

        {/* Contacts */}
        <NodeContactSection
          running={contacts?.running}
          waiting={contacts?.waiting}
          nodeType="trigger"
        />
      </div>

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3.5 !h-3.5 !border-2 !border-[#0f0f14]"
        style={{ background: "#6366F1" }}
      />
    </div>
  );
}
