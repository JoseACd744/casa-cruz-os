import { AsistenteIA, type Recomendacion, type Respuesta } from "@/components/AsistenteIA";
import { advertencia, confiabilidad, estadoValidaciones, semaforo } from "@casacruz/core";
import { hace, money } from "@casacruz/core";
import { listarDesarrollos, precioDesde, tipologiaMasBarata } from "@/lib/repo";

const PRESUPUESTO = 3500000;

export default async function PreguntarPage() {
  const desarrollos = await listarDesarrollos();

  // La "IA" no inventa: filtra exactamente lo que hay aprobado en la Base Maestra.
  const candidatos = desarrollos.filter((d) => {
    if (d.estatus !== "publicado" && d.estatus !== "aprobado") return false;
    const desde = precioDesde(d);
    return desde !== null && desde <= PRESUPUESTO && confiabilidad(d) >= 85;
  });

  const recomendaciones: Recomendacion[] = candidatos.flatMap((d) => {
    const t = tipologiaMasBarata(d);
    const desde = precioDesde(d);
    const score = confiabilidad(d);
    const validacion = estadoValidaciones(d).find((e) => e.campo === "precio");
    return [
      {
        id: d.id,
        nombre: d.nombre,
        zona: `${d.ciudad} · ${d.entrega ?? "[entrega]"}`,
        precio: money(desde),
        razon: t
          ? `${t.recamaras ?? "?"} recámaras y ${t.m2Construccion ?? "?"} m², con ${
              d.condiciones.enganchePct ?? "?"
            }% de enganche.`
          : "Sin tipologías capturadas.",
        fuente:
          validacion && validacion.haceDias !== null
            ? `Validado ${hace(validacion.haceDias)}`
            : "Sin validar",
        tono: semaforo(score),
      },
    ];
  });

  const descartados = desarrollos.filter(
    (d) => !candidatos.includes(d) && confiabilidad(d) < 85,
  );

  const playaPark = desarrollos.find((d) => d.id === "playa-park");

  const respuestas: Respuesta[] = [
    {
      pregunta:
        "Tengo una familia viviendo en Houston con $3.5 millones de presupuesto. Quieren regresar a México. Recomiéndame opciones.",
      intro:
        recomendaciones.length === 1
          ? `Con presupuesto hasta ${money(PRESUPUESTO)}, objetivo vivienda y datos validados, hoy sólo hay un desarrollo aprobado que cumple:`
          : `Con presupuesto hasta ${money(PRESUPUESTO)}, objetivo vivienda y datos validados, hay ${recomendaciones.length} desarrollos aprobados que cumplen. Los ordeno por precio de entrada:`,
      recomendaciones,
      aviso: descartados.length
        ? `No incluí ${descartados
            .map((d) => d.nombre)
            .join(", ")}: su información no está confirmada y no debería presentarse todavía.`
        : undefined,
      fuentes: candidatos.map((d) => ({
        registro: `${d.nombre} · tipologías y condiciones`,
        detalle: `Confiabilidad ${confiabilidad(d)}% · ${
          d.interna.documentos[0]?.nombre ?? "sin documento de respaldo"
        }`,
      })),
    },
    {
      pregunta: "¿Qué debo saber antes de vender Playa Park?",
      intro:
        "Esto es lo que Casa Cruz tiene documentado sobre Playa Park. Lo que no aparece es porque todavía nadie lo capturó:",
      puntos: playaPark
        ? [
            ...playaPark.comercial.argumentos,
            ...playaPark.comercial.objeciones.map((o) => `Objeción frecuente: ${o}`),
            ...playaPark.comercial.noDeberiaComprarlo.map((o) => `No se lo ofrezcas a: ${o}`),
            `Esquema: ${playaPark.condiciones.enganchePct ?? "?"}% ${
              playaPark.condiciones.engancheNota ?? ""
            }, ${playaPark.condiciones.restoPct ?? "?"}% ${playaPark.condiciones.restoNota ?? ""}.`,
            "Buyer persona y diferenciadores: [PENDIENTE DE CAPTURA]. Pídeselo al gerente de plaza y regístralo.",
          ]
        : [],
      aviso: playaPark ? (advertencia(playaPark) ?? undefined) : undefined,
      fuentes: [
        { registro: "Playa Park · información comercial", detalle: "Argumentos y objeciones cargados por Jorge Díaz" },
        { registro: "Playa Park · condiciones comerciales", detalle: "Lista de precios oficial · validada hace 2 días" },
      ],
    },
    {
      pregunta: "¿Qué información del inventario no está confirmada?",
      intro:
        "Estos desarrollos tienen datos vencidos o sin capturar. No deberían enviarse a un cliente hasta validarlos:",
      puntos: desarrollos
        .filter((d) => confiabilidad(d) < 85)
        .map(
          (d) =>
            `${d.nombre} — confiabilidad ${confiabilidad(d)}%. ${
              advertencia(d) ?? "Faltan campos por capturar."
            }`,
        ),
      fuentes: [
        { registro: "Registro de validaciones", detalle: "Calculado con la antigüedad de cada campo" },
        { registro: "Responsables de plaza", detalle: "Jorge Díaz, Mariana Ruiz y Luis Ortega" },
      ],
    },
  ];

  return (
    <>
      <header className="flex h-15 shrink-0 items-center gap-3.5 border-b border-line bg-panel px-8">
        <span className="text-[11.5px] font-semibold tracking-[0.06em]">
          PREGUNTARLE A CASA CRUZ OS
        </span>
        <div className="grow" />
        <span className="rounded-[2px] border border-tan bg-tan-soft px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-tan-deep">
          ETAPA 10 · SOBRE LA BASE MAESTRA
        </span>
      </header>
      <AsistenteIA respuestas={respuestas} />
    </>
  );
}
