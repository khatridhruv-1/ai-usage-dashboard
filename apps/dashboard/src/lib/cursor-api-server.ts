import type { CursorFetchOptions, CursorLiveDashboard } from "@repo/collectors";
import { getApiBaseUrl } from "@/lib/env";

export async function fetchCursorDashboardServer(
  opts?: CursorFetchOptions,
): Promise<CursorLiveDashboard> {
  const headers: Record<string, string> = {};
  if (opts?.sessionToken) headers["x-cursor-session-token"] = opts.sessionToken;
  if (opts?.displayName) headers["x-cursor-display-name"] = opts.displayName;
  if (opts?.email) headers["x-cursor-email"] = opts.email;

  const res = await fetch(`${getApiBaseUrl()}/api/cursor/dashboard`, {
    cache: "no-store",
    headers,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? `Failed to fetch Cursor dashboard (${res.status})`);
  }
  return body as CursorLiveDashboard;
}
