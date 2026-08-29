// Lo que ve el navegador.
//
// Dos reglas viven acá, y las dos son del producto, no de la interfaz:
//
// 1. **El texto de un loro que todavía vuela no sale del servidor.** No es que
//    la UI lo tape — no lo tiene. Si viajara igual y la pantalla lo escondiera,
//    abrir las herramientas de desarrollo alcanzaría para leer antes de tiempo,
//    y la espera dejaría de ser real. Quien lo mandó sí ve siempre su propio
//    texto: lo escribió, ya lo sabe.
//
// 2. **Las coordenadas exactas de otra persona tampoco salen.** Se manda un
//    punto corrido hasta 300 m (lib/privacidad.ts) y el radio de esa imprecisión,
//    para que el mapa pueda dibujar una zona en vez de un pin. La distancia y
//    el tiempo de vuelo se calculan antes, con los puntos reales, así que son
//    exactos aunque el dibujo sea aproximado.
//
// Tu propio nido sí viaja exacto: es tu dato.

import type { AveId } from "./aves";
import type { Loro, Nido, Suerte } from "./datos";
import type { Desvio } from "./vuelo";
import { distanciaKm, type Punto } from "./geo";
import { RADIO_ZONA_KM, zonaDe, zonaMundial } from "./privacidad";
import { createHash } from "node:crypto";

export type NidoVista = {
  id: string;
  nombre: string;
  lugar: string;
  lat: number;
  lng: number;
  bot: boolean;
  ave: AveId;
  /** 0 en el nido propio; RADIO_ZONA_KM en los demás. El mapa dibuja con esto. */
  radioKm: number;
  /** Distancia real hasta vos, en km. Calculada en el servidor con los puntos
   *  de verdad — no se puede sacar de lat/lng, que vienen corridos. */
  distanciaKm?: number;
  /** Si aparece en la vista del resto. Solo viaja para el nido propio: si de
   *  los ajenos se supiera quién se escondió, esconderse no serviría de nada. */
  publico?: boolean;
};

export type LoroVista = {
  id: string;
  ave: AveId;
  direccion: "enviado" | "recibido";
  otro: { id: string; nombre: string; bot: boolean };
  /** Puntas del vuelo: la tuya exacta, la del otro corrida. */
  origen: Punto;
  destino: Punto;
  distanciaKm: number;
  salida: number;
  llegada: number;
  llego: boolean;
  /** Se perdió: no llegó ni va a llegar. */
  perdido: boolean;
  /** Cuándo se perdió. null mientras siga volando — ver la nota de abajo. */
  extravio: number | null;
  /** Qué le pasó. Vacío hasta que efectivamente se pierde. */
  motivo: string;
  /**
   * El romance del perico. null mientras no haya pasado — por la misma razón
   * que el extravío: saber de antemano que se va a distraer arruina el momento
   * en que se distrae.
   */
  desvio: Desvio | null;
  /** null mientras vuela y es para vos: todavía no existe de este lado. */
  texto: string | null;
  /** El perico perdió cosas por el camino. Solo se sabe una vez que aterrizó. */
  olvido: boolean;
  /** Cómo llegó del otro lado. Solo para quien lo mandó, y recién al aterrizar. */
  entregado: string | null;
  leido: number | null;
  /** Qué hizo con el ave quien la recibió. null si todavía no decidió. */
  suerte: Suerte | null;
  /** Si la soltó: el vuelo de vuelta, para dibujarlo en el mapa. */
  vuelta: { salida: number; llegada: number } | null;
  /**
   * Lo que el ave trae de vuelta, con la misma regla que la ida: no sale del
   * servidor hasta que el ave aterriza en el nido de origen.
   *
   * Quien contestó lo ve desde el momento cero —lo escribió— y quien lo espera
   * no ve nada hasta que el bicho llega. Es la promesa entera de la app: el
   * mensaje viaja, no está.
   */
  respuesta: string | null;
  /** Cómo llegó del otro lado, si la cotorra la cambió. Solo para quien la
   *  escribió, y recién cuando aterriza. */
  respuestaEntregada: string | null;
  /** Que hay algo esperando adentro del ave que vuelve, sin decir qué. */
  traeRespuesta: boolean;
};

const punto = (n: Nido): Punto => ({ lat: n.lat, lng: n.lng });

/**
 * @param yo el nido de quien mira. Si es el mismo, va exacto; si no, corrido y
 *   con la distancia real ya calculada.
 */
export function verNido(n: Nido, yo?: Nido | null): NidoVista {
  const esMio = yo?.id === n.id;
  const p = esMio ? punto(n) : zonaDe(punto(n), n.id);
  return {
    id: n.id,
    nombre: n.nombre,
    lugar: n.lugar,
    lat: p.lat,
    lng: p.lng,
    bot: n.bot,
    ave: n.ave,
    radioKm: esMio ? 0 : RADIO_ZONA_KM,
    distanciaKm: esMio || !yo ? undefined : distanciaKm(punto(yo), punto(n)),
    publico: esMio ? n.publico !== false : undefined,
  };
}

export function verLoro(
  l: Loro,
  yo: string,
  nidos: Map<string, Nido>,
  ahora: number
): LoroVista {
  const enviado = l.de === yo;
  const otroId = enviado ? l.para : l.de;
  const otro = nidos.get(otroId);

  // El extravío se sortea al despegar y queda escrito, pero NO viaja hasta que
  // pasa. Si se mandara desde el principio, abrir las herramientas de
  // desarrollo diría de antemano que ese loro no va a llegar, y esperar algo
  // que ya sabés que no llega no es esperar.
  const extravio = l.extravio ?? null;
  const perdido = extravio !== null && ahora >= extravio;
  const llego = !perdido && ahora >= l.llegada;

  // Los loros de antes de que existiera el perico olvidadizo no tienen el
  // campo; para ellos lo entregado es lo escrito.
  const entregado = l.textoEntregado ?? l.texto;
  const olvido = entregado !== l.texto;

  // Mismo criterio que el extravío: el desvío no viaja hasta que sucede.
  const desvio = l.desvio ?? null;
  const seDistrajo = desvio !== null && ahora >= desvio.desde;

  const suerte = l.suerte ?? null;
  const vuelta =
    suerte === "soltado" && l.suerteEn && l.regreso
      ? { salida: l.suerteEn, llegada: l.regreso }
      : null;

  // La vuelta se lee al revés que la ida: quien MANDÓ el loro es quien espera
  // la respuesta, y quien lo recibió es quien la escribió.
  const volvio = Boolean(vuelta && ahora >= vuelta.llegada);
  const hayRespuesta = Boolean(l.respuesta);
  const respuestaLlega = l.respuestaEntregada ?? l.respuesta ?? null;
  const respuestaCambio = hayRespuesta && respuestaLlega !== l.respuesta;

  // La punta del otro se corre; la propia queda exacta. Las dos personas ven
  // líneas apenas distintas y el mismo avance: el tiempo es lo que importa.
  const origen = enviado ? l.origen : zonaDe(l.origen, l.de);
  const destino = enviado ? zonaDe(l.destino, l.para) : l.destino;

  return {
    id: l.id,
    ave: l.ave,
    direccion: enviado ? "enviado" : "recibido",
    otro: {
      id: otroId,
      nombre: otro?.nombre || "Alguien",
      bot: Boolean(otro?.bot),
    },
    origen,
    destino,
    // La real, calculada con los puntos de verdad al soltar el ave.
    distanciaKm: l.distanciaKm,
    salida: l.salida,
    llegada: l.llegada,
    llego,
    perdido,
    extravio: perdido ? extravio : null,
    motivo: perdido ? l.motivo || "" : "",
    desvio: seDistrajo ? desvio : null,
    // Un loro perdido nunca llega, así que su texto tampoco: quien lo esperaba
    // no va a saber nunca qué decía. Quien lo escribió lo sigue viendo.
    //
    // Y lo que llega no siempre es lo que se escribió: el perico se come
    // palabras por el camino. Quien lo mandó ve su texto tal cual; quien lo
    // recibe, lo que efectivamente llegó.
    texto: enviado ? l.texto : llego ? entregado : null,
    // El olvido se cuenta recién al aterrizar, para las dos puntas: saber de
    // antemano que va a llegar mordido le saca la gracia.
    olvido: llego && olvido,
    entregado: enviado && llego && olvido ? entregado : null,
    leido: l.leido,
    suerte,
    vuelta,
    // Quien la escribió (recibió el loro) ve siempre lo suyo. Quien la espera
    // (lo mandó) no ve nada hasta que el ave aterriza de vuelta.
    respuesta: enviado ? (volvio ? respuestaLlega : null) : (l.respuesta ?? null),
    respuestaEntregada: !enviado && volvio && respuestaCambio ? respuestaLlega : null,
    // Se avisa que trae algo, sin decir qué: es lo que hace que valga la pena
    // mirar el mapa mientras vuelve.
    traeRespuesta: hayRespuesta,
  };
}


// ---------- la vista del resto ----------
//
// Los loros de gente que no conocés, cruzando el mapa. Es la parte de la app
// que se ve a sí misma viva, y también la más fácil de arruinar: acá NO hay
// una relación previa entre quien mira y quien voló, así que las reglas de la
// bandada no alcanzan.
//
// Lo que se manda, y lo que no:
//
//   ✗ nombres, códigos, ids de nido — nada que identifique a nadie
//   ✗ el texto del mensaje, ni siquiera después de aterrizar
//   ✗ el id real del loro (va hasheado, para que sea una clave de dibujo y
//     nada más)
//   ✓ la especie, los horarios, y las dos puntas corridas 25 km
//
// Los 25 km son toda la protección, y por eso el mapa no dibuja ningún nido en
// esta vista: no hay un punto que valga la pena marcar, y un pin sobre una
// coordenada corrida al azar aparenta una precisión que no existe. Aparecen
// únicamente los vuelos donde LAS DOS puntas aceptaron: el arco muestra las
// dos, así que basta con que a una no le guste para que el vuelo no salga.

export type VueloMundo = {
  /** Hash del id real. Sirve para que el mapa reconozca sus capas, y para nada más. */
  id: string;
  ave: AveId;
  origen: Punto;
  destino: Punto;
  /** Redondeada: la distancia exacta entre dos puntos corridos igual estrecha
   *  demasiado dónde están las puntas de verdad. */
  distanciaKm: number;
  salida: number;
  llegada: number;
  desvio: Desvio | null;
};

/** Los nidos que aceptaron aparecer. Sin el campo cuenta como que sí: los
 *  nidos anteriores a esta vista no lo tienen. */
export function apareceEnElMundo(n: Nido | undefined | null): boolean {
  return Boolean(n) && n!.publico !== false && !n!.bot;
}

/** Menos precisión cuanto más largo el vuelo. "11.100 km" cuenta lo mismo que
 *  "11.147 km" y no ayuda a ubicar a nadie. */
function redondear(km: number): number {
  if (km < 100) return Math.round(km / 5) * 5;
  if (km < 1000) return Math.round(km / 25) * 25;
  return Math.round(km / 100) * 100;
}

export function verVueloMundial(l: Loro, ahora: number): VueloMundo {
  const desvio = l.desvio ?? null;
  return {
    id: createHash("sha256").update(`vuelo:${l.id}`).digest("hex").slice(0, 12),
    ave: l.ave,
    origen: zonaMundial(l.origen, l.de),
    destino: zonaMundial(l.destino, l.para),
    distanciaKm: redondear(l.distanciaKm),
    salida: l.salida,
    llegada: l.llegada,
    // Misma regla que en la bandada: el desvío no viaja hasta que pasa.
    desvio: desvio && ahora >= desvio.desde ? desvio : null,
  };
}
