import { formatCost, formatTokens } from "@repo/analytics";

type ReportPayload = {
  date: string;
  tokens: number;
  cost: number;
  topModel?: string;
  screenshotUrl?: string;
};

export async function sendGoogleChatReport(payload: ReportPayload) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("GOOGLE_CHAT_WEBHOOK_URL is not configured");
  }

  const lines = [
    "📊 *Daily AI Usage Report*",
    "",
    `📅 ${payload.date}`,
    `🧠 Tokens: ${formatTokens(payload.tokens)}`,
    `💰 Cost: ${formatCost(payload.cost)}`,
  ];

  if (payload.topModel) {
    lines.push(`🔥 Top Model: ${payload.topModel}`);
  }

  if (payload.screenshotUrl) {
    lines.push("", `📷 Full Dashboard: ${payload.screenshotUrl}`);
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ text: lines.join("\n") }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Chat webhook failed: ${res.status} ${text}`);
  }
}

type CursorReportPayload = {
  screenshotUrl: string;
  displayName?: string;
  email?: string;
  generatedAt?: string;
};

export async function sendCursorGoogleChatReport(payload: CursorReportPayload) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("GOOGLE_CHAT_WEBHOOK_URL is not configured");
  }

  const subtitleParts = [
    payload.displayName,
    payload.email,
    payload.generatedAt,
  ].filter(Boolean);

  const widgets: object[] = [];

  if (payload.displayName || payload.email) {
    const lines = [
      payload.displayName ? `👤 ${payload.displayName}` : null,
      payload.email ? `✉️ ${payload.email}` : null,
    ].filter(Boolean);
    widgets.push({
      decoratedText: {
        text: lines.join("\n"),
      },
    });
  }

  widgets.push({
    image: {
      imageUrl: payload.screenshotUrl,
      onClick: {
        openLink: {
          url: payload.screenshotUrl,
        },
      },
    },
  });

  const body = {
    cardsV2: [
      {
        cardId: `cursor-report-${Date.now()}`,
        card: {
          header: {
            title: "Cursor Usage Report",
            subtitle: subtitleParts.join(" · ") || undefined,
          },
          sections: [{ widgets }],
        },
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Chat webhook failed: ${res.status} ${text}`);
  }
}
