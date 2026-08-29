// Los tramos que hay que dibujar en el mapa.
//
// Un loro puede aparecer dos veces en el aire: la ida, y —si quien lo recibió
// decidió soltarlo— la vuelta a casa. Son dos líneas distintas sobre el mismo
// mensaje, con horarios propios, así que el mapa no puede trabajar con la lista
// de loros tal cual viene: necesita la lista de vuelos.
//
// Vive en su propio archivo, y solo con tipos importados, porque lo usa el
// navegador: lib/vista.ts arrastra node:crypto y no se puede meter en el bundle.

import type { AveId } from "./aves";
import type { Punto } from "./geo";
import type { Desvio } from "./vuelo";
import type { LoroVista, VueloMundo } from "./vista";

export type Tramo = {
  /** Id de la capa en el mapa. No es el id del loro: la vuelta lleva sufijo. */
  clave: string;
  loroId: string;
  ave: AveId;
  origen: Punto;
  destino: Punto;
  distanciaKm: number;
  salida: number;
  llegada: number;
  desvio: Desvio | null;
  /** true si es el regreso al nido de quien lo mandó. */
  vuelta: boolean;
  /** true si es de alguien que no conocés: se dibuja distinto y sin nidos. */
  ajeno?: boolean;
};

/** Todo lo que en este instante está cruzando el mapa. */
export function tramosEnElAire(loros: LoroVista[], ahora: number): Tramo[] {
  const salida: Tramo[] = [];
  for (const l of loros) {
    if (!l.perdido && ahora < l.llegada) {
      salida.push({
        clave: l.id,
        loroId: l.id,
        ave: l.ave,
        origen: l.origen,
        destino: l.destino,
        distanciaKm: l.distanciaKm,
        salida: l.salida,
        llegada: l.llegada,
        desvio: l.desvio,
        vuelta: false,
      });
    }
    // La vuelta va al revés y sin desvío: el perico ya gastó su romance en la
    // ida, y de todas formas ahora vuelve sin mensaje que retocar.
    if (l.vuelta && ahora < l.vuelta.llegada) {
      salida.push({
        clave: `${l.id}@vuelta`,
        loroId: l.id,
        ave: l.ave,
        origen: l.destino,
        destino: l.origen,
        distanciaKm: l.distanciaKm,
        salida: l.vuelta.salida,
        llegada: l.vuelta.llegada,
        desvio: null,
        vuelta: true,
      });
    }
  }
  return salida;
}

/**
 * Lo mismo, para la vista del resto.
 *
 * Los vuelos ajenos ya vienen filtrados por el servidor —solo los que están en
 * el aire— pero se vuelve a comprobar acá: entre que sale la respuesta y el
 * cuadro que se está dibujando pueden pasar varios segundos, y un ave que ya
 * aterrizó no tiene por qué seguir cruzando la pantalla.
 */
export function tramosDelMundo(vuelos: VueloMundo[], ahora: number): Tramo[] {
  const salida: Tramo[] = [];
  for (const v of vuelos) {
    if (ahora >= v.llegada) continue;
    salida.push({
      clave: `mundo:${v.id}`,
      loroId: v.id,
      ave: v.ave,
      origen: v.origen,
      destino: v.destino,
      distanciaKm: v.distanciaKm,
      salida: v.salida,
      llegada: v.llegada,
      desvio: v.desvio,
      vuelta: false,
      ajeno: true,
    });
  }
  return salida;
}
