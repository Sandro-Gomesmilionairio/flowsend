import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, Tag, GitBranch, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { DashboardCharts } from "./DashboardCharts";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

async function getMetrics(clientId: string) {
  const [contacts, tags, workflows, executions] = await Promise.all([
    prisma.contact.count({ where: { clientId } }),
    prisma.tag.count({ where: { clientId } }),
    prisma.workflow.count({ where: { clientId, isActive: true } }),
    prisma.workflowExecution.groupBy({
      by: ["status"],
      where: { clientId },
      _count: true,
    }),
  ]);

  const byStatus = Object.fromEntries(executions.map((e) => [e.status, e._count]));
  return {
    contacts,
    tags,
    workflows,
    pending: byStatus.WAITING || 0,
    completed: byStatus.COMPLETED || 0,
    failed: byStatus.FAILED || 0,
    running: byStatus.RUNNING || 0,
  };
}

async function getChartData(clientId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [dailyRaw, workflowStats] = await Promise.all([
    prisma.workflowExecution.findMany({
      where: { clientId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.workflowExecution.groupBy({
      by: ["workflowId"],
      where: { clientId },
      _count: { _all: true },
    }),
  ]);

  // Build 7-day bar data
  const days: { label: string; ts: number }[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return { label: DAY_LABELS[d.getDay()], ts: d.getTime() };
  });

  const countByDay: Record<number, number> = {};
  for (const { ts } of days) countByDay[ts] = 0;

  for (const exec of dailyRaw) {
    const d = new Date(exec.createdAt);
    d.setHours(0, 0, 0, 0);
    const key = d.getTime();
    if (key in countByDay) countByDay[key]++;
  }

  const daily = days.map(({ label, ts }) => ({ day: label, count: countByDay[ts] }));

  // Top workflows
  const topIds = workflowStats
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 5)
    .map((w) => w.workflowId);

  const topWorkflowsRaw = await prisma.workflow.findMany({
    where: { id: { in: topIds }, clientId },
    select: {
      id: true,
      name: true,
      executions: {
        select: { status: true },
      },
    },
  });

  const topWorkflows = topWorkflowsRaw
    .map((wf) => ({
      name: wf.name,
      total: wf.executions.length,
      completed: wf.executions.filter((e) => e.status === "COMPLETED").length,
    }))
    .sort((a, b) => b.total - a.total);

  return { daily, topWorkflows };
}

async function getRecentExecutions(clientId: string) {
  return prisma.workflowExecution.findMany({
    where: { clientId },
    include: {
      contact: { select: { name: true } },
      workflow: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const clientId = session!.user.id;

  const [metrics, chartData, recentExecutions] = await Promise.all([
    getMetrics(clientId),
    getChartData(clientId),
    getRecentExecutions(clientId),
  ]);

  const totalExecutions = metrics.completed + metrics.failed + metrics.pending + metrics.running;
  const successRate =
    totalExecutions > 0 ? Math.round((metrics.completed / totalExecutions) * 100) : 0;

  const segments = [
    { label: "Concluídos", value: metrics.completed, color: "#22c55e", textColor: "text-green-400" },
    { label: "Aguardando", value: metrics.pending, color: "#eab308", textColor: "text-yellow-400" },
    { label: "Executando", value: metrics.running, color: "#3b82f6", textColor: "text-blue-400" },
    { label: "Com Erro", value: metrics.failed, color: "#ef4444", textColor: "text-red-400" },
  ];

  const cards = [
    { label: "Contatos", value: metrics.contacts, icon: Users, color: "from-blue-500 to-cyan-500" },
    { label: "Tags", value: metrics.tags, icon: Tag, color: "from-indigo-500 to-purple-500" },
    { label: "Workflows Ativos", value: metrics.workflows, icon: GitBranch, color: "from-purple-500 to-pink-500" },
    { label: "Aguardando Envio", value: metrics.pending, icon: Clock, color: "from-yellow-500 to-orange-500" },
    { label: "Enviadas", value: metrics.completed, icon: TrendingUp, color: "from-green-500 to-emerald-500" },
    { label: "Com Erro", value: metrics.failed, icon: AlertTriangle, color: "from-red-500 to-rose-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Visão geral do sistema de automação</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-slate-400">{card.label}</p>
            </div>
            <p className="text-3xl font-bold text-white">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts
        daily={chartData.daily}
        segments={segments}
        topWorkflows={chartData.topWorkflows}
        successRate={successRate}
      />

      {/* Recent Executions */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-semibold text-white">Execuções Recentes</h2>
          <a href="/execucoes" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Ver todas →
          </a>
        </div>
        {recentExecutions.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500 text-sm">
            Nenhuma execução ainda. Aplique uma tag a um contato para iniciar um workflow.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentExecutions.map((exec) => (
              <div key={exec.id} className="px-6 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{exec.contact.name}</p>
                  <p className="text-xs text-slate-500 truncate">{exec.workflow.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[exec.status]}`}>
                    {STATUS_LABELS[exec.status]}
                  </span>
                  {exec.scheduledAt && exec.status === "WAITING" && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      {new Date(exec.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
