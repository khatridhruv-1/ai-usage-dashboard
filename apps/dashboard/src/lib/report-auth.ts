function normalizeToken(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function isReportAuthorized(
  searchParams: { token?: string | string[] },
  requestHeaders?: { get(name: string): string | null },
): boolean {
  const reportSecret = normalizeToken(process.env.REPORT_ACCESS_TOKEN);
  const internalSecret = normalizeToken(process.env.INTERNAL_API_TOKEN);

  const internalHeader = normalizeToken(requestHeaders?.get("x-internal-token"));
  if (internalSecret && internalHeader === internalSecret) {
    return true;
  }

  if (!reportSecret) return true;

  const token = Array.isArray(searchParams.token)
    ? searchParams.token[0]
    : searchParams.token;

  return normalizeToken(token) === reportSecret;
}
