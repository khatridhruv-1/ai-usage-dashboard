import { prisma, type UsageLog } from "@repo/db";
import {
  endOfReportDay,
  getCalendarPartsInTimezone,
  getReportTimezone,
  startOfDayInTimezone,
  todayInReportTimezone,
} from "./timezone";

export type DailyUsageResponse = {
  date: string;
  tokens: number;
  cost: number;
  tokensInput: number;
  tokensOutput: number;
  models: { name: string; provider: string; tokens: number; cost: number }[];
  projects: { name: string; tokens: number; cost: number }[];
  team: { name: string; email: string; tokens: number; cost: number }[];
  dailyTrend: { date: string; tokens: number; cost: number }[];
  costTrend: { date: string; cost: number }[];
  providers: { provider: string; tokens: number; cost: number }[];
  activeProjects: number;
  topModel: string;
};

function formatDate(d: Date) {
  const tz = getReportTimezone();
  const { y, m, d: day } = getCalendarPartsInTimezone(d, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(day)}`;
}

export function parseReportDate(dateParam?: string): Date {
  const tz = getReportTimezone();

  if (!dateParam || dateParam === "today") {
    return todayInReportTimezone(tz);
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateParam.trim());
  if (isoMatch) {
    return startOfDayInTimezone(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
      tz,
    );
  }

  const parsed = new Date(dateParam);
  if (Number.isNaN(parsed.getTime())) {
    return todayInReportTimezone(tz);
  }

  const { y, m, d } = getCalendarPartsInTimezone(parsed, tz);
  return startOfDayInTimezone(y, m, d, tz);
}

export async function aggregateDailyUsage(date: Date): Promise<DailyUsageResponse> {
  const tz = getReportTimezone();
  const dayStart = date;
  const dayEnd = endOfReportDay(date, tz);

  const logs = await prisma.usageLog.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    include: { user: true },
  });

  const trendStart = new Date(dayStart);
  trendStart.setDate(trendStart.getDate() - 13);

  const trendLogs = await prisma.usageLog.findMany({
    where: { createdAt: { gte: trendStart, lte: dayEnd } },
    select: {
      createdAt: true,
      tokensInput: true,
      tokensOutput: true,
      cost: true,
    },
  });

  return buildMetrics(logs, trendLogs, dayStart);
}

export async function aggregateAndStoreDailyReport(date: Date) {
  const metrics = await aggregateDailyUsage(date);
  const reportDate = date;

  await prisma.dailyReport.upsert({
    where: { date: reportDate },
    create: {
      date: reportDate,
      totalTokens: metrics.tokens,
      totalCost: metrics.cost,
      metadata: metrics as object,
    },
    update: {
      totalTokens: metrics.tokens,
      totalCost: metrics.cost,
      metadata: metrics as object,
    },
  });

  return metrics;
}

function buildMetrics(
  logs: (UsageLog & { user: { name: string; email: string } | null })[],
  trendLogs: { createdAt: Date; tokensInput: number; tokensOutput: number; cost: number }[],
  targetDate: Date
): DailyUsageResponse {
  let tokens = 0;
  let cost = 0;
  let tokensInput = 0;
  let tokensOutput = 0;

  const modelMap = new Map<string, { provider: string; tokens: number; cost: number }>();
  const projectMap = new Map<string, { tokens: number; cost: number }>();
  const teamMap = new Map<string, { name: string; email: string; tokens: number; cost: number }>();
  const providerMap = new Map<string, { tokens: number; cost: number }>();

  for (const log of logs) {
    const t = log.tokensInput + log.tokensOutput;
    tokens += t;
    tokensInput += log.tokensInput;
    tokensOutput += log.tokensOutput;
    cost += log.cost;

    const modelKey = log.model;
    const m = modelMap.get(modelKey) ?? { provider: log.provider, tokens: 0, cost: 0 };
    m.tokens += t;
    m.cost += log.cost;
    modelMap.set(modelKey, m);

    const proj = log.projectName ?? "unassigned";
    const p = projectMap.get(proj) ?? { tokens: 0, cost: 0 };
    p.tokens += t;
    p.cost += log.cost;
    projectMap.set(proj, p);

    const prov = providerMap.get(log.provider) ?? { tokens: 0, cost: 0 };
    prov.tokens += t;
    prov.cost += log.cost;
    providerMap.set(log.provider, prov);

    if (log.user) {
      const u = teamMap.get(log.userId!) ?? {
        name: log.user.name,
        email: log.user.email,
        tokens: 0,
        cost: 0,
      };
      u.tokens += t;
      u.cost += log.cost;
      teamMap.set(log.userId!, u);
    }
  }

  const dailyBuckets = new Map<string, { tokens: number; cost: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - i);
    dailyBuckets.set(formatDate(d), { tokens: 0, cost: 0 });
  }

  for (const log of trendLogs) {
    const key = formatDate(log.createdAt);
    const bucket = dailyBuckets.get(key);
    if (!bucket) continue;
    bucket.tokens += log.tokensInput + log.tokensOutput;
    bucket.cost += log.cost;
  }

  const dailyTrend = [...dailyBuckets.entries()].map(([date, v]) => ({
    date,
    tokens: v.tokens,
    cost: Math.round(v.cost * 100) / 100,
  }));

  const models = [...modelMap.entries()]
    .map(([name, v]) => ({ name, provider: v.provider, tokens: v.tokens, cost: v.cost }))
    .sort((a, b) => b.tokens - a.tokens);

  const topModel = models[0]?.name ?? "—";

  return {
    date: formatDate(targetDate),
    tokens,
    cost: Math.round(cost * 100) / 100,
    tokensInput,
    tokensOutput,
    models,
    projects: [...projectMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.tokens - a.tokens),
    team: [...teamMap.values()].sort((a, b) => b.tokens - a.tokens),
    dailyTrend,
    costTrend: dailyTrend.map((d) => ({ date: d.date, cost: d.cost })),
    providers: [...providerMap.entries()].map(([provider, v]) => ({ provider, ...v })),
    activeProjects: projectMap.size,
    topModel,
  };
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export {
  DEFAULT_REPORT_TIMEZONE,
  formatReportTimestamp,
  getReportTimezone,
  todayInReportTimezone,
} from "./timezone";
