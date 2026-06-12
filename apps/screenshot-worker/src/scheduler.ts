import "dotenv/config";
import cron from "node-cron";
import { runCursorPipeline } from "./cursor-pipeline";

const schedule = process.env.CURSOR_CRON_SCHEDULE ?? "30 19 * * 1-5";
const timezone = process.env.CRON_TIMEZONE ?? "Asia/Kolkata";

console.log(`Cursor report scheduler: ${schedule} (${timezone})`);

cron.schedule(
  schedule,
  () => {
    console.log(`[${new Date().toISOString()}] Running Cursor report pipeline...`);
    runCursorPipeline().catch((err) => console.error("Cursor pipeline failed:", err));
  },
  { timezone },
);

process.stdin.resume();
