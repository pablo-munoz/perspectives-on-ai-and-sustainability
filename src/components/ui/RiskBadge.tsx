import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/mock-data";

const config: Record<RiskLevel, { label: string; bg: string; text: string; border: string; dot: string }> = {
  critical: {
    label: "Critical Risk",
    bg: "bg-[var(--color-critical-soft)]",
    text: "text-[var(--color-critical)]",
    border: "border-[var(--color-critical)]/40",
    dot: "bg-[var(--color-critical)]",
  },
  high: {
    label: "High Risk",
    bg: "bg-[var(--color-accent-soft)]",
    text: "text-[var(--color-accent)]",
    border: "border-[var(--color-accent)]/40",
    dot: "bg-[var(--color-accent)]",
  },
  medium: {
    label: "Medium Risk",
    bg: "bg-[var(--color-warning-soft)]",
    text: "text-[var(--color-warning)]",
    border: "border-[var(--color-warning)]/40",
    dot: "bg-[var(--color-warning)]",
  },
  low: {
    label: "Low Risk",
    bg: "bg-[var(--color-success-soft)]",
    text: "text-[var(--color-success)]",
    border: "border-[var(--color-success)]/40",
    dot: "bg-[var(--color-success)]",
  },
};

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
  compact?: boolean;
  labelOverride?: string;
}

export function RiskBadge({ level, className, compact = false, labelOverride }: RiskBadgeProps) {
  const c = config[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-semibold uppercase tracking-[0.12em]",
        c.bg,
        c.text,
        c.border,
        compact ? "px-2 h-5 text-[10px]" : "px-2.5 h-6 text-[11px]",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {labelOverride ?? c.label}
    </span>
  );
}
