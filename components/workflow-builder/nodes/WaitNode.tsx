"use client";

import { Handle, Position } from "reactflow";
import { Clock } from "lucide-react";

interface WaitNodeProps {
  data: {
    mode: string;
    duration?: number;
    unit?: string;
    datetime?: string;
    from?: string;
  };
  selected?: boolean;
}

function formatWaitLabel(data: WaitNodeProps["data"]): string {
  if (data.mode === "duration" && data.duration && data.unit) {
    const unitLabels: Record<string, string> = {
      minutes: "minuto(s)",
      hours: "hora(s)",
      days: "dia(s)",
    };
    return `Aguardar ${data.duration} ${unitLabels[data.unit] || data.unit}`;
  }
  if (data.mode === "datetime" && data.datetime) {
    return `Até ${new Date(data.datetime).toLocaleDateString("pt-BR")}`;
  }
  if (data.mode === "relative" && data.from) {
    const field = data.from.replace("{{custom.", "").replace("}}", "");
    return `${data.duration} ${data.unit} após ${field}`;
  }
  return "Aguardar";
}

export function WaitNode({ data, selected }: WaitNodeProps) {
  return (
    <div
      className={`min-w-[180px] rounded-2xl border transition-all ${
        selected
          ? "border-yellow-500/60 shadow-lg shadow-yellow-500/20"
          : "border-white/10"
      }`}
      style={{
        background: "linear-gradient(135deg, rgba(234,179,8,0.1) 0%, rgba(245,158,11,0.08) 100%)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-[#1a1a2e]"
        style={{ background: "#EAB308" }}
      />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Espera</span>
        </div>
        <p className="text-sm font-medium text-white">{formatWaitLabel(data)}</p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-[#1a1a2e]"
        style={{ background: "#EAB308" }}
      />
    </div>
  );
}
