import { Crosshair } from "lucide-react";

function toDMS(value: number, kind: "lat" | "lng") {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(0);
  const dir =
    kind === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${deg}° ${String(min).padStart(2, "0")}' ${String(sec).padStart(2, "0")}" ${dir}`;
}

interface CoordinatesPillProps {
  lat: number;
  lng: number;
}

export default function CoordinatesPill({ lat, lng }: CoordinatesPillProps) {
  return (
    <div className="card-glass px-4 py-2.5 flex items-center gap-3">
      <div>
        <div className="section-label text-[10px]">Current View</div>
        <div className="mt-0.5 text-[12px] font-mono tabular text-[var(--color-fg)]">
          {toDMS(lat, "lat")} / {toDMS(lng, "lng")}
        </div>
      </div>
      <Crosshair className="w-4 h-4 text-[var(--color-accent)]" />
    </div>
  );
}
