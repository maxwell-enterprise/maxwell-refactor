import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  /**
   * Dev-only: forward /fe/* to Nest so you can set NEXT_PUBLIC_API_BASE_URL to
   * http://localhost:3000/fe (same origin as Next) and avoid CORS. Default FE
   * still uses http://localhost:3002/fe directly.
   */
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const target =
      process.env.NEXT_PUBLIC_API_PROXY_TARGET || "http://127.0.0.1:3002";
    return [{ source: "/fe/:path*", destination: `${target}/fe/:path*` }];
  },
};

export default nextConfig;
