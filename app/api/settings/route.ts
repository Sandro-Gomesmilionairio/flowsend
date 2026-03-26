import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      chatwootAccountId: true,
      chatwootApiToken: true,
      chatwootInboxId: true,
      maxMessagesPerMinute: true,
      sendWindowStart: true,
      sendWindowEnd: true,
    },
  });

  return NextResponse.json(client);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const client = await prisma.client.update({
    where: { id: session.user.id },
    data: {
      ...(body.chatwootAccountId !== undefined && { chatwootAccountId: body.chatwootAccountId }),
      ...(body.chatwootApiToken !== undefined && { chatwootApiToken: body.chatwootApiToken }),
      ...(body.chatwootInboxId !== undefined && { chatwootInboxId: body.chatwootInboxId }),
      ...(body.maxMessagesPerMinute !== undefined && { maxMessagesPerMinute: parseInt(body.maxMessagesPerMinute) }),
      ...(body.sendWindowStart !== undefined && { sendWindowStart: body.sendWindowStart }),
      ...(body.sendWindowEnd !== undefined && { sendWindowEnd: body.sendWindowEnd }),
    },
    select: {
      id: true,
      chatwootAccountId: true,
      chatwootInboxId: true,
      maxMessagesPerMinute: true,
      sendWindowStart: true,
      sendWindowEnd: true,
    },
  });

  return NextResponse.json(client);
}
