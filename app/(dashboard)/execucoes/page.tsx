"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { RefreshCw, X, Filter } from "lucide-react";

interface Execution {
  id: string;
  status: string;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  contact: { id: string; name: string; phone: string };
  workflow: { id: string; name: string };
}

const STATUS_COLORS: Record<string, string> = {
  RUNNING: "text-blue-400 bg-blue-500/10",
  WAITING: "text-yellow-400 bg-yellow-500/10",
  COMPLETED: "text-green-400 bg-green-500/10",
  FAILED: "text-red-400 bg-red-500/10",
  CANCELLED: "text-slate-400 bg-slate-500/10",
};

const STATUS_LABELS: Record<string, string> = {
  RUNNING: "Executando",
  WAITING: "Aguardando",
  COMPLETED: "Concluído",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
};

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 30;

  const fetchExecutions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(page),
      ...(statusFilter && { status: statusFilter }),
    });
    const res = await fetch(`/api/executions?${params}`);
    const data = await res.json();
    setExecutions(data.executions || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchExecutions(); }, [fetchExecutions]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchExecutions, 10_000);
    return () => clearInterval(interval);
  }, [fetchExecutions]);

  const cancelExecution = async (id: string) => {
    const res = await fetch(`/api/executions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    if (res.ok) {
      toast.success("Execução cancelada");
      fetchExecutions();
    }
  };

  const statusCounts = executions.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Execuções</h1>
          <p className="text-slate-400 mt-0.5">{total} total</p>
        </div>
        <button
          onClick={fetchExecutions}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-slate-400 text-sm rounded-xl hover:border-white/20 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500" />
        {["", "WAITING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"].map((status) => (
          <button
            key={status}
            onClick={() => { setStatusFilter(status); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              statusFilter === status
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:border-white/20"
            }`}
          >
            {status === "" ? "Todos" : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando...</div>
        ) : executions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nenhuma execução encontrada.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left font-medium text-slate-400">Contato</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden md:table-cell">Workflow</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden lg:table-cell">Agendado para</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden xl:table-cell">Criado</th>
                <th className="px-4 py-3 text-right font-medium text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {executions.map((exec) => (
                <tr key={exec.id} className="hover:bg-white/2 transition-colors group">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-white">{exec.contact.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{exec.contact.phone}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 hidden md:table-cell">{exec.workflow.name}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[exec.status]}`}>
                      {STATUS_LABELS[exec.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 hidden lg:table-cell">
                    {exec.scheduledAt
                      ? new Date(exec.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 hidden xl:table-cell">
                    {new Date(exec.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end">
                      {(exec.status === "WAITING" || exec.status === "RUNNING") && (
                        <button
                          onClick={() => cancelExecution(exec.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Mostrando {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} de {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-white/5 text-slate-400 text-sm rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-white/5 text-slate-400 text-sm rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
