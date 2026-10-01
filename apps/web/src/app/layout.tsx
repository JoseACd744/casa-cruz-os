import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { RegistroPwa } from "@/components/RegistroPwa";
import { InstalacionProvider } from "@/components/InstalarApp";

const montserrat = localFont({
  src: "./fonts/Montserrat-variable.woff2",
  variable: "--font-montserrat",
  weight: "100 900",
  display: "swap",
});

const jetbrains = localFont({
  src: [
    { path: "./fonts/JetBrainsMono-Regular.woff2", weight: "400" },
    { path: "./fonts/JetBrainsMono-Medium.woff2", weight: "500" },
  ],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Casa Cruz OS",
  description:
    "Sistema central de producto, conocimiento comercial y generación de propuestas de Casa Cruz.",
  // Al añadirla a la pantalla de inicio del iPhone se abre sin la barra de Safari.
  appleWebApp: { capable: true, title: "Casa Cruz", statusBarStyle: "default" },
};

// viewport-fit=cover deja usar las zonas seguras (muesca y barra de gestos) en el teléfono.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1C1B19",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${montserrat.variable} ${jetbrains.variable} antialiased`}>
        <RegistroPwa />
        <InstalacionProvider>{children}</InstalacionProvider>
      </body>
    </html>
  );
}
