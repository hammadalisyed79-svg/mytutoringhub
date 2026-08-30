import Link from "next/link";
import { auth } from "@/lib/auth";
import { STUDENT_REQUESTS_LINE, VALUE_PROPOSITION } from "@/lib/marketing-copy";
import { pageMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { ReportButton } from "@/components/ReportButton";

export const metadata = pageMetadata({
  title: "Student Requests – Find Students Who Need a Tutor",
  description: `${STUDENT_REQUESTS_LINE} Browse open requests by subject and city. Tutors can reply within their monthly enquiry limits; Tutor Pro unlocks unlimited reveals.`,
  path: "/ads",
});

function subjectTokens(value: string) {
  return value
    .split(/[,;|]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function subjectsMatch(adSubject: string, tutorSubjects: string[]) {
  const ad = adSubject.toLowerCase();
  return tutorSubjects.some((s) => ad.includes(s) || s.includes(ad));
}

function requestMatchScore(
  ad: {
    subject: string;
    level: string;
    board: string | null;
    location: string;
    online: boolean;
    inPerson: boolean;
  },
  tutor: {
    subjects: string[];
    levels: string[];
    boards: string[];
    location: string;
    online: boolean;
    inPerson: boolean;
  },
) {
  let score = 0;
  if (subjectsMatch(ad.subject, tutor.subjects)) score += 40;
  if (
    ad.level &&
    tutor.levels.some(
      (lvl) =>
        lvl.includes(ad.level.toLowerCase()) || ad.level.toLowerCase().includes(lvl),
    )
  ) {
    score += 20;
  }
  if (
    ad.board &&
    tutor.boards.some(
      (b) => b.includes(ad.board!.toLowerCase()) || ad.board!.toLowerCase().includes(b),
    )
  ) {
    score += 15;
  }
  if (
    ad.location &&
    tutor.location &&
    (tutor.location.includes(ad.location.toLowerCase()) ||
      ad.location.toLowerCase().includes(tutor.location))
  ) {
    score += 10;
  }
  if ((ad.online && tutor.online) || (ad.inPerson && tutor.inPerson)) score += 8;
  return score;
}

export default async function AdsPage() {
  const session = await auth();
  const currency = await getVisitorCurrency();
  const ads = await prisma.studentAd.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });

  let tutorMatch: {
    subjects: string[];
    levels: string[];
    boards: string[];
    location: string;
    online: boolean;
    inPerson: boolean;
  } | null = null;

  if (session?.user?.role === "TUTOR") {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        subjects: true,
        levels: true,
        location: true,
        online: true,
        inPerson: true,
        subjectProfiles: {
          where: { status: "ACTIVE" },
          select: { subject: true, level: true, board: true, location: true, online: true, inPerson: true },
        },
      },
    });
    if (profile) {
      const listingSubjects = profile.subjectProfiles.map((p) => p.subject.toLowerCase());
      const listingLevels = profile.subjectProfiles.map((p) => p.level.toLowerCase());
      const listingBoards = profile.subjectProfiles
        .map((p) => (p.board || "").toLowerCase())
        .filter(Boolean);
      tutorMatch = {
        subjects: [...new Set([...subjectTokens(profile.subjects || ""), ...listingSubjects])],
        levels: [
          ...new Set([
            ...subjectTokens(profile.levels || ""),
            ...listingLevels,
          ]),
        ],
        boards: [...new Set(listingBoards)],
        location: (profile.location || "").toLowerCase(),
        online: profile.online || profile.subjectProfiles.some((p) => p.online),
        inPerson: profile.inPerson || profile.subjectProfiles.some((p) => p.inPerson),
      };
    }
  }

  const sortedAds =
    tutorMatch && tutorMatch.subjects.length > 0
      ? [...ads].sort((a, b) => {
          const aScore = requestMatchScore(a, tutorMatch!);
          const bScore = requestMatchScore(b, tutorMatch!);
          return bScore - aScore || b.createdAt.getTime() - a.createdAt.getTime();
        })
      : ads;

  return (
    <div className="page">
      <div className="container">
        <header className="panel page-hero">
          <div className="page-hero-copy">
            <h1 className="page-title">Student requests</h1>
            <p className="muted">{STUDENT_REQUESTS_LINE}</p>
          </div>
          {session?.user?.role === "STUDENT" && (
            <div className="page-hero-actions">
              <Link href="/ads/new" className="btn btn-sm">
                Post a request
              </Link>
            </div>
          )}
        </header>

        <p className="muted ads-board-note">
          {VALUE_PROPOSITION}
          {tutorMatch && tutorMatch.subjects.length > 0
            ? " Requests matching your Teaching Profiles appear first."
            : ""}
        </p>

        <div className="results">
          {sortedAds.length === 0 && (
            <div className="panel empty-state">
              <h2>No open requests right now</h2>
              <p className="muted">
                Students with a Pass can post what they need. Tutors can message students from this
                board (free accounts include a monthly enquiry allowance; Tutor Pro unlocks
                unlimited reveals).
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
          {sortedAds.map((ad) => {
            const score = tutorMatch ? requestMatchScore(ad, tutorMatch) : 0;
            return (
              <article key={ad.id} className={`ad-row${score >= 40 ? " ad-row--match" : ""}`}>
                <div className="meta">
                  <span className="badge">{ad.subject}</span>
                  {score >= 40 && <span className="badge badge-verified">Matches you</span>}
                  <span>{ad.level}</span>
                  {ad.board && <span>{ad.board}</span>}
                  {ad.syllabusCode && <span>{ad.syllabusCode}</span>}
                  <span>{ad.location}</span>
                  {ad.budget != null && <span>Budget {formatHourly(ad.budget, currency)}</span>}
                </div>
                <h2 style={{ margin: "0.2rem 0", fontSize: "1.2rem" }}>{ad.title}</h2>
                <p style={{ margin: 0 }}>{ad.description}</p>
                <div className="ad-row-footer">
                  <span className="ad-row-poster">
                    {[ad.online ? "Online" : null, ad.inPerson ? "In person" : null]
                      .filter(Boolean)
                      .join(" · ")}
                    {" · "}
                    Posted by {ad.user.name}
                  </span>
                  <div className="ad-row-actions">
                    {session?.user?.role === "TUTOR" && (
                      <Link className="btn btn-sm" href={`/messages?to=${ad.user.id}&ad=${ad.id}`}>
                        Message student
                      </Link>
                    )}
                    {session?.user && <ReportButton targetType="STUDENT_AD" targetId={ad.id} />}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
