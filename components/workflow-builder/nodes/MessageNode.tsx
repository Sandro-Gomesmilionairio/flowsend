"use client";

import { Handle, Position } from "reactflow";
import { MessageSquare } from "lucide-react";

interface MessageNodeProps {
  data: {
    template: string;
  };
  selected?: boolean;
}

export function MessageNode({ data, selected }: MessageNodeProps) {
  const preview = data.template
    ? data.template.slice(0, 80) + (data.template.length > 80 ? "..." : "")
    : "Nenhuma mensagem configurada";

  return (
    <div
      className={`min-w-[200px] max-w-[260px] rounded-2xl border transition-all ${
        selected
          ? "border-green-500/60 shadow-lg shadow-green-500/20"
          : "border-white/10"
      }`}
      style={{
        background: "linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(16,185,129,0.08) 100%)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-[#1a1a2e]"
        style={{ background: "#22C55E" }}
      />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-green-400" />
          </div>
          <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Mensagem</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 whitespace-pre-line">{preview}</p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-[#1a1a2e]"
        style={{ background: "#22C55E" }}
      />
    </div>
  );
}
