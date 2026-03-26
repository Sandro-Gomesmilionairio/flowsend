import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updateData: any = {};

  if (body.name) updateData.name = body.name;
  if (body.email) updateData.email = body.email;
  if (body.password) updateData.passwordHash = await bcrypt.hash(body.password, 12);
  if (body.chatwootAccountId !== undefined) updateData.chatwootAccountId = body.chatwootAccountId;
  if (body.chatwootApiToken !== undefined) updateData.chatwootApiToken = body.chatwootApiToken;
  if (body.chatwootInboxId !== undefined) updateData.chatwootInboxId = body.chatwootInboxId;
  if (body.maxMessagesPerMinute !== undefined) updateData.maxMessagesPerMinute = body.maxMessagesPerMinute;
  if (body.sendWindowStart !== undefined) updateData.sendWindowStart = body.sendWindowStart;
  if (body.sendWindowEnd !== undefined) updateData.sendWindowEnd = body.sendWindowEnd;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  const client = await prisma.client.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return NextResponse.json(client);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Don't allow deleting yourself
  if (params.id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
