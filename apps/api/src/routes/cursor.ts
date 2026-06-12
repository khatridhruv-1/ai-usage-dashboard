import { Router } from "express";
import { formatReportTimestamp } from "@repo/analytics";
import {
  fetchCursorLiveDashboard,
  isCursorSessionConfigured,
} from "@repo/collectors";
import { cursorContextFromRequest, hasCursorSession } from "../lib/cursor-context";
import { requireInternalToken } from "../middleware/auth";
import { captureCursorScreenshot } from "../services/cursor-screenshot";
import { sendCursorGoogleChatReport } from "../services/google-chat";
import { uploadCursorScreenshotToR2 } from "../services/r2";

export const cursorRouter: Router = Router();

cursorRouter.get("/dashboard", async (req, res) => {
  if (!hasCursorSession(req)) {
    res.status(400).json({
      error:
        "Cursor session not configured. Set CURSOR_SESSION_TOKEN on the API or send x-cursor-session-token.",
    });
    return;
  }

  try {
    const ctx = cursorContextFromRequest(req);
    const data = await fetchCursorLiveDashboard({
      sessionToken: ctx.sessionToken || process.env.CURSOR_SESSION_TOKEN?.trim(),
      displayName: ctx.displayName || process.env.CURSOR_DISPLAY_NAME?.trim(),
      email: ctx.email,
    });
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Cursor dashboard";
    console.error(err);
    res.status(502).json({ error: message });
  }
});

cursorRouter.get("/screenshot", async (_req, res) => {
  if (!isCursorSessionConfigured()) {
    res.status(400).json({
      error:
        "CURSOR_SESSION_TOKEN is not configured. Add it to apps/api/.env to enable Cursor screenshots.",
    });
    return;
  }

  try {
    const image = await captureCursorScreenshot();
    const filename = `cursor-usage-${new Date().toISOString().slice(0, 10)}.png`;
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(image);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to capture screenshot";
    console.error(err);
    res.status(502).json({ error: message });
  }
});

cursorRouter.post("/report/complete", requireInternalToken, async (req, res) => {
  const {
    screenshotBase64,
    screenshotPath,
    displayName: bodyDisplayName,
    email: bodyEmail,
    googleChatWebhookUrl,
  } = req.body ?? {};

  if (!screenshotBase64 && !screenshotPath) {
    res.status(400).json({ error: "screenshotBase64 or screenshotPath is required" });
    return;
  }

  try {
    const generatedAt = new Date();
    const ctx = cursorContextFromRequest(req);
    const displayName =
      bodyDisplayName?.trim() ||
      ctx.displayName ||
      process.env.CURSOR_DISPLAY_NAME?.trim();
    let email = bodyEmail?.trim() || ctx.email;

    if (!email && hasCursorSession(req)) {
      try {
        const dashboard = await fetchCursorLiveDashboard({
          sessionToken: ctx.sessionToken || process.env.CURSOR_SESSION_TOKEN?.trim(),
        });
        email = dashboard.user?.email ?? undefined;
      } catch {
        // Screenshot already captured; posting without live email is fine.
      }
    }

    const userKey = email || displayName;
    const screenshotUrl = await uploadCursorScreenshotToR2({
      date: generatedAt,
      base64: screenshotBase64,
      filePath: screenshotPath,
      userKey,
    });

    const webhook =
      googleChatWebhookUrl?.trim() || process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim();

    let chatSent = false;
    if (webhook) {
      await sendCursorGoogleChatReport(
        {
          screenshotUrl,
          displayName: displayName || undefined,
          email,
          generatedAt: formatReportTimestamp(generatedAt),
        },
        webhook,
      );
      chatSent = true;
    }

    res.json({
      success: true,
      screenshotUrl,
      chatSent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to complete Cursor report";
    console.error(err);
    res.status(500).json({ error: message });
  }
});
