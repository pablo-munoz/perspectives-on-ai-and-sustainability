import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  right,
  className,
}: SectionHeadingProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-6 flex-wrap",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-3xl md:text-4xl font-semibold leading-tight tracking-tight text-[var(--color-fg)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 section-label text-[10px] md:text-[11px] text-[var(--color-fg-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </header>
  );
}
