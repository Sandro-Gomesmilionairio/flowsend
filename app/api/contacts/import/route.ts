import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ImportRow {
  name: string;
  phone: string;
  email?: string;
  customFields?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const rows: ImportRow[] = body.contacts;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Nenhum contato enviado" }, { status: 400 });
  }

  if (rows.length > 5000) {
    return NextResponse.json({ error: "Máximo de 5000 contatos por importação" }, { status: 400 });
  }

  const clientId = session.user.id;
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.name?.trim() || !row.phone?.trim()) {
      skipped++;
      continue;
    }

    try {
      await prisma.contact.upsert({
        where: { clientId_phone: { clientId, phone: row.phone.trim() } },
        update: {
          name: row.name.trim(),
          ...(row.email && { email: row.email.trim() }),
          ...(row.customFields && { customFields: row.customFields }),
        },
        create: {
          clientId,
          name: row.name.trim(),
          phone: row.phone.trim(),
          email: row.email?.trim() || null,
          customFields: row.customFields || {},
        },
      });
      created++;
    } catch (error: any) {
      errors.push(`${row.name}: ${error.message}`);
      skipped++;
    }
  }

  return NextResponse.json({ created, skipped, errors: errors.slice(0, 10) });
}
