import { NextResponse } from "next/server";

export async function GET() {
  const hasFirms = Boolean(process.env.FIRMS_MAP_KEY);
  const hasAemet = Boolean(process.env.AEMET_API_KEY);

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      firms: hasFirms ? "configured" : "missing-key",
      aemet: hasAemet ? "configured" : "missing-key",
      model: "loaded",
    },
    version: "1.0.0",
  });
}
