"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard-error]", error);
  }, [error]);

  return (
    <div className="h-full grid place-items-center p-8">
      <div className="max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[var(--color-warning)]/15 text-[var(--color-warning)]">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="section-label mt-4 text-[var(--color-warning)]">
          Page error
        </div>
        <h2 className="mt-2 font-display text-xl font-bold">
          Could not render this view
        </h2>
        <p className="mt-3 text-[13px] text-[var(--color-fg-muted)]">
          A live data source likely returned an unexpected response. Other
          pages should still work — try a refresh, or jump to{" "}
          <a className="text-[var(--color-accent)] hover:underline" href="/status">
            /status
          </a>{" "}
          to see what's online.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 inline-flex items-center gap-2 px-4 h-9 rounded-md bg-[var(--color-accent)] text-black text-[12px] font-bold uppercase tracking-[0.14em] hover:bg-[var(--color-accent-hi)] transition-colors"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Try again
        </button>
        {error.digest && (
          <div className="mt-4 font-mono text-[10px] text-[var(--color-fg-subtle)]">
            ref · {error.digest}
          </div>
        )}
      </div>
    </div>
  );
}
