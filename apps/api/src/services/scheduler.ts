import cron from "node-cron";
import { getSyncConfig, runLiveSync } from "@repo/collectors";

export function startSyncScheduler() {
  if (process.env.SYNC_ENABLED !== "true") return;

  const config = getSyncConfig();
  if (!config.claude && !config.cursor) {
    console.warn("[sync] SYNC_ENABLED but no sync credentials configured — skipping scheduler");
    return;
  }

  const schedule = process.env.SYNC_CRON ?? "0 * * * *";
  console.log(`[sync] Scheduler active: ${schedule}`);

  cron.schedule(schedule, () => {
    console.log(`[sync] Running scheduled live sync at ${new Date().toISOString()}`);
    runLiveSync().catch((err) => console.error("[sync] Scheduled sync failed:", err));
  });
}

export async function runStartupSync() {
  if (process.env.SYNC_ON_START !== "true") return;

  const config = getSyncConfig();
  if (!config.claude && !config.cursor) return;

  console.log("[sync] Running startup live sync...");
  try {
    const result = await runLiveSync({ clearSeed: process.env.CLEAR_SEED_ON_SYNC === "true" });
    console.log("[sync] Startup sync complete:", result);
  } catch (err) {
    console.error("[sync] Startup sync failed:", err);
  }
}
