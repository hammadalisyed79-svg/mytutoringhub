import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { ReportButton } from "@/components/ReportButton";

export const metadata = {
  title: "Student requests",
  description:
    "Browse open student requests for private tutors. Students with a Pass post what they need. Tutors with Tutor Basic can reply.",
};

function subjectTokens(value: string) {
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function subjectsMatch(adSubject: string, tutorSubjects: string[]) {
  const ad = adSubject.toLowerCase();
  return tutorSubjects.some((s) => ad.includes(s) || s.includes(ad));
}

export default async function AdsPage() {
  const session = await auth();
  const currency = await getVisitorCurrency();
  const ads = await prisma.studentAd.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });

  let tutorSubjects: string[] = [];
  if (session?.user?.role === "TUTOR") {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
      select: { subjects: true },
    });
    tutorSubjects = subjectTokens(profile?.subjects || "");
  }

  const sortedAds =
    tutorSubjects.length > 0
      ? [...ads].sort((a, b) => {
          const aMatch = subjectsMatch(a.subject, tutorSubjects) ? 0 : 1;
          const bMatch = subjectsMatch(b.subject, tutorSubjects) ? 0 : 1;
          return aMatch - bMatch;
        })
      : ads;

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title">Student requests</h1>
            <p className="section-lead">
              Students with a Pass post what they need. Tutors with Tutor Basic can reach out.
              {tutorSubjects.length > 0 && " Requests matching your subjects appear first."}
            </p>
          </div>
          {session?.user?.role === "STUDENT" && (
            <Link href="/ads/new" className="btn">
              Post a request
            </Link>
          )}
        </div>

        <div className="results">
          {sortedAds.length === 0 && (
            <div className="panel empty-state">
              <h2>No open requests right now</h2>
              <p className="muted">
                Students with a Pass can post what they need. Tutors with Tutor Basic can message
                them from this board.
              </p>
              {session?.user?.role === "STUDENT" ? (
                <Link href="/ads/new" className="btn">
                  Post a request
                </Link>
              ) : session?.user?.role === "TUTOR" ? null : (
                <Link href="/register?role=student" className="btn">
                  Join as student
                </Link>
              )}
            </div>
          )}
          {sortedAds.map((ad) => (
            <article key={ad.id} className="ad-row">
              <div className="meta">
                <span className="badge">{ad.subject}</span>
                <span>{ad.level}</span>
                <span>{ad.location}</span>
                {ad.budget != null && <span>~{formatHourly(ad.budget, currency)}</span>}
              </div>
              <h2 style={{ margin: "0.2rem 0", fontSize: "1.2rem" }}>{ad.title}</h2>
              <p style={{ margin: 0 }}>{ad.description}</p>
              <div className="meta">
                <span>Posted by {ad.user.name}</span>
                {session?.user?.role === "TUTOR" && (
                  <Link href={`/messages?to=${ad.user.id}&ad=${ad.id}`}>Message student</Link>
                )}
                {session?.user && <ReportButton targetType="STUDENT_AD" targetId={ad.id} />}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
