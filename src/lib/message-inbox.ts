import { prisma } from "@/lib/prisma";

export async function getUnreadMessageSummary(userId: string) {
  const where = {
    readAt: null as null,
    senderId: { not: userId },
    conversation: {
      OR: [{ userAId: userId }, { userBId: userId }],
    },
  };

  const [unread, latest] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        conversationId: true,
        sender: { select: { name: true } },
      },
    }),
  ]);

  return { unread, latest };
}
