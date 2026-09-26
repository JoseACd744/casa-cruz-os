import Link from "next/link";
import { BarraSeleccion } from "@/components/Seleccion";
import { TarjetaPropiedad, type VistaPropiedad } from "@/components/TarjetaPropiedad";
import { confiabilidad, galeria, semaforo } from "@casacruz/core";
import { hace, money } from "@casacruz/core";
import { etiquetaEstatus } from "@casacruz/core";
import {
  listarDesarrollos,
  precioDesde,
  rangoBanos,
  rangoM2,
  rangoRecamaras,
} from "@/lib/repo";

type Params = Record<string, string | undefined>;

function href(actuales: Params, cambios: Params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...actuales, ...cambios })) {
    if (v) sp.set(k, v);
  }
  const q = sp.toString();
  return q ? `/propiedades?${q}` : "/propiedades";
}

function Chip({
  activo,
  children,
  url,
}: {
  activo: boolean;
  children: React.ReactNode;
  url: string;
}) {
  return (
    <Link
      href={url}
      className={`flex h-9.5 items-center gap-2 rounded-[3px] border px-3.5 text-[11.5px] font-semibold ${
        activo
          ? "border-tan bg-tan-soft text-tan-deep"
          : "border-line bg-surface text-ink-2 hover:border-[#C9C1B6]"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;

  const desarrollos = await listarDesarrollos({
    q: sp.q,
    ciudad: sp.ciudad,
    recamaras: sp.rec ? Number(sp.rec) : undefined,
    precioMax: sp.max ? Number(sp.max) : undefined,
  });

  const vistas: VistaPropiedad[] = desarrollos.map((d) => {
    const desde = precioDesde(d);
    const score = confiabilidad(d);
    const masReciente = d.validaciones.length
      ? Math.min(...d.validaciones.map((v) => v.haceDias))
      : null;
    return {
      id: d.id,
      nombre: d.nombre,
      foto: galeria(d).principal,
      zona: `${d.ciudad} · ${d.entrega ? `entrega ${d.entrega}` : "[ENTREGA]"}`,
      estatus: etiquetaEstatus[d.estatus],
      precio: money(desde, "[PRECIO DESDE]"),
      precioFalta: desde === null,
      recamaras: rangoRecamaras(d) ?? "[ ]",
      banos: rangoBanos(d) ?? "[ ]",
      m2: rangoM2(d) ?? "[ m² ]",
      confiabilidad: score,
      tono: semaforo(score),
      actualizado: masReciente === null ? "sin validar" : hace(masReciente),
    };
  });

  const porValidar = vistas.filter((v) => v.tono !== "ok").length;
  const catalogo = (await listarDesarrollos()).map((d) => ({ id: d.id, nombre: d.nombre }));

  return (
    <>
      <header className="flex h-19 shrink-0 items-center gap-4 border-b border-line bg-panel px-8">
        <form action="/propiedades" className="flex h-10.5 w-full max-w-115 items-center gap-2.5 rounded-[3px] border border-line bg-surface px-3.5">
          <label htmlFor="q" className="sr-only">
            Buscar propiedad, desarrollador o zona
          </label>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E675F" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            id="q"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar propiedad, zona o desarrollador…"
            className="w-full bg-transparent text-[13px] outline-none"
          />
        </form>
        <div className="grow" />
        <span className="text-[11px] font-semibold tracking-[0.1em] text-muted">RIVIERA MAYA</span>
        <Link
          href="/alta"
          className="flex h-10 items-center gap-2 rounded-[3px] border border-ink px-4 text-[11px] font-bold tracking-[0.1em] hover:bg-ink hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          NUEVA PROPIEDAD
        </Link>
      </header>

      <div className="flex h-17 shrink-0 items-center gap-2 border-b border-line bg-panel px-8">
        <Chip activo={sp.ciudad === "Playa del Carmen"} url={href(sp, { ciudad: sp.ciudad === "Playa del Carmen" ? undefined : "Playa del Carmen" })}>
          Playa del Carmen
        </Chip>
        <Chip activo={sp.ciudad === "Puebla"} url={href(sp, { ciudad: sp.ciudad === "Puebla" ? undefined : "Puebla" })}>
          Puebla
        </Chip>
        <Chip activo={sp.max === "3500000"} url={href(sp, { max: sp.max === "3500000" ? undefined : "3500000" })}>
          Hasta $3.5 M
        </Chip>
        <Chip activo={sp.rec === "3"} url={href(sp, { rec: sp.rec === "3" ? undefined : "3" })}>
          3+ recámaras
        </Chip>
        <div className="grow" />
        <Link href="/propiedades" className="p-2 text-[11px] font-semibold tracking-[0.08em] text-muted hover:text-ink">
          LIMPIAR FILTROS
        </Link>
      </div>

      <div className="grow overflow-auto px-8 pt-6.5">
        <div className="flex items-baseline gap-3 pb-4.5">
          <h1 className="text-[22px] font-bold tracking-[-0.01em]">
            {vistas.length} {vistas.length === 1 ? "propiedad" : "propiedades"}
          </h1>
          <span className="text-[12px] text-muted">
            compatibles con el filtro
            {porValidar > 0 ? ` · ${porValidar} requieren validación` : ""}
          </span>
        </div>

        {vistas.length === 0 ? (
          <p className="text-[13px] text-muted">
            Ninguna propiedad cumple ese filtro. Prueba quitando alguno.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-6 pb-8">
            {vistas.map((p) => (
              <TarjetaPropiedad key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>

      <BarraSeleccion catalogo={catalogo} />
    </>
  );
}
