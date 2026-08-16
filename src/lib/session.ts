import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Role } from "@/lib/types";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireRole(roles: Role[]) {
  const { session, error } = await requireSession();
  if (error || !session) return { session: null, error: error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!roles.includes(session.user.role) && session.user.role !== "ADMIN") {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}
