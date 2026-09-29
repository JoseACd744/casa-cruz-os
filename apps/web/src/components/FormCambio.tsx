"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Card, Eyebrow } from "@/components/ui";
import {
  CAMPOS_CAMBIABLES,
  LISTA_CAMPOS_CAMBIABLES,
  esCampoSensible,
  etiquetaFuente,
  fuenteAdmiteEvidencia,
  interpretarValor,
  requiereAprobacion,
  valorActual,
  type CampoCambiable,
  type Desarrollo,
  type FuenteTipo,
} from "@casacruz/core";
import { registrarCambio } from "@/lib/acciones/gobierno";
import { ESTADO_INICIAL } from "@/lib/acciones/tipos";

const FUENTES: FuenteTipo[] = [
  "lista_precios",
  "brochure",
  "correo",
  "whatsapp",
  "convenio",
  "contrato",
  "llamada",
  "otro",
];

const ACEPTA = ".pdf,.png,.jpg,.jpeg,.webp,.eml,application/pdf,image/*,message/rfc822";

/**
 * Registrar un cambio.
 *
 * La pantalla anticipa con las mismas reglas del núcleo si el cambio se publica
 * o espera aprobación; la que decide es la API.
 */
export function FormCambio({
  desarrollo,
  campoInicial,
  usuario,
  ahora,
  puedeAdjuntar,
}: {
  desarrollo: Desarrollo;
  campoInicial: CampoCambiable;
  usuario: string;
  /** Hora del servidor, ya formateada: evita que el navegador y el servidor difieran. */
  ahora: string;
  puedeAdjuntar: boolean;
}) {
  const [estado, accion, enviando] = useActionState(registrarCambio, ESTADO_INICIAL);

  const conNiveles = desarrollo.tipologias.filter((t) => t.niveles.length > 0);
  const [campo, setCampo] = useState<CampoCambiable>(campoInicial);
  const [tipologiaId, setTipologiaId] = useState(conNiveles[0]?.id ?? "");
  const [nivel, setNivel] = useState(conNiveles[0]?.niveles[0]?.nombre ?? "");
  const [valor, setValor] = useState("");
  const [fuente, setFuente] = useState<FuenteTipo>("lista_precios");
  const [archivo, setArchivo] = useState<{ nombre: string; kb: number } | null>(null);

  const def = CAMPOS_CAMBIABLES[campo];
  const tipologia = desarrollo.tipologias.find((t) => t.id === tipologiaId);
  const destino = def.porNivel ? { campo, tipologiaId, nivel } : { campo };
  const actual = valorActual(desarrollo, destino);
  const interpretado = valor.trim() ? interpretarValor(campo, valor) : null;
  const igual = interpretado?.ok && interpretado.texto === actual;
  const sinNiveles = def.porNivel && conNiveles.length === 0;

  const sensible = esCampoSensible(campo);
  const documental = fuenteAdmiteEvidencia[fuente];
  const pendiente = requiereAprobacion(campo, fuente, Boolean(archivo));

  const aviso = sensible
    ? `“${def.etiqueta}” es un campo sensible: queda PENDIENTE DE APROBACIÓN hasta que un gerente o corporativo lo valide. Mientras tanto, el cliente sigue viendo el valor anterior.`
    : !documental
      ? `${etiquetaFuente[fuente]} no deja documento: el cambio queda PENDIENTE DE APROBACIÓN hasta que un gerente lo valide.`
      : !archivo
        ? "Sin evidencia adjunta, el cambio queda PENDIENTE DE APROBACIÓN. Adjunta la lista, el correo o la captura para publicarlo de inmediato."
        : "Se publica de inmediato: el valor nuevo pasa a la Base Maestra, el campo cuenta como validado hoy y el valor anterior queda en el historial.";

  const listo = Boolean(interpretado?.ok) && !igual && !sinNiveles && !enviando;

  function elegirCampo(c: CampoCambiable) {
    setCampo(c);
    setValor("");
  }

  function elegirTipologia(id: string) {
    setTipologiaId(id);
    setNivel(desarrollo.tipologias.find((t) => t.id === id)?.niveles[0]?.nombre ?? "");
  }

  return (
    <div className="flex justify-center overflow-auto p-4 app:p-8">
      <Card className="flex w-full flex-col p-4 app:w-215 app:p-7">
        <form action={accion} className="flex flex-col gap-5">
          <input type="hidden" name="desarrolloId" value={desarrollo.id} />
          <input type="hidden" name="campo" value={campo} />
          <input type="hidden" name="fuente" value={fuente} />
          {def.porNivel ? (
            <>
              <input type="hidden" name="tipologiaId" value={tipologiaId} />
              <input type="hidden" name="nivel" value={nivel} />
            </>
          ) : null}

          <div className="flex items-start gap-3.5">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold tracking-[0.16em] text-tan-deep uppercase">
                {desarrollo.nombre}
              </span>
              <h1 className="text-[24px] font-extrabold tracking-[-0.01em]">Registrar un cambio</h1>
            </div>
            <div className="grow" />
            <Link
              href={`/propiedades/${desarrollo.id}`}
              aria-label="Cerrar"
              className="flex size-8.5 items-center justify-center rounded-[3px] border border-line hover:bg-surface"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A453F" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            <Eyebrow>Qué vas a cambiar</Eyebrow>
            <div className="flex flex-wrap gap-2.5">
              {LISTA_CAMPOS_CAMBIABLES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => elegirCampo(c)}
                  aria-pressed={campo === c}
                  className={`h-10 rounded-full border px-3.5 text-[12px] font-semibold app:h-9.5 ${
                    campo === c ? "border-ink bg-ink text-white" : "border-line bg-panel text-ink-2"
                  }`}
                >
                  {CAMPOS_CAMBIABLES[c].etiqueta}
                </button>
              ))}
            </div>
          </div>

          {def.porNivel ? (
            sinNiveles ? (
              <p className="rounded-[3px] border border-alert/40 bg-alert-soft px-4 py-3 text-[12.5px] text-alert-ink">
                Este desarrollo todavía no tiene tipologías con niveles. Captúralas primero en el
                alta.
              </p>
            ) : (
              <div className="flex flex-col gap-4 app:flex-row">
                <div className="flex grow flex-col gap-1.5">
                  <label htmlFor="tipologia" className="eyebrow">
                    Tipología
                  </label>
                  <select
                    id="tipologia"
                    value={tipologiaId}
                    onChange={(e) => elegirTipologia(e.target.value)}
                    className="h-11 rounded-[3px] border border-[#C9C1B6] bg-panel px-3 text-[13px] font-semibold"
                  >
                    {conNiveles.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 app:w-60">
                  <label htmlFor="nivel" className="eyebrow">
                    Nivel
                  </label>
                  <select
                    id="nivel"
                    value={nivel}
                    onChange={(e) => setNivel(e.target.value)}
                    className="h-11 rounded-[3px] border border-[#C9C1B6] bg-panel px-3 text-[13px] font-semibold"
                  >
                    {(tipologia?.niveles ?? []).map((n) => (
                      <option key={n.nombre} value={n.nombre}>
                        {n.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )
          ) : null}

          <div className="flex flex-col gap-3 app:flex-row app:items-start app:gap-5">
            <div className="flex flex-col gap-1.5 pt-0.5 app:w-52">
              <Eyebrow>Valor actual</Eyebrow>
              <span
                className={`text-[20px] font-semibold ${
                  actual.startsWith("[") ? "text-alert" : "text-muted line-through"
                }`}
              >
                {actual}
              </span>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A98D6F" strokeWidth="2" className="hidden shrink-0 app:mt-7.5 app:block">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            <div className="flex grow flex-col gap-1.5">
              <label htmlFor="nuevo" className="eyebrow">
                Nuevo valor
              </label>
              <input
                id="nuevo"
                name="valorNuevo"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={def.ayuda}
                autoComplete="off"
                className="h-12.5 rounded-[3px] border border-ink px-4 text-[18px] font-bold placeholder:text-[13px] placeholder:font-medium"
              />
              <span
                aria-live="polite"
                className={`text-[11px] ${
                  interpretado && !interpretado.ok ? "text-alert-ink" : igual ? "text-warn-ink" : "text-muted"
                }`}
              >
                {!interpretado
                  ? def.ayuda
                  : !interpretado.ok
                    ? interpretado.error
                    : igual
                      ? "Es el mismo valor: si sólo confirmaste que sigue vigente, usa CONFIRMAR en la ficha."
                      : `Se guardará como ${interpretado.texto}`}
              </span>
            </div>
          </div>

          <div className="h-px bg-line" />

          <div className="flex flex-col gap-2.5">
            <span className="text-[12.5px] font-bold">¿De dónde salió esta información?</span>
            <div className="flex flex-wrap gap-2.5">
              {FUENTES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFuente(f)}
                  aria-pressed={fuente === f}
                  className={`h-10 rounded-full border px-3.5 text-[12px] font-semibold app:h-9.5 ${
                    fuente === f ? "border-ink bg-ink text-white" : "border-line bg-panel text-ink-2"
                  }`}
                >
                  {etiquetaFuente[f]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Eyebrow>Evidencia</Eyebrow>
            <div
              className={`flex flex-wrap items-center gap-3 rounded-[3px] p-3.5 ${
                archivo ? "border border-line bg-panel" : "border border-dashed border-alert/60 bg-alert-soft/40"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B563E" strokeWidth="1.7">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
              </svg>
              <span className="min-w-0 grow basis-40 text-[12.5px] font-semibold">
                {archivo
                  ? `${archivo.nombre} · ${archivo.kb >= 1024 ? `${(archivo.kb / 1024).toFixed(1)} MB` : `${archivo.kb} KB`}`
                  : puedeAdjuntar
                    ? "Sin evidencia adjunta: lista de precios, correo o captura (PDF, imagen o .eml, hasta 15 MB)"
                    : "El almacenamiento de archivos no está configurado: el cambio quedará pendiente"}
              </span>
              <label
                className={`flex h-11 items-center rounded-[3px] border border-line bg-surface px-3.5 text-[10.5px] font-bold tracking-[0.06em] app:h-8.5 ${
                  puedeAdjuntar ? "cursor-pointer hover:border-[#C9C1B6]" : "cursor-not-allowed opacity-50"
                }`}
              >
                {archivo ? "CAMBIAR" : "ADJUNTAR"}
                <input
                  type="file"
                  name="evidencia"
                  accept={ACEPTA}
                  disabled={!puedeAdjuntar}
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setArchivo(f ? { nombre: f.name, kb: Math.max(1, Math.round(f.size / 1024)) } : null);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="nota" className="eyebrow">
              Comentario (opcional)
            </label>
            <input
              id="nota"
              name="nota"
              maxLength={500}
              placeholder="Por ejemplo: aplica sólo a planta baja, los demás niveles no cambiaron."
              className="h-11.5 rounded-[3px] border border-[#C9C1B6] px-3.5 text-[13px]"
            />
          </div>

          <div
            className={`flex items-start gap-3 rounded-[3px] border p-3.5 ${
              pendiente ? "border-warn/40 bg-warn-soft" : "border-ok/30 bg-ok-soft"
            }`}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke={pendiente ? "#9A6B22" : "#2C4F38"}
              strokeWidth="1.8"
              className="mt-0.5 shrink-0"
            >
              <path d="M12 8v5M12 16.5v.01M10.3 3.9L2.9 17a1.5 1.5 0 0 0 1.3 2.2h15.6a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
            </svg>
            <span className="text-[11.5px] leading-relaxed">{aviso}</span>
          </div>

          {estado.error ? (
            <div
              role="alert"
              className="rounded-[3px] border border-alert/40 bg-alert-soft px-4 py-3 text-[12.5px] font-semibold text-alert-ink"
            >
              {estado.error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <span className="basis-full text-[11px] text-muted app:basis-auto">
              Se guardará a nombre de {usuario} · {ahora}
            </span>
            <div className="hidden grow app:block" />
            <Link
              href={`/propiedades/${desarrollo.id}`}
              className="flex h-12 flex-1 items-center justify-center rounded-[3px] border border-[#C9C1B6] px-5 app:h-11.5 app:flex-none text-[11px] font-bold tracking-[0.08em]"
            >
              CANCELAR
            </Link>
            <button
              type="submit"
              disabled={!listo}
              className="flex h-12 flex-[2] items-center justify-center rounded-[3px] bg-ink px-6 text-[11px] app:h-11.5 app:flex-none font-bold tracking-[0.1em] text-white hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enviando ? "GUARDANDO…" : pendiente ? "ENVIAR A APROBACIÓN" : "GUARDAR Y PUBLICAR"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
