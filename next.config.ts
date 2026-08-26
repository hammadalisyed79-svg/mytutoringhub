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
    ];
  },
};

export default nextConfig;
