import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const workflowId = searchParams.get("workflowId");
  const contactId = searchParams.get("contactId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const where: any = {
    clientId: session.user.id,
    ...(status && { status }),
    ...(workflowId && { workflowId }),
    ...(contactId && { contactId }),
  };

  const [executions, total] = await Promise.all([
    prisma.workflowExecution.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.workflowExecution.count({ where }),
  ]);

  return NextResponse.json({ executions, total, page, limit });
}
