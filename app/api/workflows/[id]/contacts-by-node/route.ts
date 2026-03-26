import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface ContactOnNode {
  id: string;
  contactId: string;
  name: string;
  phone: string;
  status: string;
  scheduledAt?: string | null;
  updatedAt: string;
}

export interface NodeContacts {
  waiting: ContactOnNode[];
  running: ContactOnNode[];
  sent: ContactOnNode[];
  failed: ContactOnNode[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify workflow belongs to client
  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, clientId: session.user.id },
  });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get active executions (WAITING or RUNNING) for this workflow
  const activeExecutions = await prisma.workflowExecution.findMany({
    where: {
      workflowId: params.id,
      status: { in: ["WAITING", "RUNNING"] },
    },
    include: { contact: { select: { id: true, name: true, phone: true } } },
    orderBy: { updatedAt: "desc" },
  });

  // Get recently sent executions (last 7 days) for message node tracking
  const recentLogs = await prisma.executionLog.findMany({
    where: {
      execution: { workflowId: params.id },
      nodeType: "message",
      status: "sent",
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    include: {
      execution: {
        include: { contact: { select: { id: true, name: true, phone: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Build map: nodeId → contacts
  const byNode: Record<string, NodeContacts> = {};

  const ensureNode = (nodeId: string) => {
    if (!byNode[nodeId]) {
      byNode[nodeId] = { waiting: [], running: [], sent: [], failed: [] };
    }
  };

  // Active executions → waiting / running on their current node
  for (const exec of activeExecutions) {
    if (!exec.currentNodeId) continue;
    ensureNode(exec.currentNodeId);

    const entry: ContactOnNode = {
      id: exec.id,
      contactId: exec.contact.id,
      name: exec.contact.name,
      phone: exec.contact.phone,
      status: exec.status,
      scheduledAt: exec.scheduledAt?.toISOString() ?? null,
      updatedAt: exec.updatedAt.toISOString(),
    };

    if (exec.status === "WAITING") {
      byNode[exec.currentNodeId].waiting.push(entry);
    } else {
      byNode[exec.currentNodeId].running.push(entry);
    }
  }

  // Recent logs → sent on message nodes
  for (const log of recentLogs) {
    if (!log.nodeId) continue;
    ensureNode(log.nodeId);

    // Avoid duplicates
    const already = byNode[log.nodeId].sent.find(
      (c) => c.contactId === log.execution.contact.id
    );
    if (!already) {
      byNode[log.nodeId].sent.push({
        id: log.execution.id,
        contactId: log.execution.contact.id,
        name: log.execution.contact.name,
        phone: log.execution.contact.phone,
        status: "COMPLETED",
        scheduledAt: null,
        updatedAt: log.createdAt.toISOString(),
      });
    }
  }

  // Also add total counts per workflow
  const totalCounts = await prisma.workflowExecution.groupBy({
    by: ["status"],
    where: { workflowId: params.id },
    _count: true,
  });

  const totals = totalCounts.reduce((acc, e) => {
    acc[e.status] = e._count;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({ byNode, totals });
}
