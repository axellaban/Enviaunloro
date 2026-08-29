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
 *   luto    — el cuervo solo trae malas noticias, y se le nota.
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
   * Una línea —una sola— en la pantalla de escribir, avisando la rareza ANTES
   * de mandar. Eran párrafos de treinta palabras: nadie los leía, y sumaban
   * cuatro bloques de texto justo en el momento de decidir.
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
      "Ojo: a veces se enamora en el camino, llega tarde y ella le toca el mensaje.",
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
      "De tanto repetirlo se le mezcla. Llega como un teléfono descompuesto.",
  },
  loro: {
    id: "loro",
    nombre: "Loro",
    articulo: "el",
    velocidadKmh: 40,
    maxCaracteres: 1000,
    color: "#10b981",
    lema: "El clásico",
  },
  guacamayo: {
    id: "guacamayo",
    nombre: "Guacamayo",
    articulo: "el",
    velocidadKmh: 25,
    maxCaracteres: 2000,
    color: "#fbbf24",
    lema: "El ceremonioso",
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
    aviso:
      "Va dejando flores, y al abrirla la pantalla del otro lado explota en confeti.",
  },
  cuervo: {
    id: "cuervo",
    nombre: "Cuervo",
    articulo: "el",
    velocidadKmh: 70,
    maxCaracteres: 250,
    color: "#a78bfa",
    lema: "El de las malas noticias",
    rareza: "luto",
    aviso:
      "Para malas noticias. Del otro lado se abre de negro. No lo mandes de vivo.",
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

/**
 * Las de todos los días.
 *
 * El onboarding elige entre estas cuatro y no entre las seis: la paloma y el
 * cuervo son de ocasión —una es para declararse y el otro para dar una mala
 * noticia— y ponerlas al lado del loro común, el primer día, es pedirle a
 * alguien que elija su ave habitual entre dos que no va a usar nunca. Aparecen
 * enteras en la pantalla de escribir, que es donde importan.
 */
export const AVES_COTIDIANAS: Ave[] = [
  AVES.perico,
  AVES.cotorra,
  AVES.loro,
  AVES.guacamayo,
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
