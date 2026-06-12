import { readFile } from "fs/promises";
import { captureCursorReport } from "./capture-cursor";

const API_BASE = process.env.API_URL ?? "http://localhost:4000";
const TOKEN = process.env.INTERNAL_API_TOKEN;

function teamHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (TOKEN) headers["x-internal-token"] = TOKEN;
  if (process.env.CURSOR_SESSION_TOKEN?.trim()) {
    headers["x-cursor-session-token"] = process.env.CURSOR_SESSION_TOKEN.trim();
  }
  if (process.env.CURSOR_DISPLAY_NAME?.trim()) {
    headers["x-cursor-display-name"] = process.env.CURSOR_DISPLAY_NAME.trim();
  }
  if (process.env.CURSOR_EMAIL?.trim()) {
    headers["x-cursor-email"] = process.env.CURSOR_EMAIL.trim();
  }
  return headers;
}

async function apiPost(path: string, body: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: teamHeaders(),
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
  const result = await apiPost("/api/cursor/report/complete", {
    screenshotBase64,
    displayName: process.env.CURSOR_DISPLAY_NAME?.trim(),
    email: process.env.CURSOR_EMAIL?.trim(),
    googleChatWebhookUrl: process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim(),
  });

  console.log("Cursor pipeline complete:", JSON.stringify(result, null, 2));
  return result;
}
