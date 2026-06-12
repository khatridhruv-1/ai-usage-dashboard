import type { CursorLiveDashboard } from "@repo/collectors";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function fetchCursorDashboardServer(): Promise<CursorLiveDashboard> {
  const res = await fetch(`${API_BASE}/api/cursor/dashboard`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? `Failed to fetch Cursor dashboard (${res.status})`);
  }
  return body as CursorLiveDashboard;
}
