import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listingPath } from "@/lib/subject-profile";
import {
  activeCanonicalCollisionGroups,
  canApplyActiveCanonicalUniqueIndex,
  groupByCanonicalSubject,
  multiRowCanonicalGroups,
} from "@/lib/teaching-profile-duplicates";
import {
  dryRunConsolidateGroup,
  leftoverCsvTagsNotExploded,
  TEACHING_PROFILE_SURVIVOR_RULES,
  type ConsolidationListing,
} from "@/lib/teaching-profile-consolidation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teaching Profile duplicates" };

export default async function AdminTeachingProfilesPage() {
  const rows = await prisma.subjectProfile.findMany({
    select: {
      id: true,
      tutorProfileId: true,
      subject: true,
      status: true,
      level: true,
      board: true,
      qualification: true,
      syllabusCode: true,
      rate: true,
      boostUntil: true,
      highlightedUntil: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      description: true,
      headline: true,
      tutorProfile: {
        select: {
          id: true,
          subjects: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: [{ tutorProfileId: "asc" }, { createdAt: "asc" }],
  });

  const listings: ConsolidationListing[] = rows.map((row) => ({
    id: row.id,
    tutorProfileId: row.tutorProfileId,
    status: row.status,
    subject: row.subject,
    title: row.title,
    level: row.level,
    board: row.board,
    qualification: row.qualification,
    syllabusCode: row.syllabusCode,
    rate: row.rate,
    boostUntil: row.boostUntil,
    highlightedUntil: row.highlightedUntil,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    description: row.description,
    headline: row.headline,
  }));

  const groups = groupByCanonicalSubject(listings);
  const multi = multiRowCanonicalGroups(groups);
  const activeCollisions = activeCanonicalCollisionGroups(groups);
  const uniqueIndexSafe = canApplyActiveCanonicalUniqueIndex(groups);
  const dryRuns = multi.map((g) => dryRunConsolidateGroup(g));
  const now = new Date();

  const leftoverByTutor = new Map<
    string,
    { name: string; email: string; tags: ReturnType<typeof leftoverCsvTagsNotExploded> }
  >();
  for (const row of rows) {
    const tutorId = row.tutorProfileId;
    if (leftoverByTutor.has(tutorId)) continue;
    const tutorListings = listings.filter((item) => item.tutorProfileId === tutorId);
    const tags = leftoverCsvTagsNotExploded(row.tutorProfile.subjects, tutorListings);
    leftoverByTutor.set(tutorId, {
      name: row.tutorProfile.user.name,
      email: row.tutorProfile.user.email,
      tags,
    });
  }
  const leftoverTutors = [...leftoverByTutor.entries()].filter(([, v]) => v.tags.length > 0);

  const tutorName = (tutorProfileId: string) => {
    const row = rows.find((r) => r.tutorProfileId === tutorProfileId);
    return row?.tutorProfile.user.name || tutorProfileId;
  };

  return (
    <>
      <div>
        <h1 className="page-title">Teaching Profile duplicates</h1>
        <p className="muted">
          Read-only report. One ACTIVE Teaching Profile per canonical subject is the product rule
          going forward. Existing duplicate rows are <strong>not</strong> merged, paused, or
          deleted here. Unique index SQL is still not applied.
        </p>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat">
          <strong>{rows.length}</strong>
          <span>Teaching Profiles</span>
        </div>
        <div className="admin-stat">
          <strong>{activeCollisions.length}</strong>
          <span>ACTIVE collision groups</span>
        </div>
        <div className="admin-stat">
          <strong>{multi.length}</strong>
          <span>Same-canonical groups (any status)</span>
        </div>
        <div className="admin-stat">
          <strong>{uniqueIndexSafe ? "Yes" : "No"}</strong>
          <span>Unique index safe to apply</span>
        </div>
      </div>

      <p className="success panel" role="status">
        Dry-run only. Survivor ids below are what Phase 9 <em>would</em> keep. No redirects and no
        writes ran.
      </p>

      <section className="panel">
        <h2>ACTIVE collisions (block the unique index)</h2>
        {activeCollisions.length === 0 ? (
          <p className="muted">None — the partial unique index could be applied after operator review.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th>Canonical</th>
                  <th>ACTIVE</th>
                  <th>Raw subjects</th>
                  <th>Listing ids</th>
                </tr>
              </thead>
              <tbody>
                {activeCollisions.map((g) => (
                  <tr key={`${g.tutorProfileId}-${g.key}`}>
                    <td>
                      <Link href={`/admin/tutors/${g.tutorProfileId}`}>{tutorName(g.tutorProfileId)}</Link>
                    </td>
                    <td>{g.canonical}</td>
                    <td>{g.rows.filter((r) => r.status === "ACTIVE").length}</td>
                    <td>{[...new Set(g.rows.map((r) => r.subject))].join(", ")}</td>
                    <td>
                      {g.rows.map((r) => (
                        <span key={r.id}>
                          <Link href={listingPath(r.id)}>{r.id.slice(-6)}</Link>{" "}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Consolidation dry-run (not executed)</h2>
        <p className="muted">
          Would keep one Teaching Profile per group and 301 the rest. Public term: Teaching
          Profile. URLs stay <code>/listings/{"{id}"}</code> until Phase 9.
        </p>
        {dryRuns.length === 0 ? (
          <p className="muted">No same-canonical groups to preview.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th>Canonical</th>
                  <th>Would keep</th>
                  <th>Would redirect</th>
                  <th>Capability union</th>
                  <th>Conflicts</th>
                </tr>
              </thead>
              <tbody>
                {dryRuns.map((dry) => (
                  <tr key={`${dry.tutorProfileId}-${dry.canonical}`}>
                    <td>
                      <Link href={`/admin/tutors/${dry.tutorProfileId}`}>
                        {tutorName(dry.tutorProfileId)}
                      </Link>
                    </td>
                    <td>{dry.canonical}</td>
                    <td>
                      <Link href={listingPath(dry.survivorId)}>{dry.survivorId.slice(-8)}</Link>
                      <div className="muted">{dry.survivorReasons.join("; ")}</div>
                    </td>
                    <td>
                      {dry.redirectIds.length === 0
                        ? "—"
                        : dry.redirectIds.map((id) => (
                            <span key={id}>
                              <Link href={listingPath(id)}>{id.slice(-6)}</Link>{" "}
                            </span>
                          ))}
                    </td>
                    <td>
                      {dry.capabilityUnion.length
                        ? dry.capabilityUnion.map((c) => `${c.kind}:${c.value}`).join(" · ")
                        : "—"}
                    </td>
                    <td>
                      {[
                        dry.rateConflict ? "rate" : null,
                        dry.boostConflict ? "boost" : null,
                        dry.highlightConflict ? "highlight" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Leftover master CSV tags (do not explode)</h2>
        <p className="muted">
          These <code>TutorProfile.subjects</code> tags are not already a Teaching Profile. Do not
          auto-create extra profiles from them.
        </p>
        {leftoverTutors.length === 0 ? (
          <p className="muted">No leftover CSV tags without a Teaching Profile.</p>
        ) : (
          <ul>
            {leftoverTutors.map(([id, info]) => (
              <li key={id}>
                <Link href={`/admin/tutors/${id}`}>{info.name}</Link>{" "}
                <span className="muted">({info.email})</span> —{" "}
                {info.tags.map((t) => t.tag).join(", ")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Survivor rules</h2>
        <pre className="muted" style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>
          {TEACHING_PROFILE_SURVIVOR_RULES}
        </pre>
        <p className="muted">
          Generated {now.toISOString()}. Re-run{" "}
          <code>npx tsx scripts/dry-run-teaching-profile-consolidation.ts</code> for the markdown
          artifact.
        </p>
      </section>
    </>
  );
}
