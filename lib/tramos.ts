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
import type { ConviteVista, LoroVista, VueloMundo } from "./vista";
// El único valor —no tipo— que entra acá. Sale de lib/vuelo.ts y NO de
// lib/datos.ts, que es donde vive el resto de las reglas del vuelo: datos.ts
// arrastra el store y node:crypto, y un valor importado de ahí se lleva todo
// eso al bundle del navegador. vuelo.ts es pura y ya la usan los dos lados.
import { MS_ABDUCCION } from "./vuelo";

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
  /**
   * Cuándo se lo llevó el plato volador, si pasó.
   *
   * El tramo NO se borra en ese instante: sigue vivo unos segundos más para que
   * la nave llegue, se quede con el ave en el rayo y recién ahí se vaya. Con el
   * ave quieta en el punto donde la interceptaron — un ave dentro de un rayo
   * tractor no sigue avanzando hacia su destino.
   */
  abducido?: number | null;
  /** true si es de alguien que no conocés: se dibuja distinto y sin nidos. */
  ajeno?: boolean;
  /** El loro que salió convertido en pollera: lo que se dibuja no es un ave.
   *  Va en las DOS patas —ida y vuelta—: si vuelve siendo loro, el chiste se
   *  rompe a mitad de camino. */
  pollera?: boolean;
};

/** Todo lo que en este instante está cruzando el mapa. */
export function tramosEnElAire(loros: LoroVista[], ahora: number): Tramo[] {
  const salida: Tramo[] = [];
  for (const l of loros) {
    // Un ave abducida deja de volar, pero no desaparece en el acto: la escena
    // dura MS_ABDUCCION y hay que dibujarla. Pasado eso ya no hay nada, ni
    // aunque su hora de llegada todavía esté por venir — ese vuelo terminó
    // cuando se lo llevaron.
    const seLoLlevaron = l.abducido != null;
    const hastaCuando = seLoLlevaron ? l.abducido! + MS_ABDUCCION : l.llegada;
    if (!l.perdido && ahora < hastaCuando) {
      salida.push({
        clave: l.id,
        loroId: l.id,
        ave: l.ave,
        pollera: l.pollera,
        origen: l.origen,
        destino: l.destino,
        distanciaKm: l.distanciaKm,
        salida: l.salida,
        llegada: l.llegada,
        desvio: l.desvio,
        vuelta: false,
        abducido: l.abducido,
      });
    }
    // La vuelta va al revés y sin desvío: el perico ya gastó su romance en la
    // ida, y de todas formas ahora vuelve sin mensaje que retocar.
    if (l.vuelta && ahora < l.vuelta.llegada) {
      salida.push({
        clave: `${l.id}@vuelta`,
        loroId: l.id,
        ave: l.ave,
        pollera: l.pollera,
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

/**
 * El vuelo de un lorito de convite hasta la cervecería.
 *
 * Solo el primer tramo: nido → barra, y mientras dura. Después el ave se posa
 * y deja de ser un tramo —no avanza— así que el mapa la dibuja como un
 * marcador quieto, no como un vuelo. El segundo tramo, de la barra al nido de
 * quien abrió el link, ya es un `Loro` común y entra por `tramosEnElAire`.
 */
export function tramosDeConvites(convites: ConviteVista[], ahora: number): Tramo[] {
  const salida: Tramo[] = [];
  for (const c of convites) {
    // La ida: del nido a la barra.
    if (ahora < c.llegadaPosada) {
      salida.push({
        clave: `convite:${c.id}`,
        loroId: c.id,
        ave: c.ave,
        origen: c.origen,
        destino: c.posada,
        distanciaKm: c.distanciaKm,
        salida: c.salida,
        llegada: c.llegadaPosada,
        desvio: null,
        vuelta: false,
      });
      continue;
    }

    // Y la vuelta, que pasa por dos razones distintas y se dibuja igual: se
    // cansó de esperar a las 48 horas, o lo llamaron de vuelta. En los dos
    // casos el ave cruza el mapa de regreso, y eso hay que verlo — un ave que
    // desaparece de la barra y reaparece en el nido no cuenta nada.
    const vuelve =
      c.estado === "volviendo"
        ? { desde: c.abandona, hasta: c.enCasa }
        : c.estado === "cancelado" && c.vuelveA !== null && ahora < c.vuelveA
          ? { desde: Math.max(c.cancelado ?? 0, c.llegadaPosada), hasta: c.vuelveA }
          : null;
    if (!vuelve) continue;
    salida.push({
      clave: `convite:${c.id}@vuelta`,
      loroId: c.id,
      ave: c.ave,
      origen: c.posada,
      destino: c.origen,
      distanciaKm: c.distanciaKm,
      salida: vuelve.desde,
      llegada: vuelve.hasta,
      desvio: null,
      vuelta: true,
    });
  }
  return salida;
}
