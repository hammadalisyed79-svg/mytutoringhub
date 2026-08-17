import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/messages",
        "/settings",
        "/assistant",
        "/register/complete",
        "/receipt/",
        "/api/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
