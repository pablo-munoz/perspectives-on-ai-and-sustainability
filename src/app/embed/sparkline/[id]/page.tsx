import "@/app/globals.css";
import { riskZones } from "@/lib/mock-data";
import { kv } from "@/lib/kv";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 600;

const HISTORY_KEY = "risk:history";

interface Snapshot {
  ts: string;
  zones: Array<{ id: string; score: number }>;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const zone = riskZones.find((z) => z.id === id);
  return {
    title: zone ? `${zone.name} sparkline` : "Sparkline embed",
    robots: { index: false },
  };
}

export default async function SparklineEmbed({ params }: PageProps) {
  const { id } = await params;
  const zone = riskZones.find((z) => z.id === id);
  if (!zone) notFound();

  const store = kv();
  const all = (await store.recent<Snapshot>(HISTORY_KEY, 4320)).reverse();
  const cutoff = Date.now() - 30 * 86400_000;
  const recent = all.filter((s) => new Date(s.ts).getTime() >= cutoff);

  const series = recent
    .map((s) => s.zones.find((z) => z.id === id)?.score ?? null)
    .filter((v): v is number => v != null);

  const last = series.length > 0 ? series[series.length - 1] : null;

  return (
    <main
      className="w-screen h-screen flex items-center bg-[var(--color-bg)] text-[var(--color-fg)] p-3"
      style={{ minHeight: 80 }}
    >
      <div className="flex items-center gap-3 w-full">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--color-fg-subtle)] truncate">
            {zone.name}
          </div>
          <div className="font-display text-xl font-bold tabular leading-none mt-0.5">
            {last != null ? Math.round(last * 100) : "—"}%
          </div>
        </div>
        <div className="flex-1">
          <Spark values={series} />
        </div>
        <a
          href="/zones"
          target="_top"
          className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-accent)] no-underline shrink-0"
          rel="noreferrer"
        >
          Fire-See ↗
        </a>
      </div>
    </main>
  );
}

function Spark({ values }: { values: number[] }) {
  const w = 240;
  const h = 40;
  if (values.length < 2) {
    return (
      <svg width={w} height={h} aria-hidden>
        <line
          x1={0}
          y1={h / 2}
          x2={w}
          y2={h / 2}
          stroke="rgba(255,255,255,0.18)"
          strokeDasharray="3 3"
        />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.01;
  const stepX = w / (values.length - 1);
  const path = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} role="img" aria-label="risk trend">
      <path
        d={path}
        fill="none"
        stroke="#ff6b1a"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
