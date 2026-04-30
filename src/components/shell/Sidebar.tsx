"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Map as MapIcon,
  BarChart3,
  Layers,
  BellRing,
  Settings,
  LifeBuoy,
  Flame,
} from "lucide-react";
import { useAlerts } from "@/lib/hooks";

interface NavItem {
  href: string;
  label: string;
  icon: typeof MapIcon;
}

const NAV: NavItem[] = [
  { href: "/map", label: "Map View", icon: MapIcon },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/zones", label: "Zones", icon: Layers },
  { href: "/alerts", label: "Alerts", icon: BellRing },
];

const FOOTER: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { alerts } = useAlerts();
  const criticalCount = alerts?.alerts?.filter(
    (a) => a.severity === "critical"
  ).length ?? 0;

  return (
    <aside className="w-[224px] shrink-0 h-full bg-[var(--color-bg-elevated)] border-r border-[var(--color-border)] flex flex-col">
      {/* Brand */}
      <div className="px-5 pt-5 pb-6">
        <Link href="/map" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-[var(--color-accent)] flex items-center justify-center shadow-[0_8px_18px_-6px_rgba(255,107,26,0.7)]">
            <Flame className="w-4.5 h-4.5 text-black" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold tracking-tight text-[var(--color-fg)]">
              FIRE-SEE
            </div>
            <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
              Wildfire Intel V.1
            </div>
          </div>
        </Link>
      </div>

      {/* Sector chip */}
      <div className="px-4">
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
            Active Sector
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)]" />
            <span className="text-[12px] font-semibold tracking-wide text-[var(--color-fg)]">
              OURENSE / GZA
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-2.5 mt-6 flex-1">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href) ?? false;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-3 h-10 rounded-md text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors",
                    active
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]/30"
                      : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-white/[0.03] border border-transparent"
                  )}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/alerts" && criticalCount > 0 && (
                    <span className="h-5 min-w-5 px-1 rounded-full bg-[var(--color-critical)] text-white text-[10px] font-bold flex items-center justify-center tabular">
                      {criticalCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Live alerts CTA */}
      <div className="px-4 pb-4">
        <Link
          href="/alerts"
          className="flex items-center justify-center h-11 rounded-md bg-[var(--color-accent)] text-black font-bold text-[12px] uppercase tracking-[0.14em] hover:bg-[var(--color-accent-hi)] transition-colors shadow-[0_10px_24px_-10px_rgba(255,107,26,0.8)]"
        >
          Live Alerts
        </Link>
      </div>

      {/* Footer */}
      <div className="px-2.5 pb-4 border-t border-[var(--color-border)] pt-3">
        <ul className="space-y-1">
          {FOOTER.map((item) => {
            const active = pathname?.startsWith(item.href) ?? false;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 h-9 rounded-md text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                    active
                      ? "text-[var(--color-fg)]"
                      : "text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-muted)]"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
