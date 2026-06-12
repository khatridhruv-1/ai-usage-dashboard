"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  gradient?: string;
  compact?: boolean;
};

export function KpiCard({ label, value, sub, icon: Icon, gradient, compact }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-${compact ? "4" : "5"} flex flex-col gap-2`}
      style={gradient ? { background: gradient } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          {label}
        </span>
        <Icon className="h-4 w-4 text-[var(--color-accent)]" />
      </div>
      <div className={`font-semibold ${compact ? "text-2xl" : "text-3xl"}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--color-muted)]">{sub}</div>}
    </motion.div>
  );
}
