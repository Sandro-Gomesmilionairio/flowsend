import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  triggerTagId: z.string().optional().nullable(),
  nodes: z.array(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await prisma.workflow.findMany({
    where: { clientId: session.user.id },
    include: {
      triggerTag: { select: { id: true, name: true, color: true } },
      _count: { select: { executions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(workflows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workflow = await prisma.workflow.create({
    data: {
      clientId: session.user.id,
      name: parsed.data.name,
      triggerTagId: parsed.data.triggerTagId || null,
      nodes: parsed.data.nodes || [],
      isActive: parsed.data.isActive ?? true,
    },
    include: {
      triggerTag: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(workflow, { status: 201 });
}
