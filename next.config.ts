import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The prototype is copied into public/ at build time (see "prebuild").
  async redirects() {
    return [{ source: "/prototype", destination: "/prototype/index.html", permanent: false }];
  },
};

export default nextConfig;
