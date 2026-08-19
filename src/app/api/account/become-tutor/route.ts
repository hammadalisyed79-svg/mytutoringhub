import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const alreadyTutor = user.role === "TUTOR";
    if (!alreadyTutor) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: "TUTOR" },
      });
    }

    return NextResponse.json({
      ok: true,
      alreadyTutor,
      redirect: "/dashboard",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not switch to a tutor account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
