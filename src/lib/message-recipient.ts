import { prisma } from "@/lib/prisma";

export type ResolvedMessageRecipient = {
  userId: string;
  name: string;
  role: string;
};

/**
 * Resolve a messaging recipient from a user id or tutor-profile id.
 * Search and legacy links may pass tutorProfile.id; the messages API needs user.id.
 */
export async function resolveMessageRecipient(
  raw: string,
): Promise<ResolvedMessageRecipient | null> {
  const id = raw.trim();
  if (!id) return null;

  const asUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, role: true, suspended: true },
  });
  if (asUser && !asUser.suspended) {
    return { userId: asUser.id, name: asUser.name, role: asUser.role };
  }

  const asProfile = await prisma.tutorProfile.findUnique({
    where: { id },
    select: {
      user: { select: { id: true, name: true, role: true, suspended: true } },
    },
  });
  if (asProfile?.user && !asProfile.user.suspended) {
    return {
      userId: asProfile.user.id,
      name: asProfile.user.name,
      role: asProfile.user.role,
    };
  }

  return null;
}
