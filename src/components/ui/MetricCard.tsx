import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Card } from "./Card";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: { value: string; tone?: "up" | "down" | "neutral" };
  icon?: ReactNode;
  iconTone?: "accent" | "critical" | "warning" | "success" | "info";
  className?: string;
  footer?: ReactNode;
}

const iconBg: Record<NonNullable<MetricCardProps["iconTone"]>, string> = {
  accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  critical: "bg-[var(--color-critical-soft)] text-[var(--color-critical)]",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  info: "bg-[var(--color-info)]/15 text-[var(--color-info)]",
};

export function MetricCard({
  label,
  value,
  unit,
  delta,
  icon,
  iconTone = "accent",
  className,
  footer,
}: MetricCardProps) {
  const deltaTone =
    delta?.tone === "up"
      ? "text-[var(--color-critical)]"
      : delta?.tone === "down"
      ? "text-[var(--color-success)]"
      : "text-[var(--color-fg-muted)]";
  return (
    <Card variant="elevated" className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="section-label">{label}</div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-display text-3xl md:text-4xl font-semibold tracking-tight tabular">
              {value}
            </span>
            {unit && (
              <span className="text-sm text-[var(--color-fg-muted)] font-medium">
                {unit}
              </span>
            )}
          </div>
          {delta && (
            <div className={cn("mt-2 text-xs font-medium tabular", deltaTone)}>
              {delta.value}
            </div>
          )}
          {footer && <div className="mt-3">{footer}</div>}
        </div>
        {icon && (
          <div
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              iconBg[iconTone]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
