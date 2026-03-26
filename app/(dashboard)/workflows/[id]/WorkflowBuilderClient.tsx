"use client";

import { WorkflowCanvas } from "@/components/workflow-builder/WorkflowCanvas";

interface WorkflowBuilderClientProps {
  workflowId: string;
  initialNodes: any[];
  triggerTagId?: string | null;
  tags: Array<{ id: string; name: string; color: string }>;
}

export default function WorkflowBuilderClient({
  workflowId,
  initialNodes,
  triggerTagId,
  tags,
}: WorkflowBuilderClientProps) {
  const handleSave = async (nodes: any[]) => {
    const res = await fetch(`/api/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes }),
    });
    if (!res.ok) throw new Error("Failed to save");
  };

  return (
    <WorkflowCanvas
      workflowId={workflowId}
      initialNodes={initialNodes}
      triggerTagId={triggerTagId}
      tags={tags}
      onSave={handleSave}
    />
  );
}
