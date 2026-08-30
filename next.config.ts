import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/join", destination: "/register", permanent: true },
      { source: "/settings/plan", destination: "/pricing", permanent: false },
      { source: "/dashboard/student/plan", destination: "/pricing", permanent: false },
      { source: "/dashboard/tutor/plan", destination: "/pricing", permanent: false },
      { source: "/study/assistant", destination: "/assistant", permanent: false },
      { source: "/student-requests", destination: "/ads", permanent: false },
      { source: "/student-requests/:path*", destination: "/ads", permanent: false },
      { source: "/requests", destination: "/ads", permanent: false },
      { source: "/requests/:path*", destination: "/ads", permanent: false },
      ...(await teachingProfileHttpRedirects()),
    ];
  },
};

/** Build-time 308s for merged Teaching Profile URLs (SEO). Page-level redirect remains a fallback. */
async function teachingProfileHttpRedirects(): Promise<
  { source: string; destination: string; permanent: boolean }[]
> {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!url) return [];
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      const rows = await prisma.$queryRaw<{ fromId: string; toId: string }[]>`
        SELECT "fromId", "toId" FROM "TeachingProfileRedirect"
      `;
      const map = new Map(rows.map((row) => [row.fromId, row.toId]));
      const resolve = (fromId: string) => {
        const visited = new Set<string>();
        let current = fromId;
        for (let i = 0; i < 6; i += 1) {
          const next = map.get(current);
          if (!next || next === current || visited.has(current)) break;
          visited.add(current);
          current = next;
        }
        return current === fromId ? null : current;
      };
      const redirects = [...map.keys()]
        .map((fromId) => {
          const toId = resolve(fromId);
          if (!toId) return null;
          return {
            source: `/listings/${fromId}`,
            destination: `/listings/${toId}`,
            permanent: true,
          };
        })
        .filter((row): row is { source: string; destination: string; permanent: boolean } => Boolean(row));
      if (redirects.length) {
        console.info(`[next.config] ${redirects.length} Teaching Profile 308 redirects`);
      }
      return redirects;
    } finally {
      await prisma.$disconnect();
    }
  } catch (err) {
    console.warn(
      "[next.config] TeachingProfileRedirect lookup skipped:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

export default nextConfig;
