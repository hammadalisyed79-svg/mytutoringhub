import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { curriculumLevels, uniqueCurriculumSubjects } from "@/lib/curriculum";
import { uniqueCurriculumBoards } from "@/lib/past-papers/browse";
import { listSourceAdapters } from "@/lib/past-papers/sources";
import { PastPaperImportClient } from "@/components/PastPaperImportClient";
import { R2ManifestImportClient } from "@/components/R2ManifestImportClient";

export const metadata = { title: "Past paper import · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPastPaperImportPage() {
  await requireAdminPage();
  const boards = uniqueCurriculumBoards();
  const levels = curriculumLevels();
  const subjects = uniqueCurriculumSubjects();
  const sources = listSourceAdapters();

  return (
    <>
      <div>
        <p className="muted">
          <Link href="/admin/past-papers">Past papers</Link>
          {" · "}
          <Link href="/admin/past-papers/imports">Import history</Link>
        </p>
        <h1 className="page-title">Past paper auto import</h1>
        <p className="muted">
          Upload PDFs you are allowed to host, or paste specific HTTPS PDF URLs. Cambridge filenames such as
          0620_s24_qp_42.pdf are parsed automatically. Board websites are not scraped. To refresh every paper already
          in Cloudflare R2, use <Link href="/admin/past-papers">Update past papers</Link> on the past papers page —
          that upserts catalog rows without downloading files. The form below is a dry-run for Chemistry 0620 only.
        </p>
      </div>
      <R2ManifestImportClient />
      <PastPaperImportClient boards={boards} levels={levels} subjects={subjects} sources={sources} />
    </>
  );
}
