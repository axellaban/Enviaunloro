// Un color para cada persona de tu bandada.
//
// Antes en el mapa había tres colores: el tuyo, el de Doña Cotorra, y un gris
// para todos los demás. Con tres amigos alcanzaba; con diez, "¿cuál de estos
// puntos es Jez?" se contesta leyendo etiquetas una por una.
//
// Dos cosas que tienen que pasar a la vez, y que tiran para lados opuestos:
//
//   ESTABLE. El color de una persona no puede cambiar. Si Jez es violeta hoy y
//   naranja mañana porque entró alguien más, el color no dice nada: aprendiste
//   algo que después resulta falso. Por eso sale del id del nido y no de la
//   posición en una lista.
//
//   DISTINTO. Y aun así, dos personas de TU bandada no pueden compartir color,
//   que es exactamente lo que el sorteo por id no puede prometer: con 16
//   colores y 5 amigos, la probabilidad de que dos caigan en el mismo es del
//   50% (el problema del cumpleaños, que es mucho menos intuitivo de lo que
//   parece).
//
// Se resuelven en ese orden: cada uno pide el color que le toca por id, y si
// ya está tomado agarra el siguiente libre. Recorriendo la bandada ordenada
// por id, así el resultado no depende de en qué orden llegaron los datos.
// Cambiar el color de alguien solo puede pasar si entra otra persona que choca
// con él, que es lo mínimo posible.

import { TEMA, type Tema } from "./tema";

/** El verde de la app, que es el de TU nido. Queda fuera de la paleta a
 *  propósito: si un amigo puede sacar el mismo color que vos, el único choque
 *  que de verdad confunde es el que puede pasar. */
export const MI_COLOR_POR_TEMA: Record<Tema, string> = {
  oscuro: "#10b981",
  claro: "#4d7c0f",
};
export const MI_COLOR = MI_COLOR_POR_TEMA[TEMA];

/**
 * Los 15 para los demás, en los dos temas. Cada uno medido contra el fondo de
 * SU tema, y no son intercambiables: los claros dan entre 2,2:1 y 3,9:1 sobre
 * el fondo oscuro, o sea que media bandada sería invisible. Los oscuros van de
 * 6,58:1 a 13,01:1 sobre #060d0c; los claros, de 5,02:1 a 9,07:1 sobre blanco.
 *
 * Ordenados por tono para que dos vecinos de la lista no sean dos azules casi
 * iguales, y los dos ordenados IGUAL: así una persona conserva su tono al
 * cambiar de tema aunque cambie el valor.
 */
export const PALETAS: Record<Tema, string[]> = {
  oscuro: [
    "#fb7185", // rojo
    "#fb923c", // naranja
    "#fbbf24", // ámbar
    "#a3e635", // lima
    "#4ade80", // verde
    "#34d399", // esmeralda
    "#2dd4bf", // teal
    "#22d3ee", // cian
    "#38bdf8", // celeste
    "#60a5fa", // azul
    "#818cf8", // índigo
    "#a78bfa", // violeta
    "#c084fc", // púrpura
    "#e879f9", // fucsia
    "#f472b6", // rosa
  ],
  claro: [
    "#be123c", // rojo
    "#c2410c", // naranja
    "#b45309", // ámbar
    "#78350f", // marrón
    "#15803d", // verde
    "#047857", // esmeralda
    "#0f766e", // teal
    "#0e7490", // cian
    "#0369a1", // celeste
    "#1d4ed8", // azul
    "#4338ca", // índigo
    "#6d28d9", // violeta
    "#7e22ce", // púrpura
    "#a21caf", // fucsia
    "#be185d", // rosa
  ],
};

export const PALETA = PALETAS[TEMA];

/** Hash chico y estable. No hace falta que sea criptográfico —acá solo reparte
 *  colores— pero sí que dé lo mismo en todos los dispositivos y para siempre. */
function semilla(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** El color que le toca a alguien por su id, sin mirar a nadie más. */
export function colorDeNido(id: string, tema: Tema = TEMA): string {
  const p = PALETAS[tema];
  return p[semilla(id) % p.length];
}

/**
 * Los colores de una bandada entera, ya sin choques.
 *
 * Si son más de 16 se repiten, que es lo correcto: con esa cantidad el color
 * ya no alcanza para identificar y lo que sirve es el nombre. Antes que
 * inventar tonos indistinguibles, se repite.
 */
export function coloresDeBandada(ids: string[], tema: Tema = TEMA): Map<string, string> {
  const paleta = PALETAS[tema];
  const salida = new Map<string, string>();
  const tomados = new Set<string>();
  for (const id of [...ids].sort()) {
    const primero = semilla(id) % paleta.length;
    let color = paleta[primero];
    if (tomados.size < paleta.length) {
      for (let i = 0; i < paleta.length && tomados.has(color); i++) {
        color = paleta[(primero + i + 1) % paleta.length];
      }
    }
    tomados.add(color);
    salida.set(id, color);
  }
  return salida;
}
