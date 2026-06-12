import { Router } from "express";
import {
  fetchCursorLiveDashboard,
  isCursorSessionConfigured,
} from "@repo/collectors";
import { requireInternalToken } from "../middleware/auth";
import { captureCursorScreenshot } from "../services/cursor-screenshot";
import { sendCursorGoogleChatReport } from "../services/google-chat";
import { uploadCursorScreenshotToR2 } from "../services/r2";

export const cursorRouter: Router = Router();

cursorRouter.get("/dashboard", async (_req, res) => {
  if (!isCursorSessionConfigured()) {
    res.status(400).json({
      error:
        "CURSOR_SESSION_TOKEN is not configured. Add it to apps/api/.env to enable live Cursor dashboard.",
    });
    return;
  }

  try {
    const data = await fetchCursorLiveDashboard();
    const displayName = process.env.CURSOR_DISPLAY_NAME?.trim();
    if (displayName) {
      data.user = {
        id: data.user?.id ?? 0,
        name: displayName,
        email: data.user?.email ?? "",
      };
    }
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
  const { screenshotBase64, screenshotPath } = req.body ?? {};

  if (!screenshotBase64 && !screenshotPath) {
    res.status(400).json({ error: "screenshotBase64 or screenshotPath is required" });
    return;
  }

  try {
    const generatedAt = new Date();
    const screenshotUrl = await uploadCursorScreenshotToR2({
      date: generatedAt,
      base64: screenshotBase64,
      filePath: screenshotPath,
    });

    const displayName = process.env.CURSOR_DISPLAY_NAME?.trim();
    let email: string | undefined;
    if (isCursorSessionConfigured()) {
      try {
        const dashboard = await fetchCursorLiveDashboard();
        email = dashboard.user?.email ?? undefined;
      } catch {
        // Screenshot already captured; posting without live email is fine.
      }
    }

    let chatSent = false;
    if (process.env.GOOGLE_CHAT_WEBHOOK_URL) {
      await sendCursorGoogleChatReport({
        screenshotUrl,
        displayName: displayName || undefined,
        email,
        generatedAt: generatedAt.toLocaleString("en-IN", {
          timeZone: process.env.CRON_TIMEZONE ?? "Asia/Kolkata",
        }),
      });
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
