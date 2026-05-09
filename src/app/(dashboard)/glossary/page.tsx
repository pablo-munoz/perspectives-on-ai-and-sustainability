"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  GLOSSARY,
  TERM_BY_CATEGORY,
  TONE_COLOR,
  type GlossaryEntry,
} from "@/lib/glossary";
import { Search } from "lucide-react";

export default function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<"es" | "en">("es");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GLOSSARY;
    return GLOSSARY.filter(
      (e) =>
        e.abbr.toLowerCase().includes(q) ||
        e.title.es.toLowerCase().includes(q) ||
        e.title.en.toLowerCase().includes(q) ||
        e.definition.es.toLowerCase().includes(q) ||
        e.definition.en.toLowerCase().includes(q)
    );
  }, [query]);

  const categories = useMemo(() => {
    const map = new Map<string, GlossaryEntry[]>();
    for (const e of filtered) {
      const arr = map.get(e.category) ?? [];
      arr.push(e);
      map.set(e.category, arr);
    }
    return [...map.entries()].sort();
  }, [filtered]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[860px] mx-auto pb-20">
      <header className="mb-6">
        <div className="section-label">Reference</div>
        <h1 className="mt-2 font-display text-3xl font-bold">Glossary</h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] max-w-prose">
          Definitions for every technical term used across the dashboard.
          Each entry is deep-linkable — every metric tooltip on the dashboard
          links to its anchor here.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-[var(--color-fg-subtle)]" />
          <input
            type="text"
            placeholder="Search terms (FWI, NDVI, anomaly…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent text-[12px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          {(["es", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-2.5 h-7 rounded text-[10px] font-bold uppercase tracking-[0.14em] ${
                lang === l
                  ? "bg-[var(--color-accent)] text-black"
                  : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {categories.length === 0 ? (
        <Card variant="elevated" className="p-6 text-center text-[var(--color-fg-muted)]">
          No matching terms.
        </Card>
      ) : (
        categories.map(([cat, entries]) => (
          <section key={cat} className="mb-8">
            <h2 className="section-label sticky top-0 bg-[var(--color-bg)] py-2 z-[1]">
              {TERM_BY_CATEGORY[cat as keyof typeof TERM_BY_CATEGORY]}
            </h2>
            <ul className="mt-3 space-y-3">
              {entries.map((e) => (
                <li
                  key={e.id}
                  id={e.id}
                  className="scroll-mt-12"
                >
                  <Card variant="elevated" className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-base font-bold">
                        <span className="text-[var(--color-accent)] font-mono">
                          {e.abbr}
                        </span>{" "}
                        <span className="text-[var(--color-fg)]">·</span>{" "}
                        {e.title[lang]}
                      </h3>
                      <span className="text-[11px] text-[var(--color-fg-subtle)] tabular shrink-0">
                        {e.range} {e.units && <>· {e.units}</>}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] text-[var(--color-fg-muted)]">
                      {e.definition[lang]}
                    </p>
                    {e.thresholds && (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {e.thresholds.map((t) => (
                          <li
                            key={t.label}
                            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] tabular bg-white/[0.03] border border-[var(--color-border)]"
                          >
                            <span
                              className="h-2 w-2 rounded-sm"
                              style={{ background: TONE_COLOR[t.tone] }}
                            />
                            <span className="text-[var(--color-fg)]">
                              {t.label}
                            </span>
                            <span className="text-[var(--color-fg-muted)]">
                              {t.range}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
                      <span>Source · {e.source}</span>
                      {e.sourceUrl && (
                        <a
                          href={e.sourceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-[var(--color-accent)] hover:underline"
                        >
                          Reference →
                        </a>
                      )}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
