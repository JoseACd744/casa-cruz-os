import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El núcleo compartido se publica como TypeScript: Next lo compila.
  transpilePackages: ["@casacruz/core"],
  // Raíz del monorepo, para que Turbopack vea packages/.
  turbopack: { root: path.join(process.cwd(), "..", "..") },
  // Las evidencias y los renders se suben por server action (la API acepta hasta 15 MB).
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
};

export default nextConfig;
