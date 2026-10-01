import { notFound } from "next/navigation";
import {
  alcanza,
  completitud,
  estaProtegido,
  etiquetaFuente,
  galeria,
  hace,
  PASOS_ALTA,
  type Desarrollo,
} from "@casacruz/core";
import { BotonAccion } from "@/components/BotonAccion";
import { ColumnaAlta } from "@/components/alta/ColumnaAlta";
import { MarcoAlta, NavegacionPasos, TituloPaso } from "@/components/alta/MarcoAlta";
import {
  FormDocumento,
  FormMultimedia,
  PasoComercial,
  PasoCondiciones,
  PasoIdentificacion,
  PasoInterna,
  PasoTipologias,
} from "@/components/alta/Pasos";
import { Eyebrow, Foto } from "@/components/ui";
import { ordenarMultimedia, quitarMultimedia } from "@/lib/acciones/desarrollos";
import { obtenerDesarrollo, obtenerIntegraciones, obtenerUsuarioActual } from "@/lib/repo";

const ETIQUETA_TIPO: Record<string, string> = {
  foto: "Foto",
  render: "Render",
  plano: "Plano",
  video: "Video",
  brochure: "Brochure",
  mapa: "Mapa",
};

/** La galería del paso 4: se ordena y se limpia aquí mismo. */
function Galeria({ d }: { d: Desarrollo }) {
  const lista = [...(d.multimedia ?? [])].sort((a, b) => a.orden - b.orden);
  const principal = galeria(d).principal;
  if (!lista.length) {
    return <p className="text-[12.5px] text-alert">[SIN MULTIMEDIA] — hacen falta al menos 3 fotos o renders para publicar.</p>;
  }

  const mover = (i: number, hacia: number) => {
    const urls = lista.map((m) => m.url);
    [urls[i], urls[hacia]] = [urls[hacia], urls[i]];
    return ordenarMultimedia.bind(null, d.id, urls);
  };
  const flecha =
    "flex size-11 shrink-0 items-center justify-center rounded-[3px] border border-line bg-panel text-[12px] font-bold hover:border-ink disabled:opacity-30 app:size-8";

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 app:grid-cols-3">
      {lista.map((m, i) => {
        const imagen = m.tipo === "foto" || m.tipo === "render" || m.tipo === "plano";
        return (
          <div key={m.url} className="flex flex-col overflow-hidden rounded-[3px] border border-line">
            {imagen ? (
              <Foto src={m.url} className="h-32 w-full rounded-none" />
            ) : (
              <a
                href={m.url}
                target="_blank"
                rel="noopener"
                className="flex h-32 items-center justify-center bg-ink text-[10px] font-bold tracking-[0.2em] text-ground uppercase"
              >
                Abrir {ETIQUETA_TIPO[m.tipo]}
              </a>
            )}
            <div className="flex flex-wrap items-center gap-2 p-2.5">
              <span className="text-[11px] font-bold">{ETIQUETA_TIPO[m.tipo]}</span>
              {m.url === principal ? (
                <span className="rounded-[2px] bg-tan-soft px-1.5 py-0.5 text-[9px] font-bold tracking-[0.1em] text-tan-deep">
                  FACHADA
                </span>
              ) : null}
              <div className="grow" />
              {i > 0 ? (
                <BotonAccion accion={mover(i, i - 1)} className={flecha}>
                  <span aria-label="Mover antes">←</span>
                </BotonAccion>
              ) : (
                <span className={`${flecha} opacity-30`}>←</span>
              )}
              {i < lista.length - 1 ? (
                <BotonAccion accion={mover(i, i + 1)} className={flecha}>
                  <span aria-label="Mover después">→</span>
                </BotonAccion>
              ) : (
                <span className={`${flecha} opacity-30`}>→</span>
              )}
              <BotonAccion
                accion={quitarMultimedia.bind(null, d.id, m.url)}
                confirmar="¿Quitar este archivo? Se borra del almacenamiento."
                className="flex h-8 items-center rounded-[3px] border border-line px-2 text-[9.5px] font-bold tracking-[0.08em] text-alert-ink hover:border-alert"
              >
                QUITAR
              </BotonAccion>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function EditarDesarrolloPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paso?: string }>;
}) {
  const { id } = await params;
  const { paso: pasoTexto } = await searchParams;
  const paso = Math.min(6, Math.max(1, Number(pasoTexto) || 1));

  const [d, usuario, integraciones] = await Promise.all([
    obtenerDesarrollo(id),
    obtenerUsuarioActual(),
    obtenerIntegraciones(),
  ]);
  if (!d) notFound();

  const base = `/propiedades/${d.id}/editar`;
  const { secciones } = completitud(d);
  const seccion = secciones[paso - 1];
  const sinAlmacenamiento = integraciones.archivos === "sin_configurar";

  return (
    <MarcoAlta
      titulo={`Editar ${d.nombre}`}
      volver={{ href: `/propiedades/${d.id}`, texto: d.nombre }}
      estatus={d.estatus}
      paso={paso}
      secciones={secciones}
      base={base}
      columna={<ColumnaAlta desarrollo={d} rol={usuario.rol} base={base} />}
    >
      <TituloPaso
        paso={paso}
        titulo={PASOS_ALTA[paso - 1].nombre}
        detalle={seccion.faltan.length ? `Falta: ${seccion.faltan.slice(0, 3).join(", ")}${seccion.faltan.length > 3 ? "…" : ""}` : "Completo"}
      />

      {paso === 1 ? <PasoIdentificacion d={d} entregaProtegida={estaProtegido(d.estatus, "entrega")} /> : null}
      {paso === 2 ? <PasoTipologias key={d.tipologias.length} d={d} protegido={estaProtegido(d.estatus, "precio")} /> : null}
      {paso === 3 ? <PasoCondiciones d={d} protegido={estaProtegido(d.estatus, "enganche")} /> : null}
      {paso === 4 ? (
        <div className="flex flex-col gap-4">
          <Galeria d={d} />
          <FormMultimedia id={d.id} sinAlmacenamiento={sinAlmacenamiento} />
        </div>
      ) : null}
      {paso === 5 ? <PasoComercial d={d} /> : null}
      {paso === 6 ? (
        <div className="flex flex-col gap-5">
          <PasoInterna d={d} esCorporativo={alcanza(usuario.rol, "corporativo")} />
          <div className="flex flex-col gap-3 border-t border-line pt-5">
            <Eyebrow>Documentación</Eyebrow>
            {d.interna.documentos.length ? (
              d.interna.documentos.map((doc, i) => (
                <div key={`${doc.nombre}-${i}`} className="flex items-center gap-3 text-[12.5px]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B563E" strokeWidth="1.6">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
                  </svg>
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noopener" className="font-semibold underline hover:text-tan-deep">
                      {doc.nombre}
                    </a>
                  ) : (
                    <span className="font-semibold">{doc.nombre}</span>
                  )}
                  <span className="text-muted">
                    {etiquetaFuente[doc.tipo]} · {hace(doc.cargadoHaceDias)}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-[12.5px] text-alert">[SIN DOCUMENTOS CARGADOS]</span>
            )}
            <FormDocumento id={d.id} sinAlmacenamiento={sinAlmacenamiento} />
          </div>
        </div>
      ) : null}

      <NavegacionPasos base={base} paso={paso} />
    </MarcoAlta>
  );
}
