import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
