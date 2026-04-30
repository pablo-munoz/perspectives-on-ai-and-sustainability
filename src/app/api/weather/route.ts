import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchWeather } from "@/lib/data-sources";

const cachedWeather = unstable_cache(fetchWeather, ["weather-aemet"], {
  revalidate: 300,
  tags: ["weather"],
});

export async function GET() {
  const data = await cachedWeather();
  return NextResponse.json(data);
}
