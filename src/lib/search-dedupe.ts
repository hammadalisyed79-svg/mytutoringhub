/**
 * Marketplace V2: one tutor per result set, using the highest-scoring listing.
 * Remaining eligible listings become "Also teaches…".
 */

export type DedupeListingInput = {
  tutorProfileId: string;
  listingId: string;
  subject: string;
  title: string;
  level: string;
  score: number;
};

export type AlsoTeachesItem = {
  listingId: string;
  subject: string;
  title: string;
  level: string;
};

export type DedupedTutorResult<T extends DedupeListingInput> = T & {
  alsoTeaches: AlsoTeachesItem[];
};

export function dedupeSearchByTutor<T extends DedupeListingInput>(
  scored: T[],
  maxAlso = 4,
): DedupedTutorResult<T>[] {
  const byTutor = new Map<string, T[]>();
  for (const row of scored) {
    const list = byTutor.get(row.tutorProfileId) || [];
    list.push(row);
    byTutor.set(row.tutorProfileId, list);
  }

  const out: DedupedTutorResult<T>[] = [];
  for (const group of byTutor.values()) {
    group.sort((a, b) => b.score - a.score);
    const best = group[0]!;
    const alsoTeaches = group.slice(1, 1 + maxAlso).map((row) => ({
      listingId: row.listingId,
      subject: row.subject,
      title: row.title,
      level: row.level,
    }));
    out.push({ ...best, alsoTeaches });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}
