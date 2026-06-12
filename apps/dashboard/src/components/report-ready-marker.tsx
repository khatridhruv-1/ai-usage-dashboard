"use client";

import { useEffect, useState } from "react";

export function ReportReadyMarker() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return null;
  return <div className="report-ready report-ready-marker" aria-hidden />;
}
