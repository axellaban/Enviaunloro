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
import type { LoroVista } from "./vista";

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
