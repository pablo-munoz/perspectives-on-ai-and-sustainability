"use client";

import { cn } from "@/lib/utils";
import { ArrowRight, Check, MapPin } from "lucide-react";
import type { DerivedAlert } from "@/lib/hooks";
import { timeAgo } from "@/lib/hooks";

interface AlertListItemProps {
  alert: DerivedAlert;
  active?: boolean;
  archived?: boolean;
  coords?: { lat: number; lng: number };
  onClick?: () => void;
}

const severityStyles = {
  critical: {
    border: "border-l-[var(--color-critical)]",
    label: "text-[var(--color-critical)]",
    bg: "bg-[var(--color-critical-soft)]",
    badge: "Critical",
  },
  high: {
    border: "border-l-[var(--color-accent)]",
    label: "text-[var(--color-accent)]",
    bg: "bg-[var(--color-accent-soft)]",
    badge: "Warning",
  },
  medium: {
    border: "border-l-[var(--color-warning)]",
    label: "text-[var(--color-warning)]",
    bg: "bg-[var(--color-warning-soft)]",
    badge: "Warning",
  },
  low: {
    border: "border-l-[var(--color-info)]",
    label: "text-[var(--color-info)]",
    bg: "bg-[var(--color-info)]/10",
    badge: "Info",
  },
} as const;

export function AlertListItem({
  alert,
  active = false,
  archived = false,
  coords,
  onClick,
}: AlertListItemProps) {
  const s = severityStyles[alert.severity];

  if (archived) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left rounded-md border border-[var(--color-border)] p-3 opacity-60 hover:opacity-90 transition-opacity",
          "flex items-center justify-between"
        )}
      >
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center text-[var(--color-fg-subtle)]">
            <Check className="w-3 h-3" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
              Archived · {timeAgo(alert.timestamp)}
            </div>
            <div className="text-[12.5px] font-medium text-[var(--color-fg-muted)]">
              {alert.title}
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border border-[var(--color-border)] border-l-4 p-3.5 transition-colors group",
        s.border,
        active
          ? "bg-[var(--color-surface-2)] border-[var(--color-border-strong)]"
          : "bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center h-5 px-2 rounded text-[10px] font-bold uppercase tracking-[0.14em]",
            s.bg,
            s.label
          )}
        >
          {s.badge}
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)] tabular">
          {timeAgo(alert.timestamp)}
        </span>
      </div>
      <div className="mt-2.5 font-display text-[15px] font-semibold leading-tight">
        {alert.title}
      </div>
      <div className="mt-1.5 text-[12px] text-[var(--color-fg-muted)] leading-relaxed line-clamp-2">
        {alert.description}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)] tabular">
          <MapPin className="w-3 h-3" />
          {coords
            ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`
            : "Ourense sector"}
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-[var(--color-fg-subtle)] group-hover:text-[var(--color-accent)] transition-colors" />
      </div>
    </button>
  );
}
