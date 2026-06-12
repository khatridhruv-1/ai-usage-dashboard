import { Router } from "express";
import { z } from "zod";
import {
  aggregateDailyUsage,
  parseReportDate,
} from "@repo/analytics";
import { prisma } from "@repo/db";
import { requireInternalToken } from "../middleware/auth";

export const usageRouter: Router = Router();

usageRouter.get("/daily", async (req, res) => {
  try {
    const date = parseReportDate(req.query.date as string | undefined);
    const data = await aggregateDailyUsage(date);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch daily usage" });
  }
});

const logSchema = z.object({
  provider: z.enum(["cursor", "claude", "openai"]),
  model: z.string().min(1),
  tokensInput: z.number().int().nonnegative().default(0),
  tokensOutput: z.number().int().nonnegative().default(0),
  cost: z.number().nonnegative().default(0),
  projectName: z.string().optional(),
  userEmail: z.string().email().optional(),
});

usageRouter.post("/log", requireInternalToken, async (req, res) => {
  try {
    const body = logSchema.parse(req.body);
    let userId: string | undefined;

    if (body.userEmail) {
      const user = await prisma.user.upsert({
        where: { email: body.userEmail },
        create: { email: body.userEmail, name: body.userEmail.split("@")[0] },
        update: {},
      });
      userId = user.id;
    }

    const log = await prisma.usageLog.create({
      data: {
        provider: body.provider,
        model: body.model,
        tokensInput: body.tokensInput,
        tokensOutput: body.tokensOutput,
        cost: body.cost,
        projectName: body.projectName,
        userId,
      },
    });

    res.status(201).json(log);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to log usage" });
  }
});
