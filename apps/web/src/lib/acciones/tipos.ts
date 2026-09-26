/**
 * Lo que devuelve un server action a su formulario: un error para mostrar o un
 * aviso de que salió bien. Vive aparte porque un archivo "use server" sólo
 * puede exportar funciones.
 */
export interface EstadoAccion {
  error?: string;
  ok?: string;
}

export const ESTADO_INICIAL: EstadoAccion = {};

export function texto(datos: FormData, campo: string): string {
  const valor = datos.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}
