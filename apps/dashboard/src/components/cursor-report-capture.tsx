"use client";

import { useEffect, useState } from "react";
import type { CursorLiveDashboard } from "@/lib/cursor-api";
import { formatShortDate, membershipLabel } from "@/lib/cursor-api";
import { CursorReportContent } from "./cursor-report-content";

type Props = {
  data: CursorLiveDashboard;
  generatedAtLabel: string;
};

export function CursorReportCapture({ data, generatedAtLabel }: Props) {
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setChartsReady(true), 1200);
    return () => window.clearTimeout(t);
  }, [data]);

  const billingStart = data.summary.billingCycle.start;
  const billingEnd = data.summary.billingCycle.end;

  return (
    <div className="report-cursor-capture relative flex flex-col gap-4 p-8">
      <header className="shrink-0">
        <p className="text-sm text-[var(--color-muted)]">Management report · Live from Cursor</p>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Cursor Usage Report</span>
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {membershipLabel(data.summary.membershipType)} plan · {formatShortDate(billingStart)} –{" "}
          {formatShortDate(billingEnd)} · Generated {generatedAtLabel}
        </p>
      </header>

      <CursorReportContent data={data} variant="capture" />

      {chartsReady && <div className="report-charts-ready" aria-hidden />}
    </div>
  );
}
