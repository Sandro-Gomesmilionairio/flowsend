"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, GitBranch, Trash2, Eye, Power, X } from "lucide-react";
import Link from "next/link";

interface Workflow {
  id: string;
  name: string;
  isActive: boolean;
  triggerTag?: { id: string; name: string; color: string } | null;
  _count: { executions: number };
  createdAt: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", triggerTagId: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [wfRes, tagRes] = await Promise.all([
      fetch("/api/workflows"),
      fetch("/api/tags"),
    ]);
    const [wfData, tagData] = await Promise.all([wfRes.json(), tagRes.json()]);
    setWorkflows(Array.isArray(wfData) ? wfData : []);
    setTags(Array.isArray(tagData) ? tagData : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        triggerTagId: form.triggerTagId || null,
        nodes: [
          { id: "1", type: "trigger", config: { tagId: form.triggerTagId }, nextId: "2" },
          { id: "2", type: "wait", config: { mode: "duration", duration: 1, unit: "days" }, nextId: "3" },
          { id: "3", type: "message", config: { template: "Olá {{first_name}}, tudo bem?" }, nextId: null },
        ],
      }),
    });

    if (res.ok) {
      const workflow = await res.json();
      toast.success("Workflow criado");
      setShowForm(false);
      setForm({ name: "", triggerTagId: "" });
      // Navigate to builder
      window.location.href = `/workflows/${workflow.id}`;
    } else {
      toast.error("Erro ao criar workflow");
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      toast.success(isActive ? "Workflow desativado" : "Workflow ativado");
      fetchData();
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Excluir este workflow? Todas as execuções serão removidas.")) return;
    const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Workflow excluído");
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows</h1>
          <p className="text-slate-400 mt-0.5">{workflows.length} workflows</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" />
          Novo Workflow
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-12">Carregando...</div>
      ) : workflows.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-500">
          <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-40" />
          Nenhum workflow criado. Crie seu primeiro workflow de automação.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="glass-card rounded-2xl p-5 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${workflow.isActive ? "bg-indigo-500/20 border border-indigo-500/30" : "bg-white/5 border border-white/10"}`}>
                    <GitBranch className={`w-5 h-5 ${workflow.isActive ? "text-indigo-400" : "text-slate-600"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{workflow.name}</p>
                    {workflow.triggerTag && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-md font-medium mt-0.5 inline-block"
                        style={{
                          background: workflow.triggerTag.color + "20",
                          color: workflow.triggerTag.color,
                        }}
                      >
                        → {workflow.triggerTag.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-xs font-medium ${workflow.isActive ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 text-slate-500"}`}>
                  {workflow.isActive ? "Ativo" : "Inativo"}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{workflow._count.executions} execução(ões)</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(workflow.id, workflow.isActive)}
                    className={`p-1.5 rounded-lg transition-colors ${workflow.isActive ? "text-green-400 hover:bg-green-500/10" : "text-slate-500 hover:text-green-400 hover:bg-green-500/10"}`}
                    title={workflow.isActive ? "Desativar" : "Ativar"}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/workflows/${workflow.id}`}
                    className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => deleteWorkflow(workflow.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Novo Workflow</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={createWorkflow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Follow-up pós-consulta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Tag Gatilho</label>
                <select
                  value={form.triggerTagId}
                  onChange={(e) => setForm({ ...form, triggerTagId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                >
                  <option value="" className="bg-[#1a1a2e]">Selecionar tag...</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id} className="bg-[#1a1a2e]">
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500">
                Um workflow base será criado (trigger → wait 1 dia → mensagem). Você poderá personalizar no builder.
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-white/10 text-slate-400 text-sm rounded-xl hover:border-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90"
                >
                  Criar e Editar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
