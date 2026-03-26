"use client";

import { Handle, Position } from "reactflow";
import { MessageSquare, Send } from "lucide-react";
import { NodeContactSection, ContactOnNode } from "./ContactAvatars";

interface MessageNodeProps {
  data: {
    template?: string;
    nodeContacts?: {
      waiting: ContactOnNode[];
      running: ContactOnNode[];
      sent: ContactOnNode[];
    };
  };
  selected?: boolean;
}

export function MessageNode({ data, selected }: MessageNodeProps) {
  const template = data.template || "";
  const preview = template
    ? template.slice(0, 90) + (template.length > 90 ? "..." : "")
    : "Clique para escrever a mensagem →";

  const contacts = data.nodeContacts;
  const sentCount = contacts?.sent?.length ?? 0;
  const runningCount = contacts?.running?.length ?? 0;

  return (
    <div
      className="min-w-[210px] max-w-[250px] rounded-2xl border-2 transition-all duration-200"
      style={{
        background: "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.08) 100%)",
        backdropFilter: "blur(12px)",
        borderColor: selected ? "rgba(34,197,94,0.8)" : "rgba(34,197,94,0.25)",
        boxShadow: selected
          ? "0 0 0 3px rgba(34,197,94,0.15), 0 8px 32px rgba(34,197,94,0.2)"
          : "0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3.5 !h-3.5 !border-2 !border-[#0f0f14]"
        style={{ background: "#22C55E" }}
      />

      <div className="px-3.5 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-green-500/30 flex items-center justify-center">
              <MessageSquare className="w-3 h-3 text-green-400" />
            </div>
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">
              Mensagem
            </span>
          </div>
          {sentCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30">
              <Send className="w-2.5 h-2.5 text-green-400" />
              <span className="text-[10px] font-bold text-green-400">{sentCount}</span>
            </div>
          )}
        </div>

        {/* Message preview bubble */}
        <div
          className="rounded-xl p-2.5 text-xs leading-relaxed whitespace-pre-line"
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.15)",
            color: template ? "#e2e8f0" : "#64748b",
            fontStyle: template ? "normal" : "italic",
          }}
        >
          {preview}
        </div>

        {/* Contacts */}
        <NodeContactSection
          running={contacts?.running}
          sent={contacts?.sent}
          nodeType="message"
        />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3.5 !h-3.5 !border-2 !border-[#0f0f14]"
        style={{ background: "#22C55E" }}
      />
    </div>
  );
}
