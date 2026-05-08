import { NextRequest, NextResponse } from "next/server";
import { refreshFwi } from "@/lib/fwi-runtime";

function isAuthorized(req: NextRequest): boolean {
  const want = process.env.CRON_SECRET;
  if (!want) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${want}`) return true;
  if (req.nextUrl.searchParams.get("secret") === want) return true;
  return false;
}

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const fresh = await refreshFwi();
    return NextResponse.json({
      ok: true,
      current: fresh.current,
      forecastDays: fresh.forecast.length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
