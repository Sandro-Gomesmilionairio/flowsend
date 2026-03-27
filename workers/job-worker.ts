/**
 * Worker for processing scheduled workflow executions.
 * Run this as a separate process: npm run worker
 */

import { PrismaClient } from "@prisma/client";
import { processNextNode } from "../lib/workflow-engine";

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = 10_000; // Check every 10 seconds
const STUCK_RUNNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

async function recoverStuckExecutions() {
  const stuckBefore = new Date(Date.now() - STUCK_RUNNING_THRESHOLD_MS);

  const stuck = await prisma.workflowExecution.updateMany({
    where: {
      status: "RUNNING",
      updatedAt: { lte: stuckBefore },
    },
    data: { status: "FAILED" },
  });

  if (stuck.count > 0) {
    console.log(`[Worker] Recovered ${stuck.count} stuck RUNNING execution(s) → FAILED`);
  }
}

async function processReadyExecutions() {
  const now = new Date();

  // Find WAITING executions whose scheduledAt has passed
  const candidates = await prisma.workflowExecution.findMany({
    where: {
      status: "WAITING",
      scheduledAt: { lte: now },
    },
    take: 10,
    orderBy: { scheduledAt: "asc" },
    select: { id: true },
  });

  if (candidates.length === 0) return;

  console.log(`[Worker] Found ${candidates.length} candidate(s), attempting to claim...`);

  for (const { id } of candidates) {
    try {
      // Atomic claim: only succeeds if status is still WAITING
      const claimed = await prisma.workflowExecution.updateMany({
        where: { id, status: "WAITING" },
        data: { status: "RUNNING" },
      });

      if (claimed.count === 0) {
        // Another worker already claimed this execution
        continue;
      }

      // Fetch full data now that we own it
      const execution = await prisma.workflowExecution.findUnique({
        where: { id },
      });

      if (!execution) continue;

      const workflow = await prisma.workflow.findUnique({
        where: { id: execution.workflowId },
      });

      if (!workflow) {
        await prisma.workflowExecution.update({
          where: { id },
          data: { status: "FAILED" },
        });
        continue;
      }

      const nodes = workflow.nodes as any[];
      const currentNode = nodes.find((n: any) => n.id === execution.currentNodeId);

      if (!currentNode) {
        await prisma.workflowExecution.update({
          where: { id },
          data: { status: "FAILED" },
        });
        continue;
      }

      // If current node is a wait node, advance to the next node.
      // If current node is anything else (e.g. message rescheduled for business hours), re-process it.
      const nextNodeId = currentNode.type === "wait" ? currentNode.nextId : currentNode.id;
      await processNextNode(id, nextNodeId, nodes);
      console.log(`[Worker] Processed execution ${id}`);
    } catch (error) {
      console.error(`[Worker] Error processing execution ${id}:`, error);
      await prisma.workflowExecution
        .update({ where: { id }, data: { status: "FAILED" } })
        .catch(() => {});
    }
  }
}

async function startWorker() {
  console.log(
    "[Worker] FlowSend worker started. Polling every",
    POLL_INTERVAL_MS / 1000,
    "seconds..."
  );

  const poll = async () => {
    try {
      await recoverStuckExecutions();
      await processReadyExecutions();
    } catch (error) {
      console.error("[Worker] Poll error (will retry):", error);
    }
  };

  // Initial poll with delay to allow DB to be ready
  setTimeout(poll, 5000);
  setInterval(poll, POLL_INTERVAL_MS);
}

startWorker().catch((err) => {
  console.error("[Worker] Fatal startup error:", err);
  // Don't crash — keep container alive so Coolify doesn't loop-restart
  setInterval(() => {}, 60_000);
});

process.on("SIGINT", async () => {
  console.log("[Worker] Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});
