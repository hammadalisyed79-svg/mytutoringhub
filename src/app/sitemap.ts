import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { TOP_COUNTRIES } from "@/lib/markets";
import { publicAvailabilityWhere } from "@/lib/past-papers/availability";
import { slugify } from "@/lib/search-tutors";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com";
  const staticRoutes = [
    "",
    "/search",
    "/subjects",
    "/past-papers",
    "/ads",
    "/pricing",
    "/help",
    "/terms",
    "/privacy",
    "/how-it-works",
    "/become-a-tutor",
    "/about",
    "/contact",
    "/login",
    "/register",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(),
  }));

  try {
    const subjects = await prisma.subject.findMany({ take: 200 });
    const cities = [
      ...new Set(TOP_COUNTRIES.flatMap((c) => c.cities)),
    ].slice(0, 18);
    const subjectRoutes = subjects.flatMap((s) => {
      const slug = s.slug || slugify(s.name);
      return [
        { url: `${base}/s/${slug}`, lastModified: new Date() },
        ...cities.map((c) => ({
          url: `${base}/s/${slug}/${slugify(c)}`,
          lastModified: new Date(),
        })),
      ];
    });
    const papers = await prisma.pastPaper.findMany({
      where: publicAvailabilityWhere(),
      select: { board: true, qualification: true, subject: true, syllabusCode: true, updatedAt: true },
      take: 2000,
    });
    const paperRoutes = papers.map((paper) => {
      const boardSlug = /cambridge/i.test(paper.board) ? "cambridge" : slugify(paper.board);
      const levelSlug = slugify(paper.qualification || "paper");
      const subjectSlug = paper.syllabusCode
        ? `${slugify(paper.subject)}-${paper.syllabusCode.toLowerCase()}`
        : slugify(paper.subject);
      return {
        url: `${base}/past-papers/${boardSlug}/${levelSlug}/${subjectSlug}`,
        lastModified: paper.updatedAt,
      };
    });
    const seen = new Set<string>();
    const uniquePaperRoutes = paperRoutes.filter((row) => {
      if (seen.has(row.url)) return false;
      seen.add(row.url);
      return true;
    });
    return [...staticRoutes, ...subjectRoutes, ...uniquePaperRoutes];
  } catch {
    return staticRoutes;
  }
}
