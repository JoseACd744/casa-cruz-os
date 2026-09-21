import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-ground">
      <div className="flex w-155 shrink-0 flex-col bg-ink px-15 py-14 text-white">
        <div className="flex items-center gap-3.5">
          <span className="flex size-10.5 items-center justify-center border-[1.5px] border-ground text-[13px] font-bold">
            CC
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[13px] font-bold tracking-[0.26em]">CASA CRUZ</span>
            <span className="text-[9.5px] font-semibold tracking-[0.34em] text-tan">OS</span>
          </span>
        </div>

        <div className="grow" />

        <span className="text-[10.5px] font-bold tracking-[0.24em] text-tan">
          SISTEMA CENTRAL DE PRODUCTO
        </span>
        <p className="max-w-115 pt-5 text-[34px] leading-tight font-bold tracking-[-0.01em]">
          La información pertenece a Casa Cruz, no a una persona.
        </p>
        <p className="max-w-110 pt-5.5 text-[14px] leading-relaxed text-[#B8B1A7]">
          Un dato se captura una vez y sirve para producir todos los formatos: la ficha, la
          propuesta, la presentación y el micrositio del cliente.
        </p>

        <div className="grow" />

        <div className="flex gap-10 border-t border-[#35322E] pt-6">
          {[
            ["6", "DESARROLLOS"],
            ["4", "PLAZAS"],
            ["1", "FUENTE DE VERDAD"],
          ].map(([n, t]) => (
            <div key={t} className="flex flex-col gap-1.5">
              <span className="text-[22px] font-extrabold">{n}</span>
              <span className="text-[10.5px] tracking-[0.1em] text-[#A09991]">{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex grow items-center justify-center">
        <form action="/inicio" className="flex w-105 flex-col gap-5.5">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-extrabold tracking-[-0.01em]">Entrar</h1>
            <span className="text-[13px] text-ink-2">
              Tu acceso define qué información ves y qué plazas puedes vender.
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="correo" className="eyebrow">
              Correo Casa Cruz
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              defaultValue="jorge.diaz@casacruz.mx"
              className="h-12.5 rounded-[3px] border border-[#C9C1B6] bg-panel px-4 text-[14px]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="clave" className="eyebrow">
              Contraseña
            </label>
            <input
              id="clave"
              name="clave"
              type="password"
              defaultValue="demo1234"
              className="h-12.5 rounded-[3px] border border-[#C9C1B6] bg-panel px-4 text-[14px]"
            />
          </div>

          <button
            type="submit"
            className="h-13.5 rounded-[3px] bg-ink text-[12px] font-bold tracking-[0.14em] text-white hover:brightness-125"
          >
            ENTRAR A CASA CRUZ OS
          </button>

          <div className="flex items-center gap-3.5">
            <div className="h-px grow bg-line-strong" />
            <span className="text-[10.5px] tracking-[0.12em] text-faint">O BIEN</span>
            <div className="h-px grow bg-line-strong" />
          </div>

          <Link
            href="/inicio"
            className="flex h-12.5 items-center justify-center rounded-[3px] border border-[#C9C1B6] bg-panel text-[12px] font-semibold"
          >
            Continuar con Google Workspace
          </Link>

          <div className="flex items-start gap-2.5 rounded-[3px] border border-line bg-surface p-3.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B563E" strokeWidth="1.8" className="mt-0.5 shrink-0">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <span className="text-[11.5px] leading-relaxed text-ink-2">
              Cada acceso queda registrado. Los cambios que hagas se guardan con tu nombre, la fecha
              y el valor anterior.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
