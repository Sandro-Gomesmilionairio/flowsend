"use client";

import { Clock, MessageSquare, Info } from "lucide-react";

const PALETTE_NODES = [
  {
    type: "wait",
    label: "Espera",
    description: "Delay antes do próximo passo",
    icon: Clock,
    color: "#EAB308",
    gradient: "from-yellow-500/20 to-amber-500/10",
    border: "border-yellow-500/20",
  },
  {
    type: "message",
    label: "Mensagem",
    description: "Envia WhatsApp ao contato",
    icon: MessageSquare,
    color: "#22C55E",
    gradient: "from-green-500/20 to-emerald-500/10",
    border: "border-green-500/20",
  },
];

export function NodePalette() {
  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("application/reactflow-type", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-52 flex-shrink-0 border-r border-white/5 bg-[#0a0a0f] flex flex-col">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Nós
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">Arraste para o canvas</p>
      </div>

      <div className="p-3 space-y-2 flex-1">
        {PALETTE_NODES.map((node) => (
          <div
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing
              bg-gradient-to-r ${node.gradient} border ${node.border}
              hover:border-opacity-50 hover:scale-[1.02] transition-all duration-150
              select-none
            `}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: node.color + "25" }}
            >
              <node.icon className="w-4 h-4" style={{ color: node.color }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{node.label}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{node.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-white/5 space-y-1.5">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">
          Legenda de pacientes
        </p>
        {[
          { color: "#60A5FA", label: "Processando" },
          { color: "#FBBF24", label: "Aguardando" },
          { color: "#34D399", label: "Enviado" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-[10px] text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
