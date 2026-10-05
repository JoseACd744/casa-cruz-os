import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El núcleo compartido se publica como TypeScript: Next lo compila.
  transpilePackages: ["@casacruz/core"],
  // Raíz del monorepo, para que Turbopack vea packages/.
  turbopack: { root: path.join(process.cwd(), "..", "..") },
  // Con bucket sólo viajan metadatos; este límite mantiene la carga local de desarrollo.
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
  async headers() {
    return [{
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      ],
    }];
  },
};

export default nextConfig;
