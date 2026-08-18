import { NextResponse } from "next/server";
import { googleConfigured, googleIdConfigured, microsoftConfigured } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    google: googleIdConfigured() || googleConfigured(),
    microsoft: microsoftConfigured(),
  });
}
