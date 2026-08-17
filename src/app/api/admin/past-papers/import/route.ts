import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, writeAdminAudit } from "@/lib/admin";
import { importSelectedItems } from "@/lib/past-papers/import-service";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  jobId: z.string().min(8).max(80),
  itemIds: z.array(z.string().min(8).max(80)).min(1).max(200),
  replaceExisting: z.boolean().optional(),
  overrides: z
    .record(
      z.string(),
      z.object({
        subject: z.string().max(120).optional(),
        board: z.string().max(120).optional(),
        qualification: z.string().max(80).optional(),
        year: z.number().int().min(1990).max(2035).optional(),
        session: z.string().max(40).optional(),
        componentCode: z.string().max(12).optional(),
        documentType: z.string().max(40).optional(),
        curriculumCode: z.string().max(80).optional(),
        syllabusCode: z.string().max(20).optional(),
      }),
    )
    .optional(),
});

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = schema.parse(await req.json());
    const job = await importSelectedItems({
      jobId: body.jobId,
      adminId: session.user.id,
      itemIds: body.itemIds,
      replaceExisting: body.replaceExisting,
      overrides: body.overrides,
    });
    await writeAdminAudit({
      adminId: session.user.id,
      action: "past_paper_import",
      targetType: "ImportJob",
      targetId: job.id,
      detail: `imported=${job.importedCount} failed=${job.failedCount}`,
    });
    return NextResponse.json(job);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
