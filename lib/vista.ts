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
import { horariosDelConvite, type Convite } from "./convite";
import type { Loro, Nido, Suerte } from "./datos";
import { estadoDeConvite, type EstadoConvite, type Parada } from "./cerveceria";
import { duracionVuelo } from "./vuelo";
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
  /**
   * La parada en la cervecería, si este loro salió de un convite.
   *
   * Viaja siempre, para las dos puntas y desde el momento cero, y ahí se
   * separa del extravío y del romance: esos son sorpresas que se arruinan si
   * se saben antes. Esto ya pasó —el ave estuvo esperando en la barra a que
   * armaras tu nido— y es justamente lo que explica por qué el mensaje llega
   * con hipo.
   */
  parada: Parada | null;
  /** El loro salió convertido en pollera: lo que vuela es una pollera, y al
   *  abrirlo del otro lado llueven polleras. Falso hasta que DESPEGA —importa
   *  para el que sale de una cervecería, que hasta ese momento es un loro. */
  pollera: boolean;
  /**
   * Cuándo se lo llevó un plato volador, o null.
   *
   * Va a las DOS puntas y no solo a quien lo pidió. Del otro lado había alguien
   * a quien ya se le avisó que venía un loro: hacerlo desaparecer en silencio
   * es dejarlo esperando algo que no llega nunca, que es justo lo que la app
   * evita hasta con los que se pierden solos. Y una nave llevándose un ave es
   * demasiado bueno para que lo vea uno solo.
   */
  abducido: number | null;
};

/**
 * Un lorito de convite mientras todavía espera.
 *
 * Solo lo ve quien lo mandó: es la única punta que existe hasta que alguien
 * abre el link. El texto NO viaja de vuelta al navegador de quien lo escribió
 * por costumbre —lo escribió, ya lo sabe— pero sí, porque poder releer qué le
 * mandaste a alguien antes de que lo abra es media razón para volver a mirar.
 */
export type ConviteVista = {
  id: string;
  ave: AveId;
  /**
   * Va a salir de la barra convertido en pollera.
   *
   * Viaja solo acá, que es la vista de quien lo mandó: lo eligió al soltarlo, y
   * esconderlo de ese lado no sería una sorpresa sino un interruptor del que no
   * se sabe si anduvo. Del otro lado no viaja ni por el link (`/api/convite` es
   * público) ni en el loro que sale, hasta que despega.
   *
   * Y el mapa lo ignora a propósito: lo que se dibuja esperando en la
   * cervecería es un loro, para cualquiera que lo mire.
   */
  pollera: boolean;
  texto: string;
  /** A quién iba dirigido. Puede estar vacío. */
  para: string;
  salida: number;
  /** La cervecería y cuándo se posó ahí. Exacta: sale de tu propio nido. */
  posada: Punto;
  lugar: string;
  llegadaPosada: number;
  /** Dónde despegó, para poder dibujar el tramo. */
  origen: Punto;
  distanciaKm: number;
  /** Si ya salió: no hay nada más que esperar, el loro cuenta el resto. */
  reclamado: boolean;
  /** Cuándo se cansa de esperar y arranca de vuelta, y cuándo llega. */
  abandona: number;
  enCasa: number;
  /** Cuándo lo llamaron de vuelta, y cuándo llega al nido si así fue. */
  cancelado: number | null;
  vuelveA: number | null;
  /** En qué anda, ya resuelto: la pantalla no tiene que hacer la cuenta. */
  estado: EstadoConvite;
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
  // Se lo llevó un plato volador. No hace falta taparlo hasta que pase —como el
  // extravío o la pollera— porque no está sorteado de antemano: ocurre en el
  // instante en que alguien lo pide, y para cuando se escribe ya pasó.
  const abducido = l.abducido ?? null;
  // Y ESTO es lo que no puede fallar: un ave abducida NO llega nunca, ni
  // cuando pase su hora de llegada. Sin el `&& !abducido`, el loro seguía
  // aterrizando solo unas horas después —la hora estaba escrita desde el
  // despegue— y entregaba el mensaje que la nave se había llevado. Habría sido
  // un borrado que no borra: el peor resultado posible, porque quien lo pidió
  // se queda creyendo que sí.
  const llego = !perdido && !abducido && ahora >= l.llegada;

  // Los loros de antes de que existiera el perico olvidadizo no tienen el
  // campo; para ellos lo entregado es lo escrito.
  const entregado = l.textoEntregado ?? l.texto;
  const olvido = entregado !== l.texto;

  // Mismo criterio que el extravío: el desvío no viaja hasta que sucede.
  const desvio = l.desvio ?? null;
  const seDistrajo = desvio !== null && ahora >= desvio.desde;

  // Y la pollera tampoco, por la misma razón: la transformación es el chiste y
  // adelantarla lo arruina.
  //
  // En un envío común no cambia nada —el ave despega en el mismo momento en que
  // se manda, así que ya sale convertida—. Existe por el lorito de convite, que
  // sale de la cervecería en pollera: entre que abren el link y que el ave se
  // levanta de la mesa pasa un minuto, y durante ese minuto sigue siendo un
  // loro. Sin esto, el campo llegaba al navegador en cuanto lo reclamaban y la
  // pollera aparecía sentada en la barra, contando el final antes de tiempo.
  const despego = ahora >= l.salida;

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
    abducido,
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
    parada: l.parada ?? null,
    pollera: Boolean(l.pollera) && despego,
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

/**
 * Un convite, como lo ve quien lo mandó.
 *
 * Las dos puntas van exactas y no corridas, al revés que en un loro normal, y
 * por la razón de siempre: las dos son suyas. El nido es el propio y la
 * cervecería la eligió su propia ave.
 */
export function verConvite(
  c: Convite,
  de: Nido,
  escala = 1,
  ahora = Date.now()
): ConviteVista {
  const origen: Punto = { lat: de.lat, lng: de.lng };
  const km = distanciaKm(origen, c.posada);
  const { abandona, enCasa } = horariosDelConvite(c, origen, escala);
  // Si lo llamaron de vuelta, el ave arranca desde donde esté —terminando de
  // llegar a la barra si todavía iba— y tarda lo mismo que tardó en ir.
  const vuelveA =
    c.cancelado === null
      ? null
      : Math.max(c.cancelado, c.llegadaPosada) + duracionVuelo(km, c.ave, escala);
  return {
    id: c.id,
    ave: c.ave,
    pollera: c.pollera === true,
    texto: c.texto,
    para: c.para,
    salida: c.salida,
    posada: c.posada,
    lugar: c.lugar,
    llegadaPosada: c.llegadaPosada,
    origen,
    distanciaKm: km,
    reclamado: Boolean(c.reclamado),
    abandona,
    enCasa,
    cancelado: c.cancelado,
    vuelveA,
    estado: estadoDeConvite(
      {
        llegadaPosada: c.llegadaPosada,
        abandona,
        enCasa,
        reclamado: Boolean(c.reclamado),
        cancelado: c.cancelado,
      },
      ahora
    ),
  };
}
