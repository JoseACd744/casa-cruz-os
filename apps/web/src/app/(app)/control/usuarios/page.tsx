import Link from "next/link";
import { redirect } from "next/navigation";
import { alcanza, iniciales, type Rol } from "@casacruz/core";
import { EditarUsuario, InvitarUsuario } from "@/components/Equipo";
import { Badge, Card, Eyebrow, Seccion } from "@/components/ui";
import { listarCambios, listarPlazas, listarUsuarios, obtenerUsuarioActual } from "@/lib/repo";

const ROLES: { rol: Rol; nombre: string; puede: string }[] = [
  {
    rol: "cliente",
    nombre: "Cliente",
    puede: "Ve precio, fotos, video, ubicación, amenidades y formas de pago desde la propuesta web.",
  },
  {
    rol: "cerrador",
    nombre: "Cerrador",
    puede: "Todo lo anterior más comisiones autorizadas, contactos, argumentos, objeciones y capacitación.",
  },
  {
    rol: "gerente",
    nombre: "Gerente",
    puede: "Aprueba cambios sensibles, ve desempeño del producto, incidencias y control de actualización.",
  },
  {
    rol: "corporativo",
    nombre: "Corporativo",
    puede: "Contratos, márgenes, riesgos jurídicos, históricos, auditoría y administración del equipo.",
  },
];

export default async function UsuariosPage() {
  const actual = await obtenerUsuarioActual();
  if (!alcanza(actual.rol, "gerente")) redirect("/control");

  const [usuarios, plazas, cambios] = await Promise.all([
    listarUsuarios(),
    listarPlazas(),
    listarCambios(),
  ]);

  const nombrePlaza = (id: string) => plazas.find((p) => p.id === id)?.nombre ?? id;
  // El equipo lo administra corporativo; el gerente lo consulta.
  const administra = alcanza(actual.rol, "corporativo");
  const cuantos = (rol: Rol) => {
    if (rol === "cliente") return "Sin cuenta";
    const n = usuarios.filter((u) => u.rol === rol && u.activo).length;
    return `${n} ${n === 1 ? "activo" : "activos"}`;
  };

  return (
    <>
      <header className="flex h-15 shrink-0 items-center gap-3.5 border-b border-line bg-panel px-8">
        <Link
          href="/control"
          className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.06em] text-ink-2 hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          CONTROL DEL DATO
        </Link>
        <span className="text-[11.5px] text-faint">/</span>
        <span className="text-[11.5px] font-semibold tracking-[0.06em]">USUARIOS Y PERMISOS</span>
        <div className="grow" />
        <span className="text-[11px] font-semibold tracking-[0.08em] text-muted">
          VISTA {actual.rol.toUpperCase()}
        </span>
      </header>

      <div className="flex items-start gap-5 overflow-auto p-7">
        <div className="flex w-235 shrink-0 flex-col gap-4.5">
          <div className="flex items-end gap-3.5">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[26px] font-extrabold tracking-[-0.015em]">Usuarios</h1>
              <span className="text-[12.5px] text-ink-2">
                El rol define qué ve y qué edita. La certificación define qué plazas puede vender.
              </span>
            </div>
            <div className="grow" />
          </div>

          {administra ? <InvitarUsuario plazas={plazas} /> : null}

          <Card className="overflow-hidden">
            <div className="flex bg-surface">
              {[
                ["USUARIO", "w-57"],
                ["ROL", "w-37"],
                ["PLAZAS CERTIFICADAS", "grow"],
                ["ÚLTIMO ACCESO", "w-33"],
                ["ESTADO", "w-27"],
              ].map(([t, w]) => (
                <span
                  key={t}
                  className={`${w} px-4 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted`}
                >
                  {t}
                </span>
              ))}
            </div>
            {usuarios.map((u) => (
              <div key={u.id} className="flex flex-col border-t border-line">
                <div className="flex items-center">
                  <div className="flex w-57 items-center gap-3 px-4 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tan-soft text-[10.5px] font-bold text-tan-deep">
                      {iniciales(u.nombre)}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-bold">{u.nombre}</span>
                      <span className="text-[10.5px] text-muted">{u.correo}</span>
                    </span>
                  </div>
                  <span className="w-37 px-4 py-3">
                    <Badge tono={u.rol === "corporativo" ? "dark" : u.rol === "gerente" ? "tan" : "ok"}>
                      {u.rol}
                    </Badge>
                  </span>
                  <span className="grow px-4 py-3 text-[12px] text-ink-2">
                    {u.plazasCertificadas.map(nombrePlaza).join(" · ")}
                    {u.plazasEnProgreso.length
                      ? ` · ${u.plazasEnProgreso.map(nombrePlaza).join(" · ")} (en progreso)`
                      : ""}
                  </span>
                  <span className="w-33 px-4 py-3 text-[11.5px] text-muted">{u.ultimoAcceso}</span>
                  <span className="w-27 px-4 py-3">
                    <Badge tono={u.activo ? "ok" : "alert"}>
                      {!u.activo ? "inactivo" : u.debeCambiarContrasena ? "invitado" : "activo"}
                    </Badge>
                  </span>
                </div>
                {administra ? (
                  <EditarUsuario usuario={u} plazas={plazas} esYo={u.id === actual.id} />
                ) : null}
              </div>
            ))}
          </Card>

          <Seccion titulo="Roles">
            <div className="grid grid-cols-4 gap-4">
              {ROLES.map((r) => (
                <div key={r.nombre} className="flex flex-col gap-2 rounded-[3px] border border-line p-3.5">
                  <span className="text-[13px] font-bold">{r.nombre}</span>
                  <span className="text-[11.5px] leading-relaxed text-ink-2">{r.puede}</span>
                  <span className="text-[11px] font-semibold text-tan-deep">{cuantos(r.rol)}</span>
                </div>
              ))}
            </div>
          </Seccion>
        </div>

        <Card className="flex grow flex-col gap-3.5 self-stretch p-5.5">
          <Eyebrow>Auditoría reciente</Eyebrow>
          {cambios.map((c) => (
            <div key={c.id} className="flex flex-col gap-1.5 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`size-1.75 rounded-full ${
                    c.estado === "publicado" ? "bg-ok" : c.estado === "pendiente" ? "bg-warn" : "bg-alert"
                  }`}
                />
                <span className="text-[12px] font-bold">{c.usuario}</span>
                <div className="grow" />
                <span className="font-mono text-[10px] text-muted">{c.fecha.split(" · ")[0]}</span>
              </div>
              <span className="text-[11.5px] leading-relaxed text-ink-2">
                {c.campo} en {c.desarrolloNombre}: {c.valorAnterior} → {c.valorNuevo}
              </span>
            </div>
          ))}
          <div className="grow" />
          <a
            href="/descargas/bitacora.csv"
            className="flex h-11 items-center justify-center rounded-[3px] border border-line bg-surface text-[10.5px] font-bold tracking-[0.08em] hover:border-[#C9C1B6]"
          >
            EXPORTAR BITÁCORA (CSV)
          </a>
        </Card>
      </div>
    </>
  );
}
