import {
  CAMPOS_CAMBIABLES,
  efectoDeCambio,
  etiquetaDestino,
  interpretarValor,
  motivoParaNoAprobar,
  requiereAprobacion,
  resolverDestino,
  valorActual,
  type Cambio,
  type Desarrollo,
  type DestinoCambio,
  type FuenteTipo,
} from "@casacruz/core";
import type { Sesion } from "./auth";
import type { FuenteDeDatos } from "./datos";

/**
 * Gobierno del dato.
 *
 * Aquí se decide qué pasa con un cambio: el servidor calcula el valor anterior,
 * interpreta el nuevo, decide si se publica o espera aprobación y, al
 * publicarse, lo escribe en la Base Maestra y lo cuenta como validado. Todo en
 * una transacción: no puede quedar el cambio sin su efecto ni al revés.
 */

type Resultado<T> = { ok: true; valor: T } | { ok: false; codigo: 400 | 403 | 404 | 409; error: string };

export interface EntradaDeCambio {
  desarrolloId: string;
  destino: DestinoCambio;
  valorNuevo: string;
  fuente: FuenteTipo;
  evidenciaUrl?: string | null;
  nota?: string | null;
}

/** Escribe el valor del cambio en la Base Maestra y refresca su validación. */
async function aplicar(datos: FuenteDeDatos, d: Desarrollo, cambio: Cambio): Promise<void> {
  if (!cambio.destino) return; // Histórico de texto libre: sólo queda en la bitácora.

  const interpretado = interpretarValor(cambio.destino.campo, cambio.valorNuevo);
  if (!interpretado.ok) throw new Error(`El cambio ${cambio.id} no tiene un valor válido`);

  const efecto = efectoDeCambio(d, cambio.destino, interpretado.valor);
  if (efecto.tipo === "tipologia") {
    const { tipologia } = efecto;
    await datos.guardarTipologia(d.id, {
      id: tipologia.id,
      nombre: tipologia.nombre,
      recamaras: tipologia.recamaras,
      banos: tipologia.banos,
      m2Construccion: tipologia.m2Construccion,
      m2Terreno: tipologia.m2Terreno,
      estacionamientos: tipologia.estacionamientos,
      planoUrl: tipologia.planoUrl,
      niveles: tipologia.niveles,
    });
  } else {
    await datos.actualizarDesarrollo(d.id, efecto.parche);
  }

  // Publicar un dato con su fuente es confirmarlo: cuenta como validación de quien lo trajo.
  const valida = CAMPOS_CAMBIABLES[cambio.destino.campo].valida;
  if (valida) await datos.registrarValidacion(d.id, valida, cambio.usuarioId);
}

export async function registrarCambio(
  datos: FuenteDeDatos,
  entrada: EntradaDeCambio,
  autor: Sesion,
): Promise<Resultado<{ cambio: Cambio; requiereAprobacion: boolean }>> {
  return datos.enTransaccion(async (tx) => {
    const d = await tx.obtenerDesarrollo(entrada.desarrolloId);
    if (!d) return { ok: false, codigo: 404, error: "Desarrollo no encontrado" };

    const destino = resolverDestino(d, entrada.destino);
    if (!destino.ok) return { ok: false, codigo: 400, error: destino.error };

    const valor = interpretarValor(destino.destino.campo, entrada.valorNuevo);
    if (!valor.ok) return { ok: false, codigo: 400, error: valor.error };

    const anterior = valorActual(d, destino.destino);
    if (anterior === valor.texto) {
      return {
        ok: false,
        codigo: 409,
        error: `El valor ya es ${anterior}. Si sólo confirmaste que sigue vigente, usa CONFIRMAR en la confiabilidad.`,
      };
    }

    const pendiente = requiereAprobacion(
      destino.destino.campo,
      entrada.fuente,
      Boolean(entrada.evidenciaUrl),
    );

    const cambio = await tx.guardarCambio({
      desarrolloId: d.id,
      destino: destino.destino,
      campo: etiquetaDestino(d, destino.destino),
      valorAnterior: anterior,
      valorNuevo: valor.texto,
      usuarioId: autor.id,
      fuente: entrada.fuente,
      evidenciaUrl: entrada.evidenciaUrl ?? null,
      nota: entrada.nota?.trim() || null,
      estado: pendiente ? "pendiente" : "publicado",
    });

    if (!pendiente) await aplicar(tx, d, cambio);
    return { ok: true, valor: { cambio, requiereAprobacion: pendiente } };
  });
}

export async function resolverCambio(
  datos: FuenteDeDatos,
  id: string,
  decision: "aprobar" | "rechazar",
  sesion: Sesion,
): Promise<Resultado<Cambio>> {
  return datos.enTransaccion(async (tx) => {
    const cambio = await tx.obtenerCambio(id);
    if (!cambio) return { ok: false, codigo: 404, error: "Cambio no encontrado" };

    const motivo = motivoParaNoAprobar(cambio, sesion);
    if (motivo) return { ok: false, codigo: motivo.codigo, error: motivo.mensaje };

    if (decision === "aprobar" && cambio.destino) {
      const d = await tx.obtenerDesarrollo(cambio.desarrolloId);
      if (!d) return { ok: false, codigo: 404, error: "El desarrollo ya no existe" };

      if (!resolverDestino(d, cambio.destino).ok) {
        return {
          ok: false,
          codigo: 409,
          error: "La tipología o el nivel de este cambio ya no existen. Recházalo y registra uno nuevo.",
        };
      }
      // Mientras esperaba, otro cambio pudo mover el dato: no se pisa a ciegas.
      const actual = valorActual(d, cambio.destino);
      if (actual !== cambio.valorAnterior) {
        return {
          ok: false,
          codigo: 409,
          error: `El dato cambió mientras esperaba: ahora es ${actual}, no ${cambio.valorAnterior}. Recházalo y registra uno nuevo.`,
        };
      }
      await aplicar(tx, d, cambio);
    }

    const resuelto = await tx.resolverCambio(
      id,
      decision === "aprobar" ? "publicado" : "rechazado",
      sesion.id,
    );
    return { ok: true, valor: resuelto! };
  });
}

/** La bitácora en CSV, con BOM para que Excel respete los acentos. */
export function bitacoraCsv(cambios: Cambio[]): string {
  const columnas = [
    "Fecha",
    "Desarrollo",
    "Campo",
    "Valor anterior",
    "Valor nuevo",
    "Autor",
    "Fuente",
    "Evidencia",
    "Estado",
    "Aprobó o rechazó",
    "Resuelto el",
    "Nota",
  ];
  const celda = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const filas = cambios.map((c) =>
    [
      c.fechaIso,
      c.desarrolloNombre,
      c.campo,
      c.valorAnterior,
      c.valorNuevo,
      c.usuario,
      c.fuente,
      c.evidencia,
      c.estado,
      c.aprobadoPor,
      c.resueltoIso,
      c.nota,
    ]
      .map(celda)
      .join(","),
  );
  return `﻿${[columnas.map(celda).join(","), ...filas].join("\r\n")}\r\n`;
}
