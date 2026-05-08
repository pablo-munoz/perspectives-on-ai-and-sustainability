import "@/app/globals.css";
import { riskZones } from "@/lib/mock-data";
import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Embed Fire-See widgets",
  robots: { index: false },
};

export default async function EmbedDocsPage() {
  const h = await headers();
  const host = h.get("host") ?? "perspectives-on-ai-and-sustainabili.vercel.app";
  const proto = host.includes("localhost") ? "http" : "https";
  const base = `${proto}://${host}`;

  const example = riskZones[0];
  const snippet = `<iframe
  src="${base}/embed/zone/${example.id}"
  width="460"
  height="200"
  style="border:0;border-radius:14px"
  loading="lazy"
  title="Fire-See — ${example.name}"
></iframe>`;

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto text-[var(--color-fg)]">
      <h1 className="font-display text-2xl font-bold">
        Embed Fire-See in your site
      </h1>
      <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
        Drop a live wildfire-risk badge for any of the eight Ourense zones into
        a council website, blog, or community portal. Auto-refreshes every 5
        minutes server-side.
      </p>

      <section className="mt-6">
        <h2 className="font-display text-base font-semibold">Snippet</h2>
        <pre className="mt-2 p-4 rounded-md border border-[var(--color-border)] bg-black/40 text-[12px] overflow-x-auto">
          <code>{snippet}</code>
        </pre>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-base font-semibold">Available zones</h2>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {riskZones.map((z) => (
            <li
              key={z.id}
              className="flex items-center justify-between border border-[var(--color-border)] rounded-md px-3 py-2"
            >
              <span className="text-sm text-[var(--color-fg)]">{z.name}</span>
              <code className="text-[11px] text-[var(--color-fg-muted)]">
                /embed/zone/{z.id}
              </code>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 text-[12px] text-[var(--color-fg-subtle)] leading-relaxed">
        <p>
          By embedding Fire-See you agree to display attribution to AEMET, NASA
          FIRMS, and Open-Meteo as detailed in the{" "}
          <a className="text-[var(--color-accent)] underline" href="/support">
            data sources page
          </a>
          . Embeds are free for non-commercial use.
        </p>
      </section>
    </main>
  );
}
