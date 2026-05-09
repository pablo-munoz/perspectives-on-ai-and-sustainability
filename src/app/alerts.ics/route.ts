import { kv } from "@/lib/kv";
import { riskZones } from "@/lib/mock-data";
import { classifyFWI, type FwiResponse } from "@/lib/fwi";

export const revalidate = 3600;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function icalDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function escapeText(s: string): string {
  return s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export async function GET() {
  const now = new Date();
  const store = kv();
  const fwiCache = await store.get<FwiResponse>("fwi:cache:ourense");

  const events: string[] = [];
  if (fwiCache?.forecast?.length) {
    for (const day of fwiCache.forecast) {
      const cls = classifyFWI(day.fwi);
      if (cls === "very-high" || cls === "high" || cls === "extreme") {
        const date = new Date(day.date + "T00:00:00Z");
        const next = new Date(date.getTime() + 86400_000);
        const summary = `Wildfire risk · ${cls.replace("-", " ").toUpperCase()} (FWI ${day.fwi})`;
        events.push(
          [
            "BEGIN:VEVENT",
            `UID:firesee-${day.date}-${cls}@firesee`,
            `DTSTAMP:${icalDate(now)}T${pad(now.getUTCHours())}${pad(
              now.getUTCMinutes()
            )}00Z`,
            `DTSTART;VALUE=DATE:${icalDate(date)}`,
            `DTEND;VALUE=DATE:${icalDate(next)}`,
            `SUMMARY:${escapeText(summary)}`,
            `DESCRIPTION:${escapeText(
              `EFFIS-aligned FWI forecast for Ourense. Affected zones: ${riskZones
                .map((z) => z.name)
                .join(", ")}.`
            )}`,
            "END:VEVENT",
          ].join("\r\n")
        );
      }
    }
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fire-See//Wildfire Risk//EN",
    "X-WR-CALNAME:Fire-See · Wildfire risk days",
    "X-WR-TIMEZONE:Europe/Madrid",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="firesee-alerts.ics"',
    },
  });
}
