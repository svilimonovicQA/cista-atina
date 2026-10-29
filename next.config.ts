import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Prijava šalje do 3 kompresovane fotografije (~0,5 MB svaka). Vercel prima najviše 4,5 MB.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
