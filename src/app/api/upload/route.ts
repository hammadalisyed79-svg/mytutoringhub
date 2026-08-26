import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateUploadMagicBytes } from "@/lib/upload-magic";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

function extFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function resolveContentType(file: File): string | null {
  if (file.type && ALLOWED.has(file.type)) return file.type;
  const mime = EXT_TO_MIME[extFromName(file.name)];
  return mime && ALLOWED.has(mime) ? mime : null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 });
  }
  const contentType = resolveContentType(file);
  if (!contentType) {
    return NextResponse.json(
      { error: "Only images (JPEG, PNG, WebP, GIF) and PDF are allowed" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateUploadMagicBytes(buffer, contentType)) {
    return NextResponse.json(
      { error: "File content does not match its type. Upload a valid image or PDF." },
      { status: 400 },
    );
  }

  const ext =
    contentType === "application/pdf"
      ? "pdf"
      : contentType.split("/")[1]?.replace("jpeg", "jpg") || extFromName(file.name) || "bin";
  const pathname = `uploads/${session.user.id}/${Date.now()}.${ext}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ url: blob.url });
}
