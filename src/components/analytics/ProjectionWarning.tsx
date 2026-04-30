import { AlertTriangle } from "lucide-react";

export default function ProjectionWarning() {
  return (
    <div className="rounded-xl border border-[var(--color-critical)]/30 bg-[var(--color-critical-soft)] p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-md bg-[var(--color-critical)]/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-[var(--color-critical)]" />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-critical)]">
            Projection Warning
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-fg)]">
            Forecasted wind shifts in Sector Alpha may accelerate fuel
            moisture depletion by 12% within the next reporting cycle.
            Immediate watch recommended.
          </p>
        </div>
      </div>
    </div>
  );
}
