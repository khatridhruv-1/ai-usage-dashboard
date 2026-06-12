import { Router } from "express";
import { getSyncStatus, runLiveSync } from "@repo/collectors";
import { requireInternalToken } from "../middleware/auth";

export const syncRouter: Router = Router();

syncRouter.get("/status", async (_req, res) => {
  try {
    const status = await getSyncStatus();
    res.json(status);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get sync status" });
  }
});

syncRouter.post("/run", requireInternalToken, async (req, res) => {
  try {
    const days = req.body?.days ? Number(req.body.days) : undefined;
    const clearSeed = req.body?.clearSeed === true;
    const result = await runLiveSync({ days, clearSeed });
    const status = await getSyncStatus();
    res.json({ success: true, result, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error(err);
    res.status(500).json({ error: message });
  }
});
