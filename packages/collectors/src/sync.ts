import { prisma } from "@repo/db";
import { syncClaudeUsage, isClaudeConfigured } from "./claude";
import { syncCursorAdminUsage, isCursorAdminConfigured } from "./cursor";
import { syncCursorSessionUsage, isCursorSessionConfigured } from "./cursor-session";

export type SyncResult = {
  claude?: { records: number; error?: string };
  cursor?: { records: number; error?: string };
  clearedSeed: boolean;
};

async function clearSeedData() {
  const deleted = await prisma.usageLog.deleteMany({
    where: { externalId: null },
  });
  return deleted.count;
}

async function markSyncError(provider: string, error: string) {
  await prisma.syncState.upsert({
    where: { provider },
    create: {
      provider,
      lastSyncStatus: "error",
      lastSyncError: error,
    },
    update: {
      lastSyncStatus: "error",
      lastSyncError: error,
    },
  });
}

export function getSyncConfig() {
  const cursorAdmin = isCursorAdminConfigured();
  const cursorSession = isCursorSessionConfigured();
  return {
    claude: isClaudeConfigured(),
    cursor: cursorAdmin || cursorSession,
    cursorAdmin,
    cursorSession,
    syncDays: Number(process.env.SYNC_DAYS ?? 30),
  };
}

export async function runLiveSync(opts?: {
  days?: number;
  clearSeed?: boolean;
}): Promise<SyncResult> {
  const config = getSyncConfig();
  const result: SyncResult = { clearedSeed: false };

  if (!config.claude && !config.cursor) {
    throw new Error(
      "No live sync configured. Set CURSOR_SESSION_TOKEN (personal/Pro) and/or ANTHROPIC_ADMIN_API_KEY in apps/api/.env"
    );
  }

  if (opts?.clearSeed ?? process.env.CLEAR_SEED_ON_SYNC === "true") {
    await clearSeedData();
    result.clearedSeed = true;
  }

  const days = opts?.days ?? config.syncDays;

  if (config.claude) {
    try {
      const r = await syncClaudeUsage({ days });
      result.claude = { records: r.records };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markSyncError("claude", msg);
      result.claude = { records: 0, error: msg };
    }
  }

  if (config.cursor) {
    try {
      const r = config.cursorAdmin
        ? await syncCursorAdminUsage({ days })
        : await syncCursorSessionUsage({ days });
      result.cursor = { records: r.records };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markSyncError("cursor", msg);
      result.cursor = { records: 0, error: msg };
    }
  }

  return result;
}

export async function getSyncStatus() {
  const states = await prisma.syncState.findMany();
  const config = getSyncConfig();

  return {
    config,
    providers: {
      claude: states.find((s) => s.provider === "claude") ?? null,
      cursor: states.find((s) => s.provider === "cursor") ?? null,
    },
    liveDataEnabled: config.claude || config.cursor,
  };
}
