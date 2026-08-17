import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export const COMPANY_ADMIN_EMAIL = "admin@mytutoringhub.com";

export function signedInHome(role?: string | null) {
  return role === "ADMIN" ? "/admin" : "/dashboard";
}

export async function requireAdmin(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return session;
}

export async function writeAdminAudit(opts: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: string | null;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: opts.adminId,
        action: opts.action,
        targetType: opts.targetType,
        targetId: opts.targetId,
        detail: opts.detail || null,
      },
    });
  } catch (err) {
    console.error("Admin audit log failed", err);
  }
}

export function isCompanyAdminEmail(email: string | null | undefined) {
  return (email || "").toLowerCase() === COMPANY_ADMIN_EMAIL;
}
