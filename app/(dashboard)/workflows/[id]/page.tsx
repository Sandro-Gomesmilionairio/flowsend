import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import WorkflowBuilderClient from "./WorkflowBuilderClient";

interface PageProps {
  params: { id: string };
}

export default async function WorkflowBuilderPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [workflow, tags] = await Promise.all([
    prisma.workflow.findFirst({
      where: { id: params.id, clientId: session.user.id },
      include: { triggerTag: true },
    }),
    prisma.tag.findMany({
      where: { clientId: session.user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!workflow) notFound();

  return (
    <div className="-m-6 lg:-m-8 h-[calc(100vh-0px)] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0f0f14] flex-shrink-0">
        <div>
          <h1 className="font-bold text-white">{workflow.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {workflow.triggerTag ? `Gatilho: ${workflow.triggerTag.name}` : "Sem tag gatilho"}
            {" · "}
            <span className={workflow.isActive ? "text-green-400" : "text-slate-600"}>
              {workflow.isActive ? "Ativo" : "Inativo"}
            </span>
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <WorkflowBuilderClient
          workflowId={workflow.id}
          initialNodes={(workflow.nodes as any[]) || []}
          triggerTagId={workflow.triggerTagId}
          tags={tags}
        />
      </div>
    </div>
  );
}
