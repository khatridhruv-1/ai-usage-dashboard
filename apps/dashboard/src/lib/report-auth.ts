export function isReportAuthorized(searchParams: {
  token?: string | string[];
}): boolean {
  const secret = process.env.REPORT_ACCESS_TOKEN;
  if (!secret) return true;

  const token = Array.isArray(searchParams.token)
    ? searchParams.token[0]
    : searchParams.token;

  return token === secret;
}
