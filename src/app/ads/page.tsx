import Link from "next/link";
import { auth } from "@/lib/auth";
import { STUDENT_REQUESTS_LINE } from "@/lib/marketing-copy";
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

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ posted?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
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
            <p className="section-lead">
              {session?.user?.role === "TUTOR"
                ? "Students looking for tutors — reply when you are a good fit."
                : session?.user?.role === "STUDENT"
                  ? "Tell tutors what you need — matching tutors can reply."
                  : "Browse open requests. Join free to post what you need — matching tutors can reply."}
            </p>
          </div>
          <div className="page-hero-actions">
            {session?.user?.role === "STUDENT" ? (
              <Link href="/ads/new" className="btn btn-sm">
                Post a request
              </Link>
            ) : !session?.user ? (
              <>
                <Link href="/register?role=student&next=/ads/new" className="btn btn-sm">
                  Join free to post
                </Link>
                <Link href="/login?next=/ads/new" className="btn btn-secondary btn-sm">
                  Log in
                </Link>
              </>
            ) : null}
          </div>
        </header>

        {sp.posted === "1" ? (
          <p className="success panel" role="status">
            Request posted. Matching tutors can see it on this board and reply in Messages.{" "}
            <Link href="/ads/new">Post another</Link>
            {" · "}
            <Link href="/dashboard/student">Dashboard</Link>
          </p>
        ) : null}

        {tutorMatch && tutorMatch.subjects.length > 0 ? (
          <p className="muted ads-board-note">
            Requests matching your subjects appear first.
          </p>
        ) : null}

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
              ) : session?.user?.role === "TUTOR" ? (
                <p>
                  <Link href="/pricing?plan=TUTOR_BASIC" className="btn">
                    View Tutor Pro
                  </Link>
                </p>
              ) : (
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
                <div className="ad-row-meta meta">
                  <span className="badge">{ad.subject}</span>
                  {score >= 40 && <span className="badge badge-verified">Matches you</span>}
                  <span className="ad-row-chip">{ad.level}</span>
                  {ad.board && <span className="ad-row-chip">{ad.board}</span>}
                  {ad.syllabusCode && <span className="ad-row-chip">{ad.syllabusCode}</span>}
                  <span className="ad-row-chip">{ad.location}</span>
                  {ad.budget != null && (
                    <span className="ad-row-chip ad-row-chip--budget">
                      Budget {formatHourly(ad.budget, currency)}
                    </span>
                  )}
                </div>
                <h2 className="ad-row-title">{ad.title}</h2>
                <p className="ad-row-desc">{ad.description}</p>
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
