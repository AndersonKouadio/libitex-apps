import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  images: {
    // Fix I5 Module 7 : next/image active pour la vitrine publique
    // (lazy load, srcset webp/avif, optimisation auto). Les images sont
    // hebergees sur MinIO derriere libitex-storage.lunion-lab.com.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "libitex-storage.lunion-lab.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
