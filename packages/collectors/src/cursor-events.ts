import { prisma } from "@repo/db";
import { upsertUser } from "./utils";

export type CursorUsageEventRow = {
  timestamp: string;
  userEmail?: string;
  owningUser?: string;
  model: string;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheWriteTokens?: number;
    cacheReadTokens?: number;
    totalCents?: number;
  };
  chargedCents?: number;
};

export function resolveEventEmail(
  event: CursorUsageEventRow,
  fallbackEmail?: string
): string {
  return (
    event.userEmail?.trim() ||
    event.owningUser?.trim() ||
    fallbackEmail?.trim() ||
    "unknown@cursor.local"
  );
}

export async function persistCursorEvents(
  events: CursorUsageEventRow[],
  opts: {
    externalIdPrefix: "cursor:admin" | "cursor:session";
    fallbackEmail?: string;
  }
) {
  let records = 0;

  for (const event of events) {
    const ts = Number(event.timestamp);
    if (!Number.isFinite(ts)) continue;

    const createdAt = new Date(ts);
    const email = resolveEventEmail(event, opts.fallbackEmail);
    const user = await upsertUser(email);

    const tokenUsage = event.tokenUsage;
    const tokensInput = tokenUsage
      ? (tokenUsage.inputTokens ?? 0) +
        (tokenUsage.cacheWriteTokens ?? 0) +
        (tokenUsage.cacheReadTokens ?? 0)
      : 0;
    const tokensOutput = tokenUsage?.outputTokens ?? 0;
    const cost = (event.chargedCents ?? tokenUsage?.totalCents ?? 0) / 100;

    const externalId = `${opts.externalIdPrefix}:${event.timestamp}:${email}:${event.model}`;

    await prisma.usageLog.create({
      data: {
        provider: "cursor",
        model: event.model,
        tokensInput,
        tokensOutput,
        cost,
        projectName: "cursor-ide",
        userId: user.id,
        externalId,
        createdAt,
      },
    });
    records++;
  }

  return records;
}

export async function markCursorSyncSuccess(records: number) {
  await prisma.syncState.upsert({
    where: { provider: "cursor" },
    create: {
      provider: "cursor",
      lastSyncedAt: new Date(),
      lastSyncStatus: "success",
      recordsSynced: records,
    },
    update: {
      lastSyncedAt: new Date(),
      lastSyncStatus: "success",
      lastSyncError: null,
      recordsSynced: records,
    },
  });

  return { provider: "cursor" as const, records };
}
