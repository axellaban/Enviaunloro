// La fórmula del vuelo, sin nada del servidor adentro.
//
// Vive aparte de datos.ts porque la necesitan los dos lados: el servidor para
// fijar la hora de llegada, y el navegador para mostrar —antes de mandar— cuánto
// va a tardar cada ave hasta esa persona. Si las dos cuentas no fueran
// exactamente la misma, la app prometería un tiempo y cumpliría otro.

import { AVES, type AveId } from "./aves";

/**
 * Piso del vuelo, medido en kilómetros y no en segundos.
 *
 * Sin ningún piso, mandarle algo a alguien de la misma cuadra sería un chat.
 * Pero el piso no puede ser un tiempo fijo: si lo fuera, a corta distancia las
 * cuatro aves darían el mismo número y la elección —que es todo el producto—
 * dejaría de significar nada. Con un piso de distancia, el perico sigue
 * llegando antes que el guacamayo aunque los dos nidos estén pegados.
 */
export const KM_MINIMOS = 0.4;

/**
 * Uno de cada quinientos loros no llega nunca.
 *
 * Es poco y no es cero, y esa es exactamente la idea: si mandar algo no
 * pudiera salir mal, esperarlo no significaría nada. El número es chico a
 * propósito —a nadie le tiene que pasar dos veces seguidas— pero existe, y
 * cuando pasa, el mensaje se pierde de verdad: no hay reintento automático ni
 * copia guardada del lado de quien lo esperaba.
 *
 * Se puede pisar con LOROS_PROB_EXTRAVIO (0 a 1). Sirve para probar el camino
 * del extravío sin mandar quinientos loros.
 */
export function probabilidadExtravio(): number {
  const n = Number(process.env.LOROS_PROB_EXTRAVIO ?? "0.002");
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.002;
}

/** Para mostrarlo en la portada sin depender del entorno del servidor. */
export const EXTRAVIO_POR_DEFECTO = 0.002;

export function duracionVuelo(km: number, aveId: AveId, escala = 1): number {
  const recorrido = Math.max(KM_MINIMOS, km);
  const horas = recorrido / AVES[aveId].velocidadKmh;
  return Math.round((horas * 3_600_000) / (escala > 0 ? escala : 1));
}

// ---------- el romance del perico ----------
//
// El perico es el más rápido de las seis y eso, solo, lo volvía la elección
// obvia para todo. Su contra es que se enamora: a veces se cruza con una perica
// en pleno viaje, se olvida de para qué salió y se queda dando vueltas. Llega
// tarde, y con el mensaje retocado por ella.
//
// Dos decisiones que hacen que sea un chiste y no una traición:
//
//   1. Se avisa ANTES de mandar (lib/aves.ts, campo `aviso`). Un tiempo
//      prometido que después no se cumple sin haberlo dicho es un bug; dicho de
//      antemano, es el precio de mandar el ave más rápida.
//   2. Se sortea al despegar y queda escrito, igual que el extravío. La hora de
//      llegada que se muestra ya incluye las vueltas: el contador nunca da un
//      salto para atrás.

/** Dónde y cuándo se distrajo. Las tres cosas se calculan al soltarlo. */
export type Desvio = {
  /** Epoch ms en que se cruza con la perica. */
  desde: number;
  /** Epoch ms en que se acuerda del mensaje y sigue viaje. */
  hasta: number;
  /** En qué punto del camino, de 0 a 1. Cada lado lo dibuja sobre SU ruta. */
  en: number;
};

/**
 * Cuántos de cada diez pericos se distraen.
 *
 * Se puede pisar con LOROS_PROB_ROMANCE (0 a 1), igual que el extravío: sirve
 * para probar el camino del desvío sin mandar diez pericos y cruzar los dedos.
 */
export function probabilidadRomance(): number {
  const n = Number(process.env.LOROS_PROB_ROMANCE ?? "0.4");
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.4;
}

/**
 * Cuánto se queda dando vueltas, en proporción al viaje que le faltaba.
 *
 * Proporcional y no un número fijo: seis minutos de romance arriba de un vuelo
 * de veinte segundos convierten al ave más rápida en la más lenta de las seis,
 * y seis minutos arriba de un vuelo de nueve días no los nota nadie. Así el
 * desvío se siente igual de largo en cualquier viaje.
 */
const VUELTAS_MIN_FACTOR = 0.5;
const VUELTAS_MAX_FACTOR = 1.1;

/** Pero con topes: menos de esto no se llega a ver, y más aburre. */
const VUELTAS_PISO_MS = 40_000;
const VUELTAS_TECHO_MS = 20 * 60_000;

/**
 * Sortea el romance. Devuelve null si el perico se portó bien.
 *
 * @param duracion lo que iba a tardar el vuelo sin distraerse.
 */
export function sortearDesvio(
  aveId: AveId,
  salida: number,
  duracion: number,
  escala = 1
): Desvio | null {
  if (AVES[aveId].rareza !== "romance") return null;
  if (Math.random() >= probabilidadRomance()) return null;

  // Ni al despegar ni rozando el destino: en el medio, donde se nota que iba
  // bien y se desvió.
  const en = 0.3 + Math.random() * 0.4;
  const factor =
    VUELTAS_MIN_FACTOR + Math.random() * (VUELTAS_MAX_FACTOR - VUELTAS_MIN_FACTOR);
  const vueltas = Math.min(
    VUELTAS_TECHO_MS / (escala > 0 ? escala : 1),
    Math.max(VUELTAS_PISO_MS / (escala > 0 ? escala : 1), duracion * factor)
  );
  const desde = salida + Math.round(duracion * en);
  return { desde, hasta: desde + Math.round(vueltas), en };
}

/**
 * Cuánto del camino lleva hecho, de 0 a 1, y si en este momento está dando
 * vueltas en vez de avanzar.
 *
 * Vive acá y no en el mapa porque lo necesitan los dos: el mapa para poner el
 * ave y la tarjeta para la barra de progreso. Si cada uno hiciera su cuenta, el
 * ave y la barra irían a destiempo.
 */
export function avanceVuelo(
  v: { salida: number; llegada: number; desvio?: Desvio | null },
  ahora: number
): { avance: number; girando: boolean } {
  const d = v.desvio ?? null;
  const total = Math.max(1, v.llegada - v.salida);
  const acotar = (x: number) => Math.min(1, Math.max(0, x));

  if (!d) return { avance: acotar((ahora - v.salida) / total), girando: false };

  // Sin las vueltas, el vuelo hubiera durado esto. Es la escala con la que se
  // mide el avance en los dos tramos.
  const vueltas = d.hasta - d.desde;
  const limpio = Math.max(1, total - vueltas);

  if (ahora < d.desde) return { avance: acotar((ahora - v.salida) / limpio), girando: false };
  if (ahora < d.hasta) return { avance: acotar(d.en), girando: true };
  return { avance: acotar((ahora - v.salida - vueltas) / limpio), girando: false };
}
