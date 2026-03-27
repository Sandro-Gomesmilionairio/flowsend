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

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, clientId: session.user.id },
    include: {
      triggerTag: { select: { id: true, name: true, color: true } },
    },
  });

  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workflow);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Always derive triggerTagId from nodes when nodes are provided
  // This prevents desync between nodes JSON and the triggerTagId column
  let triggerTagId = body.triggerTagId;
  if (body.nodes !== undefined) {
    const triggerNode = (body.nodes as any[]).find((n: any) => n.type === "trigger");
    triggerTagId = triggerNode?.config?.tagId || null;
  }

  const result = await prisma.workflow.updateMany({
    where: { id: params.id, clientId: session.user.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(triggerTagId !== undefined && { triggerTagId }),
      ...(body.nodes !== undefined && { nodes: body.nodes }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const workflow = await prisma.workflow.findUnique({
    where: { id: params.id },
    include: { triggerTag: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(workflow);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.workflow.deleteMany({
    where: { id: params.id, clientId: session.user.id },
  });

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
