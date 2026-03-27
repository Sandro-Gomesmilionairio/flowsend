import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startWorkflowForContact } from "@/lib/workflow-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tagId } = await req.json();

  // Verify contact belongs to client
  const contact = await prisma.contact.findFirst({
    where: { id: params.id, clientId: session.user.id },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  // Verify tag belongs to client
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, clientId: session.user.id },
  });
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  // Apply tag (upsert to avoid duplicates)
  try {
    await prisma.contactTag.create({
      data: {
        contactId: params.id,
        tagId,
        appliedBy: session.user.email || "system",
      },
    });
  } catch (error: any) {
    if (error.code !== "P2002") throw error;
    return NextResponse.json({ error: "Tag already applied" }, { status: 409 });
  }

  // Trigger workflows that use this tag
  const workflows = await prisma.workflow.findMany({
    where: {
      clientId: session.user.id,
      triggerTagId: tagId,
      isActive: true,
    },
  });

  // Start workflows — await all, skip if active execution already exists for this contact+workflow
  let workflowsTriggered = 0;
  await Promise.allSettled(
    workflows.map(async (workflow) => {
      // Prevent duplicate executions for the same contact+workflow
      const existing = await prisma.workflowExecution.findFirst({
        where: {
          workflowId: workflow.id,
          contactId: params.id,
          status: { in: ["RUNNING", "WAITING"] },
        },
      });
      if (existing) return;

      await startWorkflowForContact(workflow.id, params.id, session.user.id);
      workflowsTriggered++;
    })
  );

  return NextResponse.json({ success: true, workflowsTriggered });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tagId } = await req.json();

  await prisma.contactTag.deleteMany({
    where: {
      contactId: params.id,
      tagId,
      contact: { clientId: session.user.id },
    },
  });

  // Cancel active executions for workflows triggered by this tag
  const workflows = await prisma.workflow.findMany({
    where: { clientId: session.user.id, triggerTagId: tagId },
    select: { id: true },
  });

  if (workflows.length > 0) {
    await prisma.workflowExecution.updateMany({
      where: {
        contactId: params.id,
        workflowId: { in: workflows.map((w) => w.id) },
        status: { in: ["RUNNING", "WAITING"] },
      },
      data: { status: "CANCELLED" },
    });
  }

  return NextResponse.json({ success: true });
}
