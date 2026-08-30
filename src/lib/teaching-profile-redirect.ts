import { prisma } from "@/lib/prisma";
import { listingPath } from "@/lib/subject-profile";

export async function resolveTeachingProfileRedirect(fromId: string): Promise<string | null> {
  const visited = new Set<string>();
  let current = fromId;
  for (let i = 0; i < 6; i += 1) {
    if (visited.has(current)) return null;
    visited.add(current);
    try {
      const rows = await prisma.$queryRaw<{ toId: string }[]>`
        SELECT "toId" FROM "TeachingProfileRedirect" WHERE "fromId" = ${current} LIMIT 1
      `;
      const toId = rows[0]?.toId;
      if (!toId || toId === current) return current === fromId ? null : current;
      current = toId;
    } catch {
      return current === fromId ? null : current;
    }
  }
  return current === fromId ? null : current;
}

export function teachingProfileRedirectPath(toId: string) {
  return listingPath(toId);
}
