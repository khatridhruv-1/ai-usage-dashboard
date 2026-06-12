import type { Request } from "express";
import type { CursorFetchOptions } from "@repo/collectors";

export function cursorContextFromRequest(req: Request): CursorFetchOptions {
  return {
    sessionToken: req.header("x-cursor-session-token")?.trim(),
    displayName: req.header("x-cursor-display-name")?.trim(),
    email: req.header("x-cursor-email")?.trim(),
  };
}

export function hasCursorSession(req: Request): boolean {
  return Boolean(
    cursorContextFromRequest(req).sessionToken || process.env.CURSOR_SESSION_TOKEN?.trim(),
  );
}
