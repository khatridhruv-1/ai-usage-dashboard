const CURSOR_WEB_BASE = "https://cursor.com";

export type AuthMeResponse = {
  user?: {
    id?: number;
    email?: string;
    name?: string;
  };
  id?: number;
  email?: string;
  name?: string;
};

export function getSessionToken() {
  return process.env.CURSOR_SESSION_TOKEN?.trim();
}

export function cursorCookie(sessionToken?: string): string | null {
  const token = sessionToken?.trim() || getSessionToken();
  if (!token) return null;
  if (token.includes("=")) return token;
  return `WorkosCursorSessionToken=${token}`;
}

export function resolveTeamId() {
  const raw = process.env.CURSOR_TEAM_ID?.trim();
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function resolveUserId(me: AuthMeResponse | null): number | undefined {
  const envId = process.env.CURSOR_USER_ID?.trim();
  if (envId && !Number.isNaN(Number(envId))) return Number(envId);
  if (me?.user?.id != null) return me.user.id;
  if (me?.id != null) return me.id;
  return undefined;
}

export async function cursorSessionRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: object,
  sessionToken?: string,
): Promise<T> {
  const cookie = cursorCookie(sessionToken);
  if (!cookie) {
    throw new Error(
      "CURSOR_SESSION_TOKEN is not set. Copy WorkosCursorSessionToken from cursor.com (DevTools → Application → Cookies)."
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    Cookie: cookie,
    "User-Agent": "ai-usage-dashboard/1.0",
  };

  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    headers.Origin = "https://cursor.com";
    headers.Referer = "https://cursor.com/dashboard/usage";
  }

  const res = await fetch(`${CURSOR_WEB_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Cursor session returned ${res.status}. Sign in at cursor.com and refresh CURSOR_SESSION_TOKEN.`
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cursor ${path}: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchAuthMe(sessionToken?: string): Promise<AuthMeResponse | null> {
  try {
    return await cursorSessionRequest<AuthMeResponse>("GET", "/api/auth/me", undefined, sessionToken);
  } catch {
    return null;
  }
}
