import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/search-tutors";
import {
  catalogSubjectNames,
  mergeSubjectNames,
  parseRemoteSubjectsPayload,
  subjectNamesFromObjectKey,
} from "@/lib/subject-catalog";
import {
  getObjectUtf8,
  isR2Configured,
  listCommonPrefixes,
  listObjectSummaries,
  r2NotConfiguredMessage,
} from "@/lib/past-papers/r2";

export const DEFAULT_R2_SUBJECTS_KEY = "catalog/subjects.json";

export type SubjectSyncResult = {
  created: number;
  updated: number;
  unchanged: number;
  total: number;
  catalogCount: number;
  r2Count: number;
  r2Configured: boolean;
  sources: string[];
  warning?: string;
};

function r2SubjectsKey() {
  return (process.env.R2_SUBJECTS_KEY || DEFAULT_R2_SUBJECTS_KEY).trim().replace(/^\/+/, "");
}

function isMissingR2Object(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const rec = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  const status = rec.$metadata?.httpStatusCode;
  return rec.name === "NoSuchKey" || rec.name === "NotFound" || rec.Code === "NoSuchKey" || status === 404;
}

async function loadJsonSubjectNames(): Promise<{ names: string[]; found: boolean }> {
  const key = r2SubjectsKey();
  try {
    const text = await getObjectUtf8(key);
    return { names: parseRemoteSubjectsPayload(text), found: true };
  } catch (err) {
    if (isMissingR2Object(err)) return { names: [], found: false };
    throw err;
  }
}

async function loadFolderSubjectNames() {
  const names: string[] = [];
  const objects = await listObjectSummaries("cambridge/", 1500);
  for (const obj of objects) names.push(...subjectNamesFromObjectKey(obj.key));

  const extraPrefix = (process.env.R2_PREFIX || "").trim();
  if (extraPrefix && !extraPrefix.replace(/\\/g, "/").startsWith("cambridge/")) {
    const more = await listObjectSummaries(extraPrefix, 800);
    for (const obj of more) names.push(...subjectNamesFromObjectKey(obj.key));
  }

  if (objects.length === 0) {
    const roots = await listCommonPrefixes("", 20);
    for (const root of roots.slice(0, 12)) {
      names.push(...subjectNamesFromObjectKey(root));
      const children = await listCommonPrefixes(root, 40);
      for (const child of children) names.push(...subjectNamesFromObjectKey(child));
    }
  }

  return mergeSubjectNames(names);
}

export async function loadCloudflareSubjectNames(): Promise<{
  names: string[];
  warning?: string;
}> {
  if (!isR2Configured()) {
    return { names: [], warning: r2NotConfiguredMessage() };
  }

  const json = await loadJsonSubjectNames();
  const folders = await loadFolderSubjectNames();
  const names = mergeSubjectNames(json.names, folders);
  if (!json.found && folders.length === 0) {
    return {
      names,
      warning: `No subjects file at R2 key “${r2SubjectsKey()}” and no subject folders were found in the bucket.`,
    };
  }
  return { names };
}

function uniqueSlug(base: string, taken: Set<string>) {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export async function syncSubjectsFromSources(): Promise<SubjectSyncResult> {
  const catalog = catalogSubjectNames();
  const sources = ["catalog"];
  let r2Names: string[] = [];
  let warning: string | undefined;
  const r2Configured = isR2Configured();

  if (!r2Configured) {
    warning = r2NotConfiguredMessage();
  } else {
    try {
      const loaded = await loadCloudflareSubjectNames();
      r2Names = loaded.names;
      if (loaded.warning) warning = loaded.warning;
      if (r2Names.length) sources.push("cloudflare-r2");
      else if (!warning) warning = "Cloudflare R2 is configured but returned no extra subject names.";
    } catch (err) {
      warning = err instanceof Error ? err.message : "Could not read subjects from Cloudflare R2";
    }
  }

  const names = mergeSubjectNames(catalog, r2Names);
  const existing = await prisma.subject.findMany();
  const byName = new Map(existing.map((row) => [row.name.toLowerCase(), row]));
  const takenSlugs = new Set(existing.map((row) => row.slug));

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const name of names) {
    const current = byName.get(name.toLowerCase());
    if (current) {
      if (current.name === name) {
        unchanged += 1;
        continue;
      }
      await prisma.subject.update({ where: { id: current.id }, data: { name } });
      current.name = name;
      updated += 1;
      continue;
    }

    const slug = uniqueSlug(slugify(name), takenSlugs);
    const row = await prisma.subject.create({ data: { name, slug } });
    byName.set(name.toLowerCase(), row);
    takenSlugs.add(slug);
    created += 1;
  }

  const total = await prisma.subject.count();
  return {
    created,
    updated,
    unchanged,
    total,
    catalogCount: catalog.length,
    r2Count: r2Names.length,
    r2Configured,
    sources,
    ...(warning ? { warning } : {}),
  };
}
