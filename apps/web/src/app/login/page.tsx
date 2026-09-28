import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { usandoApi } from "@/lib/api";
import { COOKIE_SESION } from "@/lib/sesion";
import { MarcaOS } from "@/components/Marca";

/** En local se precargan las credenciales de demostración; en producción, nunca. */
const PRECARGA = process.env.NODE_ENV !== "production";

/**
 * Acceso.
 *
 * El token lo emite la API y se guarda en una cookie httpOnly. Sin API_URL la
 * pantalla sigue existiendo pero entra directo: es el modo de demostración.
 */
async function entrar(datos: FormData) {
  "use server";

  const api = process.env.API_URL?.replace(/\/$/, "");
  if (!api) redirect("/inicio");

  const respuesta = await fetch(`${api}/sesion`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      correo: String(datos.get("correo") ?? ""),
      contrasena: String(datos.get("contrasena") ?? ""),
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!respuesta?.ok) redirect("/login?error=1");

  const { token, sesion } = (await respuesta.json()) as {
    token: string;
    sesion: { debeCambiarContrasena: boolean };
  };
  const almacen = await cookies();
  almacen.set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });

  redirect(sesion.debeCambiarContrasena ? "/cuenta/contrasena" : "/inicio");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; vencida?: string }>;
}) {
  const { error, vencida } = await searchParams;

  return (
    <div className="flex min-h-screen bg-ground">
      <div className="flex w-155 shrink-0 flex-col bg-ink px-15 py-14 text-white">
        <MarcaOS grande />

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
        <form action={entrar} className="flex w-105 flex-col gap-5.5">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-extrabold tracking-[-0.01em]">Entrar</h1>
            <span className="text-[13px] text-ink-2">
              Tu acceso define qué información ves y qué plazas puedes vender.
            </span>
          </div>

          {error ? (
            <div className="rounded-[3px] border border-alert/40 bg-alert-soft px-4 py-3 text-[12.5px] font-semibold text-alert-ink">
              Usuario o contraseña incorrectos.
            </div>
          ) : vencida ? (
            <div className="rounded-[3px] border border-warn/40 bg-warn-soft px-4 py-3 text-[12.5px] font-semibold text-warn-ink">
              Tu sesión venció. Vuelve a entrar para continuar.
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor="correo" className="eyebrow">
              Correo Casa Cruz
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              required
              defaultValue={PRECARGA ? "jorge.diaz@casacruz.mx" : undefined}
              className="h-12.5 rounded-[3px] border border-[#C9C1B6] bg-panel px-4 text-[14px]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="contrasena" className="eyebrow">
              Contraseña
            </label>
            <input
              id="contrasena"
              name="contrasena"
              type="password"
              required
              defaultValue={PRECARGA ? "casacruz" : undefined}
              className="h-12.5 rounded-[3px] border border-[#C9C1B6] bg-panel px-4 text-[14px]"
            />
          </div>

          <button
            type="submit"
            className="h-13.5 rounded-[3px] bg-ink text-[12px] font-bold tracking-[0.14em] text-white hover:brightness-125"
          >
            ENTRAR A CASA CRUZ OS
          </button>

          <div className="flex items-start gap-2.5 rounded-[3px] border border-line bg-surface p-3.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6B563E"
              strokeWidth="1.8"
              className="mt-0.5 shrink-0"
            >
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <span className="text-[11.5px] leading-relaxed text-ink-2">
              Cada acceso queda registrado. Los cambios que hagas se guardan con tu nombre, la fecha
              y el valor anterior.
            </span>
          </div>

          <span className="text-center text-[11.5px] text-muted">
            ¿Olvidaste tu clave? Pide a corporativo que la restablezca.
          </span>

          {usandoApi ? null : (
            <Link href="/inicio" className="text-center text-[12px]">
              Entrar sin sesión (sólo demostración)
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}
