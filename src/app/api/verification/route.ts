import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  filesForSlot,
  idNeedsBack,
  parseVerificationDocs,
} from "@/lib/verification-docs";

const schema = z.object({
  docUrls: z.string().min(5),
  notes: z.string().max(2000).optional(),
  idType: z.string().max(80).optional(),
});

function missingSidesError(docUrls: string) {
  const docs = parseVerificationDocs(docUrls);
  if (!docs.length) return "Upload the required document sides.";
  const id = filesForSlot(docs, "id");
  const hasId = Boolean(id.front || id.back);
  if (hasId) {
    const type = id.idType || "National ID / CNIC";
    if (!id.front) {
      return type === "Passport" ? "Upload the passport photo page." : "Upload the front of your photo ID.";
    }
    if (idNeedsBack(type) && !id.back) return `Upload the back of your ${type}.`;
  }
  const qualification = filesForSlot(docs, "qualification");
  if (qualification.back && !qualification.front) return "Upload the front of your qualification document.";
  const teaching = filesForSlot(docs, "teaching");
  if (teaching.back && !teaching.front) return "Upload the front of your teaching certificate.";
  return "";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.verificationRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = schema.parse(await req.json());
  const sideError = missingSidesError(data.docUrls);
  if (sideError) return NextResponse.json({ error: sideError }, { status: 400 });

  const approved = await prisma.verificationRequest.findMany({
    where: { userId: session.user.id, status: "APPROVED" },
    select: { docUrls: true },
  });
  const idAlreadyAccepted = approved.some((row) => parseVerificationDocs(row.docUrls).some((doc) => doc.slot === "id"));
  if (!idAlreadyAccepted && !parseVerificationDocs(data.docUrls).some((doc) => doc.slot === "id")) {
    return NextResponse.json(
      { error: "A government photo ID (passport, national ID, or driving licence) is required." },
      { status: 400 },
    );
  }

  const pending = await prisma.verificationRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
  });
  if (pending) {
    const item = await prisma.verificationRequest.update({
      where: { id: pending.id },
      data: {
        docUrls: data.docUrls,
        notes: data.notes || pending.notes,
      },
    });
    return NextResponse.json(item);
  }

  const item = await prisma.verificationRequest.create({
    data: {
      userId: session.user.id,
      docUrls: data.docUrls,
      notes: data.notes || null,
      status: "PENDING",
    },
  });
  return NextResponse.json(item);
}
