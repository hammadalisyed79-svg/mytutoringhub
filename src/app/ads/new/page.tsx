import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canPostAd } from "@/lib/subscription";
import { NewAdForm } from "@/components/NewAdForm";
import type { Role } from "@/lib/types";
import Link from "next/link";

export const metadata = { title: "Post a request" };

export default async function NewAdPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, suspended: true },
    });
    if (me?.suspended) redirect("/dashboard");
    if (!me?.emailVerified) redirect("/dashboard?verify=1");
  }
  const allowed = await canPostAd(session.user.id, session.user.role as Role);
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="page">
      <div className="narrow">
        <h1 className="page-title">Post a tutor request</h1>
        {!allowed ? (
          <div className="panel">
            <p>An active Student Pass is required to post ads.</p>
            <Link href="/pricing" className="btn">
              Get Student Pass
            </Link>
          </div>
        ) : (
          <NewAdForm subjects={subjects.map((s) => s.name)} />
        )}
      </div>
    </div>
  );
}
