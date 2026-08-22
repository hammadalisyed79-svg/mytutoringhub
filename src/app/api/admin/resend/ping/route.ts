import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { emailConfigured } from "@/lib/email";
import { sendTestMessageEmail } from "@/lib/message-notify";

export const runtime = "nodejs";

/** Admin-only: verify Resend can send from admin@mytutoringhub.com */
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!emailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "RESEND_API_KEY is missing or invalid on this deployment. Add it in Vercel → Environment Variables and redeploy.",
      },
      { status: 503 },
    );
  }

  let to: string | undefined;
  try {
    const body = await req.json();
    to = typeof body?.to === "string" ? body.to.trim() : undefined;
  } catch {
    to = undefined;
  }

  if (!to) {
    return NextResponse.json({ error: "Provide { to: email } in JSON body" }, { status: 400 });
  }

  try {
    const result = await sendTestMessageEmail(to);
    return NextResponse.json({
      ok: true,
      message: `Test email sent to ${to}`,
      id: result.id,
      skipped: result.skipped,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Resend send failed",
      },
      { status: 502 },
    );
  }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    configured: emailConfigured(),
    from: "admin@mytutoringhub.com",
    hint: "POST { to: your@email } to send a test message notification.",
  });
}
