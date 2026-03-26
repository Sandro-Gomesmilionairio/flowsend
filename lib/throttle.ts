import { prisma } from "@/lib/prisma";

interface ClientThrottleConfig {
  maxMessagesPerMinute: number;
  sendWindowStart: string; // "09:00"
  sendWindowEnd: string;   // "18:00"
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function adjustToBusinessWindow(
  date: Date,
  windowStart: string,
  windowEnd: string
): Date {
  const startMinutes = parseTimeToMinutes(windowStart);
  const endMinutes = parseTimeToMinutes(windowEnd);

  const result = new Date(date);
  const currentMinutes = result.getHours() * 60 + result.getMinutes();

  if (currentMinutes < startMinutes) {
    // Before window: move to window start today
    result.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  } else if (currentMinutes >= endMinutes) {
    // After window: move to next day's window start
    result.setDate(result.getDate() + 1);
    result.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  }

  return result;
}

export async function calculateSendTime(
  baseTime: Date,
  clientId: string,
  config: ClientThrottleConfig
): Promise<Date> {
  const minGapMs = (60 / config.maxMessagesPerMinute) * 1000; // ms between messages

  // Count existing scheduled executions around baseTime (±1 day)
  const windowStart = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000);

  const existingCount = await prisma.workflowExecution.count({
    where: {
      clientId,
      status: "WAITING",
      scheduledAt: {
        gte: baseTime,
        lte: windowEnd,
      },
    },
  });

  const offsetMs = existingCount * minGapMs;
  const jitterMs = Math.random() * 15_000; // 0-15s random jitter

  let sendTime = new Date(baseTime.getTime() + offsetMs + jitterMs);
  sendTime = adjustToBusinessWindow(
    sendTime,
    config.sendWindowStart,
    config.sendWindowEnd
  );

  return sendTime;
}
