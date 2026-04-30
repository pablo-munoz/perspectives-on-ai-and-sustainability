"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface ToolbarChipProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function ToolbarChip({
  active = false,
  onClick,
  children,
  icon,
  className,
}: ToolbarChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 h-8 px-3 rounded-md border text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
        active
          ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)]",
        className
      )}
    >
      {icon}
      <span>{children}</span>
      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
    </button>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center p-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-7 px-3 rounded text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
            value === opt.value
              ? "bg-[var(--color-accent)] text-black"
              : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
