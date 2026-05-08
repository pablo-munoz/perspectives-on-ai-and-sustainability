"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const ROUTES = ["/map", "/analytics", "/zones", "/alerts"];

const SHORTCUTS: { key: string; description: string }[] = [
  { key: "1", description: "Map view" },
  { key: "2", description: "Analytics" },
  { key: "3", description: "Zones" },
  { key: "4", description: "Alerts" },
  { key: "G", description: "Toggle GIBS thermal layer (on map)" },
  { key: "?", description: "Show this help" },
  { key: "Esc", description: "Close dialogs / deselect" },
];

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      if (e.key === "Escape") {
        if (helpOpen) {
          setHelpOpen(false);
          e.preventDefault();
        }
        return;
      }

      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx !== -1) {
        e.preventDefault();
        router.push(ROUTES[idx]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, helpOpen]);

  if (!helpOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setHelpOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-[420px] max-w-[92vw] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="section-label">Help</div>
            <h2 className="mt-1 font-display text-lg font-bold">
              Keyboard shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            aria-label="Close"
            className="h-8 w-8 rounded-full border border-[var(--color-border-strong)] text-[var(--color-fg-muted)] flex items-center justify-center hover:border-[var(--color-critical)] hover:text-[var(--color-critical)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="mt-4 space-y-1.5">
          {SHORTCUTS.map((s) => (
            <li
              key={s.key}
              className="flex items-center justify-between gap-3 text-[13px]"
            >
              <span className="text-[var(--color-fg-muted)]">
                {s.description}
              </span>
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--color-border-strong)] bg-white/5 font-mono text-[11px] text-[var(--color-fg)]">
                {s.key}
              </kbd>
            </li>
          ))}
        </ul>

        <div className="mt-4 text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          Press ? anywhere to reopen this help.
        </div>
      </div>
    </div>
  );
}
