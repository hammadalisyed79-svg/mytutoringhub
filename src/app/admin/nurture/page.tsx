import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NURTURE_SEQUENCES } from "@/lib/email-nurture";
import {
  PROFILE_NURTURE_SEQUENCES,
  emailSequenceLabel,
} from "@/lib/email-sequence-labels";
import { getTutorProfileCompletion, completionInputFromTutorRow } from "@/lib/tutor-profile-completion";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ sequence?: string; profile?: string }>;

function nextProfileReminder(
  events: { sequence: string; sentAt: Date }[],
): string {
  const sent = new Set(events.map((e) => e.sequence));
  if (sent.has(NURTURE_SEQUENCES.TUTOR_PROFILE_R4)) return "All reminders sent";
  if (sent.has(NURTURE_SEQUENCES.TUTOR_PROFILE_R3)) return "Reminder 4 (final)";
  if (sent.has(NURTURE_SEQUENCES.TUTOR_PROFILE_R2)) return "Reminder 3";
  if (sent.has(NURTURE_SEQUENCES.TUTOR_PROFILE_R1)) return "Reminder 2";
  if (sent.has(NURTURE_SEQUENCES.TUTOR_PROFILE_NEVER_STARTED)) return "Reminder 1";
  return "Never started or reminder 1";
}

export default async function AdminNurturePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const profileOnly = sp.profile === "1";
  const sequenceFilter = sp.sequence?.trim();

  const where = {
    ...(profileOnly
      ? { sequence: { in: [...PROFILE_NURTURE_SEQUENCES] } }
      : sequenceFilter
        ? { sequence: sequenceFilter }
        : {}),
  };

  const [recentEvents, sequenceCounts, incompleteTutors, totalEvents] = await Promise.all([
    prisma.emailSequenceEvent.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: 80,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.emailSequenceEvent.groupBy({
      by: ["sequence"],
      _count: { sequence: true },
      orderBy: { _count: { sequence: "desc" } },
    }),
    prisma.user.findMany({
      where: {
        role: "TUTOR",
        suspended: false,
        emailVerified: { not: null },
        tutorProfile: { isNot: null },
      },
      include: {
        tutorProfile: {
          include: {
            subjectProfiles: {
              select: { status: true, subject: true, rate: true, online: true, inPerson: true },
            },
          },
        },
        emailSequenceEvents: {
          where: { sequence: { in: [...PROFILE_NURTURE_SEQUENCES] } },
          orderBy: { sentAt: "desc" },
        },
      },
      take: 200,
    }),
    prisma.emailSequenceEvent.count({ where }),
  ]);

  const incompleteRows = incompleteTutors
    .map((user) => {
      if (!user.tutorProfile) return null;
      const completion = getTutorProfileCompletion(
        completionInputFromTutorRow(user.tutorProfile, user.name),
      );
      if (completion.complete) return null;
      const profileEvents = user.emailSequenceEvents;
      const lastSent = profileEvents[0];
      return {
        user,
        completion,
        lastSent,
        next: nextProfileReminder(profileEvents),
        remindersSent: profileEvents.filter((e) =>
          e.sequence.startsWith("tutor_profile_r"),
        ).length,
      };
    })
    .filter(Boolean) as {
    user: (typeof incompleteTutors)[number];
    completion: ReturnType<typeof getTutorProfileCompletion>;
    lastSent: (typeof incompleteTutors)[number]["emailSequenceEvents"][number] | undefined;
    next: string;
    remindersSent: number;
  }[];

  incompleteRows.sort((a, b) => {
    const aTime = a.lastSent?.sentAt.getTime() ?? 0;
    const bTime = b.lastSent?.sentAt.getTime() ?? 0;
    return aTime - bTime;
  });

  const profileReminderCount = sequenceCounts
    .filter((row) => PROFILE_NURTURE_SEQUENCES.includes(row.sequence as (typeof PROFILE_NURTURE_SEQUENCES)[number]))
    .reduce((sum, row) => sum + row._count.sequence, 0);

  return (
    <>
      <div>
        <h1 className="page-title">Nurture emails</h1>
        <p className="muted section-lead">
          Automated reminder <strong>emails</strong> (not in-app Messages). Profile reminders run daily
          via cron at 10:00 UTC (<code>/api/digests/onboarding</code>). Each sequence sends at most
          once per user.
        </p>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat">
          <strong>{totalEvents.toLocaleString()}</strong>
          <span>Matching sends</span>
        </div>
        <div className="admin-stat">
          <strong>{profileReminderCount.toLocaleString()}</strong>
          <span>Profile-related sends</span>
        </div>
        <div className="admin-stat">
          <strong>{incompleteRows.length.toLocaleString()}</strong>
          <span>Incomplete tutor profiles</span>
        </div>
        <div className="admin-stat">
          <strong>
            {incompleteRows.filter((r) => !r.lastSent).length.toLocaleString()}
          </strong>
          <span>No profile email yet</span>
        </div>
      </div>

      <div className="admin-toolbar panel">
        <p className="admin-toolbar-label">Filter</p>
        <div className="admin-quick-links">
          <Link href="/admin/nurture" className={!profileOnly && !sequenceFilter ? "is-active" : undefined}>
            All emails
          </Link>
          <Link href="/admin/nurture?profile=1" className={profileOnly ? "is-active" : undefined}>
            Profile reminders only
          </Link>
        </div>
      </div>

      <section className="panel">
        <h2>Send counts by type</h2>
        {sequenceCounts.length === 0 && <p className="muted">No nurture emails recorded yet.</p>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Email type</th>
                <th>Total sent</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sequenceCounts.map((row) => (
                <tr key={row.sequence}>
                  <td>{emailSequenceLabel(row.sequence)}</td>
                  <td>{row._count.sequence.toLocaleString()}</td>
                  <td>
                    <Link href={`/admin/nurture?sequence=${encodeURIComponent(row.sequence)}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Incomplete tutor profiles</h2>
        <p className="muted">
          Tutors who still need required fields. Reminders 1–4 go out on days 1, 3, 7, and 14 after
          verify (if profile started). Never-started tutors get a separate email on day 3.
        </p>
        {incompleteRows.length === 0 && (
          <p className="muted">All verified tutors have complete profiles.</p>
        )}
        {incompleteRows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th>Progress</th>
                  <th>Missing</th>
                  <th>Reminders sent</th>
                  <th>Last email</th>
                  <th>Next due</th>
                </tr>
              </thead>
              <tbody>
                {incompleteRows.slice(0, 40).map((row) => (
                  <tr key={row.user.id}>
                    <td>
                      <Link href={`/admin/users/${row.user.id}`}>{row.user.name}</Link>
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {row.user.email}
                      </div>
                    </td>
                    <td>
                      {row.completion.requiredDone}/{row.completion.requiredTotal}
                    </td>
                    <td className="muted" style={{ maxWidth: "16rem" }}>
                      {row.completion.missingRequired.slice(0, 4).join(", ")}
                      {row.completion.missingRequired.length > 4 ? "…" : ""}
                    </td>
                    <td>{row.remindersSent}</td>
                    <td>
                      {row.lastSent
                        ? `${emailSequenceLabel(row.lastSent.sequence)} · ${row.lastSent.sentAt.toLocaleString()}`
                        : "—"}
                    </td>
                    <td>{row.next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Recent sends</h2>
        {sequenceFilter && (
          <p className="muted">
            Filtered: <strong>{emailSequenceLabel(sequenceFilter)}</strong> ·{" "}
            <Link href="/admin/nurture">Clear filter</Link>
          </p>
        )}
        {recentEvents.length === 0 && <p className="muted">No matching sends yet.</p>}
        <div className="results">
          {recentEvents.map((event) => (
            <Link key={event.id} href={`/admin/users/${event.userId}`} className="ad-row">
              <strong>{emailSequenceLabel(event.sequence)}</strong>
              <span className="muted">
                {event.user.name} · {event.user.email} · {event.user.role}
              </span>
              <span className="muted">{event.sentAt.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
