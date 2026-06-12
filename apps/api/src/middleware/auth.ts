import type { Request, Response, NextFunction } from "express";

export function requireInternalToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-internal-token"] ?? req.query.token;
  const expected = process.env.INTERNAL_API_TOKEN;

  if (!expected) {
    next();
    return;
  }

  if (token !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
