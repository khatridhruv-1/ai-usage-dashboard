import { prisma } from "@repo/db";
import { daysAgo, endOfDay, startOfDay, toRfc3339, upsertUser } from "./utils";

const ANTHROPIC_BASE = "https://api.anthropic.com";

type UsageBucket = {
  starting_at?: string;
  ending_at?: string;
  results?: Array<{
    model?: string;
    workspace_id?: string;
    api_key_id?: string;
    uncached_input_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    output_tokens?: number;
  }>;
};

type CostBucket = {
  starting_at?: string;
  ending_at?: string;
  results?: Array<{
    amount?: string;
    currency?: string;
    model?: string;
    description?: string;
    workspace_id?: string;
    cost_type?: string;
  }>;
};

function getAdminKey() {
  return process.env.ANTHROPIC_ADMIN_API_KEY?.trim();
}

async function anthropicGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = getAdminKey();
  if (!key) {
    throw new Error("ANTHROPIC_ADMIN_API_KEY is not set (requires sk-ant-admin... org admin key)");
  }

  const url = new URL(path, ANTHROPIC_BASE);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.append(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${path}: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

function parseCostCents(amount?: string): number {
  if (!amount) return 0;
  return Number(amount) / 100;
}

export async function syncClaudeUsage(opts?: { days?: number }) {
  const days = opts?.days ?? Number(process.env.SYNC_DAYS ?? 30);
  const start = daysAgo(days);
  const end = endOfDay(new Date());

  const usageRes = await anthropicGet<{ data?: UsageBucket[] }>(
    "/v1/organizations/usage_report/messages",
    {
      starting_at: toRfc3339(start),
      ending_at: toRfc3339(end),
      bucket_width: "1d",
      "group_by[]": "model",
    }
  );

  let costByDayModel = new Map<string, number>();
  try {
    const costRes = await anthropicGet<{ data?: CostBucket[] }>(
      "/v1/organizations/cost_report",
      {
        starting_at: toRfc3339(start),
        ending_at: toRfc3339(end),
        bucket_width: "1d",
        "group_by[]": "description",
      }
    );

    for (const bucket of costRes.data ?? []) {
      const day = bucket.starting_at?.slice(0, 10) ?? "unknown";
      for (const row of bucket.results ?? []) {
        if (row.cost_type && row.cost_type !== "tokens") continue;
        const model = row.model ?? row.description ?? "unknown";
        const key = `${day}:${model}`;
        costByDayModel.set(key, (costByDayModel.get(key) ?? 0) + parseCostCents(row.amount));
      }
    }
  } catch (err) {
    console.warn("[claude] cost_report unavailable, estimating from tokens:", err);
  }

  await prisma.usageLog.deleteMany({
    where: {
      provider: "claude",
      createdAt: { gte: start, lte: end },
    },
  });

  let records = 0;

  for (const bucket of usageRes.data ?? []) {
    const dayStr = bucket.starting_at?.slice(0, 10);
    if (!dayStr) continue;
    const createdAt = startOfDay(new Date(dayStr));

    for (const row of bucket.results ?? []) {
      const model = row.model ?? "claude-unknown";
      const tokensInput =
        (row.uncached_input_tokens ?? 0) +
        (row.cache_creation_input_tokens ?? 0) +
        (row.cache_read_input_tokens ?? 0);
      const tokensOutput = row.output_tokens ?? 0;
      const costKey = `${dayStr}:${model}`;
      const cost =
        costByDayModel.get(costKey) ??
        tokensInput * 0.000003 + tokensOutput * 0.000015;

      if (tokensInput + tokensOutput === 0) continue;

      const externalId = `claude:${dayStr}:${model}:${row.workspace_id ?? "default"}`;

      await prisma.usageLog.create({
        data: {
          provider: "claude",
          model,
          tokensInput,
          tokensOutput,
          cost,
          projectName: row.workspace_id ? `workspace:${row.workspace_id}` : "claude-api",
          externalId,
          createdAt,
        },
      });
      records++;
    }
  }

  await prisma.syncState.upsert({
    where: { provider: "claude" },
    create: {
      provider: "claude",
      lastSyncedAt: new Date(),
      lastSyncStatus: "success",
      recordsSynced: records,
    },
    update: {
      lastSyncedAt: new Date(),
      lastSyncStatus: "success",
      lastSyncError: null,
      recordsSynced: records,
    },
  });

  return { provider: "claude", records };
}

export function isClaudeConfigured() {
  return Boolean(getAdminKey());
}
