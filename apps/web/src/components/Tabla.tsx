import type { ReactNode } from "react";

/**
 * Tabla que en escritorio (app+, 1280 px) es la fila con columnas de siempre y en el
 * teléfono se vuelve una lista de tarjetas: la columna `principal` es el título
 * de cada tarjeta y las demás muestran su encabezado como etiqueta.
 *
 * Es un solo DOM (sin duplicar celdas): los formularios y botones de las celdas
 * existen una vez. Las clases de ancho van completas (`app:w-65`) para que
 * Tailwind las vea.
 */

export interface Columna {
  /** Encabezado. Vacío = columna de acciones: sin etiqueta y a lo ancho en el teléfono. */
  titulo: string;
  /** Ancho en escritorio, como clase (`app:w-65`). Sin ancho, la columna crece. */
  ancho?: string;
  /** Título de la tarjeta en el teléfono. */
  principal?: boolean;
}

export interface Fila {
  clave: string;
  celdas: ReactNode[];
  /** Contenido a lo ancho bajo la fila (p. ej. un formulario de edición). */
  extra?: ReactNode;
}

const encabezado = "px-3.5 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted uppercase";

export function Tabla({
  columnas,
  filas,
  vacio,
}: {
  columnas: Columna[];
  filas: Fila[];
  vacio?: ReactNode;
}) {
  if (filas.length === 0 && vacio) return <>{vacio}</>;
  return (
    <div className="flex flex-col gap-2.5 app:gap-0">
      <div className="hidden rounded-[3px] bg-surface app:flex">
        {columnas.map((c, i) => (
          <span key={i} className={`${encabezado} ${c.ancho ?? "grow"}`}>
            {c.titulo}
          </span>
        ))}
      </div>
      {filas.map((fila) => (
        <div
          key={fila.clave}
          className="flex flex-col gap-2.5 rounded-[3px] border border-line p-3.5 app:gap-0 app:rounded-none app:border-0 app:border-b app:p-0"
        >
          <div className="flex flex-col gap-2.5 app:flex-row app:items-center app:gap-0">
            {columnas.map((c, i) => {
              const celda = fila.celdas[i];
              if (c.principal) {
                return (
                  <div
                    key={i}
                    className={`min-w-0 text-[14px] app:px-3.5 app:py-3.5 app:text-[13px] ${c.ancho ?? "grow"}`}
                  >
                    {celda}
                  </div>
                );
              }
              const acciones = c.titulo === "";
              return (
                <div
                  key={i}
                  className={`flex min-w-0 items-center gap-3 app:block app:px-3.5 app:py-3.5 ${
                    acciones ? "flex-wrap pt-1" : "justify-between"
                  } ${c.ancho ?? "grow"}`}
                >
                  {acciones ? null : <span className="eyebrow shrink-0 app:hidden">{c.titulo}</span>}
                  <div
                    className={
                      acciones
                        ? "flex w-full flex-wrap gap-2 app:w-auto"
                        : "min-w-0 text-right app:text-left"
                    }
                  >
                    {celda}
                  </div>
                </div>
              );
            })}
          </div>
          {fila.extra}
        </div>
      ))}
    </div>
  );
}
