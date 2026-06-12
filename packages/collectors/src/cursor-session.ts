import { prisma } from "@repo/db";
import { daysAgo, endOfDay } from "./utils";
import {
  type CursorUsageEventRow,
  markCursorSyncSuccess,
  persistCursorEvents,
} from "./cursor-events";
import {
  cursorSessionRequest,
  fetchAuthMe,
  getSessionToken,
  resolveTeamId,
  resolveUserId,
} from "./cursor-session-client";

const EVENTS_PATH = "/api/dashboard/get-filtered-usage-events";
const PAGE_SIZE = 100;
const MAX_PAGES = 100;

type FilteredUsageEventsResponse = {
  totalUsageEventsCount?: number;
  usageEventsDisplay?: CursorUsageEventRow[];
};

function resolveFallbackEmail(me: Awaited<ReturnType<typeof fetchAuthMe>>) {
  return me?.user?.email ?? me?.email;
}

async function fetchSessionUsageEvents(opts: {
  start: Date;
  end: Date;
  userId?: number;
}): Promise<CursorUsageEventRow[]> {
  const events: CursorUsageEventRow[] = [];
  let total = Infinity;

  const base = {
    teamId: resolveTeamId(),
    startDate: String(opts.start.getTime()),
    endDate: String(opts.end.getTime()),
    pageSize: PAGE_SIZE,
    ...(opts.userId != null ? { userId: opts.userId } : {}),
  };

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await cursorSessionRequest<FilteredUsageEventsResponse>(
      "POST",
      EVENTS_PATH,
      { ...base, page }
    );

    const batch = res.usageEventsDisplay ?? [];
    total = res.totalUsageEventsCount ?? batch.length;
    events.push(...batch);

    if (events.length >= total || batch.length < PAGE_SIZE) break;
  }

  return events;
}

export function isCursorSessionConfigured() {
  return Boolean(getSessionToken());
}

export async function syncCursorSessionUsage(opts?: { days?: number }) {
  const days = opts?.days ?? Number(process.env.SYNC_DAYS ?? 30);
  const start = daysAgo(days);
  const end = endOfDay(new Date());

  await prisma.usageLog.deleteMany({
    where: {
      provider: "cursor",
      createdAt: { gte: start, lte: end },
    },
  });

  const me = await fetchAuthMe();
  const userId = resolveUserId(me);
  const fallbackEmail = resolveFallbackEmail(me);

  const events = await fetchSessionUsageEvents({ start, end, userId });
  const records = await persistCursorEvents(events, {
    externalIdPrefix: "cursor:session",
    fallbackEmail,
  });

  return markCursorSyncSuccess(records);
}
