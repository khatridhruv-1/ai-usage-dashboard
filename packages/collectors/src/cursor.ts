import { prisma } from "@repo/db";
import { daysAgo, endOfDay } from "./utils";
import {
  type CursorUsageEventRow,
  markCursorSyncSuccess,
  persistCursorEvents,
} from "./cursor-events";

const CURSOR_API_BASE = "https://api.cursor.com";

type CursorEventsResponse = {
  usageEvents?: CursorUsageEventRow[];
  pagination?: {
    hasNextPage?: boolean;
  };
};

function getAdminKey() {
  return process.env.CURSOR_ADMIN_API_KEY?.trim();
}

function basicAuthHeader(key: string) {
  const encoded = Buffer.from(`${key}:`).toString("base64");
  return `Basic ${encoded}`;
}

async function cursorAdminPost<T>(path: string, body: object): Promise<T> {
  const key = getAdminKey();
  if (!key) {
    throw new Error(
      "CURSOR_ADMIN_API_KEY is not set (Enterprise Team Admin API key from cursor.com/dashboard)"
    );
  }

  const res = await fetch(`${CURSOR_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(key),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cursor API ${path}: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

export function isCursorAdminConfigured() {
  return Boolean(getAdminKey());
}

/** @deprecated Use isCursorAdminConfigured or isCursorSessionConfigured */
export function isCursorConfigured() {
  return isCursorAdminConfigured();
}

export async function syncCursorAdminUsage(opts?: { days?: number }) {
  const days = opts?.days ?? Number(process.env.SYNC_DAYS ?? 30);
  const start = daysAgo(days);
  const end = endOfDay(new Date());

  await prisma.usageLog.deleteMany({
    where: {
      provider: "cursor",
      createdAt: { gte: start, lte: end },
    },
  });

  const allEvents: CursorUsageEventRow[] = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const res = await cursorAdminPost<CursorEventsResponse>(
      "/teams/filtered-usage-events",
      {
        startDate: start.getTime(),
        endDate: end.getTime(),
        page,
        pageSize,
      }
    );

    allEvents.push(...(res.usageEvents ?? []));
    hasMore = res.pagination?.hasNextPage ?? false;
    page++;
    if (page > 500) break;
  }

  const records = await persistCursorEvents(allEvents, {
    externalIdPrefix: "cursor:admin",
  });

  return markCursorSyncSuccess(records);
}

/** @deprecated Use syncCursorAdminUsage */
export const syncCursorUsage = syncCursorAdminUsage;
