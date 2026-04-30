import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchFirms } from "@/lib/data-sources";

const cachedFirms = unstable_cache(fetchFirms, ["firms-ourense"], {
  revalidate: 600,
  tags: ["firms"],
});

export async function GET() {
  const data = await cachedFirms();
  return NextResponse.json(data);
}
