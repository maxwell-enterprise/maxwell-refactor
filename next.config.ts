import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Silence "multiple lockfiles" / wrong workspace root when
  // D:\Kerjaan\MAXWELL\package-lock.json sits above this app.
  outputFileTracingRoot: path.join(__dirname),
  /**
   * Forward /fe/* to Nest so the frontend can keep a same-origin
   * `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/fe` in both `next dev`
   * and local `next start` runs.
   */
  async rewrites() {
    const target =
      process.env.NEXT_PUBLIC_API_PROXY_TARGET || "http://127.0.0.1:3002";
    return [{ source: "/fe/:path*", destination: `${target}/fe/:path*` }];
  },
};

export default nextConfig;
