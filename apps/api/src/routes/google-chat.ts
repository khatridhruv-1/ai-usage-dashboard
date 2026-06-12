import { Router } from "express";
import { z } from "zod";
import { sendGoogleChatReport } from "../services/google-chat";
import { requireInternalToken } from "../middleware/auth";

export const googleChatRouter: Router = Router();

const sendSchema = z.object({
  date: z.string(),
  tokens: z.number(),
  cost: z.number(),
  topModel: z.string().optional(),
  screenshotUrl: z.string().url().optional(),
});

googleChatRouter.post("/send", requireInternalToken, async (req, res) => {
  try {
    const body = sendSchema.parse(req.body);
    await sendGoogleChatReport(body);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to send Google Chat message" });
  }
});
