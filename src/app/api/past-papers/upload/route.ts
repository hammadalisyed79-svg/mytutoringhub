import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage is not configured. Add BLOB_READ_WRITE_TOKEN." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "PDF must be under 12MB" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Upload a PDF" }, { status: 400 });
  }

  const key = String(form.get("catalogKey") || "paper").replace(/[^a-z0-9_-]/gi, "-");
  const pathname = `past-papers/${key}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.pdf`;
  const blob = await put(pathname, file, {
    access: "public",
    contentType: "application/pdf",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ url: blob.url });
}
