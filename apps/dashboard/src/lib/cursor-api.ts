import type { CursorLiveDashboard } from "@repo/collectors";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type { CursorLiveDashboard };

export async function fetchCursorDashboard(): Promise<CursorLiveDashboard> {
  const res = await fetch(`${API_BASE}/api/cursor/dashboard`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? `Failed to fetch Cursor dashboard (${res.status})`);
  }
  return body as CursorLiveDashboard;
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function formatPercent(n: number, digits = 1) {
  return `${n.toFixed(digits)}%`;
}

export function formatChartDay(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function membershipLabel(t: string) {
  switch (t) {
    case "pro_plus":
      return "Pro Plus";
    case "pro":
      return "Pro";
    case "business":
      return "Business";
    case "free":
      return "Free";
    default:
      return t.replace(/_/g, " ");
  }
}
