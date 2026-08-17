import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { completeOnboarding } from "@/lib/oauth";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  role: z.enum(["STUDENT", "TUTOR"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = schema.parse(await req.json());
  await completeOnboarding(session.user.id, role as Role);

  return NextResponse.json({
    ok: true,
    redirect: role === "TUTOR" ? "/pricing?verify=sent" : "/pricing?verify=sent",
  });
}
