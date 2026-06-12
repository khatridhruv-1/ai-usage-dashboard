import { CursorReportCapture } from "@/components/cursor-report-capture";
import { fetchCursorDashboardServer } from "@/lib/cursor-api-server";
import { isReportAuthorized } from "@/lib/report-auth";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function CursorReportPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!isReportAuthorized(params)) {
    return (
      <div className="report-cursor-capture flex items-center justify-center p-8">
        <p className="text-[var(--color-muted)]">Unauthorized — invalid report token</p>
      </div>
    );
  }

  try {
    const data = await fetchCursorDashboardServer();
    return <CursorReportCapture data={data} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load Cursor report";
    return (
      <div className="report-cursor-capture flex items-center justify-center p-8">
        <p className="text-red-300">{message}</p>
      </div>
    );
  }
}
