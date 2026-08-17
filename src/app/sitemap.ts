import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { MARKET_CITIES } from "@/lib/currency";
import { slugify } from "@/lib/search-tutors";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com";
  const staticRoutes = [
    "",
    "/search",
    "/subjects",
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
    const cities = MARKET_CITIES.filter((c) => c !== "Online").slice(0, 10);
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
    return [...staticRoutes, ...subjectRoutes];
  } catch {
    return staticRoutes;
  }
}
