import { Router } from "express";
import {
  aggregateAndStoreDailyReport,
  formatCost,
  formatTokens,
  parseReportDate,
} from "@repo/analytics";
import { prisma } from "@repo/db";
import { requireInternalToken } from "../middleware/auth";
import { uploadScreenshotToR2 } from "../services/r2";
import { sendGoogleChatReport } from "../services/google-chat";

export const reportRouter: Router = Router();

reportRouter.post("/generate", requireInternalToken, async (req, res) => {
  try {
    const date = parseReportDate(req.body?.date ?? req.query.date as string);
    const metrics = await aggregateAndStoreDailyReport(date);

    const screenshotUrl = req.body?.screenshotUrl as string | undefined;
    const reportDate = parseReportDate(metrics.date);
    if (screenshotUrl) {
      await prisma.dailyReport.update({
        where: { date: reportDate },
        data: { screenshotUrl },
      });
    }

    res.json({
      success: true,
      date: metrics.date,
      tokens: metrics.tokens,
      cost: metrics.cost,
      topModel: metrics.topModel,
      summary: {
        tokens: formatTokens(metrics.tokens),
        cost: formatCost(metrics.cost),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

reportRouter.post("/complete", requireInternalToken, async (req, res) => {
  try {
    const { date: dateParam, screenshotBase64, screenshotPath } = req.body ?? {};
    const date = parseReportDate(dateParam);
    const metrics = await aggregateAndStoreDailyReport(date);

    let screenshotUrl: string | undefined;
    if (screenshotBase64 || screenshotPath) {
      screenshotUrl = await uploadScreenshotToR2({
        date,
        base64: screenshotBase64,
        filePath: screenshotPath,
      });
      const reportDate = parseReportDate(dateParam);
      await prisma.dailyReport.update({
        where: { date: reportDate },
        data: { screenshotUrl },
      });
    }

    const reportDate = parseReportDate(dateParam);
    const report = await prisma.dailyReport.findUnique({ where: { date: reportDate } });
    const url = screenshotUrl ?? report?.screenshotUrl;

    if (process.env.GOOGLE_CHAT_WEBHOOK_URL) {
      await sendGoogleChatReport({
        date: metrics.date,
        tokens: metrics.tokens,
        cost: metrics.cost,
        topModel: metrics.topModel,
        screenshotUrl: url ?? undefined,
      });
    }

    res.json({
      success: true,
      metrics,
      screenshotUrl: url,
      chatSent: Boolean(process.env.GOOGLE_CHAT_WEBHOOK_URL),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to complete report pipeline" });
  }
});
