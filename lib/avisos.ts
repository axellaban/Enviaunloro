// El texto de los avisos. Todos, y en un solo lugar.
//
// Antes vivían en dos: el servidor los escribía en sus rutas y el cliente los
// volvía a escribir en la página. Eran los MISMOS momentos —despegó, aterrizó,
// se perdió— redactados dos veces, y ya habían empezado a separarse: el mismo
// extravío se anunciaba "Se perdió tu loro" desde el servidor y "Se perdió un
// loro" desde la pestaña abierta. Nadie los iba a mantener sincronizados a
// mano, así que dejaron de estar a mano.
//
// TRES REGLAS, y las tres salen de mirar una pantalla de bloqueo:
//
// 1. EL NOMBRE VA EN EL TÍTULO. Es lo único que se lee de reojo, con el
//    teléfono sobre la mesa. "Aterrizó un lorito" obliga a desbloquear para
//    saber de quién; "Aterrizó el lorito de Ana" ya te lo dijo.
//
// 2. EL EMOJI VA AL FINAL. Siempre. Estaban seis al final y dos al principio,
//    y en una lista de avisos apilados el desalineado se ve.
//
// 3. EL MENSAJE NO VIAJA. Ni un pedazo. Abrir el ave es la ceremonia de la
//    app, y un aviso que adelanta el texto se la come. Es la misma regla que
//    el servidor ya respeta en `lib/vista.ts`, acá abajo.
//
// Este archivo no importa nada del servidor a propósito: lo usan las rutas y
// también el navegador, así que no puede arrastrar `node:crypto` ni el store.
// Solo tipos y funciones puras.

import { AVES, type AveId } from "./aves";
import { formatearDuracion } from "./geo";

export type Aviso = {
  titulo: string;
  cuerpo: string;
  /** Mismo tag = reemplaza en vez de apilar. Todos los capítulos de un mismo
   *  loro comparten el suyo: cinco avisos del mismo bicho son cinco veces la
   *  misma noticia. */
  tag: string;
  /** Adónde lleva el toque. Hasta ahora ninguno la mandaba y todos caían en el
   *  mapa: te avisaban que aterrizó algo y después te tocaba buscarlo. */
  url: string;
};

const tagDe = (idLoro: string) => `loro:${idLoro}`;
const irA = (idLoro: string) => `/nido?ver=${encodeURIComponent(idLoro)}`;

/** El nombre de la especie en minúscula, para meter en una frase. */
const especie = (ave: AveId) => AVES[ave].nombre.toLowerCase();

// Tres de las seis aves son femeninas —paloma, cotorra— y la tabla ya lo sabe:
// `AVES[x].articulo`. Sin esto salían "Ese paloma" y "Va el guacamayo", que es
// la clase de detalle que hace que un texto se lea escrito por una máquina.
/** "un" / "una". */
const un = (ave: AveId) => (AVES[ave].articulo === "la" ? "una" : "un");
/** "Ese" / "Esa", para empezar una oración. */
const Ese = (ave: AveId) => (AVES[ave].articulo === "la" ? "Esa" : "Ese");

/** "en 3 h 20 min", o nada si ya pasó. Sirve para no escribir "llega en 0 s". */
const enTanto = (falta: number) =>
  falta > 0 ? `Llega en ${formatearDuracion(falta)}.` : "Está por llegar.";

/**
 * Despegó y viene hacia vos.
 *
 * El título nombra a la persona y no al ave: lo que hace que valga la pena
 * mirar el teléfono es quién se acordó de vos, no qué especie eligió. La
 * especie va abajo, que es donde suma.
 */
export function avisoDespegue(a: {
  idLoro: string;
  quien: string;
  ave: AveId;
  pollera: boolean;
  falta: number;
}): Aviso {
  return {
    titulo: a.pollera
      ? `${a.quien} te mandó una pollera 🩱`
      : `${a.quien} te mandó un lorito 🦜`,
    cuerpo: a.pollera
      ? `Va cruzando el mapa. ${enTanto(a.falta)}`
      : `Va ${un(a.ave)} ${especie(a.ave)} en camino. ${enTanto(a.falta)}`,
    tag: tagDe(a.idLoro),
    url: irA(a.idLoro),
  };
}

/**
 * El lorito que sale de una cervecería.
 *
 * Es el primer aviso que recibe alguien que acaba de armar su nido desde un
 * convite, así que es literalmente la primera frase que esa persona lee de la
 * app. Contarlo como un vuelo más se come toda la historia: ese bicho estuvo
 * esperando en una barra a que existieras.
 */
export function avisoDeCopetines(a: {
  idLoro: string;
  quien: string;
  ave: AveId;
  falta: number;
  enLaBarra: boolean;
}): Aviso {
  return {
    titulo: `Tu lorito viene de copetines 🍺`,
    cuerpo: a.enLaBarra
      ? `${un(a.ave)[0].toUpperCase()}${un(a.ave).slice(1)} ${especie(a.ave)} de ${a.quien}, todavía terminando el copetín. ${enTanto(a.falta)}`
      : `${un(a.ave)[0].toUpperCase()}${un(a.ave).slice(1)} ${especie(a.ave)} de ${a.quien}, ya salió de la cervecería. ${enTanto(a.falta)}`,
    tag: tagDe(a.idLoro),
    url: irA(a.idLoro),
  };
}

/**
 * Aterrizó.
 *
 * El cuerpo NO dice "tocá para abrirlo": todo aviso se toca, y ahora el toque
 * además lleva hasta la tarjeta. Ese renglón se usa para lo único que hace
 * falta saber sin abrir nada — que el bicho está ahí, esperando.
 */
export function avisoAterrizaje(a: { idLoro: string; quien: string; ave: AveId }): Aviso {
  return {
    titulo: `Aterrizó el lorito de ${a.quien} 🦜`,
    cuerpo: `${Ese(a.ave)} ${especie(a.ave)} te está esperando en el nido.`,
    tag: tagDe(a.idLoro),
    url: irA(a.idLoro),
  };
}

/**
 * Se perdió.
 *
 * `mio` cambia de quién es la pérdida. Le llega a las dos puntas y no dice lo
 * mismo: al que lo mandó le importa que su mensaje no llegó; al que lo
 * esperaba, que deje de esperarlo.
 */
export function avisoExtravio(a: {
  idLoro: string;
  quien: string;
  ave: AveId;
  motivo: string;
  mio: boolean;
}): Aviso {
  return {
    titulo: a.mio ? `Se perdió tu lorito 🍃` : `Se perdió un lorito de ${a.quien} 🍃`,
    cuerpo: a.mio
      ? `Nunca llegó a lo de ${a.quien}. ${a.motivo}`.trim()
      : `${un(a.ave)[0].toUpperCase()}${un(a.ave).slice(1)} ${especie(a.ave)} que venía hacia vos. ${a.motivo}`.trim(),
    tag: tagDe(a.idLoro),
    url: irA(a.idLoro),
  };
}

/** Qué hicieron con tu ave del otro lado. El título cuenta la noticia: es lo
 *  que se lee de reojo, y "Novedades de tu lorito" no era ninguna noticia. */
export function avisoSuerte(a: {
  idLoro: string;
  quien: string;
  ave: AveId;
  suerte: "soltado" | "enjaulado" | "puchero";
  conRespuesta: boolean;
  vuelve: number;
}): Aviso {
  if (a.suerte === "enjaulado") {
    return {
      titulo: `${a.quien} se quedó con tu lorito 🔒`,
      cuerpo: `${Ese(a.ave)} ${especie(a.ave)} no vuelve más.`,
      tag: tagDe(a.idLoro),
      url: irA(a.idLoro),
    };
  }
  if (a.suerte === "puchero") {
    return {
      titulo: `Tu lorito no volvió de lo de ${a.quien} 🍲`,
      cuerpo: "Mejor no preguntes.",
      tag: tagDe(a.idLoro),
      url: irA(a.idLoro),
    };
  }
  return {
    titulo: `${a.quien} soltó tu lorito 🕊`,
    cuerpo: `${a.conRespuesta ? "Vuelve con una respuesta adentro." : "Vuelve a tu nido."}${
      a.vuelve > 0 ? ` ${enTanto(a.vuelve)}` : ""
    }`,
    tag: tagDe(a.idLoro),
    url: irA(a.idLoro),
  };
}

/** El ave volvió al nido de quien la mandó, y con lo que traiga adentro. */
export function avisoVuelta(a: {
  idLoro: string;
  quien: string;
  ave: AveId;
  conRespuesta: boolean;
}): Aviso {
  return {
    titulo: `Volvió tu lorito 🕊`,
    cuerpo: a.conRespuesta
      ? `${Ese(a.ave)} ${especie(a.ave)} trae la respuesta de ${a.quien}.`
      : `${a.quien} lo soltó y ya está en tu nido.`,
    tag: tagDe(a.idLoro),
    url: irA(a.idLoro),
  };
}

/**
 * Alguien a quien invitaste armó su nido.
 *
 * El mejor momento de toda la mecánica, y el único aviso que premia haber
 * invitado a alguien. Por eso el nombre va adelante de todo.
 */
export function avisoBandada(a: {
  idLoro: string;
  quien: string;
  ave: AveId;
  falta: number;
}): Aviso {
  return {
    titulo: `${a.quien} se sumó a tu bandada 🦜`,
    cuerpo: `Armó su nido. Tu ${especie(a.ave)} está pagando la cuenta. ${enTanto(a.falta)}`,
    tag: tagDe(a.idLoro),
    url: irA(a.idLoro),
  };
}

/**
 * Se lo llevó un plato volador.
 *
 * Le llega a quien lo ESPERABA, no a quien la llamó: esa persona la pidió y ya
 * sabe. Del otro lado hace falta de verdad —se le había avisado que venía un
 * lorito— y sin esto se queda esperando algo que no llega nunca.
 */
export function avisoAbduccion(a: { idLoro: string; quien: string; ave: AveId }): Aviso {
  return {
    titulo: `Abdujeron el lorito de ${a.quien} 🛸`,
    cuerpo: `Un plato volador interceptó ${AVES[a.ave].articulo} ${especie(
      a.ave
    )} en pleno vuelo. No va a llegar.`,
    tag: tagDe(a.idLoro),
    url: irA(a.idLoro),
  };
}

/**
 * El mismo aviso, en una línea, para el cartelito de adentro de la app.
 *
 * Ese cartel decía otra cosa que la notificación del mismo hecho, porque eran
 * dos textos distintos escritos en dos lugares. Ahora es el mismo, plegado:
 * el título trae la noticia y el cuerpo el detalle, que es exactamente el
 * orden en que se quieren leer.
 */
export function unaLinea(a: Aviso): string {
  return `${a.titulo} · ${a.cuerpo}`;
}
