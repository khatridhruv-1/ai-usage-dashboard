import "dotenv/config";
import cors from "cors";
import express from "express";
import { usageRouter } from "./routes/usage";
import { reportRouter } from "./routes/report";
import { googleChatRouter } from "./routes/google-chat";
import { syncRouter } from "./routes/sync";
import { cursorRouter } from "./routes/cursor";
import { runStartupSync, startSyncScheduler } from "./services/scheduler";

const app = express();
const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-usage-api" });
});

app.use("/api/usage", usageRouter);
app.use("/api/report", reportRouter);
app.use("/api/google-chat", googleChatRouter);
app.use("/api/sync", syncRouter);
app.use("/api/cursor", cursorRouter);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  startSyncScheduler();
  void runStartupSync();
});
