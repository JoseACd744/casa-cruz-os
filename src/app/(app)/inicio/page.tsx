import Link from "next/link";
import { Badge, Card, Dot, Eyebrow, Seccion } from "@/components/ui";
import { advertencia, semaforo } from "@/lib/confiabilidad";
import {
  listarNovedades,
  listarPropuestas,
  obtenerCliente,
  obtenerUsuarioActual,
  pendientesDeValidar,
} from "@/lib/repo";

export default async function InicioPage() {
  const usuario = await obtenerUsuarioActual();
  const pendientes = await pendientesDeValidar(usuario.id);
  const novedades = await listarNovedades();
  const propuestas = await listarPropuestas();

  const kpis = [
    { label: "PROPUESTAS ESTE MES", valor: "14", delta: "+5", nota: "Meta del mes: 20", tono: "ok" as const },
    {
      label: "DESARROLLOS A TU CARGO",
      valor: String(usuario.desarrollosACargo),
      delta: "Riviera Maya",
      nota: "Rotación el 1 de octubre",
      tono: "neutral" as const,
    },
    {
      label: "DATOS POR VALIDAR",
      valor: String(pendientes.length),
      delta: `${pendientes.filter((p) => p.confiabilidad < 65).length} críticos`,
      nota: "Precio, entrega y disponibilidad",
      tono: "alert" as const,
    },
    { label: "LEADS ACTIVOS EN KOMMO", valor: "23", delta: "+3", nota: "8 esperan propuesta", tono: "ok" as const },
  ];

  const filas = await Promise.all(
    propuestas.map(async (p) => {
      const cliente = await obtenerCliente(p.clienteId);
      return { propuesta: p, cliente };
    }),
  );

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto p-8">
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[30px] font-extrabold tracking-[-0.015em]">
            Buen día, {usuario.nombre.split(" ")[0]}
          </h1>
          <p className="text-[13px] text-ink-2">
            Viernes 18 de septiembre · {pendientes.length} desarrollos tuyos necesitan validación
          </p>
        </div>
        <div className="grow" />
        <Link
          href="/propiedades"
          className="flex h-11.5 items-center gap-2.5 rounded-[3px] bg-ink px-5 text-[11.5px] font-bold tracking-[0.1em] text-white hover:brightness-125"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          BUSCAR PARA UN CLIENTE
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="flex flex-col gap-2.5 p-4.5">
            <Eyebrow>{k.label}</Eyebrow>
            <div className="flex items-baseline gap-2">
              <span className="text-[32px] font-extrabold tracking-[-0.02em]">{k.valor}</span>
              <span
                className={`text-[11.5px] font-bold ${
                  k.tono === "ok" ? "text-ok-ink" : k.tono === "alert" ? "text-alert-ink" : "text-muted"
                }`}
              >
                {k.delta}
              </span>
            </div>
            <span className="text-[11px] text-muted">{k.nota}</span>
          </Card>
        ))}
      </div>

      <div className="flex gap-5">
        <Seccion
          titulo="Tus desarrollos por validar"
          className="w-154"
          accion={
            <Link href="/control" className="text-[11px] font-semibold text-tan-deep hover:text-ink">
              Ver todo
            </Link>
          }
        >
          <div className="flex flex-col gap-2.5">
            {pendientes.map(({ desarrollo, confiabilidad: score }) => (
              <div
                key={desarrollo.id}
                className="flex items-center gap-3.5 rounded-[3px] border border-line px-3.5 py-3"
              >
                <Dot tono={semaforo(score)} />
                <Link
                  href={`/propiedades/${desarrollo.id}`}
                  className="w-37 text-[13.5px] font-bold hover:text-tan-deep"
                >
                  {desarrollo.nombre}
                </Link>
                <span className="grow text-[12px] text-ink-2">
                  {advertencia(desarrollo) ?? "Revisar campos pendientes"}
                </span>
                <span className="text-[11.5px] font-semibold">{score}%</span>
                <Link
                  href={`/propiedades/${desarrollo.id}?tab=trazabilidad`}
                  className="flex h-8 items-center rounded-[3px] border border-[#C9C1B6] px-3 text-[10.5px] font-bold tracking-[0.06em] hover:bg-surface"
                >
                  VALIDAR
                </Link>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Novedades del inventario" className="grow">
          <div className="flex flex-col gap-3">
            {novedades.map((n) => (
              <div key={n.titulo} className="flex gap-3 border-b border-line pb-3 last:border-0">
                <span className="w-18 shrink-0 font-mono text-[10.5px] text-muted">{n.fecha}</span>
                <div className="flex flex-col gap-1">
                  <span className="text-[12.5px] font-semibold">{n.titulo}</span>
                  <span className="text-[11.5px] leading-relaxed text-muted">{n.detalle}</span>
                </div>
              </div>
            ))}
          </div>
        </Seccion>
      </div>

      <Seccion
        titulo="Tus propuestas recientes"
        accion={
          <Link href="/clientes/c-berenice-fabian" className="text-[11px] font-semibold text-tan-deep hover:text-ink">
            Ver todas
          </Link>
        }
      >
        <div className="flex flex-col">
          <div className="flex rounded-[3px] bg-surface">
            <span className="w-65 px-3.5 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted">CLIENTE</span>
            <span className="grow px-3.5 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted">PROPIEDADES</span>
            <span className="w-35 px-3.5 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted">ENVIADA</span>
            <span className="w-24 px-3.5 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted">VISTAS</span>
            <span className="w-45 px-3.5 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted">ESTADO</span>
          </div>
          {filas.map(({ propuesta, cliente }) => (
            <div key={propuesta.id} className="flex items-center border-b border-line">
              <Link
                href={`/clientes/${propuesta.clienteId}`}
                className="w-65 px-3.5 py-3.5 text-[13px] font-bold hover:text-tan-deep"
              >
                {cliente?.nombre ?? "[CLIENTE]"}
              </Link>
              <span className="grow px-3.5 py-3.5 text-[12px] text-ink-2">
                {propuesta.items.length} propiedades
              </span>
              <span className="w-35 px-3.5 py-3.5 text-[12px] text-ink-2">
                {propuesta.enviadaEl ?? "sin enviar"}
              </span>
              <span className="w-24 px-3.5 py-3.5 text-[12px] font-bold">
                {propuesta.vistas || "—"}
              </span>
              <span className="w-45 px-3.5 py-3.5">
                <Badge tono="warn">{propuesta.estado}</Badge>
              </span>
            </div>
          ))}
        </div>
      </Seccion>
    </div>
  );
}
