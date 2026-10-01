import type { MetadataRoute } from "next";

/**
 * Lo mínimo para que el teléfono ofrezca «Instalar / Añadir a inicio»: se abre a
 * pantalla completa, con el ícono de Casa Cruz. El worker sólo guarda el aviso
 * sin conexión; la app siempre consulta la API.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Casa Cruz OS",
    id: "/",
    short_name: "Casa Cruz",
    description: "Producto, conocimiento comercial y propuestas de Casa Cruz.",
    lang: "es-MX",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#1C1B19",
    theme_color: "#1C1B19",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
