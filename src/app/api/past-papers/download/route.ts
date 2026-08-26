import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPastPaperFeePkr, parsePastPaperKey } from "@/lib/past-papers";
import { paperHasFile } from "@/lib/past-papers/availability";
import { isSafeCatalogKey } from "@/lib/past-papers/catalog-key";
import { fetchPastPaperPdfBytes } from "@/lib/past-papers/fetch-paper-bytes";
import { watermarkPastPaperPdf } from "@/lib/past-papers/pdf-watermark";
import { siteUrl } from "@/lib/seo";

export const runtime = "nodejs";

function attachmentFilename(name: string) {
  const safe = name.replace(/["\r\n]/g, "").trim() || "past-paper.pdf";
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const key = new URL(req.url).searchParams.get("key") || "";
  if (!isSafeCatalogKey(key)) {
    return NextResponse.json({ error: "Unknown past paper" }, { status: 404 });
  }
  const listing = parsePastPaperKey(key);
  const catalogKey = listing?.key || key;

  const paper = await prisma.pastPaper.findUnique({ where: { catalogKey } });
  if (!paper || !paperHasFile(paper) || !paper.published || paper.isActive === false) {
    return NextResponse.json({ error: "This paper is not available yet" }, { status: 404 });
  }

  // TODO: gate premium papers — when a isPremium flag is added to PastPaper,
  // check it here and call getUserPlan to enforce student plan limits.
  // For now all papers are treated as free-tier accessible.

  const fee = await getPastPaperFeePkr();
  const allowed =
    session.user.role === "ADMIN" ||
    fee === 0 ||
    Boolean(
      await prisma.pastPaperPurchase.findFirst({
        where: { userId: session.user.id, catalogKey, status: "PAID" },
      }),
    );

  if (!allowed) {
    return NextResponse.json({ error: "Purchase this paper to download it" }, { status: 402 });
  }

  let fetched;
  try {
    fetched = await fetchPastPaperPdfBytes(paper);
  } catch (err) {
    console.error("Past paper fetch failed", catalogKey, err);
    const message = err instanceof Error ? err.message : "Could not load past paper";
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  let watermarked: Uint8Array;
  try {
    watermarked = await watermarkPastPaperPdf(fetched.buffer, { siteUrl: siteUrl() });
  } catch (err) {
    console.error("Past paper watermark failed", catalogKey, err);
    return NextResponse.json({ error: "Could not prepare download" }, { status: 502 });
  }

  await prisma.pastPaper.update({
    where: { id: paper.id },
    data: { downloadCount: { increment: 1 } },
  });

  const filename = attachmentFilename(fetched.filename);
  const body = Buffer.from(watermarked);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(body.byteLength),
    },
  });
}
