// La parada en la cervecería.
//
// Cuando le mandás un lorito a alguien que TODAVÍA NO ESTÁ en la app, hay un
// problema de geometría antes que de producto: no se sabe adónde va. El nido
// de esa persona no existe hasta que abre el link, así que no hay destino, no
// hay distancia y no hay hora de llegada.
//
// La salida no es hacer esperar al ave en el nido —eso es una bandeja de
// salida, y ver un pájaro quieto no le cuenta nada a nadie— sino mandarla a
// una parada intermedia. Despega, cruza un pedazo de mapa, se posa en una
// cervecería a dos minutos de vuelo y espera ahí. Cuando la otra persona abre
// el link y arma su nido, recién ahí hay adónde ir, y el ave sale de la
// cervecería hacia allá.
//
// Y como el ave estuvo en una cervecería todo ese tiempo, se tomó unos
// copetines. Cuanto más tardaron en abrir el link, más copetines: llega más
// tarde y entrega el mensaje con hipo. Eso convierte la espera —que en
// cualquier otra app es tiempo muerto— en la parte más divertida.
//
// Todo lo de acá es puro y sin nada del servidor adentro: lo necesitan los dos
// lados, el servidor para fijar horarios y el navegador para contar qué está
// haciendo el ave mientras espera.

import { AVES, type AveId } from "./aves";
import { desplazar, type Punto } from "./geo";

/**
 * Cuánto vuela el ave antes de parar.
 *
 * Dos minutos, y son dos minutos y no una distancia fija porque cada ave vuela
 * distinto: el perico para más lejos que el guacamayo, igual que en todo el
 * resto de la app. Lo que tiene que ser igual para todas es lo que se ve —
 * despegar, cruzar un pedazo de mapa y posarse— y eso es tiempo, no kilómetros.
 */
export const MINUTOS_HASTA_LA_PARADA = 2;

/** A cuántos kilómetros del nido queda la parada, según el ave. */
export function kmHastaLaParada(ave: AveId): number {
  return AVES[ave].velocidadKmh * (MINUTOS_HASTA_LA_PARADA / 60);
}

/**
 * Para qué lado sale.
 *
 * No hay un lado correcto: el destino no existe todavía. Sale determinista de
 * la semilla —el id del convite— y no de `Math.random()`, porque el punto se
 * guarda una sola vez pero se dibuja muchas: si bailara, el ave cambiaría de
 * cervecería en cada consulta.
 */
export function rumboDeLaParada(semilla: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < semilla.length; i++) {
    h ^= semilla.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967296) * 360;
}

/** Dónde para. */
export function dondeLaCerveceria(nido: Punto, semilla: string, ave: AveId): Punto {
  return desplazar(nido, kmHastaLaParada(ave), rumboDeLaParada(semilla));
}

/**
 * Cómo se nombra la cervecería.
 *
 * El geocodificador devuelve "Buenos Aires, Argentina", y "en una cervecería de
 * Buenos Aires, Argentina" se lee como una dirección postal, no como un bar. La
 * barra está a pocos kilómetros: el país sobra siempre y la ciudad alcanza —y a
 * veces sale premio, porque un ave rápida cruza al partido de al lado y la
 * cervecería queda "de Vicente López".
 */
export function ciudadDe(lugar: string): string {
  return (lugar || "").split(",")[0].trim();
}

/**
 * Lo que se queda en la barra DESPUÉS de que abren el link.
 *
 * Podría salir en el acto y no estaría mal, pero se perdería el mejor momento
 * que tiene esto: alguien acaba de armar su nido, entra al mapa por primera
 * vez, y lo primero que ve es un ave sentada en una cervecería terminando el
 * copetín antes de salir para su casa. Un minuto es poco para molestar y
 * suficiente para que se entienda que el bicho estuvo ahí.
 *
 * Cuenta desde que abren el link y no desde que el ave llegó a la barra: si
 * contara desde que llegó, quien abre el link tres días después no vería nada.
 */
export const MINUTOS_MINIMOS_EN_LA_BARRA = 1;

/** Lo mismo en milisegundos, con la escala de tiempo aplicada. */
export function esperaMinimaEnLaBarra(escala = 1): number {
  return Math.round((MINUTOS_MINIMOS_EN_LA_BARRA * 60_000) / (escala > 0 ? escala : 1));
}

// ---------- los copetines ----------

/** Cada cuánto se pide otra. */
const MINUTOS_POR_COPETIN = 20;

/** Más de esto no entra en un ave. */
const TOPE_COPETINES = 12;

/** Cuántas horas de barra hacen falta para quedar de jarana del todo. */
export const HORAS_HASTA_LA_JAROLA = 6;

/**
 * Cuánto se demora de más por venir tomado, como parte del viaje.
 *
 * Es un tope bajo a propósito. El chiste es que llegue haciendo eses, no que
 * alguien que acaba de armar su nido se quede esperando el doble.
 */
export const DEMORA_MAXIMA = 0.35;

/**
 * La parada, ya cerrada: dónde fue, cuánto duró y cómo salió el ave de ahí.
 *
 * Queda escrita en el loro que sale de la cervecería, y no se recalcula nunca:
 * los copetines se cuentan una sola vez, cuando el ave se levanta de la mesa.
 * Si se contaran al mirar, el mensaje entregado cambiaría en cada consulta.
 */
export type Parada = {
  punto: Punto;
  /** "Palermo, Buenos Aires". Puede estar vacío: es best-effort. */
  lugar: string;
  /** Cuándo se posó y cuándo se levantó. */
  llegada: number;
  salida: number;
  /** De 0 a 1. Cuánto le arrastra la lengua al entregar. */
  nivel: number;
  copetines: number;
};

export type Borrachera = {
  /** De 0 (recién se sentó) a 1 (de jarana). */
  nivel: number;
  copetines: number;
};

/**
 * Cuán tomado está, según lo que esperó.
 *
 * @param esperaMs cuánto estuvo posado en la cervecería.
 * @param escala la escala de tiempo global, para que las demos también sirvan
 *   para esto: con el tiempo acelerado, el ave se emborracha acelerado.
 */
export function borrachera(esperaMs: number, escala = 1): Borrachera {
  const e = escala > 0 ? escala : 1;
  const espera = Math.max(0, esperaMs);
  const hastaLaJarola = (HORAS_HASTA_LA_JAROLA * 3_600_000) / e;
  const porCopetin = (MINUTOS_POR_COPETIN * 60_000) / e;
  return {
    nivel: Math.min(1, espera / hastaLaJarola),
    copetines: Math.min(TOPE_COPETINES, Math.floor(espera / porCopetin)),
  };
}

/** Cuánto le suma al viaje de vuelta. 1 = como si nada. */
export function demoraPorCopetines(nivel: number): number {
  return 1 + DEMORA_MAXIMA * Math.min(1, Math.max(0, nivel));
}

/**
 * Qué está haciendo en la cervecería, para contarlo mientras espera.
 *
 * Rota con el tiempo en vez de quedarse en una sola frase: quien mandó el
 * lorito va a mirar esta tarjeta varias veces, y un cartel que nunca cambia
 * deja de leerse a la segunda. Cambia sola, sin pedirle nada al servidor: es
 * el reloj y la semilla, igual que la posición del ave.
 */
const ANTES_DEL_PRIMERO = [
  "está eligiendo mesa",
  "se acomodó en la barra",
  "pidió la carta",
];

const YA_EMPEZO = [
  "se está tomando unos copetines",
  "pidió una picada",
  "se hizo amigo del de la barra",
  "está mirando el partido",
  "pidió otra, la última",
  "se puso a contar el viaje",
];

const DE_JAROLA = [
  "está de jarana",
  "se puso a cantar",
  "le está explicando el mensaje a un desconocido",
  "juró que ya sale",
  "está haciendo eses arriba de la mesa",
];

/** Cada cuánto cambia la frase. */
const FRASE_MS = 25_000;

export function loQueEstaHaciendo(
  b: Borrachera,
  semilla: string,
  ahora: number
): string {
  const lista = b.copetines === 0 ? ANTES_DEL_PRIMERO : b.nivel >= 0.75 ? DE_JAROLA : YA_EMPEZO;
  const salto = Math.floor(ahora / FRASE_MS);
  const base = Math.floor(rumboDeLaParada(semilla));
  return lista[(base + salto) % lista.length];
}
