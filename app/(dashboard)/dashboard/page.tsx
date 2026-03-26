import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, Tag, GitBranch, Activity, TrendingUp, Clock } from "lucide-react";

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

  const pending = executions.find((e) => e.status === "WAITING")?._count || 0;
  const completed = executions.find((e) => e.status === "COMPLETED")?._count || 0;
  const failed = executions.find((e) => e.status === "FAILED")?._count || 0;

  return { contacts, tags, workflows, pending, completed, failed };
}

async function getRecentExecutions(clientId: string) {
  return prisma.workflowExecution.findMany({
    where: { clientId },
    include: {
      contact: { select: { name: true } },
      workflow: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

const statusColors: Record<string, string> = {
  RUNNING: "text-blue-400 bg-blue-500/10",
  WAITING: "text-yellow-400 bg-yellow-500/10",
  COMPLETED: "text-green-400 bg-green-500/10",
  FAILED: "text-red-400 bg-red-500/10",
  CANCELLED: "text-slate-400 bg-slate-500/10",
};

const statusLabels: Record<string, string> = {
  RUNNING: "Executando",
  WAITING: "Aguardando",
  COMPLETED: "Concluído",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const clientId = session!.user.id;

  const [metrics, recentExecutions] = await Promise.all([
    getMetrics(clientId),
    getRecentExecutions(clientId),
  ]);

  const cards = [
    { label: "Contatos", value: metrics.contacts, icon: Users, color: "from-blue-500 to-cyan-500" },
    { label: "Tags", value: metrics.tags, icon: Tag, color: "from-indigo-500 to-purple-500" },
    { label: "Workflows Ativos", value: metrics.workflows, icon: GitBranch, color: "from-purple-500 to-pink-500" },
    { label: "Aguardando Envio", value: metrics.pending, icon: Clock, color: "from-yellow-500 to-orange-500" },
    { label: "Enviadas", value: metrics.completed, icon: TrendingUp, color: "from-green-500 to-emerald-500" },
    { label: "Com Erro", value: metrics.failed, icon: Activity, color: "from-red-500 to-rose-500" },
  ];

  return (
    <div className="space-y-8">
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

      {/* Recent Executions */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white">Execuções Recentes</h2>
        </div>
        {recentExecutions.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500">
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
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[exec.status]}`}>
                    {statusLabels[exec.status]}
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
