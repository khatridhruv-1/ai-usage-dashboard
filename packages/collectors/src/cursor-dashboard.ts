import type { CursorUsageEventRow } from "./cursor-events";
import type {
  CursorDailyPoint,
  CursorLiveDashboard,
  CursorModelSlice,
  CursorUsageSummary,
  CursorUser,
} from "./cursor-dashboard-types";
import {
  cursorSessionRequest,
  fetchAuthMe,
  resolveTeamId,
  resolveUserId,
} from "./cursor-session-client";

const EVENTS_PATH = "/api/dashboard/get-filtered-usage-events";
const PAGE_SIZE = 100;
const MAX_PAGES = 100;

const MODEL_PALETTE = [
  "#10b981",
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#64748b",
];

type FilteredUsageEventsResponse = {
  totalUsageEventsCount?: number;
  usageEventsDisplay?: CursorUsageEventRow[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizePlan(raw: Record<string, unknown>) {
  const breakdown = isRecord(raw.breakdown)
    ? {
        included: Number(raw.breakdown.included ?? 0),
        bonus: Number(raw.breakdown.bonus ?? 0),
        total: Number(raw.breakdown.total ?? 0),
      }
    : { included: 0, bonus: 0, total: 0 };

  const legacyPct = isRecord(raw.usagePercentages) ? raw.usagePercentages : null;

  return {
    enabled: Boolean(raw.enabled),
    used: Number(raw.used ?? 0),
    limit: Number(raw.limit ?? 0),
    remaining: Number(raw.remaining ?? 0),
    breakdown,
    usagePercentages: {
      autoModel: Number(legacyPct?.autoModel ?? raw.autoPercentUsed ?? 0),
      api: Number(legacyPct?.api ?? raw.apiPercentUsed ?? 0),
      total: Number(legacyPct?.total ?? raw.totalPercentUsed ?? 0),
    },
  };
}

function normalizeIndividualUsage(raw: unknown) {
  if (!isRecord(raw) || !isRecord(raw.plan)) return null;
  return normalizePlan(raw.plan);
}

export function normalizeUsageSummary(raw: unknown): CursorUsageSummary | null {
  if (!isRecord(raw)) return null;

  let billingCycle: { start: string; end: string } | null = null;
  let membershipType = "free";
  let displayMessages = { autoModel: "", namedModel: "" };
  let planRaw: unknown = null;

  if (isRecord(raw.billingCycle) && typeof raw.billingCycle.start === "string") {
    billingCycle = {
      start: String(raw.billingCycle.start),
      end: String(raw.billingCycle.end),
    };
    membershipType = isRecord(raw.membership)
      ? String(raw.membership.type ?? "free")
      : "free";
    if (isRecord(raw.displayMessages)) {
      displayMessages = {
        autoModel: String(raw.displayMessages.autoModel ?? ""),
        namedModel: String(raw.displayMessages.namedModel ?? ""),
      };
    }
    planRaw = raw.individualUsage;
  } else if (
    typeof raw.billingCycleStart === "string" &&
    typeof raw.billingCycleEnd === "string"
  ) {
    billingCycle = {
      start: String(raw.billingCycleStart),
      end: String(raw.billingCycleEnd),
    };
    membershipType = String(raw.membershipType ?? "free");
    displayMessages = {
      autoModel: String(raw.autoModelSelectedDisplayMessage ?? ""),
      namedModel: String(raw.namedModelSelectedDisplayMessage ?? ""),
    };
    planRaw = raw.individualUsage;
  }

  if (!billingCycle) return null;

  const plan =
    normalizeIndividualUsage(planRaw) ??
    ({
      enabled: true,
      used: 0,
      limit: 0,
      remaining: 0,
      breakdown: { included: 0, bonus: 0, total: 0 },
      usagePercentages: { autoModel: 0, api: 0, total: 0 },
    } as const);

  return {
    billingCycle,
    membershipType,
    displayMessages,
    plan,
  };
}

function normalizeUser(me: Awaited<ReturnType<typeof fetchAuthMe>>): CursorUser | null {
  if (!me) return null;
  if (isRecord(me.user) && typeof me.user.id === "number") {
    return {
      id: me.user.id,
      name: String(me.user.name ?? ""),
      email: String(me.user.email ?? ""),
    };
  }
  if (typeof me.id === "number") {
    return {
      id: me.id,
      name: String(me.name ?? ""),
      email: String(me.email ?? ""),
    };
  }
  return null;
}

function utcDayStart(iso: string | Date): number {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function dateKeyFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function eventTokens(event: CursorUsageEventRow): number {
  const u = event.tokenUsage;
  if (!u) return 0;
  return (
    (u.inputTokens ?? 0) +
    (u.outputTokens ?? 0) +
    (u.cacheReadTokens ?? 0) +
    (u.cacheWriteTokens ?? 0)
  );
}

export type CursorFetchOptions = {
  sessionToken?: string;
  displayName?: string;
  email?: string;
};

async function fetchBillingCycleEvents(
  billingCycle: CursorUsageSummary["billingCycle"],
  userId?: number,
  sessionToken?: string,
): Promise<CursorUsageEventRow[]> {
  const now = new Date();
  const startMs = utcDayStart(billingCycle.start);
  const cycleEndMs = utcDayStart(billingCycle.end);
  const todayMs = utcDayStart(now);
  const lastDayMs = Math.min(cycleEndMs, todayMs);

  const events: CursorUsageEventRow[] = [];
  let total = Infinity;

  const base = {
    teamId: resolveTeamId(),
    startDate: String(startMs),
    endDate: String(lastDayMs + 86_400_000 - 1),
    pageSize: PAGE_SIZE,
    ...(userId != null ? { userId } : {}),
  };

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await cursorSessionRequest<FilteredUsageEventsResponse>(
      "POST",
      EVENTS_PATH,
      { ...base, page },
      sessionToken,
    );

    const batch = res.usageEventsDisplay ?? [];
    total = res.totalUsageEventsCount ?? batch.length;
    events.push(...batch);

    if (events.length >= total || batch.length < PAGE_SIZE) break;
  }

  return events;
}

function buildDailySeries(
  events: CursorUsageEventRow[],
  billingCycle: CursorUsageSummary["billingCycle"]
): CursorDailyPoint[] {
  const now = new Date();
  const startMs = utcDayStart(billingCycle.start);
  const endMs = Math.min(utcDayStart(billingCycle.end), utcDayStart(now));
  if (endMs < startMs) return [];

  const byDay = new Map<string, { tokens: number; requests: number }>();
  for (const event of events) {
    const ts = Number(event.timestamp);
    if (!Number.isFinite(ts)) continue;
    const key = dateKeyFromMs(ts);
    const dayMs = utcDayStart(key);
    if (dayMs < startMs || dayMs > endMs) continue;
    const row = byDay.get(key) ?? { tokens: 0, requests: 0 };
    row.tokens += eventTokens(event);
    row.requests += 1;
    byDay.set(key, row);
  }

  const out: CursorDailyPoint[] = [];
  for (let ms = startMs; ms <= endMs; ms += 86_400_000) {
    const key = dateKeyFromMs(ms);
    const row = byDay.get(key) ?? { tokens: 0, requests: 0 };
    out.push({ date: key, tokens: row.tokens, requests: row.requests });
  }
  return out;
}

function buildModelSlices(events: CursorUsageEventRow[]): CursorModelSlice[] {
  const byModel = new Map<string, { tokens: number; requests: number }>();
  for (const event of events) {
    const model = event.model?.trim() || "unknown";
    const row = byModel.get(model) ?? { tokens: 0, requests: 0 };
    row.tokens += eventTokens(event);
    row.requests += 1;
    byModel.set(model, row);
  }

  return [...byModel.entries()]
    .filter(([, v]) => v.tokens > 0 || v.requests > 0)
    .sort((a, b) => b[1].tokens - a[1].tokens)
    .map(([model, stats], i) => ({
      model,
      tokens: stats.tokens,
      requests: stats.requests,
      color: MODEL_PALETTE[i % MODEL_PALETTE.length],
    }));
}

export async function fetchCursorLiveDashboard(
  opts?: CursorFetchOptions,
): Promise<CursorLiveDashboard> {
  const sessionToken = opts?.sessionToken?.trim();
  const [summaryRaw, me] = await Promise.all([
    cursorSessionRequest<unknown>("GET", "/api/usage-summary", undefined, sessionToken),
    fetchAuthMe(sessionToken),
  ]);

  const summary = normalizeUsageSummary(summaryRaw);
  if (!summary) {
    throw new Error(
      "Cursor /api/usage-summary returned an unexpected shape. Session token may be expired."
    );
  }

  const userId = resolveUserId(me);
  const events = await fetchBillingCycleEvents(summary.billingCycle, userId, sessionToken);
  const daily = buildDailySeries(events, summary.billingCycle);
  const models = buildModelSlices(events);
  const totalCycleTokens = events.reduce((s, e) => s + eventTokens(e), 0);

  let user = normalizeUser(me);
  if (opts?.displayName?.trim() || opts?.email?.trim()) {
    user = {
      id: user?.id ?? 0,
      name: opts?.displayName?.trim() || user?.name || "",
      email: opts?.email?.trim() || user?.email || "",
    };
  }

  return {
    summary,
    user,
    daily,
    models,
    usageEventsCount: events.length,
    totalCycleTokens,
    fetchedAt: new Date().toISOString(),
  };
}
