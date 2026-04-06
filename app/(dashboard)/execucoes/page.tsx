"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { RefreshCw, X, ChevronDown, Clock, Send, Zap, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface ExecutionLog {
  id: string;
  nodeId?: string;
  nodeType?: string;
  status: string;
  message?: string;
  createdAt: string;
}

interface Execution {
  id: string;
  status: string;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  currentNodeId?: string;
  contact: { id: string; name: string; phone: string };
  workflow: { id: string; name: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; pulse: boolean }> = {
  RUNNING:   { label: "Executando",  color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",    icon: Zap,         pulse: true },
  WAITING:   { label: "Aguardando", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", icon: Clock,       pulse: true },
  COMPLETED: { label: "Enviado",    color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20",   icon: CheckCircle, pulse: false },
  FAILED:    { label: "Falhou",     color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",        icon: XCircle,     pulse: false },
  CANCELLED: { label: "Cancelado",  color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/20",   icon: AlertCircle, pulse: false },
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  if (h < 24) return `${h}h atrás`;
  return `${d}d atrás`;
}

function formatScheduledIn(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "em instantes";
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (min < 60) return `em ${min}min`;
  if (h < 24) return `em ${h}h`;
  return `em ${d}d`;
}

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
  useEffect(() => {
    const interval = setInterval(fetchExecutions, 10_000);
    return () => clearInterval(interval);
  }, [fetchExecutions]);

  const cancelExecution = async (id: string) => {
    await fetch(`/api/executions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    toast.success("Cancelado");
    fetchExecutions();
  };

  // Group by workflow
  const grouped = executions.reduce((acc, exec) => {
    const key = exec.workflow.id;
    if (!acc[key]) acc[key] = { name: exec.workflow.name, executions: [] };
    acc[key].executions.push(exec);
    return acc;
  }, {} as Record<string, { name: string; executions: Execution[] }>);

  const counts = executions.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {["", "WAITING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"].map((s) => {
          const cfg = s ? STATUS_CONFIG[s] : null;
          const count = s ? (counts[s] || 0) : executions.length;
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                statusFilter === s
                  ? (cfg ? `${cfg.bg} ${cfg.color} border-opacity-60` : "bg-indigo-600/20 text-indigo-400 border-indigo-500/30")
                  : "bg-white/5 text-slate-500 border-white/10 hover:border-white/20"
              }`}
            >
              {cfg && <cfg.icon className="w-3 h-3" />}
              {s === "" ? "Todos" : STATUS_CONFIG[s]?.label}
              <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-slate-500 py-12">Carregando...</div>
      ) : executions.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-500">
          Nenhuma execução encontrada.
        </div>
      ) : statusFilter ? (
        /* Flat list when filtering */
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left font-medium text-slate-400">Paciente</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden md:table-cell">Workflow</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden lg:table-cell">Agendado</th>
                <th className="px-4 py-3 text-right font-medium text-slate-400">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {executions.map((exec) => (
                <ExecutionRow key={exec.id} exec={exec} onCancel={cancelExecution} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grouped by workflow when no filter */
        <div className="space-y-4">
          {Object.entries(grouped).map(([wfId, group]) => (
            <WorkflowGroup key={wfId} name={group.name} executions={group.executions} onCancel={cancelExecution} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Mostrando {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} de {total}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed">Anterior</button>
            <button disabled={page * limit >= total} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowGroup({ name, executions, onCancel }: { name: string; executions: Execution[]; onCancel: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  const counts = executions.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Group header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/2 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-white text-sm">{name}</p>
            <p className="text-xs text-slate-500">{executions.length} execução(ões)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries(counts).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status];
            if (!cfg) return null;
            return (
              <div key={status} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.bg} ${cfg.color}`}>
                {cfg.pulse && <div className={`w-1.5 h-1.5 rounded-full ${cfg.color.replace("text-", "bg-")} animate-pulse`} />}
                {count}
              </div>
            );
          })}
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Execution rows */}
      {open && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {executions.map((exec) => (
            <ExecutionRow key={exec.id} exec={exec} onCancel={onCancel} compact />
          ))}
        </div>
      )}
    </div>
  );
}

function ExecutionRow({ exec, onCancel, compact = false }: { exec: Execution; onCancel: (id: string) => void; compact?: boolean }) {
  const cfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.CANCELLED;
  const StatusIcon = cfg.icon;
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const toggleLogs = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (logs.length > 0) return;
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/executions/${exec.id}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {}
    setLoadingLogs(false);
  };

  const LOG_STATUS_STYLES: Record<string, string> = {
    scheduled: "text-yellow-400 bg-yellow-500/10",
    sent: "text-green-400 bg-green-500/10",
    error: "text-red-400 bg-red-500/10",
  };

  return (
    <div>
      <div
        onClick={toggleLogs}
        className="px-5 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors group cursor-pointer"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">
          {getInitials(exec.contact.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white truncate">{exec.contact.name}</p>
            <span className="text-slate-600 text-xs hidden md:block">{exec.contact.phone}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{formatRelative(exec.createdAt)}</p>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
          {cfg.pulse && <div className={`w-1.5 h-1.5 rounded-full ${cfg.color.replace("text-", "bg-")} animate-pulse`} />}
          <StatusIcon className="w-3 h-3" />
          {cfg.label}
        </div>

        {/* Scheduled time */}
        {exec.scheduledAt && exec.status === "WAITING" && (
          <div className="text-xs text-slate-500 flex-shrink-0 hidden lg:block">
            {formatScheduledIn(exec.scheduledAt)}
          </div>
        )}
        {exec.completedAt && exec.status === "COMPLETED" && (
          <div className="text-xs text-slate-500 flex-shrink-0 hidden lg:block">
            {formatTime(exec.completedAt)}
          </div>
        )}

        {/* Expand indicator + Cancel */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {(exec.status === "WAITING" || exec.status === "RUNNING") && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(exec.id); }}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Cancelar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Logs panel */}
      {expanded && (
        <div className="px-5 pb-3 ml-12">
          {loadingLogs ? (
            <p className="text-xs text-slate-500">Carregando logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum log registrado.</p>
          ) : (
            <div className="space-y-1.5">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded font-medium ${LOG_STATUS_STYLES[log.status] || "text-slate-400 bg-white/5"}`}>
                    {log.status}
                  </span>
                  {log.nodeType && (
                    <span className="text-slate-600">[{log.nodeType}]</span>
                  )}
                  <span className="text-slate-300 flex-1">{log.message || "—"}</span>
                  <span className="text-slate-600 flex-shrink-0">{formatTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
