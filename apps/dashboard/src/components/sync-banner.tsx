"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Radio, AlertCircle } from "lucide-react";
import { formatReportTimestamp } from "@repo/analytics";
import { clientApiPath } from "@/lib/env";

type SyncStatus = {
  liveDataEnabled: boolean;
  config: {
    claude: boolean;
    cursor: boolean;
    cursorAdmin?: boolean;
    cursorSession?: boolean;
    syncDays: number;
  };
  providers: {
    claude: {
      lastSyncedAt: string | null;
      lastSyncStatus: string;
      lastSyncError: string | null;
      recordsSynced: number;
    } | null;
    cursor: {
      lastSyncedAt: string | null;
      lastSyncStatus: string;
      lastSyncError: string | null;
      recordsSynced: number;
    } | null;
  };
};

function formatTime(iso: string | null) {
  if (!iso) return "Never";
  return formatReportTimestamp(iso);
}

export function SyncBanner() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(clientApiPath("/api/sync/status"));
      if (res.ok) setStatus(await res.json());
    } catch {
      /* API offline */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN;
      if (token) headers["x-internal-token"] = token;

      const res = await fetch(clientApiPath("/api/sync/run"), {
        method: "POST",
        headers,
        body: JSON.stringify({ clearSeed: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      await load();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (!status) return null;

  const live = status.liveDataEnabled;
  const claudeOk = status.providers.claude?.lastSyncStatus === "success";
  const cursorOk = status.providers.cursor?.lastSyncStatus === "success";

  const cursorSource = status.config.cursorAdmin
    ? "Enterprise API"
    : status.config.cursorSession
      ? "session token"
      : "not configured";

  return (
    <div
      className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
        live && (claudeOk || cursorOk)
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-amber-500/30 bg-amber-500/10"
      }`}
    >
      <div className="flex items-start gap-3">
        {live ? (
          <Radio className="mt-0.5 h-4 w-4 text-emerald-400" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 text-amber-400" />
        )}
        <div>
          <p className="text-sm font-medium">
            {live ? "Live sync configured" : "Demo data — sync not configured"}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            Claude: {status.config.claude ? (claudeOk ? `✓ ${status.providers.claude?.recordsSynced} records` : status.providers.claude?.lastSyncError ?? "pending") : "no key"}
            {" · "}
            Cursor ({cursorSource}):{" "}
            {status.config.cursor
              ? cursorOk
                ? `✓ ${status.providers.cursor?.recordsSynced} records`
                : status.providers.cursor?.lastSyncError ?? "pending"
              : "not configured"}
          </p>
          {live && (
            <p className="text-xs text-[var(--color-muted)]">
              Last sync — Claude: {formatTime(status.providers.claude?.lastSyncedAt ?? null)}
              {" · "}
              Cursor: {formatTime(status.providers.cursor?.lastSyncedAt ?? null)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-400">{error}</span>}
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || !live}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>
    </div>
  );
}
