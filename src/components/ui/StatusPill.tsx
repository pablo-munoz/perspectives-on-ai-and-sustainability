import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "live" | "synced" | "warning" | "critical" | "neutral" | "info";

const tones: Record<Tone, { dot: string; text: string; bg: string; border: string }> = {
  live: {
    dot: "text-[var(--color-success)] bg-[var(--color-success)]",
    text: "text-[var(--color-success)]",
    bg: "bg-[var(--color-success-soft)]",
    border: "border-[var(--color-success)]/30",
  },
  synced: {
    dot: "text-[var(--color-success)] bg-[var(--color-success)]",
    text: "text-[var(--color-fg)]",
    bg: "bg-[var(--color-success-soft)]",
    border: "border-[var(--color-success)]/25",
  },
  warning: {
    dot: "text-[var(--color-warning)] bg-[var(--color-warning)]",
    text: "text-[var(--color-warning)]",
    bg: "bg-[var(--color-warning-soft)]",
    border: "border-[var(--color-warning)]/30",
  },
  critical: {
    dot: "text-[var(--color-critical)] bg-[var(--color-critical)]",
    text: "text-[var(--color-critical)]",
    bg: "bg-[var(--color-critical-soft)]",
    border: "border-[var(--color-critical)]/40",
  },
  info: {
    dot: "text-[var(--color-info)] bg-[var(--color-info)]",
    text: "text-[var(--color-info)]",
    bg: "bg-[var(--color-info)]/15",
    border: "border-[var(--color-info)]/25",
  },
  neutral: {
    dot: "text-[var(--color-fg-muted)] bg-[var(--color-fg-muted)]",
    text: "text-[var(--color-fg-muted)]",
    bg: "bg-white/5",
    border: "border-[var(--color-border-strong)]",
  },
};

interface StatusPillProps {
  tone?: Tone;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function StatusPill({
  tone = "neutral",
  pulse = false,
  children,
  className,
  icon,
}: StatusPillProps) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 h-7 text-[11px] font-semibold uppercase tracking-[0.12em]",
        t.bg,
        t.border,
        t.text,
        className
      )}
    >
      {icon ? (
        <span className="flex items-center">{icon}</span>
      ) : (
        <span
          className={cn(
            "rounded-full",
            pulse ? "status-pulse-dot" : "h-1.5 w-1.5",
            t.dot
          )}
        />
      )}
      <span>{children}</span>
    </span>
  );
}
