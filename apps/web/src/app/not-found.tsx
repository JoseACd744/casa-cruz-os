import Link from "next/link";
import { Isotipo } from "@/components/Marca";

export default function NoEncontrado() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ground px-6 text-center md:px-8">
      <Isotipo className="h-13" />
      <h1 className="text-[28px] font-extrabold tracking-[-0.015em]">Esta página no existe</h1>
      <p className="max-w-115 text-[13.5px] leading-relaxed text-ink-2">
        El enlace puede estar mal escrito, o la propuesta que buscas se dio de baja. Si un cliente te
        compartió este enlace, pídele al asesor que lo genere de nuevo.
      </p>
      <Link
        href="/inicio"
        className="flex h-11.5 items-center rounded-[3px] bg-ink px-5 text-[11.5px] font-bold tracking-[0.1em] text-white hover:brightness-125"
      >
        VOLVER A CASA CRUZ OS
      </Link>
    </div>
  );
}
