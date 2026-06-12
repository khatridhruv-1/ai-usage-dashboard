"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, RefreshCw } from "lucide-react";
import type { CursorLiveDashboard } from "@/lib/cursor-api";
import {
  fetchCursorDashboard,
  formatShortDate,
  membershipLabel,
} from "@/lib/cursor-api";
import { CursorReportContent } from "./cursor-report-content";
import { Sidebar } from "./sidebar";

const REFRESH_MS = 5 * 60 * 1000;
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function CursorDashboardView() {
  const [data, setData] = useState<CursorLiveDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchCursorDashboard();
      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const billingLabel = useMemo(() => {
    if (!data) return "";
    const s = data.summary.billingCycle.start;
    const e = data.summary.billingCycle.end;
    return `${formatShortDate(s)} – ${formatShortDate(e)}`;
  }, [data]);

  const downloadScreenshot = useCallback(async () => {
    setCapturing(true);
    setScreenshotError(null);
    try {
      const res = await fetch(`${API_BASE}/api/cursor/screenshot`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Screenshot failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `cursor-usage-${new Date().toISOString().slice(0, 10)}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setScreenshotError(e instanceof Error ? e.message : "Screenshot failed");
    } finally {
      setCapturing(false);
    }
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex flex-1 flex-col gap-6 p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--color-muted)]">Management report · Live from Cursor</p>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="gradient-text">Cursor Usage Report</span>
            </h1>
            {data && (
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {membershipLabel(data.summary.membershipType)} plan · {billingLabel}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void downloadScreenshot()}
              disabled={capturing || loading || !data}
              className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <Camera className={`h-4 w-4 ${capturing ? "animate-pulse" : ""}`} />
              {capturing ? "Capturing…" : "Download screenshot"}
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh data
            </button>
          </div>
        </header>

        {error ? (
          <div className="glass-card border border-red-500/30 bg-red-500/10 p-6">
            <p className="font-medium text-red-300">Could not load Cursor data</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{error}</p>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Ensure CURSOR_SESSION_TOKEN is set in apps/api/.env and is not expired. For screenshots,
              run <code className="text-violet-300">npm run screenshot:cursor</code> with the
              dashboard and API running.
            </p>
          </div>
        ) : loading && !data ? (
          <div className="glass-card p-12 text-center text-[var(--color-muted)]">
            Loading Cursor usage report…
          </div>
        ) : data && lastUpdated ? (
          <>
            {screenshotError && (
              <div className="glass-card border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                Screenshot failed: {screenshotError}
              </div>
            )}
            <CursorReportContent data={data} />
          </>
        ) : null}
      </main>
    </div>
  );
}
