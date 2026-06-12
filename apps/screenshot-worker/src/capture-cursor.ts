import { config as loadEnv } from "dotenv";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const workerDir = dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  join(workerDir, "../.env"),
  join(workerDir, "../../.env"),
  join(workerDir, "../../../.env"),
  join(workerDir, "../../../apps/api/.env"),
  join(process.cwd(), ".env"),
  join(process.cwd(), "apps/api/.env"),
];

for (const path of envCandidates) {
  if (existsSync(path)) loadEnv({ path, override: false });
}

const VIEWPORT_WIDTH = 1600;

function buildCursorReportUrl() {
  const base = process.env.DASHBOARD_URL ?? "http://localhost:3000";
  const params = new URLSearchParams();
  const token = process.env.REPORT_ACCESS_TOKEN;
  if (token) params.set("token", token);
  const query = params.toString();
  return `${base}/report/cursor${query ? `?${query}` : ""}`;
}

function defaultOutputPath() {
  return (
    process.env.CURSOR_SCREENSHOT_OUTPUT_PATH ??
    join(dirname(fileURLToPath(import.meta.url)), "..", "cursor-report.png")
  );
}

export async function captureCursorReport(): Promise<string> {
  const reportUrl = buildCursorReportUrl();
  const outputPath = defaultOutputPath();

  console.log("Opening Cursor report:", reportUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: VIEWPORT_WIDTH, height: 900 },
  });

  try {
    await page.goto(reportUrl, { waitUntil: "load", timeout: 120_000 });

    const status = await page.waitForSelector(".report-ready, .report-failed", {
      timeout: 120_000,
      state: "attached",
    });
    const className = (await status.getAttribute("class")) ?? "";
    if (className.includes("report-failed")) {
      const error =
        (await status.getAttribute("data-error")) ??
        (await page.locator(".report-cursor-capture").textContent()) ??
        "Unknown report page error";
      throw new Error(error.trim());
    }
    // Allow Recharts client components to hydrate and finish layout
    await page.waitForTimeout(2_500);

    await page.screenshot({
      path: outputPath,
      fullPage: true,
      type: "png",
    });

    if (!existsSync(outputPath)) {
      throw new Error(`Screenshot was not written to ${outputPath}`);
    }

    console.log("Cursor screenshot saved:", outputPath);
    return outputPath;
  } finally {
    await browser.close();
  }
}
