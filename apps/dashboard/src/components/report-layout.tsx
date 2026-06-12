"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  Cpu,
  DollarSign,
  FolderKanban,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyUsageResponse } from "@repo/analytics";
import { formatCost, formatTokens } from "@repo/ui";
import { KpiCard } from "./kpi-card";

type Props = { data: DailyUsageResponse };

export function ReportLayout({ data }: Props) {
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setChartsReady(true), 800);
    return () => clearTimeout(t);
  }, [data]);

  const claude = data.providers.find((p) => p.provider === "claude");
  const cursor = data.providers.find((p) => p.provider === "cursor");

  return (
    <div className="report-viewport relative flex flex-col gap-4 p-8">
      <header>
        <p className="text-sm text-[var(--color-muted)]">AI Usage Analytics</p>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Daily Report</span>
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {new Date(data.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <div className="grid grid-cols-5 gap-3">
        <KpiCard label="Total Tokens" value={formatTokens(data.tokens)} icon={Activity} compact />
        <KpiCard label="Total Cost" value={formatCost(data.cost)} icon={DollarSign} compact />
        <KpiCard
          label="Claude"
          value={formatTokens(claude?.tokens ?? 0)}
          sub={formatCost(claude?.cost ?? 0)}
          icon={Sparkles}
          compact
        />
        <KpiCard
          label="Cursor"
          value={formatTokens(cursor?.tokens ?? 0)}
          sub={formatCost(cursor?.cost ?? 0)}
          icon={Bot}
          compact
        />
        <KpiCard label="Projects" value={String(data.activeProjects)} icon={FolderKanban} compact />
      </div>

      <div className="glass-card flex-1 p-4 min-h-0">
        <h3 className="mb-2 text-sm font-medium text-[var(--color-muted)]">Daily Usage</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => formatTokens(v)} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b" }} />
            <Line type="monotone" dataKey="tokens" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card flex-1 p-4 min-h-0">
        <h3 className="mb-2 text-sm font-medium text-[var(--color-muted)]">Cost Trend</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.costTrend}>
            <defs>
              <linearGradient id="reportCostGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b" }} />
            <Area type="monotone" dataKey="cost" stroke="#06b6d4" fill="url(#reportCostGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 shrink-0" style={{ height: 200 }}>
        <div className="glass-card p-4">
          <h3 className="mb-2 text-sm font-medium text-[var(--color-muted)]">Team Usage</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data.team} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={70} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Bar dataKey="tokens" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card flex items-center gap-4 p-4">
          <Cpu className="h-8 w-8 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium">Team Alerts</p>
            <p className="text-sm text-[var(--color-muted)]">
              Top model: {data.topModel}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              {data.team.length} users · {formatTokens(data.tokensInput)} in / {formatTokens(data.tokensOutput)} out
            </p>
          </div>
        </div>
      </div>

      {chartsReady && <div className="report-ready report-ready-marker" aria-hidden />}
    </div>
  );
}
