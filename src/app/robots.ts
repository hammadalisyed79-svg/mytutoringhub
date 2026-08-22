import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/dashboard",
        "/messages",
        "/settings",
        "/assistant",
        "/study/",
        "/profile/edit",
        "/register/complete",
        "/receipt/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
