import { NextResponse } from "next/server";
import { fetchWeatherCached } from "@/lib/data-sources";

export async function GET() {
  const data = await fetchWeatherCached();
  return NextResponse.json(data);
}
