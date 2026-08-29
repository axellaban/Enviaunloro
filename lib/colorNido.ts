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

/** El verde del perico, que es el de la app y el de TU nido. Queda fuera de la
 *  paleta a propósito: si un amigo puede sacar el mismo color que vos, el
 *  único choque que de verdad confunde es el que puede pasar. */
export const MI_COLOR = "#4d7c0f";

/** Los 15 para los demás, todos medidos: el peor da 5,02:1 sobre blanco, así
 *  que el punto y su nombre se leen sobre un mapa claro. Ordenados por tono
 *  para que dos vecinos de la lista no sean dos azules casi iguales. */
export const PALETA = [
  "#be123c", // rojo
  "#c2410c", // naranja
  "#b45309", // ámbar
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
  "#78350f", // marrón
];

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
export function colorDeNido(id: string): string {
  return PALETA[semilla(id) % PALETA.length];
}

/**
 * Los colores de una bandada entera, ya sin choques.
 *
 * Si son más de 16 se repiten, que es lo correcto: con esa cantidad el color
 * ya no alcanza para identificar y lo que sirve es el nombre. Antes que
 * inventar tonos indistinguibles, se repite.
 */
export function coloresDeBandada(ids: string[]): Map<string, string> {
  const salida = new Map<string, string>();
  const tomados = new Set<string>();
  for (const id of [...ids].sort()) {
    const primero = semilla(id) % PALETA.length;
    let color = PALETA[primero];
    if (tomados.size < PALETA.length) {
      for (let i = 0; i < PALETA.length && tomados.has(color); i++) {
        color = PALETA[(primero + i + 1) % PALETA.length];
      }
    }
    tomados.add(color);
    salida.set(id, color);
  }
  return salida;
}
