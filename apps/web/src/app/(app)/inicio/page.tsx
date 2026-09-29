import Link from "next/link";
import { Badge, Card, Dot, Eyebrow, Seccion } from "@/components/ui";
import {
  advertencia,
  claveMes,
  fechaLarga,
  primeroDelMesSiguiente,
  saludo,
  semaforo,
} from "@casacruz/core";
import { etiquetaEstadoPropuesta, tonoEstadoPropuesta } from "@/lib/etiquetas";
import {
  listarClientes,
  listarDesarrollos,
  listarNovedades,
  listarPlazas,
  listarPropuestas,
  obtenerUsuarioActual,
  pendientesDeValidar,
} from "@/lib/repo";
import { Tabla } from "@/components/Tabla";

export default async function InicioPage() {
  const usuario = await obtenerUsuarioActual();
  const [pendientes, novedades, propuestas, clientes, desarrollos, plazas] = await Promise.all([
    pendientesDeValidar(usuario.id),
    listarNovedades(),
    listarPropuestas(),
    listarClientes(),
    listarDesarrollos(),
    listarPlazas(),
  ]);

  const hoy = new Date();
  const mias = propuestas.filter((p) => p.usuarioId === usuario.id);
  const delMes = mias.filter((p) => claveMes(new Date(p.creadaIso)) === claveMes(hoy));
  const aCargo = desarrollos.filter((d) => d.responsableId === usuario.id);
  const leads = clientes.filter((c) => c.kommoLeadId);
  const sinPropuesta = leads.filter((c) => !propuestas.some((p) => p.clienteId === c.id));
  const nombresPlazas = usuario.plazasCertificadas
    .map((id) => plazas.find((p) => p.id === id)?.nombre ?? id)
    .join(" · ");

  const kpis = [
    {
      label: "PROPUESTAS ESTE MES",
      valor: String(delMes.length),
      delta: `${delMes.filter((p) => p.vistas > 0).length} abiertas`,
      nota: `${mias.length} en total a tu nombre`,
      tono: "ok" as const,
    },
    {
      label: "DESARROLLOS A TU CARGO",
      valor: String(aCargo.length),
      delta: nombresPlazas || "sin plaza",
      nota: `Rotación el ${primeroDelMesSiguiente(hoy)}`,
      tono: "neutral" as const,
    },
    {
      label: "DATOS POR VALIDAR",
      valor: String(pendientes.length),
      delta: `${pendientes.filter((p) => p.confiabilidad < 65).length} críticos`,
      nota: "Precio, entrega y disponibilidad",
      tono: "alert" as const,
    },
    {
      label: "LEADS DE KOMMO",
      valor: String(leads.length),
      delta: "",
      nota: `${sinPropuesta.length} esperan propuesta`,
      tono: "ok" as const,
    },
  ];

  const filas = mias.slice(0, 5).map((p) => ({
    propuesta: p,
    cliente: clientes.find((c) => c.id === p.clienteId),
  }));
  const fecha = fechaLarga(hoy);

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto p-4 app:p-8">
      <div className="flex flex-col gap-4 app:flex-row app:items-end">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[24px] font-extrabold tracking-[-0.015em] app:text-[30px]">
            {saludo(hoy)}, {usuario.nombre.split(" ")[0]}
          </h1>
          <p className="text-[13px] text-ink-2">
            {fecha.charAt(0).toUpperCase() + fecha.slice(1)} ·{" "}
            {pendientes.length === 0
              ? "tus desarrollos están al día"
              : `${pendientes.length} ${pendientes.length === 1 ? "desarrollo tuyo necesita" : "desarrollos tuyos necesitan"} validación`}
          </p>
        </div>
        <div className="hidden grow app:block" />
        <Link
          href="/propiedades"
          className="flex h-12 items-center justify-center gap-2.5 app:h-11.5 app:justify-start rounded-[3px] bg-ink px-5 text-[11.5px] font-bold tracking-[0.1em] text-white hover:brightness-125"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          BUSCAR PARA UN CLIENTE
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 app:grid-cols-4 app:gap-4">
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

      <div className="flex flex-col gap-5 app:flex-row">
        <Seccion
          titulo="Tus desarrollos por validar"
          className="app:w-154 app:shrink-0"
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
                className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-[3px] border border-line px-3.5 py-3"
              >
                <Dot tono={semaforo(score)} />
                <Link
                  href={`/propiedades/${desarrollo.id}`}
                  className="text-[13.5px] font-bold hover:text-tan-deep app:w-37"
                >
                  {desarrollo.nombre}
                </Link>
                <span className="order-last basis-full text-[12px] text-ink-2 app:order-none app:grow app:basis-auto">
                  {advertencia(desarrollo) ?? "Revisar campos pendientes"}
                </span>
                <span className="ml-auto text-[11.5px] font-semibold app:ml-0">{score}%</span>
                <Link
                  href={`/propiedades/${desarrollo.id}#confiabilidad`}
                  className="flex h-10 items-center rounded-[3px] border border-[#C9C1B6] px-3 text-[10.5px] font-bold tracking-[0.06em] hover:bg-surface app:h-8"
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
          <Link href="/propuestas" className="text-[11px] font-semibold text-tan-deep hover:text-ink">
            Ver todas
          </Link>
        }
      >
        <Tabla
          columnas={[
            { titulo: "Cliente", ancho: "app:w-65", principal: true },
            { titulo: "Propiedades" },
            { titulo: "Enviada", ancho: "app:w-35" },
            { titulo: "Vistas", ancho: "app:w-24" },
            { titulo: "Estado", ancho: "app:w-45" },
          ]}
          filas={filas.map(({ propuesta, cliente }) => ({
            clave: propuesta.id,
            celdas: [
              <Link
                key="cliente"
                href={`/clientes/${propuesta.clienteId}`}
                className="font-bold hover:text-tan-deep"
              >
                {cliente?.nombre ?? "[CLIENTE]"}
              </Link>,
              <span key="props" className="text-[12px] text-ink-2">
                {propuesta.items.length} propiedades
              </span>,
              <span key="enviada" className="text-[12px] text-ink-2">
                {propuesta.enviadaEl ?? "sin enviar"}
              </span>,
              <span key="vistas" className="text-[12px] font-bold">
                {propuesta.vistas || "—"}
              </span>,
              <Badge key="estado" tono={tonoEstadoPropuesta[propuesta.estado]}>
                {etiquetaEstadoPropuesta[propuesta.estado]}
              </Badge>,
            ],
          }))}
        />
      </Seccion>
    </div>
  );
}
