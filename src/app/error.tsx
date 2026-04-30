"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg)] text-[var(--color-fg)] p-6">
      <div className="w-14 h-14 rounded-full bg-[var(--color-critical-soft)] border border-[var(--color-critical)]/40 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-[var(--color-critical)]" />
      </div>
      <h1 className="font-display text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-sm text-[var(--color-fg-muted)] mb-6 max-w-md text-center">
        {error.message || "An unexpected error occurred while loading Fire-See."}
      </p>
      {error.digest && (
        <p className="text-[10px] font-mono text-[var(--color-fg-subtle)] mb-4">
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 h-9 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hi)] rounded-md text-xs font-bold uppercase tracking-[0.14em] text-black transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Try again
      </button>
    </div>
  );
}
