import { fetchDailyUsage } from "@/lib/api";
import { DashboardContent } from "@/components/dashboard-content";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let data;
  try {
    data = await fetchDailyUsage("today");
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="glass-card max-w-md p-8 text-center">
          <h2 className="text-xl font-semibold">API unavailable</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Start the API with <code className="text-violet-300">npm run dev:api</code> and
            ensure <code className="text-violet-300">NEXT_PUBLIC_API_URL</code> is set.
          </p>
        </div>
      </div>
    );
  }

  return <DashboardContent data={data} mode="interactive" />;
}
