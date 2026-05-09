"use client";

interface Props {
  values: Array<number | null>;
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  /** Optional secondary baseline at y=value rendered as dashed line. */
  baseline?: number;
}

export default function Sparkline({
  values,
  width = 200,
  height = 40,
  stroke = "#ff6b1a",
  fill = "rgba(255,107,26,0.18)",
  strokeWidth = 1.5,
  baseline,
}: Props) {
  const numeric = values.filter((v): v is number => v != null);
  if (numeric.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      </svg>
    );
  }
  const min = Math.min(...numeric, baseline ?? Infinity);
  const max = Math.max(...numeric, baseline ?? -Infinity);
  const range = max - min || 1;
  const stepX = width / Math.max(1, values.length - 1);
  const y = (v: number) =>
    height - ((v - min) / range) * (height - 4) - 2;

  let path = "";
  let first = true;
  values.forEach((v, i) => {
    if (v == null) return;
    const x = i * stepX;
    path += first ? `M${x.toFixed(1)},${y(v).toFixed(1)}` : ` L${x.toFixed(1)},${y(v).toFixed(1)}`;
    first = false;
  });
  const area = path + ` L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} role="img" aria-label="trend">
      {baseline != null && (
        <line
          x1={0}
          y1={y(baseline)}
          x2={width}
          y2={y(baseline)}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
          strokeDasharray="3 2"
        />
      )}
      <path d={area} fill={fill} stroke="none" />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
