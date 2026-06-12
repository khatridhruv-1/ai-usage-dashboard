import type { DailyUsageResponse } from "@repo/analytics";
import { getApiBaseUrl } from "@/lib/env";

export async function fetchDailyUsage(date?: string): Promise<DailyUsageResponse> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);

  const url = `${getApiBaseUrl()}/api/usage/daily${params.size ? `?${params}` : ""}`;
  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    throw new Error(`Failed to fetch usage: ${res.status}`);
  }

  return res.json();
}

export function getReportUrl(date?: string, token?: string) {
  const base = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3000";
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (token) params.set("token", token);
  const qs = params.size ? `?${params}` : "";
  return `${base}/report/daily${qs}`;
}
