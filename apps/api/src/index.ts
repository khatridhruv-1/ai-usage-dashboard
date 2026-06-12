import "dotenv/config";
import express from "express";

process.on("uncaughtException", (err) => {
  console.error("[api] uncaughtException:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("[api] unhandledRejection:", err);
});

const app = express();
const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-usage-api" });
});

app.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`);

  import("./bootstrap.js")
    .then(({ bootstrap }) => bootstrap(app))
    .catch((err) => {
      console.error("[api] Failed to load routes (health still works):", err);
    });
});
