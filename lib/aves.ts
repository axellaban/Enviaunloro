// Las seis aves y su tabla de balance.
//
// La velocidad NO es ornitología: es diseño de producto. En la vida real un
// guacamayo vuela más rápido que un perico, pero acá la regla que hace
// interesante la elección es el canje velocidad ↔ cuánto podés decir:
//
//   rápido = llega ya, pero te obliga a ser breve
//   lento  = tarda, pero te deja escribir una carta
//
// La regla vale para las seis y en ese orden: perico 90, cuervo 70, cotorra 60,
// paloma 50, loro 40, guacamayo 25 — y los caracteres suben mientras la
// velocidad baja, sin excepciones. Una sola ave que rompa la escalera convierte
// la elección en un trámite: siempre habría una mejor que las demás.
//
// Si algún día se cambian estos números, cambiarlos ACÁ: la app entera (ETA,
// contador de caracteres, colores, mapa) sale de esta tabla.

export type AveId =
  | "perico"
  | "cotorra"
  | "loro"
  | "guacamayo"
  | "paloma"
  | "cuervo";

/**
 * Lo que le pasa al mensaje —o a la pantalla— por culpa del ave. Una por
 * especie, o ninguna.
 *
 *   olvida  — la cotorra habla tanto que se le mezclan las palabras.
 *   romance — el perico se enamora en el camino y llega tarde y retocado.
 *   confeti — la paloma explota la pantalla al abrirse.
 *   luto    — el cuervo solo trae desgracias, y se le nota.
 */
export type Rareza = "olvida" | "romance" | "confeti" | "luto";

export type Ave = {
  id: AveId;
  nombre: string;
  /** Nombre con artículo, para armar frases: "tu perico", "la cotorra". */
  articulo: "el" | "la";
  velocidadKmh: number;
  maxCaracteres: number;
  /** Color de la especie. Se usa en la ruta del mapa, el ave y las tarjetas. */
  /** El del tema oscuro, que es el que la app usa. El claro vive en
   *  lib/tema.ts (COLOR_AVE), medido, para cuando haya interruptor. */
  color: string;
  lema: string;
  rareza?: Rareza;
  /**
   * Una línea —una sola— en la pantalla de escribir, ANTES de mandar. Eran
   * párrafos de treinta palabras: nadie los leía, y sumaban cuatro bloques de
   * texto justo en el momento de decidir.
   *
   * En las cuatro con rareza avisa lo que va a pasar. En las dos que no tienen
   * —loro y guacamayo— dice justamente eso: que no pasa nada raro, que es la
   * información que hacía falta para elegirlas. El recuadro se dibuja distinto
   * según el caso (ver Compositor): si todas avisaran igual, el punteado
   * dejaría de significar "ojo".
   */
  aviso?: string;
};

export const AVES: Record<AveId, Ave> = {
  perico: {
    id: "perico",
    nombre: "Perico",
    articulo: "el",
    velocidadKmh: 90,
    maxCaracteres: 120,
    color: "#a3e635",
    lema: "El express",
    rareza: "romance",
    aviso:
      "Ojo: a veces se distrae en el camino con alguna cotorra que lo enamora.",
  },
  cotorra: {
    id: "cotorra",
    nombre: "Cotorra",
    articulo: "la",
    velocidadKmh: 60,
    maxCaracteres: 400,
    color: "#22d3ee",
    lema: "La charlatana",
    rareza: "olvida",
    aviso:
      "De tanto repetirlo se le mezcla. Se le olvida la mitad.",
  },
  loro: {
    id: "loro",
    nombre: "Loro",
    articulo: "el",
    velocidadKmh: 40,
    maxCaracteres: 1000,
    color: "#10b981",
    lema: "El clásico",
    aviso: "Es un loro… un re loro. Puede convertirse en pollera.",
  },
  guacamayo: {
    id: "guacamayo",
    nombre: "Guacamayo",
    articulo: "el",
    velocidadKmh: 25,
    maxCaracteres: 2000,
    color: "#fbbf24",
    lema: "El ceremonioso",
    aviso: "El más grande y el más lento de todos. Con este, la espera es parte del mensaje.",
  },
  paloma: {
    id: "paloma",
    nombre: "Paloma",
    articulo: "la",
    velocidadKmh: 50,
    maxCaracteres: 600,
    color: "#f472b6",
    lema: "La romántica",
    rareza: "confeti",
    aviso: "Para mensajes románticos. Entrega con flores y chocolate.",
  },
  cuervo: {
    id: "cuervo",
    nombre: "Cuervo",
    articulo: "el",
    velocidadKmh: 70,
    maxCaracteres: 250,
    color: "#a78bfa",
    lema: "El de las desgracias",
    rareza: "luto",
    aviso: "Para comunicar desgracias.",
  },
};

/**
 * El orden en que se muestran. Las cuatro de siempre primero —son las del día a
 * día— y atrás las dos de ocasión, que casi nadie manda dos veces por semana.
 */
export const AVES_LISTA: Ave[] = [
  AVES.perico,
  AVES.cotorra,
  AVES.loro,
  AVES.guacamayo,
  AVES.paloma,
  AVES.cuervo,
];

export function esAveId(x: unknown): x is AveId {
  return typeof x === "string" && x in AVES;
}

export function ave(id: AveId): Ave {
  return AVES[id];
}

/** Las que entregan algo distinto de lo que se escribió. */
export function retocaElTexto(id: AveId): boolean {
  const r = AVES[id].rareza;
  return r === "olvida" || r === "romance";
}
