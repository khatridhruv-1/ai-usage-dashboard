import cors from "cors";
import type { Express } from "express";
import express from "express";
import { cursorRouter } from "./routes/cursor";
import { googleChatRouter } from "./routes/google-chat";
import { reportRouter } from "./routes/report";
import { syncRouter } from "./routes/sync";
import { usageRouter } from "./routes/usage";
import { runStartupSync, startSyncScheduler } from "./services/scheduler";

export function bootstrap(app: Express) {
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true }));
  // Full-page PNG screenshots are sent as base64 in report complete payloads
  app.use(express.json({ limit: "25mb" }));

  app.use("/api/usage", usageRouter);
  app.use("/api/report", reportRouter);
  app.use("/api/google-chat", googleChatRouter);
  app.use("/api/sync", syncRouter);
  app.use("/api/cursor", cursorRouter);

  startSyncScheduler();
  if (process.env.SYNC_ON_START === "true") {
    setTimeout(() => void runStartupSync(), 2000);
  }

  console.log("API routes loaded");
}
