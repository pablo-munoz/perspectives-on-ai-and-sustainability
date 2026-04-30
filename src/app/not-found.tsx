import Link from "next/link";
import { Flame } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg)] text-[var(--color-fg)] p-6">
      <div className="w-12 h-12 rounded-md bg-[var(--color-accent)] flex items-center justify-center mb-4 shadow-[0_10px_24px_-8px_rgba(255,107,26,0.7)]">
        <Flame className="w-6 h-6 text-black" strokeWidth={2.5} />
      </div>
      <h1 className="font-display text-3xl font-bold mb-2">404</h1>
      <p className="text-sm text-[var(--color-fg-muted)] mb-6">
        This zone is not on our risk map.
      </p>
      <Link
        href="/map"
        className="inline-flex items-center h-9 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hi)] rounded-md text-xs font-bold uppercase tracking-[0.14em] text-black transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
