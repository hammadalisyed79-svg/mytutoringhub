import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getSiteSettings } from "@/lib/site-settings";
import { AdminActionError, runAdminAction } from "@/lib/admin-actions";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const result = await runAdminAction(session.user.id, { action: "update_settings", ...body });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    if (err instanceof AdminActionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not save settings" }, { status: 500 });
  }
}
