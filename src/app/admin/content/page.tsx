import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import {
  AdminActionButton,
  AdminSettingsForm,
  AdminSubjectCreateForm,
  AdminSubjectRenameForm,
  AdminSyncSubjectsButton,
} from "@/components/AdminActions";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [settings, subjects] = await Promise.all([
    getSiteSettings(),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <div>
        <h1 className="page-title">Content & site control</h1>
        <p className="muted">
          Subjects, maintenance, announcements, and feature switches. Catalog prices are on{" "}
          <Link href="/admin/plans">Plans & prices</Link>.
        </p>
      </div>

      <section className="panel">
        <h2>Site settings</h2>
        <AdminSettingsForm settings={settings} />
      </section>

      <section className="panel">
        <h2>Subjects ({subjects.length})</h2>
        <AdminSyncSubjectsButton />
        <AdminSubjectCreateForm />
        {subjects.length === 0 && <p className="muted">No subjects yet.</p>}
        <div className="results" style={{ marginTop: "1rem" }}>
          {subjects.map((s) => (
            <article key={s.id} className="ad-row">
              <strong>{s.name}</strong>
              <span className="muted">{s.slug}</span>
              <AdminSubjectRenameForm id={s.id} name={s.name} />
              <AdminActionButton
                action="subject_delete"
                id={s.id}
                label="Delete"
                confirm={`Delete subject ${s.name}?`}
                danger
              />
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
