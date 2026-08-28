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
  emoji: string;
  velocidadKmh: number;
  maxCaracteres: number;
  /** Color de la especie. Se usa en la ruta del mapa, el ave y las tarjetas. */
  color: string;
  lema: string;
  descripcion: string;
  rareza?: Rareza;
  /** Una línea, en la pantalla de escribir, avisando la rareza ANTES de mandar. */
  aviso?: string;
};

export const AVES: Record<AveId, Ave> = {
  perico: {
    id: "perico",
    nombre: "Perico",
    articulo: "el",
    emoji: "⚡",
    velocidadKmh: 90,
    maxCaracteres: 120,
    color: "#a3e635",
    lema: "El express",
    descripcion:
      "Chiquito, ansioso y sin frenos. Llega antes que nadie… salvo que se cruce con una perica.",
    rareza: "romance",
    aviso:
      "El perico es el más rápido, pero es un enamoradizo: a veces se cruza con una perica, se queda dando vueltas y llega tarde. Y ella le toca el mensaje.",
  },
  cotorra: {
    id: "cotorra",
    nombre: "Cotorra",
    articulo: "la",
    emoji: "💬",
    velocidadKmh: 60,
    maxCaracteres: 400,
    color: "#22d3ee",
    lema: "La charlatana",
    descripcion:
      "Habla hasta por los codos, y de tanto hablar se le mezcla todo. Llega puntual y con la mitad cambiada.",
    rareza: "olvida",
    aviso:
      "La cotorra repite tu mensaje todo el viaje y se le mezclan las palabras: llega con cosas perdidas, repetidas o dadas vuelta. Teléfono descompuesto, pero con alas.",
  },
  loro: {
    id: "loro",
    nombre: "Loro",
    articulo: "el",
    emoji: "🦜",
    velocidadKmh: 40,
    maxCaracteres: 1000,
    color: "#10b981",
    lema: "El clásico",
    descripcion:
      "El de toda la vida. Se toma su tiempo, escucha todo y lo repite tal cual se lo dijiste.",
  },
  guacamayo: {
    id: "guacamayo",
    nombre: "Guacamayo",
    articulo: "el",
    emoji: "👑",
    velocidadKmh: 25,
    maxCaracteres: 2000,
    color: "#fbbf24",
    lema: "El ceremonioso",
    descripcion:
      "El más lento de todos, y eso es exactamente el mensaje. Mandarlo dice más que lo que lleva escrito.",
  },
  paloma: {
    id: "paloma",
    nombre: "Paloma",
    articulo: "la",
    emoji: "💌",
    velocidadKmh: 50,
    maxCaracteres: 600,
    color: "#f472b6",
    lema: "La romántica",
    descripcion:
      "Cruza el mapa dejando flores y un corazón de chocolate. Cuando abren lo que trae, le explota la pantalla en la cara.",
    rareza: "confeti",
    aviso:
      "La paloma va dejando flores por el camino y llega con un corazón de chocolate. Cuando la abran, la pantalla del otro lado explota en confeti.",
  },
  cuervo: {
    id: "cuervo",
    nombre: "Cuervo",
    articulo: "el",
    emoji: "🖤",
    velocidadKmh: 70,
    maxCaracteres: 250,
    color: "#a78bfa",
    lema: "El de las malas noticias",
    descripcion:
      "Solo lleva lo que nadie quiere escribir. Vuela casi tan rápido como el perico, porque las malas noticias nunca se demoran.",
    rareza: "luto",
    aviso:
      "El cuervo es para las malas noticias. Llega rápido, en silencio, y del otro lado se abre de negro. No lo mandes de vivo.",
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
