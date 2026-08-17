import { NextResponse } from "next/server";
import { requireAdmin, writeAdminAudit } from "@/lib/admin";
import { scanPastPapers } from "@/lib/past-papers/import-service";
import { SourceNotEnabledError } from "@/lib/past-papers/sources";
import type { PastPaperSourceId } from "@/lib/past-papers/types";
import { MAX_PAST_PAPER_BYTES } from "@/lib/past-papers/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const source = String(form.get("source") || "MANUAL_UPLOAD") as PastPaperSourceId;
  const files: { filename: string; buffer: Buffer; mimeType?: string }[] = [];
  for (const value of form.getAll("files")) {
    if (value instanceof File) {
      if (value.size > MAX_PAST_PAPER_BYTES) {
        return NextResponse.json({ error: `${value.name} must be under 12MB` }, { status: 400 });
      }
      files.push({
        filename: value.name,
        buffer: Buffer.from(await value.arrayBuffer()),
        mimeType: value.type,
      });
    }
  }

  try {
    const job = await scanPastPapers({
      adminId: session.user.id,
      source,
      board: String(form.get("board") || "") || undefined,
      qualification: String(form.get("qualification") || "") || undefined,
      subject: String(form.get("subject") || "") || undefined,
      subjectCode: String(form.get("subjectCode") || "") || undefined,
      yearFrom: form.get("yearFrom") ? Number(form.get("yearFrom")) : undefined,
      yearTo: form.get("yearTo") ? Number(form.get("yearTo")) : undefined,
      session: String(form.get("session") || "") || undefined,
      documentType: String(form.get("documentType") || "") || undefined,
      urlsText: String(form.get("urlsText") || ""),
      files,
    });
    await writeAdminAudit({
      adminId: session.user.id,
      action: "past_paper_scan",
      targetType: "ImportJob",
      targetId: job.id,
      detail: `${job.totalItems} item(s) from ${source}`,
    });
    return NextResponse.json(job);
  } catch (err) {
    if (err instanceof SourceNotEnabledError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
