import { Flame } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg)] text-[var(--color-fg-muted)]">
      <div className="relative">
        <div className="w-12 h-12 rounded-md bg-[var(--color-accent)] flex items-center justify-center shadow-[0_10px_24px_-8px_rgba(255,107,26,0.7)] animate-pulse">
          <Flame className="w-6 h-6 text-black" strokeWidth={2.5} />
        </div>
      </div>
      <div className="mt-4 text-[11px] uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
        Loading Fire-See…
      </div>
    </div>
  );
}
