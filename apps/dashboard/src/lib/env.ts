function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "http://localhost:4000";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

/** Server-side: prefers runtime API_URL, then NEXT_PUBLIC_API_URL. */
export function getApiBaseUrl(): string {
  const raw =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000";
  return normalizeUrl(raw);
}

/** Client-side: NEXT_PUBLIC_API_URL is inlined at build time. */
export function getApiBaseUrlClient(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return normalizeUrl(raw);
}
