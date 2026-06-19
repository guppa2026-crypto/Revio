import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      { source: "/terms", destination: "/legal?tab=terms", permanent: false },
      { source: "/privacy", destination: "/legal?tab=privacy", permanent: false },
    ];
  },
};

export default nextConfig;
