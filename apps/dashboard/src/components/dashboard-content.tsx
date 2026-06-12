"use client";

import {
  Activity,
  Bot,
  Cpu,
  DollarSign,
  FolderKanban,
  Sparkles,
} from "lucide-react";
import type { DailyUsageResponse } from "@repo/analytics";
import { formatCost, formatTokens } from "@repo/ui";
import { KpiCard } from "./kpi-card";
import { ChartsSection } from "./charts";
import { Sidebar } from "./sidebar";
import { SyncBanner } from "./sync-banner";

type Props = {
  data: DailyUsageResponse;
  mode?: "interactive" | "report";
  showReadyMarker?: boolean;
};

export function DashboardContent({ data, mode = "interactive", showReadyMarker }: Props) {
  const isReport = mode === "report";
  const claude = data.providers.find((p) => p.provider === "claude");
  const cursor = data.providers.find((p) => p.provider === "cursor");

  const content = (
    <div className={isReport ? "flex h-full flex-col gap-5 p-8" : "flex flex-1 flex-col gap-6 p-8"}>
      {!isReport && <SyncBanner />}

      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-[var(--color-muted)]">AI Usage Analytics</p>
          <h1 className={`font-bold tracking-tight ${isReport ? "text-3xl" : "text-4xl"}`}>
            <span className="gradient-text">Usage Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {new Date(data.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {!isReport && (
          <div className="glass-card px-4 py-2 text-sm text-[var(--color-muted)]">
            Top model: <span className="text-[var(--color-foreground)]">{data.topModel}</span>
          </div>
        )}
      </header>

      <div className={`grid gap-4 ${isReport ? "grid-cols-5" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"}`}>
        <KpiCard label="Total Tokens" value={formatTokens(data.tokens)} icon={Activity} compact={isReport} />
        <KpiCard label="Total Cost" value={formatCost(data.cost)} icon={DollarSign} compact={isReport} />
        <KpiCard
          label="Claude Usage"
          value={formatTokens(claude?.tokens ?? 0)}
          sub={formatCost(claude?.cost ?? 0)}
          icon={Sparkles}
          compact={isReport}
        />
        <KpiCard
          label="Cursor Usage"
          value={formatTokens(cursor?.tokens ?? 0)}
          sub={formatCost(cursor?.cost ?? 0)}
          icon={Bot}
          compact={isReport}
        />
        <KpiCard
          label="Active Projects"
          value={String(data.activeProjects)}
          icon={FolderKanban}
          compact={isReport}
        />
      </div>

      {isReport ? (
        <div className="flex flex-1 flex-col gap-4 min-h-0">
          <div className="grid grid-cols-2 gap-4 flex-[2] min-h-0">
            <ChartsSection data={data} compact onReady={() => {}} />
          </div>
          <div className="glass-card flex items-center justify-between px-6 py-4 shrink-0">
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium">Alerts & Insights</p>
                <p className="text-xs text-[var(--color-muted)]">
                  Top model: {data.topModel} · {data.team.length} active users
                </p>
              </div>
            </div>
            <div className="text-right text-sm">
              <span className="text-[var(--color-muted)]">Input / Output</span>
              <p className="font-medium">
                {formatTokens(data.tokensInput)} / {formatTokens(data.tokensOutput)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ChartsSection data={data} />
      )}

      {showReadyMarker && <div className="report-ready report-ready-marker" aria-hidden />}
    </div>
  );

  if (isReport) {
    return <div className="report-viewport relative">{content}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">{content}</main>
    </div>
  );
}
