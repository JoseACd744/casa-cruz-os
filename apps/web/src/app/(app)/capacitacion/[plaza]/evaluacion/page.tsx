import Link from "next/link";
import { Evaluacion } from "@/components/Capacitacion";
import { Card } from "@/components/ui";
import { listarPlazas, obtenerEvaluacion } from "@/lib/repo";

export default async function EvaluacionPage({ params }: { params: Promise<{ plaza: string }> }) {
  const { plaza: plazaId } = await params;
  const [evaluacion, plazas] = await Promise.all([obtenerEvaluacion(plazaId), listarPlazas()]);
  const plaza = plazas.find((p) => p.id === plazaId)?.nombre ?? plazaId;

  return (
    <>
      <header className="encabezado">
        <Link
          href={`/capacitacion?plaza=${plazaId}`}
          className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.06em] text-ink-2 hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          CAPACITACIÓN
        </Link>
        <span className="text-[11.5px] text-faint">/</span>
        <span className="text-[11.5px] font-semibold tracking-[0.06em] uppercase">Evaluación · {plaza}</span>
      </header>
      <div className="flex justify-center overflow-auto p-4 app:p-8">
        <Card className="flex w-full flex-col gap-5 p-4 app:w-215 app:p-7">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[24px] font-extrabold tracking-[-0.01em]">Evaluación de certificación · {plaza}</h1>
            <span className="text-[12.5px] text-ink-2">
              Se aprueba con 80 %. Al aprobar quedas certificado por un año y puedes proponer los
              desarrollos de la plaza.
            </span>
          </div>
          {"error" in evaluacion ? (
            <div className="flex flex-col gap-3 rounded-[3px] border border-warn/40 bg-warn-soft p-4">
              <span className="text-[13px] font-semibold text-warn-ink">{evaluacion.error}</span>
              <Link href={`/capacitacion?plaza=${plazaId}`} className="text-[12px] font-semibold text-tan-deep underline">
                Volver a la ruta de la plaza
              </Link>
            </div>
          ) : (
            <Evaluacion plazaId={plazaId} plaza={plaza} preguntas={evaluacion.preguntas} />
          )}
        </Card>
      </div>
    </>
  );
}
