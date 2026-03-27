import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Tag, Clock, CheckCircle, XCircle, AlertCircle, Loader } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  WAITING: "Aguardando",
  RUNNING: "Executando",
  COMPLETED: "Concluído",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  WAITING: "text-yellow-400 bg-yellow-400/10",
  RUNNING: "text-blue-400 bg-blue-400/10",
  COMPLETED: "text-green-400 bg-green-400/10",
  FAILED: "text-red-400 bg-red-400/10",
  CANCELLED: "text-slate-400 bg-slate-400/10",
};

function StatusIcon({ status }: { status: string }) {
  const cls = "w-3.5 h-3.5";
  switch (status) {
    case "WAITING": return <Clock className={cls} />;
    case "RUNNING": return <Loader className={`${cls} animate-spin`} />;
    case "COMPLETED": return <CheckCircle className={cls} />;
    case "FAILED": return <XCircle className={cls} />;
    case "CANCELLED": return <AlertCircle className={cls} />;
    default: return null;
  }
}

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, clientId: session.user.id },
    include: {
      tags: { include: { tag: true } },
      executions: {
        include: {
          workflow: { select: { id: true, name: true } },
          logs: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!contact) notFound();

  const customFields = (contact.customFields as Record<string, unknown>) || {};

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/contatos"
          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{contact.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Criado em {formatDate(contact.createdAt)}
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Informações</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-300 font-mono">{contact.phone}</span>
            </div>
            {contact.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-300">{contact.email}</span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {contact.tags.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma tag aplicada</p>
            ) : (
              contact.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: tag.color + "20", color: tag.color, border: `1px solid ${tag.color}40` }}
                >
                  <Tag className="w-3 h-3" />
                  {tag.name}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Custom Fields */}
      {Object.keys(customFields).length > 0 && (
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Campos Customizados</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(customFields).map(([key, value]) => (
              <div key={key} className="bg-white/5 rounded-xl px-3 py-2.5">
                <p className="text-xs text-slate-500 mb-0.5">{key}</p>
                <p className="text-sm text-white font-medium">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executions */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Histórico de Workflows
          </h2>
        </div>

        {contact.executions.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            Nenhum workflow executado para este contato.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {contact.executions.map((execution) => (
              <div key={execution.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/workflows/${execution.workflow.id}`}
                      className="text-sm font-medium text-white hover:text-indigo-400 transition-colors"
                    >
                      {execution.workflow.name}
                    </Link>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[execution.status]}`}>
                        <StatusIcon status={execution.status} />
                        {STATUS_LABELS[execution.status] || execution.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        Iniciado {formatDate(execution.createdAt)}
                      </span>
                      {execution.scheduledAt && execution.status === "WAITING" && (
                        <span className="text-xs text-yellow-500/80">
                          Próximo envio: {formatDate(execution.scheduledAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  {execution.completedAt && (
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      Finalizado {formatDate(execution.completedAt)}
                    </span>
                  )}
                </div>

                {/* Execution logs */}
                {execution.logs.length > 0 && (
                  <div className="mt-3 space-y-1.5 pl-3 border-l border-white/5">
                    {execution.logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-xs text-slate-400">
                        <span
                          className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            log.status === "sent" ? "bg-green-500" :
                            log.status === "error" ? "bg-red-500" :
                            log.status === "scheduled" ? "bg-yellow-500" :
                            "bg-slate-500"
                          }`}
                        />
                        <span className="text-slate-500">[{log.nodeType}]</span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
