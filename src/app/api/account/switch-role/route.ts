import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { switchAccountRole } from "@/lib/oauth";
import { trackProductEvent } from "@/lib/product-events";

export const runtime = "nodejs";

const bodySchema = z.object({
  role: z.enum(["STUDENT", "TUTOR"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose student or tutor mode." }, { status: 400 });
  }

  try {
    const result = await switchAccountRole(session.user.id, parsed.data.role);
    if (!result.already) {
      trackProductEvent("switch_account_role", {
        userId: session.user.id,
        role: result.role,
        hasTutorProfile: result.hasTutorProfile,
      });
    }
    return NextResponse.json({
      ok: true,
      role: result.role,
      already: result.already,
      hasTutorProfile: result.hasTutorProfile,
      redirect: result.redirect,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not switch profile mode";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
