import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El proyecto vive dentro de Documents/GitHub; sin fijar la raíz, Turbopack la
  // infiere desde un package-lock.json de una carpeta superior.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
