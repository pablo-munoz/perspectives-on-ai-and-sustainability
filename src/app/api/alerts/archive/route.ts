import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import type { DerivedAlert } from "@/lib/hooks";

const ARCHIVE_KEY = "alerts:archive";
const MAX_ARCHIVED = 200;

interface ArchivedAlert extends DerivedAlert {
  dismissedAt: string;
  resolution?: string;
}

export async function GET() {
  const store = kv();
  const items = await store.recent<ArchivedAlert>(ARCHIVE_KEY, MAX_ARCHIVED);
  return NextResponse.json({
    archived: items,
    count: items.length,
    persistent: store.isPersistent(),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | (DerivedAlert & { resolution?: string })
    | null;
  if (!body || !body.id) {
    return NextResponse.json({ error: "Missing alert payload" }, { status: 400 });
  }

  const store = kv();
  const archived: ArchivedAlert = {
    id: body.id,
    type: body.type,
    severity: body.severity,
    title: body.title,
    description: body.description,
    timestamp: body.timestamp,
    dismissedAt: new Date().toISOString(),
    resolution: body.resolution,
  };
  await store.push(ARCHIVE_KEY, archived, MAX_ARCHIVED);
  return NextResponse.json({ ok: true, archived });
}
