"use client";

import { X, Plus, Trash2 } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface WorkflowNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
  nextId: string | null;
}

interface NodeEditorProps {
  node: WorkflowNode;
  tags: Tag[];
  onUpdate: (nodeId: string, config: Record<string, unknown>) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

const VARIABLES = [
  "{{name}}", "{{first_name}}", "{{phone}}", "{{email}}",
  "{{date}}", "{{now}}", "{{doctor_name}}", "{{custom.data_consulta}}",
];

export function NodeEditor({ node, tags, onUpdate, onClose, onDelete }: NodeEditorProps) {
  const config = node.config;

  if (node.type === "trigger") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Nó: Gatilho</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Tag Gatilho</label>
          <select
            value={(config.tagId as string) || ""}
            onChange={(e) => onUpdate(node.id, { ...config, tagId: e.target.value })}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
          >
            <option value="" className="bg-[#1a1a2e]">Selecionar tag...</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id} className="bg-[#1a1a2e]">{tag.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">O workflow é iniciado quando esta tag é aplicada ao contato.</p>
        </div>
      </div>
    );
  }

  if (node.type === "wait") {
    const mode = (config.mode as string) || "duration";
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Nó: Espera</h3>
          <div className="flex gap-2">
            <button onClick={() => onDelete(node.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo de Espera</label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { value: "duration", label: "Duração" },
              { value: "datetime", label: "Data/Hora" },
              { value: "relative", label: "Relativo" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => onUpdate(node.id, { ...config, mode: opt.value })}
                className={`py-1.5 text-xs rounded-lg transition-colors ${mode === opt.value ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "duration" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Valor</label>
              <input
                type="number"
                min={1}
                value={(config.duration as number) || 1}
                onChange={(e) => onUpdate(node.id, { ...config, duration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Unidade</label>
              <select
                value={(config.unit as string) || "days"}
                onChange={(e) => onUpdate(node.id, { ...config, unit: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/30 appearance-none"
              >
                <option value="minutes" className="bg-[#1a1a2e]">Minutos</option>
                <option value="hours" className="bg-[#1a1a2e]">Horas</option>
                <option value="days" className="bg-[#1a1a2e]">Dias</option>
              </select>
            </div>
          </div>
        )}

        {mode === "datetime" && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Data e Hora</label>
            <input
              type="datetime-local"
              value={(config.datetime as string) || ""}
              onChange={(e) => onUpdate(node.id, { ...config, datetime: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
            />
          </div>
        )}

        {mode === "relative" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Campo de referência</label>
              <input
                value={(config.from as string) || "{{custom.data_consulta}}"}
                onChange={(e) => onUpdate(node.id, { ...config, from: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                placeholder="{{custom.data_consulta}}"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">+/- Valor</label>
                <input
                  type="number"
                  value={(config.duration as number) || 7}
                  onChange={(e) => onUpdate(node.id, { ...config, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Unidade</label>
                <select
                  value={(config.unit as string) || "days"}
                  onChange={(e) => onUpdate(node.id, { ...config, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none appearance-none"
                >
                  <option value="minutes" className="bg-[#1a1a2e]">Minutos</option>
                  <option value="hours" className="bg-[#1a1a2e]">Horas</option>
                  <option value="days" className="bg-[#1a1a2e]">Dias</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (node.type === "message") {
    const template = (config.template as string) || "";
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Nó: Mensagem</h3>
          <div className="flex gap-2">
            <button onClick={() => onDelete(node.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Mensagem</label>
          <textarea
            rows={6}
            value={template}
            onChange={(e) => onUpdate(node.id, { ...config, template: e.target.value })}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/30"
            placeholder="Olá {{first_name}}, tudo bem?..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Inserir variável</label>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map((v) => (
              <button
                key={v}
                onClick={() => onUpdate(node.id, { ...config, template: template + v })}
                className="px-2 py-1 bg-white/5 border border-white/10 text-xs text-slate-400 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors font-mono"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
