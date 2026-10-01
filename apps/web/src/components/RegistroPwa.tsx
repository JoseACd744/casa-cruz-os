"use client";

import { useEffect } from "react";

export function RegistroPwa() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(error => console.warn("No se pudo preparar el aviso sin conexión", error));
  }, []);
  return null;
}
