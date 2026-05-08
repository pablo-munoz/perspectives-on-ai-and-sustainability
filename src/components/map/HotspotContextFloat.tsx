"use client";

import { Card } from "@/components/ui/Card";
import { usePois } from "@/lib/hooks";
import { haversineKm } from "@/lib/geo";
import {
  AlertTriangle,
  Droplet,
  Hospital,
  MapPin,
  Shield,
  X,
} from "lucide-react";
import { useMemo } from "react";

interface Props {
  lat: number;
  lng: number;
  onClose: () => void;
}

const TYPE_META = {
  fire_station: { icon: Shield, label: "Bomberos", tone: "var(--color-accent)" },
  hospital: { icon: Hospital, label: "Hospital", tone: "var(--color-critical)" },
  shelter: {
    icon: AlertTriangle,
    label: "Punto encontro",
    tone: "var(--color-warning)",
  },
  water: { icon: Droplet, label: "Punto de auga", tone: "#4a9eff" },
} as const;

export default function HotspotContextFloat({ lat, lng, onClose }: Props) {
  const { pois, isLoading, error } = usePois(lat, lng);

  const sorted = useMemo(() => {
    const list = pois?.pois ?? [];
    return [...list]
      .map((p) => ({ ...p, distKm: haversineKm(lat, lng, p.lat, p.lng) }))
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 8);
  }, [pois, lat, lng]);

  return (
    <Card variant="glass" className="w-[300px] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <div className="section-label">Resources nearby</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-6 w-6 rounded-full border border-[var(--color-border-strong)] text-[var(--color-fg-muted)] flex items-center justify-center hover:border-[var(--color-critical)] hover:text-[var(--color-critical)]"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
        {lat.toFixed(4)}, {lng.toFixed(4)} · within 10 km
      </div>

      {isLoading ? (
        <div className="mt-4 text-[12px] text-[var(--color-fg-muted)]">
          Loading OSM context…
        </div>
      ) : error ? (
        <div className="mt-4 text-[12px] text-[var(--color-fg-muted)]">
          Overpass unavailable — try again.
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-4 text-[12px] text-[var(--color-fg-muted)]">
          No POIs found within 10 km. Try a wider radius.
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {sorted.map((p) => {
            const meta = TYPE_META[p.type];
            const Icon = meta.icon;
            return (
              <li key={p.id} className="flex items-center gap-2 text-[12px]">
                <span
                  className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: `${meta.tone}22`, color: meta.tone }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[var(--color-fg)]">
                    {p.name}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
                    {meta.label} · {p.distKm.toFixed(1)} km
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pois?.isochrones && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)] text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          Isochrones: 10 / 15 min driving via {pois.isochroneSource}
        </div>
      )}
    </Card>
  );
}
