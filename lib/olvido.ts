// Lo que llega cuando no llega tal cual se escribió.
//
// Dos aves entregan algo distinto de lo que se puso en el campo de texto, y por
// razones distintas:
//
//   La cotorra repite el mensaje en voz alta todo el viaje y se le mezcla:
//   pierde palabras, repite otras, da vuelta un par. Teléfono descompuesto.
//
//   Al perico se lo retoca la perica con la que se distrajo. Ella toca menos
//   —no es su mensaje— pero firma al final, y ahí está el chiste.
//
// Ninguna de las dos es un error de la app: las dos se avisan en la pantalla de
// escribir, antes de mandar (lib/aves.ts, campo `aviso`).
//
// Tres reglas para que sea gracioso y no molesto:
//
//   1. La primera y la última palabra no se tocan. Un mensaje que arranca y
//      cierra bien se entiende igual aunque el medio esté hecho un desastre;
//      uno que empieza con "…" se lee como un error.
//   2. Se rompe alrededor de un quinto de las palabras. Más que eso deja de
//      ser un chiste y pasa a ser ruido.
//   3. Mensajes de menos de cuatro palabras salen intactos: no hay medio que
//      arruinar sin arruinarlo todo.
//
// Es determinista: el resultado sale de la semilla (el id del loro), así que
// se calcula una vez al despegar y las dos personas ven exactamente lo mismo.

/** Hash de texto a número (FNV-1a). Solo para sembrar el azar. */
function semillaNumerica(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Azar reproducible (mulberry32). */
function azar(semilla: number): () => number {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MINIMO_PALABRAS = 4;

/** Qué proporción de palabras se rompe. La cotorra habla el viaje entero; la
 *  perica apenas mete mano en un mensaje que ni siquiera es suyo. */
const PROPORCION_COTORRA = 0.22;
const PROPORCION_PERICA = 0.12;

function mezclar(texto: string, semilla: string, proporcion: number): string {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length < MINIMO_PALABRAS) return texto;

  const r = azar(semillaNumerica(semilla));
  const objetivo = Math.max(1, Math.round(palabras.length * proporcion));
  const salida: string[] = [];
  let rotas = 0;

  for (let i = 0; i < palabras.length; i++) {
    const palabra = palabras[i];
    const enElMedio = i > 0 && i < palabras.length - 1;
    if (!enElMedio || rotas >= objetivo || r() > 0.5) {
      salida.push(palabra);
      continue;
    }
    const que = r();
    if (que < 0.45) {
      salida.push("…"); // se la olvidó
    } else if (que < 0.78) {
      salida.push(palabra, palabra); // la repitió, como buen loro
    } else if (i + 1 < palabras.length - 1) {
      salida.push(palabras[i + 1], palabra); // las mezcló
      i++;
    } else {
      salida.push("…");
    }
    rotas++;
  }

  // Si el azar no rompió nada, el chiste no llega. Se fuerza un olvido en el
  // medio: una cotorra que entrega el mensaje perfecto no es una cotorra.
  if (rotas === 0) salida[Math.floor(palabras.length / 2)] = "…";

  return salida
    .join(" ")
    .replace(/(?:… ){2,}…?/g, "… ") // dos olvidos seguidos se leen como uno
    .replace(/\s+/g, " ")
    .trim();
}

/** El teléfono descompuesto de la cotorra. */
export function loQueRepiteLaCotorra(texto: string, semilla: string): string {
  return mezclar(texto, semilla, PROPORCION_COTORRA);
}

/**
 * Lo que queda del mensaje después de que la perica le metiera mano.
 *
 * Toca menos palabras que la cotorra —no es su mensaje, solo lo está espiando—
 * pero firma al final. La firma es lo que convierte "llegó raro" en "pasó algo
 * en el camino", que es la historia que la app quiere contar.
 */
const FIRMAS = [
  "(esto último lo escribió una perica, no preguntes)",
  "(la perica también te manda saludos)",
  "(pd: tu perico ahora es mi perico)",
  "(el perico está ocupado, termino yo)",
  "(perdón, se lo leí entero antes de traerlo)",
];

export function loQueRetocaLaPerica(texto: string, semilla: string): string {
  const mezclado = mezclar(texto, `perica:${semilla}`, PROPORCION_PERICA);
  const firma = FIRMAS[semillaNumerica(`firma:${semilla}`) % FIRMAS.length];
  return `${mezclado} ${firma}`;
}
