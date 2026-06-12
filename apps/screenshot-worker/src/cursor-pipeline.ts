import { readFile } from "fs/promises";
import { captureCursorReport } from "./capture-cursor";

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

export async function runCursorPipeline() {
  console.log("Step 1: Capture Cursor report screenshot...");
  const screenshotPath = await captureCursorReport();
  const screenshotBase64 = await readFile(screenshotPath, { encoding: "base64" });

  console.log("Step 2: Upload screenshot + post to Google Chat...");
  const result = await apiPost("/api/cursor/report/complete", { screenshotBase64 });

  console.log("Cursor pipeline complete:", JSON.stringify(result, null, 2));
  return result;
}
