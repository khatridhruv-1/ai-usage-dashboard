import "dotenv/config";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const VIEWPORT = { width: 1600, height: 1200 };

function buildReportUrl(date?: string) {
  const base = process.env.DASHBOARD_URL ?? "http://localhost:3000";
  const params = new URLSearchParams();
  params.set("date", date ?? "today");
  const token = process.env.REPORT_ACCESS_TOKEN;
  if (token) params.set("token", token);
  return `${base}/report/daily?${params}`;
}

export async function captureDailyReport(date?: string): Promise<string> {
  const reportUrl = buildReportUrl(date);
  const outputPath =
    process.env.SCREENSHOT_OUTPUT_PATH ??
    join(dirname(fileURLToPath(import.meta.url)), "..", "daily-report.png");

  console.log("Opening report:", reportUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });

  try {
    await page.goto(reportUrl, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector(".report-ready", { timeout: 30_000 });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: outputPath,
      fullPage: false,
      type: "png",
    });

    console.log("Screenshot saved:", outputPath);
    return outputPath;
  } finally {
    await browser.close();
  }
}
