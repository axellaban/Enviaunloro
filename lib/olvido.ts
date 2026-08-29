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

import {
  LARGO_MINIMO_PALABRA,
  PARTE_QUE_CAMBIA,
  tieneParecida,
  transformar,
} from "./sanateo";

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

/** Qué proporción toca la perica. Apenas mete mano en un mensaje que ni
 *  siquiera es suyo: la cotorra tiene su propia regla, más abajo. */
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

  if (rotas === 0) salida[Math.floor(palabras.length / 2)] = "…";

  return salida
    .join(" ")
    .replace(/(?:… ){2,}…?/g, "… ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lo que la cotorra escuchó mal.
 *
 * Cambia un tercio de las palabras por otras que suenan parecido, y deja la
 * frase con la misma cantidad de palabras. Nada de "…" ni de
 * repeticiones: un mensaje al que le faltan pedazos está roto, uno con la
 * mitad de las palabras cambiadas es un malentendido — que es lo que hace un
 * ave que viene repitiendo lo que oyó todo el viaje.
 *
 * Cuáles se cambian sale de barajar los índices con la semilla, así que dos
 * personas mirando el mismo loro leen lo mismo. Se prefieren las palabras
 * largas: cambiar "de" por "te" no se nota y gasta uno de los turnos.
 */
export function loQueRepiteLaCotorra(texto: string, semilla: string): string {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length < MINIMO_PALABRAS) return texto;

  const r = azar(semillaNumerica(`cotorra:${semilla}`));
  const cuantas = Math.max(1, Math.round(palabras.length * PARTE_QUE_CAMBIA));

  // Barajado determinista (Fisher-Yates con la semilla), con las largas
  // primero: son las que llevan el sentido y donde el cambio se escucha.
  const orden = palabras.map((p, i) => i);
  for (let i = orden.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  // Primero las que tienen una parecida de verdad en la lista: son los mejores
  // malentendidos, porque las dos son palabras que existen. Después las largas,
  // que es donde el cambio se escucha. Cambiar "de" por "te" gasta un turno y
  // no lo nota nadie.
  const puntaje = (i: number) => {
    const p = palabras[i];
    const largo = p.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "").length;
    return (tieneParecida(p) ? 100 : 0) + (largo > 3 ? 10 : 0) + Math.min(largo, 9);
  };
  orden.sort((a, b) => puntaje(b) - puntaje(a));

  const elegidas = new Set<number>();
  for (const i of orden) {
    if (elegidas.size >= cuantas) break;
    const p = palabras[i];
    const largo = p.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "").length;
    // Una palabra corta solo se toca si hay una parecida de verdad. Sin esto
    // salían "qua" por "que" y "da" por "de": no son malentendidos, son
    // erratas, y son justo lo que hacía que la cotorra escuchara DEMASIADO mal.
    if (largo < LARGO_MINIMO_PALABRA && !tieneParecida(p)) continue;
    elegidas.add(i);
  }

  const salida = palabras.map((p, i) => (elegidas.has(i) ? transformar(p, r) : p));
  return salida.join(" ");
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
