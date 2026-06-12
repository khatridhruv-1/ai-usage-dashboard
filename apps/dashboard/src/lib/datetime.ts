const DEFAULT_REPORT_TIMEZONE = "Asia/Kolkata";

export function getReportTimezone(): string {
  return (
    process.env.REPORT_TIMEZONE ??
    process.env.CRON_TIMEZONE ??
    DEFAULT_REPORT_TIMEZONE
  );
}

/** IST (or configured zone) — used on report screenshots from server/CI (UTC by default). */
export function formatReportTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: getReportTimezone(),
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}
