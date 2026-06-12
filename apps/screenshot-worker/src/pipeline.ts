import { readFile } from "fs/promises";
import { captureDailyReport } from "./capture";

const API_BASE = process.env.API_URL ?? "http://localhost:4000";
const TOKEN = process.env.INTERNAL_API_TOKEN;

async function apiPost(path: string, body: object) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (TOKEN) headers["x-internal-token"] = TOKEN;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function runFullPipeline(date?: string) {
  const reportDate = date ?? "today";
  console.log("Step 1: Aggregate usage...");
  await apiPost("/api/report/generate", { date: reportDate });

  console.log("Step 2: Capture screenshot...");
  const screenshotPath = await captureDailyReport(reportDate);
  const screenshotBase64 = await readFile(screenshotPath, { encoding: "base64" });

  console.log("Step 3: Upload + Google Chat...");
  const result = await apiPost("/api/report/complete", {
    date: reportDate,
    screenshotBase64,
  });

  console.log("Pipeline complete:", JSON.stringify(result, null, 2));
  return result;
}
