import { prisma } from "@/lib/prisma";

export async function isEitherBlocked(userA: string, userB: string) {
  if (!userA || !userB || userA === userB) return false;
  const row = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function listBlockedIds(blockerId: string) {
  const rows = await prisma.userBlock.findMany({
    where: { blockerId },
    select: { blockedId: true },
  });
  return rows.map((r) => r.blockedId);
}
