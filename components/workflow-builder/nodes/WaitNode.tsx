"use client";

import { Handle, Position } from "reactflow";
import { Clock } from "lucide-react";
import { NodeContactSection, ContactOnNode } from "./ContactAvatars";

interface WaitNodeProps {
  data: {
    mode?: string;
    duration?: number;
    unit?: string;
    datetime?: string;
    from?: string;
    nodeContacts?: {
      waiting: ContactOnNode[];
      running: ContactOnNode[];
      sent: ContactOnNode[];
    };
  };
  selected?: boolean;
}

function formatWaitLabel(data: WaitNodeProps["data"]): { title: string; subtitle: string } {
  const unitLabels: Record<string, string> = {
    minutes: "minuto(s)",
    hours: "hora(s)",
    days: "dia(s)",
  };

  if (data.mode === "duration" && data.duration && data.unit) {
    return {
      title: `Aguardar ${data.duration} ${unitLabels[data.unit] || data.unit}`,
      subtitle: data.duration === 1 ? "Delay fixo" : `= ${data.duration * (data.unit === "days" ? 24 : data.unit === "hours" ? 1 : 1 / 60)} ${data.unit === "days" ? "horas" : "h"}`,
    };
  }
  if (data.mode === "datetime" && data.datetime) {
    return {
      title: "Data específica",
      subtitle: new Date(data.datetime).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
    };
  }
  if (data.mode === "relative" && data.from) {
    const field = data.from.replace("{{custom.", "").replace("}}", "");
    return {
      title: `+${data.duration} ${unitLabels[data.unit || "days"] || "dias"}`,
      subtitle: `após ${field}`,
    };
  }
  return { title: "Aguardar", subtitle: "Configurar delay" };
}

export function WaitNode({ data, selected }: WaitNodeProps) {
  const { title, subtitle } = formatWaitLabel(data);
  const contacts = data.nodeContacts;
  const waitingCount = contacts?.waiting?.length ?? 0;

  return (
    <div
      className="min-w-[200px] max-w-[240px] rounded-2xl border-2 transition-all duration-200"
      style={{
        background: "linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(245,158,11,0.08) 100%)",
        backdropFilter: "blur(12px)",
        borderColor: selected ? "rgba(234,179,8,0.8)" : "rgba(234,179,8,0.25)",
        boxShadow: selected
          ? "0 0 0 3px rgba(234,179,8,0.15), 0 8px 32px rgba(234,179,8,0.2)"
          : "0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3.5 !h-3.5 !border-2 !border-[#0f0f14]"
        style={{ background: "#EAB308" }}
      />

      <div className="px-3.5 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-yellow-500/30 flex items-center justify-center">
              <Clock className="w-3 h-3 text-yellow-400" />
            </div>
            <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
              Espera
            </span>
          </div>
          {waitingCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[10px] font-bold text-yellow-400">{waitingCount} aqui</span>
            </div>
          )}
        </div>

        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>

        {/* Contacts */}
        <NodeContactSection
          waiting={contacts?.waiting}
          running={contacts?.running}
          nodeType="wait"
        />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3.5 !h-3.5 !border-2 !border-[#0f0f14]"
        style={{ background: "#EAB308" }}
      />
    </div>
  );
}
