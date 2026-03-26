import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const execution = await prisma.workflowExecution.findFirst({
    where: { id: params.id, clientId: session.user.id },
    include: {
      contact: true,
      workflow: true,
      logs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!execution) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(execution);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json();

  if (action === "cancel") {
    await prisma.workflowExecution.updateMany({
      where: {
        id: params.id,
        clientId: session.user.id,
        status: { in: ["WAITING", "RUNNING"] },
      },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
  }

  const execution = await prisma.workflowExecution.findUnique({
    where: { id: params.id },
  });
  return NextResponse.json(execution);
}
