import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPastPaperFeePkr, parsePastPaperKey } from "@/lib/past-papers";
import { isSafeCatalogKey } from "@/lib/past-papers/catalog-key";

export const runtime = "nodejs";

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
  if (!paper?.fileUrl || !paper.published || paper.isActive === false) {
    return NextResponse.json({ error: "This paper is not available yet" }, { status: 404 });
  }

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

  await prisma.pastPaper.update({
    where: { id: paper.id },
    data: { downloadCount: { increment: 1 } },
  });

  return NextResponse.redirect(paper.fileUrl);
}
