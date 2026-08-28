import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publicAvailabilityWhere } from "@/lib/past-papers/availability";
import { slugify } from "@/lib/search-tutors";
import { siteUrl } from "@/lib/seo";
import { publicListedTutorWhere, filterCanonicallyPublicTutors, isIndexableSubjectHubSlug } from "@/lib/tutor-public-eligibility";

/**
 * Public sitemap only — no auth/utility routes, no thin city mass-generation.
 * Subject/city landings with zero tutors stay reachable but are noindex via page metadata.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const priorityMap: Record<string, number> = {
    "/": 1.0,
    "/search": 0.85,
    "/past-papers": 0.85,
    "/subjects": 0.85,
    "/pricing": 0.75,
    "/free-vs-paid": 0.72,
    "/become-a-tutor": 0.75,
    "/how-it-works": 0.7,
    "/ads": 0.65,
    "/about": 0.6,
    "/contact": 0.55,
    "/help": 0.55,
    "/terms": 0.35,
    "/privacy": 0.35,
    "/refund": 0.35,
  };
  const changeFreqMap: Record<string, MetadataRoute.Sitemap[number]["changeFrequency"]> = {
    "/": "daily",
    "/search": "daily",
    "/past-papers": "weekly",
    "/subjects": "weekly",
    "/pricing": "monthly",
    "/ads": "daily",
  };

  const staticRoutes = [
    "",
    "/search",
    "/subjects",
    "/past-papers",
    "/ads",
    "/pricing",
    "/free-vs-paid",
    "/help",
    "/terms",
    "/privacy",
    "/refund",
    "/how-it-works",
    "/become-a-tutor",
    "/about",
    "/contact",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: changeFreqMap[path || "/"] || "monthly",
    priority: priorityMap[path || "/"] ?? 0.5,
  }));

  try {
    const [subjects, papers, tutors, listings] = await Promise.all([
      prisma.subject.findMany({ select: { slug: true, name: true } }),
      prisma.pastPaper.findMany({
        where: publicAvailabilityWhere(),
        select: {
          board: true,
          qualification: true,
          subject: true,
          syllabusCode: true,
          updatedAt: true,
        },
      }),
      prisma.tutorProfile.findMany({
        where: publicListedTutorWhere(),
        select: {
          id: true,
          updatedAt: true,
          active: true,
          forceActive: true,
          photoUrl: true,
          headline: true,
          bio: true,
          country: true,
          location: true,
          subjects: true,
          hourlyRate: true,
          online: true,
          inPerson: true,
          qualifications: true,
          user: { select: { name: true, emailVerified: true, suspended: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.subjectProfile.findMany({
        where: {
          status: "ACTIVE",
          tutorProfile: publicListedTutorWhere(),
        },
        select: {
          id: true,
          updatedAt: true,
          tutorProfile: {
            select: {
              active: true,
              forceActive: true,
              photoUrl: true,
              headline: true,
              bio: true,
              country: true,
              location: true,
              subjects: true,
              online: true,
              inPerson: true,
              qualifications: true,
              user: { select: { name: true, emailVerified: true, suspended: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // Subject hubs only (no automatic city fan-out — prevents thin SEO URLs at scale)
    const subjectRoutes = subjects
      .map((s) => {
        const slug = s.slug || slugify(s.name);
        return { slug, name: s.name };
      })
      .filter((s) => isIndexableSubjectHubSlug(s.slug))
      .map((s) => ({
        url: `${base}/s/${s.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    const publicTutors = filterCanonicallyPublicTutors(tutors);
    const publicListings = listings.filter((row) =>
      filterCanonicallyPublicTutors([row.tutorProfile]).length > 0,
    );

    const seenPapers = new Set<string>();
    const paperRoutes = papers
      .map((paper) => {
        const boardSlug = /cambridge/i.test(paper.board) ? "cambridge" : slugify(paper.board);
        const levelSlug = slugify(paper.qualification || "paper");
        const subjectSlug = paper.syllabusCode
          ? `${slugify(paper.subject)}-${paper.syllabusCode.toLowerCase()}`
          : slugify(paper.subject);
        return {
          url: `${base}/past-papers/${boardSlug}/${levelSlug}/${subjectSlug}`,
          lastModified: paper.updatedAt,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        };
      })
      .filter((row) => {
        if (seenPapers.has(row.url)) return false;
        seenPapers.add(row.url);
        return true;
      });


    const tutorRoutes = publicTutors.map((t) => ({
      url: `${base}/tutors/${t.id}`,
      lastModified: t.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const listingRoutes = publicListings.map((l) => ({
      url: `${base}/listings/${l.id}`,
      lastModified: l.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

    return [...staticRoutes, ...subjectRoutes, ...paperRoutes, ...tutorRoutes, ...listingRoutes];
  } catch {
    return staticRoutes;
  }
}
