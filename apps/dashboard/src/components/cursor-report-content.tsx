"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange, Mail, User } from "lucide-react";
import type { CursorLiveDashboard } from "@/lib/cursor-api";
import {
  formatChartDay,
  formatNumber,
  formatPercent,
  formatShortDate,
  membershipLabel,
} from "@/lib/cursor-api";

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return formatNumber(n);
}

function Metric({
  label,
  value,
  detail,
  compact,
}: {
  label: string;
  value: string;
  detail?: string;
  compact?: boolean;
}) {
  return (
    <div className={`glass-card ${compact ? "p-4" : "p-5"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </p>
      <p className={`mt-2 font-bold text-[var(--color-foreground)] ${compact ? "text-xl" : "text-2xl"}`}>
        {value}
      </p>
      {detail && (
        <p className={`text-[var(--color-muted)] ${compact ? "mt-1 text-xs" : "mt-1.5 text-sm"}`}>
          {detail}
        </p>
      )}
    </div>
  );
}

function ProgressRow({
  label,
  percent,
  detail,
  compact,
}: {
  label: string;
  percent: number;
  detail: string;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const barColor =
    clamped >= 100 ? "bg-red-500" : clamped >= 80 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-2">
      <div className={`flex items-center justify-between gap-4 ${compact ? "text-xs" : "text-sm"}`}>
        <span className="font-medium">{label}</span>
        <span className="text-[var(--color-muted)]">{formatPercent(clamped, 0)}</span>
      </div>
      <div className={`overflow-hidden rounded-full bg-white/10 ${compact ? "h-1.5" : "h-2"}`}>
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${clamped}%` }} />
      </div>
      <p className={`text-[var(--color-muted)] ${compact ? "text-[10px]" : "text-xs"}`}>{detail}</p>
    </div>
  );
}

type Props = {
  data: CursorLiveDashboard;
  variant?: "default" | "capture";
};

export function CursorReportContent({ data, variant = "default" }: Props) {
  const compact = variant === "capture";
  const plan = data.summary.plan;
  const billingStart = data.summary.billingCycle.start;
  const billingEnd = data.summary.billingCycle.end;

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(billingEnd).getTime() - Date.now()) / 86_400_000),
  );

  const quotaUsed = plan.used;
  const quotaTotal = plan.breakdown.total;

  const activeDays = data.daily.filter((d) => d.requests > 0);
  const weekDays = data.daily.slice(-7);
  const weekDaysNewestFirst = [...weekDays].reverse();
  const weekTotals = weekDays.reduce(
    (acc, d) => ({ requests: acc.requests + d.requests, tokens: acc.tokens + d.tokens }),
    { requests: 0, tokens: 0 },
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayUsage = data.daily.find((d) => d.date === todayKey) ?? {
    date: todayKey,
    tokens: 0,
    requests: 0,
  };
  const yesterdayKey = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const yesterdayUsage = data.daily.find((d) => d.date === yesterdayKey) ?? {
    date: yesterdayKey,
    tokens: 0,
    requests: 0,
  };

  const modelRows = data.models.map((m) => ({
    ...m,
    share: data.totalCycleTokens ? (m.tokens / data.totalCycleTokens) * 100 : 0,
  }));

  const sectionGap = compact ? "gap-4" : "gap-6";
  const cardPad = compact ? "p-4" : "p-6";
  const chartHeight = compact ? "h-40" : "h-52";
  const cellPad = compact ? "px-3 py-1.5" : "px-4 py-2.5";
  const headPad = compact ? "px-3 py-2" : "px-4 py-3";

  return (
    <div className={`flex flex-col ${sectionGap}`}>
      {data.user && (
        <div className={`glass-card grid gap-4 ${compact ? "p-4" : "p-5"} sm:grid-cols-2`}>
          <div className="flex items-start gap-3">
            <div
              className={`flex shrink-0 items-center justify-center rounded-lg bg-violet-500/20 ${compact ? "h-9 w-9" : "h-10 w-10"}`}
            >
              <User className={`text-violet-300 ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                Name
              </p>
              <p
                className={`mt-1 font-semibold ${
                  data.user.name
                    ? compact
                      ? "text-base text-[var(--color-foreground)]"
                      : "text-lg text-[var(--color-foreground)]"
                    : "text-sm font-normal text-[var(--color-muted)]"
                }`}
              >
                {data.user.name || "Set CURSOR_DISPLAY_NAME in apps/api/.env"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div
              className={`flex shrink-0 items-center justify-center rounded-lg bg-violet-500/20 ${compact ? "h-9 w-9" : "h-10 w-10"}`}
            >
              <Mail className={`text-violet-300 ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                Email
              </p>
              <p
                className={`mt-1 truncate font-semibold text-[var(--color-foreground)] ${compact ? "text-base" : "text-lg"}`}
              >
                {data.user.email || "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Daily usage at a glance
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            compact={compact}
            label="Today — requests"
            value={formatNumber(todayUsage.requests)}
            detail={`${formatCompact(todayUsage.tokens)} tokens consumed today`}
          />
          <Metric
            compact={compact}
            label="Yesterday — requests"
            value={formatNumber(yesterdayUsage.requests)}
            detail={`${formatCompact(yesterdayUsage.tokens)} tokens consumed yesterday`}
          />
          <Metric
            compact={compact}
            label="Active days this cycle"
            value={formatNumber(activeDays.length)}
            detail={`${formatNumber(data.usageEventsCount)} total requests · ${formatCompact(data.totalCycleTokens)} tokens`}
          />
          <Metric
            compact={compact}
            label="Billing cycle"
            value={`${daysLeft} days left`}
            detail={`${formatShortDate(billingStart)} → ${formatShortDate(billingEnd)}`}
          />
        </div>
      </div>

      <div className={`glass-card ${cardPad}`}>
        <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 ${compact ? "mb-3" : "mb-5"}`}>
          <div>
            <h2 className={`font-semibold ${compact ? "text-base" : "text-lg"}`}>
              Plan usage (matches Cursor Spending)
            </h2>
            <p className={`text-[var(--color-muted)] ${compact ? "text-xs" : "text-sm"}`}>
              {membershipLabel(data.summary.membershipType)} plan · resets{" "}
              {formatShortDate(billingEnd)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-medium text-violet-200">
            <CalendarRange className="h-3.5 w-3.5" />
            {formatShortDate(billingStart)} – {formatShortDate(billingEnd)}
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <ProgressRow
            compact={compact}
            label="Total plan usage"
            percent={plan.usagePercentages.total}
            detail={`${formatNumber(quotaUsed)} of ${formatNumber(quotaTotal)} quota credits used`}
          />
          <ProgressRow
            compact={compact}
            label="Auto + Composer"
            percent={plan.usagePercentages.autoModel}
            detail="Auto-routed model traffic (matches Spending → Auto)"
          />
          <ProgressRow
            compact={compact}
            label="API usage"
            percent={plan.usagePercentages.api}
            detail="Named-model / direct API calls (matches Spending → API)"
          />
        </div>
        {!compact &&
          (data.summary.displayMessages.autoModel || data.summary.displayMessages.namedModel) && (
            <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-[var(--color-muted)]">
              Cursor status: {data.summary.displayMessages.autoModel}
              {data.summary.displayMessages.namedModel
                ? ` · ${data.summary.displayMessages.namedModel}`
                : ""}
            </p>
          )}
      </div>

      <div className={`glass-card ${cardPad}`}>
        <h2 className={`font-semibold ${compact ? "text-base" : "text-lg"}`}>Usage by model</h2>
        {!compact && (
          <p className="mb-4 text-sm text-[var(--color-muted)]">
            Breakdown of which AI models were used this billing cycle.
          </p>
        )}
        <div className={`overflow-x-auto rounded-lg border border-white/10 ${compact ? "mt-2" : "mt-0"}`}>
          <table className={`w-full min-w-[520px] text-left ${compact ? "text-xs" : "text-sm"}`}>
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className={`${headPad} font-medium`}>Model</th>
                <th className={`${headPad} text-right font-medium`}>Requests</th>
                <th className={`${headPad} text-right font-medium`}>Tokens</th>
                <th className={`${headPad} text-right font-medium`}>Share</th>
              </tr>
            </thead>
            <tbody>
              {modelRows.map((m) => (
                <tr key={m.model} className="border-b border-white/5">
                  <td className={cellPad}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                      {m.model}
                    </span>
                  </td>
                  <td className={`${cellPad} text-right tabular-nums`}>{formatNumber(m.requests)}</td>
                  <td className={`${cellPad} text-right tabular-nums`}>{formatNumber(m.tokens)}</td>
                  <td className={`${cellPad} text-right tabular-nums`}>
                    {formatPercent(m.share, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`glass-card ${cardPad}`}>
        <h2 className={`font-semibold ${compact ? "text-base" : "text-lg"}`}>Daily usage</h2>
        {!compact && (
          <p className="mb-4 text-sm text-[var(--color-muted)]">
            Last 7 days of usage.
          </p>
        )}

        <div className={`grid gap-4 lg:grid-cols-2 ${compact ? "mb-4" : "mb-6"}`}>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Tokens per day
            </p>
            <div className={chartHeight}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekDays}>
                  <defs>
                    <linearGradient id="dailyTokenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDay}
                    stroke="#94a3b8"
                    fontSize={compact ? 10 : 11}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={compact ? 10 : 11}
                    tickFormatter={(v) => formatCompact(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid rgba(148,163,184,0.2)",
                      borderRadius: 8,
                    }}
                    labelFormatter={(l) => formatChartDay(String(l))}
                    formatter={(v: number) => [`${formatNumber(v)} tokens`, "Tokens"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    stroke="#10b981"
                    fill="url(#dailyTokenGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Requests per day
            </p>
            <div className={chartHeight}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekDays}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDay}
                    stroke="#94a3b8"
                    fontSize={compact ? 10 : 11}
                  />
                  <YAxis stroke="#94a3b8" fontSize={compact ? 10 : 11} />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid rgba(148,163,184,0.2)",
                      borderRadius: 8,
                    }}
                    labelFormatter={(l) => formatChartDay(String(l))}
                    formatter={(v: number) => [`${formatNumber(v)} requests`, "Requests"]}
                  />
                  <Bar dataKey="requests" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className={`w-full min-w-[480px] text-left ${compact ? "text-xs" : "text-sm"}`}>
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className={`${headPad} font-medium`}>Date</th>
                <th className={`${headPad} text-right font-medium`}>Requests</th>
                <th className={`${headPad} text-right font-medium`}>Tokens consumed</th>
              </tr>
            </thead>
            <tbody>
              {weekDaysNewestFirst.map((row) => {
                const isToday = row.date === todayKey;
                return (
                  <tr
                    key={row.date}
                    className={`border-b border-white/5 ${isToday ? "bg-violet-500/10" : ""}`}
                  >
                    <td className={`${cellPad} font-medium`}>
                      {formatShortDate(row.date)}
                      {isToday && (
                        <span className="ml-2 rounded bg-violet-500/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-200">
                          Today
                        </span>
                      )}
                    </td>
                    <td className={`${cellPad} text-right tabular-nums`}>
                      {formatNumber(row.requests)}
                    </td>
                    <td className={`${cellPad} text-right tabular-nums`}>
                      {formatNumber(row.tokens)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-white/5 font-semibold">
                <td className={headPad}>Week total</td>
                <td className={`${headPad} text-right tabular-nums`}>
                  {formatNumber(weekTotals.requests)}
                </td>
                <td className={`${headPad} text-right tabular-nums`}>
                  {formatNumber(weekTotals.tokens)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
