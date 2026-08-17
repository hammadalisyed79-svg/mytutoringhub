import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  docUrls: z.string().min(5),
  notes: z.string().max(2000).optional(),
});

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
  const pending = await prisma.verificationRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
  });
  if (pending) {
    return NextResponse.json({ error: "You already have a pending request" }, { status: 400 });
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
