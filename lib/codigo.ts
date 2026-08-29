// El código de nido: lo que le pasás a alguien para que te sume.
//
// Antes eran seis caracteres al azar (ABC123). Funcionaba y era imposible de
// recordar: se dicta por teléfono, se copia de un mensaje de WhatsApp y se
// tipea a mano. Ahora se arma con dos palabras del mundo de la app —
// `loroparlanchin`, `palomaveloz`— que se leen una vez y se acuerdan.
//
// LO VIEJO SIGUE ANDANDO, y no por casualidad: la clave con la que se guarda
// el código en la base siempre fue la forma en MAYÚSCULAS, y eso no cambió.
// `ABC123` sigue guardado en `codigo:ABC123` y `loroparlanchin` va a
// `codigo:LOROPARLANCHIN`. Los dos conviven sin migrar nada, sin tocar un solo
// nido existente, y quien ya repartió su código por ahí lo sigue teniendo.
// Lo único que cambia es lo que se GENERA de acá en adelante y lo que se
// MUESTRA: las palabras se ven en minúscula, que es como se leen.

/** Sustantivos del mundo de la app. Cortos, sin acentos y sin ñ: el código
 *  viaja en una URL y se tipea a mano en un teclado de celular. */
const SUSTANTIVOS = [
  "loro", "lorito", "perico", "cotorra", "paloma", "cuervo", "pichon",
  "gorrion", "tucan", "colibri", "hornero", "benteveo", "zorzal", "canario",
  "jilguero", "calandria", "chimango", "guacamayo", "pajaro", "pluma",
  "plumita", "pico", "nido", "ala", "bandada", "vuelo", "cardenal", "tordo",
];

/** Adjetivos. Todos amables, curiosos o graciosos: el código es lo primero que
 *  una persona le manda a otra, y no queremos que a nadie le toque un insulto
 *  por sorteo. */
const ADJETIVOS = [
  "parlanchin", "voraz", "veloz", "dormilon", "curioso", "valiente",
  "tranquilo", "inquieto", "viajero", "madrugador", "nocturno", "silencioso",
  "ruidoso", "elegante", "gracioso", "sabio", "travieso", "alegre", "sereno",
  "audaz", "ligero", "errante", "solitario", "festivo", "saltarin", "cantor",
  "silbador", "danzarin", "coqueto", "galante", "prolijo", "distraido",
  "puntual", "andariego", "aventurero", "goloso", "friolento", "veraniego",
  "invernal", "marino", "serrano", "pampeano", "andino", "austral", "boreal",
  "celeste", "dorado", "plateado", "esmeralda", "carmesi", "violeta",
  "turquesa", "escarlata", "ambar", "canela", "tostado", "moteado", "rayado",
  "brioso", "gallardo", "altivo", "apacible", "cordial", "amable", "gentil",
  "jovial", "vivaz", "ocurrente", "pillo", "simpatico", "astuto", "sagaz",
  "listo", "despierto", "atento", "presto", "raudo", "fugaz", "rapido",
  "pausado", "paciente", "constante", "tenaz", "firme", "fiel", "leal",
  "franco", "sincero", "noble", "generoso", "campechano", "sencillo",
  "humilde", "modesto", "discreto", "reservado", "misterioso", "enigmatico",
  "romantico", "sentimental", "apasionado", "calido", "templado", "fresco",
  "matutino", "vespertino", "estelar", "lunar", "solar", "nomada",
  "peregrino", "migrante", "forastero", "trotamundos", "callejero",
  "montaraz", "silvestre", "libre", "curtido", "bonachon", "dicharachero",
  "conversador", "cuentero", "pregunton", "tozudo", "decidido", "resuelto",
  "animoso", "entusiasta", "optimista", "soleado", "luminoso", "radiante",
  "brillante", "reluciente", "flamante", "lustroso", "pulcro", "cordobes",
  "playero", "pescador", "campero", "arisco", "ronco", "silbante",
];

/** Cuántas combinaciones hay antes de tener que numerar. */
export const COMBINACIONES = SUSTANTIVOS.length * ADJETIVOS.length;

const alAzar = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

/** Un código nuevo, en la forma en que se muestra: minúscula, dos palabras. */
/**
 * El código nuevo más corto que puede salir del sorteo.
 *
 * Existe por una sola razón, y es la que hace que nada se rompa: los códigos
 * de antes medían SEIS caracteres exactos. Mientras esto sea siete o más,
 * ningún código nuevo puede caer encima de uno viejo. No es suerte ni es un
 * número grande de combinaciones — es la longitud, y no se puede dar la
 * casualidad. La prueba lo verifica: si alguien agrega mañana un adjetivo de
 * tres letras, se entera ahí y no el día que alguien pierde su nido.
 */
export const LARGO_MINIMO_NUEVO =
  Math.min(...SUSTANTIVOS.map((s) => s.length)) + Math.min(...ADJETIVOS.map((a) => a.length));

export function codigoNuevo(): string {
  return `${alAzar(SUSTANTIVOS)}${alAzar(ADJETIVOS)}`;
}

/** El mismo, con un número atrás. Solo si el sorteo choca varias veces. */
export function codigoNumerado(base: string, n: number): string {
  return `${base}${n}`;
}

/**
 * La forma con la que se guarda y se busca: sin espacios ni guiones, en
 * mayúsculas. Es la misma de siempre, y por eso los códigos viejos siguen
 * resolviendo — alguien puede tipear `abc 123` o `ABC-123` y llega igual.
 */
export function normalizarCodigo(x: unknown): string {
  return String(x ?? "")
    .trim()
    .replace(/[\s\-_.]+/g, "")
    .toUpperCase();
}

export const LARGO_MINIMO = 4;
export const LARGO_MAXIMO = 24;

/**
 * ¿Tiene forma de código? Acepta los seis caracteres de antes y las dos
 * palabras de ahora, que es todo el punto de tener esto en un solo lugar: la
 * regla vivía copiada en cinco archivos y cambiarla significaba acordarse de
 * los cinco.
 */
export function esCodigo(x: unknown): boolean {
  const c = normalizarCodigo(x);
  return c.length >= LARGO_MINIMO && c.length <= LARGO_MAXIMO && /^[A-Z0-9]+$/.test(c);
}
