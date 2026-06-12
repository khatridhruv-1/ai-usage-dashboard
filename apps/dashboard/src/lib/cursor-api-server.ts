import type { CursorLiveDashboard } from "@repo/collectors";
import { getApiBaseUrl } from "@/lib/env";

export async function fetchCursorDashboardServer(): Promise<CursorLiveDashboard> {
  const res = await fetch(`${getApiBaseUrl()}/api/cursor/dashboard`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? `Failed to fetch Cursor dashboard (${res.status})`);
  }
  return body as CursorLiveDashboard;
}
