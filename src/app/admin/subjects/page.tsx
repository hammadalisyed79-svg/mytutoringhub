import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import {
  AdminActionButton,
  AdminSubjectCreateForm,
  AdminSubjectRenameForm,
} from "@/components/AdminActions";

export const metadata = { title: "Subjects · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSubjectsPage() {
  await requireAdminPage();
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <div>
        <h1 className="page-title">Subjects</h1>
        <p className="muted">These appear on the public subjects index and search.</p>
      </div>
      <section className="panel">
        <h2>Add subject</h2>
        <AdminSubjectCreateForm />
      </section>
      <section className="panel">
        <h2>All subjects</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td>
                    <AdminSubjectRenameForm id={s.id} name={s.name} />
                  </td>
                  <td className="muted">{s.slug}</td>
                  <td>
                    <AdminActionButton
                      action="subject_delete"
                      id={s.id}
                      label="Delete"
                      confirm={`Delete subject “${s.name}”?`}
                      danger
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
