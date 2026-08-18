import { NextResponse } from "next/server";
import { googleConfigured, microsoftConfigured } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    google: googleConfigured(),
    microsoft: microsoftConfigured(),
  });
}
