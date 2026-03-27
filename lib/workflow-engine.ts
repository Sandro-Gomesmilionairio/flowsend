import { prisma } from "@/lib/prisma";
import { calculateSendTime } from "@/lib/throttle";
import { replaceVariables, durationToMs, resolveRelativeTime } from "@/lib/variables";
import { createChatwootClient } from "@/lib/chatwoot";

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function nextBusinessWindowStart(windowStart: string, windowEnd: string): Date {
  const startMins = parseTimeToMinutes(windowStart);
  const endMins = parseTimeToMinutes(windowEnd);
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const result = new Date(now);
  result.setSeconds(0, 0);
  result.setMilliseconds(0);
  result.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
  // If before window start today, schedule for today's window start (already set above)
  // If after window end, schedule for next day's window start
  if (currentMins >= endMins) {
    result.setDate(result.getDate() + 1);
  }
  // If already inside business hours this path shouldn't be called, but just in case return now
  if (currentMins >= startMins && currentMins < endMins) {
    return now;
  }
  return result;
}

export type WaitMode =
  | { mode: "duration"; duration: number; unit: "minutes" | "hours" | "days" }
  | { mode: "datetime"; datetime: string }
  | { mode: "relative"; from: string; duration: number; unit: "minutes" | "hours" | "days" };

export interface WorkflowNode {
  id: string;
  type: "trigger" | "wait" | "message" | "condition" | "tag";
  config: Record<string, unknown>;
  nextId: string | null;
}

export async function startWorkflowForContact(
  workflowId: string,
  contactId: string,
  clientId: string
): Promise<void> {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow || !workflow.isActive) return;

  const nodes = workflow.nodes as unknown as WorkflowNode[];
  const triggerNode = nodes.find((n) => n.type === "trigger");

  if (!triggerNode) {
    console.warn(
      `[Engine] Workflow ${workflowId} has no trigger node — skipping execution for contact ${contactId}`
    );
    return;
  }

  if (!triggerNode.nextId) {
    console.warn(
      `[Engine] Workflow ${workflowId} trigger node has no connected next node — nothing to execute for contact ${contactId}`
    );
    return;
  }

  // Create execution starting at the first real node after trigger
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      contactId,
      clientId,
      status: "RUNNING",
      currentNodeId: triggerNode.nextId,
    },
  });

  await processNextNode(execution.id, triggerNode.nextId, nodes);
}

export async function processNextNode(
  executionId: string,
  nodeId: string | null,
  nodes?: WorkflowNode[]
): Promise<void> {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: {
      workflow: true,
      contact: true,
      client: true,
    },
  });

  if (!execution || execution.status === "CANCELLED" || execution.status === "FAILED") {
    return;
  }

  if (!nodeId) {
    // Workflow completed
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return;
  }

  const allNodes = (nodes || (execution.workflow.nodes as unknown as WorkflowNode[]));
  const node = allNodes.find((n) => n.id === nodeId);

  if (!node) {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: "FAILED" },
    });
    return;
  }

  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: { currentNodeId: nodeId, status: "RUNNING" },
  });

  try {
    switch (node.type) {
      case "wait":
        await handleWaitNode(execution, node, allNodes);
        break;
      case "message":
        await handleMessageNode(execution, node, allNodes);
        break;
      default:
        // Skip unknown node types and move to next
        await processNextNode(executionId, node.nextId, allNodes);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.executionLog.create({
      data: {
        executionId,
        nodeId: node.id,
        nodeType: node.type,
        status: "error",
        message,
      },
    });
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: "FAILED" },
    });
  }
}

async function handleWaitNode(
  execution: any,
  node: WorkflowNode,
  allNodes: WorkflowNode[]
): Promise<void> {
  const config = node.config as WaitMode;
  let scheduledAt: Date;

  if (config.mode === "duration") {
    // Duration wait is literal — no business hours adjustment here.
    // Business hours are enforced at the message node when actually sending.
    const ms = durationToMs(config.duration, config.unit);
    const jitterMs = Math.random() * 5_000; // small jitter to avoid thundering herd
    scheduledAt = new Date(Date.now() + ms + jitterMs);
  } else if (config.mode === "datetime") {
    scheduledAt = new Date(config.datetime);
  } else if (config.mode === "relative") {
    const customFields = (execution.contact.customFields as Record<string, unknown>) || {};
    const baseTime = resolveRelativeTime(
      config.from,
      config.duration,
      config.unit,
      customFields
    );
    scheduledAt = await calculateSendTime(baseTime, execution.clientId, {
      maxMessagesPerMinute: execution.client.maxMessagesPerMinute,
      sendWindowStart: execution.client.sendWindowStart,
      sendWindowEnd: execution.client.sendWindowEnd,
    });
  } else {
    scheduledAt = new Date();
  }

  await prisma.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: "WAITING",
      scheduledAt,
      currentNodeId: node.id,
    },
  });

  await prisma.executionLog.create({
    data: {
      executionId: execution.id,
      nodeId: node.id,
      nodeType: "wait",
      status: "scheduled",
      message: `Scheduled for ${scheduledAt.toISOString()}`,
    },
  });

  // Schedule via pg-boss (will be picked up by worker)
  // The worker polls WAITING executions and processes them at scheduledAt
}

async function handleMessageNode(
  execution: any,
  node: WorkflowNode,
  allNodes: WorkflowNode[]
): Promise<void> {
  // Enforce business hours: if outside send window, reschedule this node for next window start
  const { sendWindowStart, sendWindowEnd } = execution.client;
  if (sendWindowStart && sendWindowEnd) {
    const startMins = parseTimeToMinutes(sendWindowStart);
    const endMins = parseTimeToMinutes(sendWindowEnd);
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const outsideHours = currentMins < startMins || currentMins >= endMins;

    if (outsideHours) {
      const scheduledAt = nextBusinessWindowStart(sendWindowStart, sendWindowEnd);
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: "WAITING", scheduledAt, currentNodeId: node.id },
      });
      await prisma.executionLog.create({
        data: {
          executionId: execution.id,
          nodeId: node.id,
          nodeType: "message",
          status: "scheduled",
          message: `Outside business hours — rescheduled for ${scheduledAt.toISOString()}`,
        },
      });
      return;
    }
  }

  const template = node.config.template as string;

  const message = replaceVariables(template, {
    contact: {
      name: execution.contact.name,
      phone: execution.contact.phone,
      email: execution.contact.email,
      customFields: execution.contact.customFields as Record<string, unknown>,
    },
    client: {
      name: execution.client.name,
    },
  });

  // Send via Chatwoot
  const { chatwootAccountId, chatwootApiToken, chatwootInboxId } = execution.client;

  if (!chatwootAccountId || !chatwootApiToken || !chatwootInboxId) {
    throw new Error("Chatwoot credentials not configured");
  }

  const chatwoot = createChatwootClient(
    chatwootAccountId,
    chatwootApiToken,
    chatwootInboxId
  );

  const result = await chatwoot.sendWhatsAppMessage(
    execution.contact.name,
    execution.contact.phone,
    message,
    execution.contact.email || undefined
  );

  // Update contact with Chatwoot IDs
  await prisma.contact.update({
    where: { id: execution.contactId },
    data: {
      chatwootContactId: result.contactId,
      chatwootConversationId: result.conversationId,
    },
  });

  await prisma.executionLog.create({
    data: {
      executionId: execution.id,
      nodeId: node.id,
      nodeType: "message",
      status: "sent",
      message: `Message sent to ${execution.contact.phone}`,
      data: { message, chatwootConversationId: result.conversationId },
    },
  });

  // Move to next node
  await processNextNode(execution.id, node.nextId, allNodes);
}
