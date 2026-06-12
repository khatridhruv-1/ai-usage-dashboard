"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyUsageResponse } from "@repo/analytics";
import { formatTokens } from "@repo/ui";

const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ec4899"];

type ChartProps = {
  data: DailyUsageResponse;
  compact?: boolean;
  onReady?: () => void;
};

export function ChartsSection({ data, compact, onReady }: ChartProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setReady(true);
      onReady?.();
    }, 600);
    return () => clearTimeout(t);
  }, [data, onReady]);

  const h = compact ? 180 : 220;

  const modelData = data.models.slice(0, 5).map((m) => ({
    name: m.name.length > 18 ? `${m.name.slice(0, 16)}…` : m.name,
    value: m.tokens,
  }));

  return (
    <div className="grid grid-cols-2 gap-4" data-charts-ready={ready}>
      <ChartCard title="Daily Usage" compact={compact}>
        <ResponsiveContainer width="100%" height={h}>
          <LineChart data={data.dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => formatTokens(v)} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #1e293b" }}
              formatter={(v: number) => [formatTokens(v), "Tokens"]}
            />
            <Line type="monotone" dataKey="tokens" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cost Trend" compact={compact}>
        <ResponsiveContainer width="100%" height={h}>
          <AreaChart data={data.costTrend}>
            <defs>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #1e293b" }}
              formatter={(v: number) => [`$${v.toFixed(2)}`, "Cost"]}
            />
            <Area type="monotone" dataKey="cost" stroke="#06b6d4" fill="url(#costGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Model Distribution" compact={compact}>
        <ResponsiveContainer width="100%" height={h}>
          <PieChart>
            <Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={compact ? 60 : 80} label={!compact}>
              {modelData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #1e293b" }}
              formatter={(v: number) => formatTokens(v)}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Team Usage" compact={compact}>
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={data.team} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => formatTokens(v)} />
            <YAxis type="category" dataKey="name" width={72} tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #1e293b" }}
              formatter={(v: number) => [formatTokens(v), "Tokens"]}
            />
            <Bar dataKey="tokens" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`glass-card ${compact ? "p-4" : "p-5"}`}>
      <h3 className={`mb-3 font-medium text-[var(--color-muted)] ${compact ? "text-sm" : ""}`}>
        {title}
      </h3>
      {children}
    </div>
  );
}
