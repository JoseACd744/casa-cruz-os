"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

interface EventoInstalar extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Instalacion = createContext<{
  evento: EventoInstalar | null;
  consumir: () => void;
}>({ evento: null, consumir: () => {} });

// La oferta de Chrome sobrevive a navegar desde el acceso hasta el menú.
export function InstalacionProvider({ children }: { children: ReactNode }) {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const limpiar = () => setEvento(null);
    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", limpiar);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", limpiar);
    };
  }, []);
  return <Instalacion.Provider value={{ evento, consumir: () => setEvento(null) }}>{children}</Instalacion.Provider>;
}

function suscribir(avisar: () => void) {
  const modo = window.matchMedia("(display-mode: standalone)");
  modo.addEventListener("change", avisar);
  window.addEventListener("appinstalled", avisar);
  return () => {
    modo.removeEventListener("change", avisar);
    window.removeEventListener("appinstalled", avisar);
  };
}

function instalada() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

/** El navegador ofrece la instalación; en Safari mostramos los pasos manuales. */
export function InstalarApp({ oscura = false }: { oscura?: boolean }) {
  const { evento, consumir } = useContext(Instalacion);
  const [ayuda, setAyuda] = useState(false);
  const [error, setError] = useState(false);
  const yaInstalada = useSyncExternalStore(suscribir, instalada, () => false);

  if (yaInstalada) return null;

  async function instalar() {
    setError(false);
    if (!evento) {
      setAyuda(v => !v);
      return;
    }
    try {
      await evento.prompt();
      await evento.userChoice;
    } catch {
      setError(true);
      setAyuda(true);
    } finally {
      consumir();
    }
  }

  return (
    <div className={`flex min-w-0 flex-col gap-3 ${oscura ? "text-ground" : "text-ink"}`}>
      <button
        type="button"
        onClick={() => void instalar()}
        aria-expanded={ayuda}
        className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-[3px] border px-4 py-2 text-[12px] font-semibold ${oscura ? "border-[#4A463F] hover:bg-[#2E2C28]" : "border-line hover:bg-surface"}`}
      >
        Instalar Casa Cruz en mi celular
      </button>
      {ayuda && (
        <div className="flex flex-col gap-2 text-[12px] leading-relaxed" role="status">
          {error && <p>No se pudo abrir la instalación. Puedes hacerlo desde el menú del navegador.</p>}
          <p><strong>iPhone:</strong> abre esta web en Safari, toca Compartir y elige «Añadir a pantalla de inicio».</p>
          <p><strong>Android:</strong> abre esta web en Chrome y elige «Instalar aplicación» o «Añadir a pantalla de inicio» en el menú.</p>
          <p>Necesitas conexión para consultar y guardar información.</p>
        </div>
      )}
    </div>
  );
}
