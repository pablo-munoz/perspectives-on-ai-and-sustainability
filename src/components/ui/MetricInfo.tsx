"use client";

import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getEntry, TONE_COLOR } from "@/lib/glossary";

interface Props {
  termId: string;
  className?: string;
  /** Bigger trigger surface for desktop hover; popover content is the same. */
  variant?: "icon" | "underline";
  /** Render this child as the underline-style trigger (e.g. label text). */
  children?: React.ReactNode;
  lang?: "es" | "en";
}

/**
 * Lightweight hover/click popover. Click toggles, click-outside closes,
 * Esc closes. On touch devices the icon click is the primary affordance.
 */
export default function MetricInfo({
  termId,
  className = "",
  variant = "icon",
  children,
  lang = "es",
}: Props) {
  const entry = getEntry(termId);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 320;
    const left = Math.min(
      Math.max(8, r.left + r.width / 2 - popoverWidth / 2),
      window.innerWidth - popoverWidth - 8
    );
    setCoords({ top: r.bottom + 8, left });
  }, [open]);

  if (!entry) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`More info about ${entry.abbr}`}
        aria-expanded={open}
        aria-describedby={open ? `glossary-${entry.id}` : undefined}
        className={
          variant === "underline"
            ? `inline-flex items-center gap-1 underline decoration-dotted decoration-[var(--color-fg-subtle)] underline-offset-[3px] hover:decoration-[var(--color-fg)] cursor-help ${className}`
            : `inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] transition-colors ${className}`
        }
      >
        {variant === "underline" ? (
          <>
            {children}
            <Info className="w-3 h-3 opacity-60" aria-hidden />
          </>
        ) : (
          <Info className="w-3.5 h-3.5" aria-hidden />
        )}
      </button>

      {open && coords && (
        <div
          ref={popoverRef}
          id={`glossary-${entry.id}`}
          role="dialog"
          aria-label={`${entry.abbr} definition`}
          className="fixed z-50 w-[320px] p-4 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] shadow-2xl text-[var(--color-fg)] motion-reduce:!animate-none"
          style={{ top: coords.top, left: coords.left }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
                {entry.abbr}
              </div>
              <div className="font-display text-sm font-bold leading-tight">
                {entry.title[lang]}
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
              {entry.range} {entry.units && <>· {entry.units}</>}
            </span>
          </div>

          <p className="mt-2 text-[12px] text-[var(--color-fg-muted)] leading-snug">
            {entry.definition[lang]}
          </p>

          {entry.thresholds && (
            <ul className="mt-3 space-y-1">
              {entry.thresholds.map((t) => (
                <li
                  key={t.label}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ background: TONE_COLOR[t.tone] }}
                      aria-hidden
                    />
                    <span className="text-[var(--color-fg)]">{t.label}</span>
                  </span>
                  <span className="tabular text-[var(--color-fg-muted)]">
                    {t.range}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            <span className="truncate">{entry.source}</span>
            <Link
              href={`/methodology#${entry.id}`}
              onClick={() => setOpen(false)}
              className="text-[var(--color-accent)] hover:underline shrink-0 ml-2"
            >
              Read more →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
