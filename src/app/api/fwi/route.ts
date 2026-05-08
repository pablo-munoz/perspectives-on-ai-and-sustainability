import { NextResponse } from "next/server";
import { getCachedFwi, refreshFwi } from "@/lib/fwi-runtime";

export const revalidate = 0;

export async function GET() {
  const cached = await getCachedFwi();
  if (cached) return NextResponse.json(cached);

  try {
    const fresh = await refreshFwi();
    return NextResponse.json(fresh);
  } catch (err) {
    return NextResponse.json(
      { error: "FWI data unavailable", reason: String(err) },
      { status: 503 }
    );
  }
}
