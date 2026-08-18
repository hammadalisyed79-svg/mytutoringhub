import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, writeAdminAudit } from "@/lib/admin";
import { isR2Configured, r2NotConfiguredMessage } from "@/lib/past-papers/r2";
import {
  commitManifestJob,
  parseManifestPayload,
  previewManifestEntries,
  previewR2List,
} from "@/lib/past-papers/manifest-import";

export const runtime = "nodejs";
export const maxDuration = 300;

const jsonSchema = z.object({
  action: z.enum(["preview", "commit", "preview-r2"]),
  prefix: z.string().max(200).optional(),
  jobId: z.string().min(8).max(80).optional(),
  itemIds: z.array(z.string().min(8).max(80)).max(2000).optional(),
  replaceExisting: z.boolean().optional(),
  manifest: z.unknown().optional(),
});

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let action: "preview" | "commit" | "preview-r2" = "preview";
    let prefix: string | undefined;
    let jobId: string | undefined;
    let itemIds: string[] | undefined;
    let replaceExisting = false;
    let payload: unknown;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      action = String(form.get("action") || "preview") as typeof action;
      prefix = String(form.get("prefix") || "") || undefined;
      jobId = String(form.get("jobId") || "") || undefined;
      const file = form.get("manifest") || form.get("file");
      if (file instanceof File) {
        const text = await file.text();
        payload = JSON.parse(text);
      }
    } else {
      const body = jsonSchema.parse(await req.json());
      action = body.action;
      prefix = body.prefix;
      jobId = body.jobId;
      itemIds = body.itemIds;
      replaceExisting = Boolean(body.replaceExisting);
      payload = body.manifest;
    }

    if (action === "preview-r2") {
      if (!isR2Configured()) {
        return NextResponse.json({ error: r2NotConfiguredMessage() }, { status: 503 });
      }
      const job = await previewR2List({ adminId: session.user.id, prefix });
      await writeAdminAudit({
        adminId: session.user.id,
        action: "past_paper_r2_preview",
        targetType: "ImportJob",
        targetId: job.id,
        detail: `${job.totalItems} R2 object(s)`,
      });
      return NextResponse.json(job);
    }

    if (action === "preview") {
      const entries = parseManifestPayload(payload);
      if (!entries.length) {
        return NextResponse.json(
          { error: "No past-paper files found in the JSON manifest" },
          { status: 400 },
        );
      }
      const job = await previewManifestEntries({
        adminId: session.user.id,
        entries,
        sourceLabel: "JSON manifest upload",
      });
      await writeAdminAudit({
        adminId: session.user.id,
        action: "past_paper_manifest_preview",
        targetType: "ImportJob",
        targetId: job.id,
        detail: `${job.totalItems} manifest item(s)`,
      });
      return NextResponse.json(job);
    }

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required to commit" }, { status: 400 });
    }
    const job = await commitManifestJob({
      jobId,
      adminId: session.user.id,
      itemIds,
      replaceExisting,
    });
    await writeAdminAudit({
      adminId: session.user.id,
      action: "past_paper_manifest_commit",
      targetType: "ImportJob",
      targetId: job.id,
      detail: `imported=${job.importedCount} exists=${job.existsCount} failed=${job.failedCount}`,
    });
    return NextResponse.json(job);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Manifest must be valid JSON" }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Manifest ingest failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
