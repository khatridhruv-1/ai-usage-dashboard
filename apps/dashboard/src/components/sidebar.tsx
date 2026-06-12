"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bot, Camera, LayoutDashboard } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cursor", label: "Cursor Report", icon: Bot },
  { href: "/report/daily", label: "Daily Report", icon: Camera },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-card m-4 flex w-56 shrink-0 flex-col gap-2 p-4">
      <div className="mb-4 flex items-center gap-2 px-2">
        <BarChart3 className="h-5 w-5 text-[var(--color-accent)]" />
        <span className="font-semibold">AI Analytics</span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-violet-500/20 text-violet-200"
                  : "text-[var(--color-muted)] hover:bg-white/5 hover:text-[var(--color-foreground)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
