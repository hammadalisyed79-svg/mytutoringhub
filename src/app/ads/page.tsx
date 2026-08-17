import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatHourly } from "@/lib/pakistan";

export const metadata = { title: "Student ads" };

export default async function AdsPage() {
  const session = await auth();
  const ads = await prisma.studentAd.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title">Student requests</h1>
            <p className="section-lead">Students post what they need. Tutors can reach out to help.</p>
          </div>
          {session?.user?.role === "STUDENT" && (
            <Link href="/ads/new" className="btn">
              Post a request
            </Link>
          )}
        </div>

        <div className="results">
          {ads.length === 0 && <p className="muted">No open requests right now.</p>}
          {ads.map((ad) => (
            <article key={ad.id} className="ad-row">
              <div className="meta">
                <span className="badge">{ad.subject}</span>
                <span>{ad.level}</span>
                <span>{ad.location}</span>
                {ad.budget != null && <span>~{formatHourly(ad.budget)}</span>}
              </div>
              <h2 style={{ margin: "0.2rem 0", fontSize: "1.2rem" }}>{ad.title}</h2>
              <p style={{ margin: 0 }}>{ad.description}</p>
              <div className="meta">
                <span>Posted by {ad.user.name}</span>
                {session?.user?.role === "TUTOR" && (
                  <Link href={`/messages?to=${ad.user.id}&ad=${ad.id}`}>Message student</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
