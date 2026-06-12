/** All report generation and display defaults to India Standard Time. */
export const DEFAULT_REPORT_TIMEZONE = "Asia/Kolkata";

export function getReportTimezone(): string {
  return (
    process.env.REPORT_TIMEZONE ??
    process.env.CRON_TIMEZONE ??
    DEFAULT_REPORT_TIMEZONE
  );
}

export function getCalendarPartsInTimezone(
  date: Date,
  timeZone = getReportTimezone(),
): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  return {
    y: Number(parts.find((p) => p.type === "year")!.value),
    m: Number(parts.find((p) => p.type === "month")!.value),
    d: Number(parts.find((p) => p.type === "day")!.value),
  };
}

/** Start of calendar day in Asia/Kolkata (+05:30). */
export function startOfDayInTimezone(
  y: number,
  m: number,
  d: number,
  timeZone = getReportTimezone(),
): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${y}-${pad(m)}-${pad(d)}`;
  const offset = timeZone === "Asia/Kolkata" ? "+05:30" : "+00:00";
  return new Date(`${dateStr}T00:00:00${offset}`);
}

/** End of calendar day in Asia/Kolkata (+05:30). */
export function endOfDayInTimezone(
  y: number,
  m: number,
  d: number,
  timeZone = getReportTimezone(),
): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${y}-${pad(m)}-${pad(d)}`;
  const offset = timeZone === "Asia/Kolkata" ? "+05:30" : "+00:00";
  return new Date(`${dateStr}T23:59:59.999${offset}`);
}

export function todayInReportTimezone(timeZone = getReportTimezone()): Date {
  const { y, m, d } = getCalendarPartsInTimezone(new Date(), timeZone);
  return startOfDayInTimezone(y, m, d, timeZone);
}

export function endOfReportDay(dayStart: Date, timeZone = getReportTimezone()): Date {
  const { y, m, d } = getCalendarPartsInTimezone(dayStart, timeZone);
  return endOfDayInTimezone(y, m, d, timeZone);
}

export function formatReportTimestamp(
  iso: string | Date,
  timeZone = getReportTimezone(),
): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleString("en-IN", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}
