import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El núcleo compartido se publica como TypeScript: Next lo compila.
  transpilePackages: ["@casacruz/core"],
  // Raíz del monorepo, para que Turbopack vea packages/.
  turbopack: { root: path.join(process.cwd(), "..", "..") },
};

export default nextConfig;
