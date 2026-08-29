import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canPostAd } from "@/lib/subscription";
import { NewAdForm } from "@/components/NewAdForm";
import type { Role } from "@/lib/types";
import Link from "next/link";
import { catalogSubjectNames, mergeSubjectNames } from "@/lib/subject-catalog";
import { getVisitorRegion } from "@/lib/visitor-region";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { loginUrlWithNext } from "@/lib/safe-return-url";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata(
  "Post a request – My Tutoring Hub",
  "Post a student request for a private tutor. Student Pass required.",
);

type SearchParams = Promise<{
  subject?: string;
  level?: string;
  location?: string;
  country?: string;
  board?: string;
  syllabusCode?: string;
  online?: string;
  inPerson?: string;
  q?: string;
}>;

export default async function NewAdPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string" && value.trim()) qs.set(key, value);
  }
  const returnPath = qs.toString() ? `/ads/new?${qs.toString()}` : "/ads/new";

  const session = await auth();
  if (!session?.user) redirect(loginUrlWithNext(returnPath));
  if (session.user.role === "TUTOR") redirect("/ads");
  if (session.user.role !== "ADMIN") {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, suspended: true },
    });
    if (me?.suspended) redirect("/dashboard");
    if (!me?.emailVerified) redirect("/dashboard?verify=1");
  }
  const allowed = await canPostAd(session.user.id, session.user.role as Role);
  const region = getVisitorRegion(await headers());
  const currency = await getVisitorCurrency();
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  const subjectNames = mergeSubjectNames(
    subjects.map((s) => s.name),
    catalogSubjectNames(),
  );

  return (
    <div className="page">
      <div className="narrow">
        <h1 className="page-title">Post a tutor request</h1>
        <p className="muted">
          Describe the subject, level, and city. Tutors can reply within their enquiry limits. An
          active Student Pass is required to post. Budgets are entered in PKR and shown in{" "}
          <strong>{currency}</strong> on the board.
        </p>
        {!allowed ? (
          <div className="panel">
            <p>An active Student Pass is required to post a request.</p>
            <Link href="/pricing" className="btn">
              Get Student Pass
            </Link>
          </div>
        ) : (
          <NewAdForm
            subjects={subjectNames}
            titlePlaceholder={region.adTitlePlaceholder}
            levelPlaceholder={region.adLevelPlaceholder}
            currency={currency}
            initial={{
              subject: sp.subject,
              level: sp.level,
              location: sp.location,
              board: sp.board,
              syllabusCode: sp.syllabusCode,
              online: sp.online === "1" || sp.online === undefined,
              inPerson: sp.inPerson === "1",
              q: sp.q,
            }}
          />
        )}
      </div>
    </div>
  );
}
