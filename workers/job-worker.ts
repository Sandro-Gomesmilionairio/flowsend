/**
 * pg-boss based worker for processing scheduled workflow executions.
 * Run this as a separate process: npm run worker
 * Or include in Next.js custom server.
 */

import { PrismaClient } from "@prisma/client";
import { processNextNode } from "../lib/workflow-engine";

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = 10_000; // Check every 10 seconds

async function processReadyExecutions() {
  const now = new Date();

  // Find WAITING executions whose scheduledAt has passed
  const readyExecutions = await prisma.workflowExecution.findMany({
    where: {
      status: "WAITING",
      scheduledAt: {
        lte: now,
      },
    },
    take: 10, // Process in batches
  });

  if (readyExecutions.length > 0) {
    console.log(`[Worker] Processing ${readyExecutions.length} ready executions`);
  }

  for (const execution of readyExecutions) {
    try {
      // Move to RUNNING
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: "RUNNING" },
      });

      // Get the workflow to find the next node
      const workflow = await prisma.workflow.findUnique({
        where: { id: execution.workflowId },
      });

      if (!workflow) {
        await prisma.workflowExecution.update({
          where: { id: execution.id },
          data: { status: "FAILED" },
        });
        continue;
      }

      const nodes = workflow.nodes as any[];
      const currentNode = nodes.find((n: any) => n.id === execution.currentNodeId);

      if (!currentNode) {
        await prisma.workflowExecution.update({
          where: { id: execution.id },
          data: { status: "FAILED" },
        });
        continue;
      }

      // Process the next node after the wait node
      await processNextNode(execution.id, currentNode.nextId, nodes);

      console.log(`[Worker] Processed execution ${execution.id}`);
    } catch (error) {
      console.error(`[Worker] Error processing execution ${execution.id}:`, error);
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: "FAILED" },
      }).catch(() => {});
    }
  }
}

async function startWorker() {
  console.log("[Worker] FlowSend worker started. Polling every", POLL_INTERVAL_MS / 1000, "seconds...");

  // Poll at regular intervals (don't crash on error)
  const poll = async () => {
    try {
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

// Handle graceful shutdown
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
