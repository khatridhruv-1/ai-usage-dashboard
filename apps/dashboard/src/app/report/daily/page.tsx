import { fetchDailyUsage } from "@/lib/api";
import { isReportAuthorized } from "@/lib/report-auth";
import { ReportLayout } from "@/components/report-layout";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ date?: string; token?: string }>;
};

export default async function DailyReportPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!isReportAuthorized(params)) {
    return (
      <div className="report-viewport flex items-center justify-center">
        <p className="text-[var(--color-muted)]">Unauthorized — invalid report token</p>
      </div>
    );
  }

  const date = params.date ?? "today";
  const data = await fetchDailyUsage(date);

  return <ReportLayout data={data} />;
}
