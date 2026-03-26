"use client";

import { Handle, Position } from "reactflow";
import { Tag, Zap } from "lucide-react";

interface TriggerNodeProps {
  data: {
    label: string;
    tagName?: string;
    tagColor?: string;
    selected?: boolean;
  };
  selected?: boolean;
}

export function TriggerNode({ data, selected }: TriggerNodeProps) {
  return (
    <div
      className={`min-w-[180px] rounded-2xl border transition-all ${
        selected
          ? "border-indigo-500/60 shadow-lg shadow-indigo-500/20"
          : "border-white/10"
      }`}
      style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Gatilho</span>
        </div>
        <p className="text-sm font-medium text-white">Tag aplicada</p>
        {data.tagName ? (
          <div
            className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
            style={{
              background: (data.tagColor || "#6366F1") + "20",
              color: data.tagColor || "#6366F1",
            }}
          >
            <Tag className="w-3 h-3" />
            {data.tagName}
          </div>
        ) : (
          <p className="text-xs text-slate-500 mt-1">Nenhuma tag selecionada</p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-[#1a1a2e]"
        style={{ background: "#6366F1" }}
      />
    </div>
  );
}
