import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  chatwootAccountId: z.string().optional(),
  chatwootApiToken: z.string().optional(),
  chatwootInboxId: z.string().optional(),
  maxMessagesPerMinute: z.number().default(2),
  sendWindowStart: z.string().default("09:00"),
  sendWindowEnd: z.string().default("18:00"),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      chatwootAccountId: true,
      chatwootInboxId: true,
      maxMessagesPerMinute: true,
      sendWindowStart: true,
      sendWindowEnd: true,
      _count: { select: { contacts: true, workflows: true, executions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const client = await prisma.client.create({
      data: { ...rest, passwordHash },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true,
      },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
    }
    throw error;
  }
}
