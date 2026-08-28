import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { becomeTutor } from "@/lib/oauth";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await becomeTutor(session.user.id);
    return NextResponse.json({
      ok: true,
      alreadyTutor: result.alreadyTutor,
      redirect: "/dashboard/tutor?tab=profile",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not switch to a tutor account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
