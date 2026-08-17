import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPastPaperFeePkr, parsePastPaperKey } from "@/lib/past-papers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const key = new URL(req.url).searchParams.get("key") || "";
  const listing = parsePastPaperKey(key);
  if (!listing) {
    return NextResponse.json({ error: "Unknown past paper" }, { status: 404 });
  }

  const paper = await prisma.pastPaper.findUnique({ where: { catalogKey: listing.key } });
  if (!paper?.fileUrl || !paper.published) {
    return NextResponse.json({ error: "This paper is not available yet" }, { status: 404 });
  }

  const fee = await getPastPaperFeePkr();
  const allowed =
    session.user.role === "ADMIN" ||
    fee === 0 ||
    Boolean(
      await prisma.pastPaperPurchase.findFirst({
        where: { userId: session.user.id, catalogKey: listing.key, status: "PAID" },
      }),
    );

  if (!allowed) {
    return NextResponse.json({ error: "Purchase this paper to download it" }, { status: 402 });
  }

  return NextResponse.redirect(paper.fileUrl);
}
