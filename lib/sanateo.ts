// Lo que la cotorra escuchó mal.
//
// La regla, que es de una línea: reescribir la frase cambiando exactamente la
// mitad de las palabras por otras que suenen parecido o corran un poco el
// sentido, manteniendo la cantidad de palabras.
//
// Esas tres condiciones no son decoración:
//
//   UN TERCIO. Empezó siendo la mitad y era demasiado: con la mitad cambiada
//   la frase deja de leerse y hay que descifrarla, y descifrar no da gracia.
//   Un tercio es donde el mensaje se entiende de corrido Y se nota que dice
//   cualquier cosa, que es el punto.
//
//   QUE SUENEN PARECIDO. Es la diferencia entre un ave que escuchó mal y un
//   generador de disparates. "Te dejé las llaves" → "te dejé las naves" tiene
//   la gracia de que casi lo dice; → "te dejé las medialunas" no.
//
//   MISMA CANTIDAD DE PALABRAS. Sin "…" ni repeticiones. Un mensaje al que le
//   faltan pedazos es un mensaje roto; uno con todas las palabras cambiadas es
//   un malentendido, que es lo que la cotorra vino a hacer.
//
// Todo local y determinista: el resultado sale de la semilla (el id del loro),
// se calcula una vez al despegar y queda escrito. Las dos personas ven lo
// mismo, sin esperar a nadie.

/** Pares que suenan casi igual. Es de donde salen los mejores malentendidos,
 *  porque las dos son palabras de verdad. Se busca en los dos sentidos. */
/**
 * Cuántas palabras cambia. Vive acá —y no en quien la usa— porque la prueba de
 * punta a punta importa este mismo número: si el valor y lo que se verifica
 * viven en dos archivos, tarde o temprano dicen cosas distintas.
 */
export const PARTE_QUE_CAMBIA = 1 / 3;

/** Debajo de esto una palabra es andamiaje —"que", "del", "en"— y cambiarla no
 *  da un malentendido, da ruido: "que" → "qua" se lee como un error de tipeo.
 *  Solo se tocan si hay una parecida de verdad en la lista. */
export const LARGO_MINIMO_PALABRA = 4;

const PARECIDAS: string[][] = [
  ["casa", "caza", "cara", "cama", "capa", "taza", "brasa"],
  ["perro", "cerro", "berro", "puerro"],
  ["llave", "nave", "clave", "ave"],
  ["puerta", "huerta", "muerta", "tuerca"],
  ["vino", "pino", "lino", "chino", "vio"],
  ["cena", "pena", "nena", "vena", "arena"],
  ["mañana", "banana", "manzana", "campana"],
  ["jefe", "chef", "jeque"],
  ["asado", "pescado", "helado", "cansado", "pesado"],
  ["hermano", "gusano", "verano", "pantano", "germano"],
  ["sábado", "sótano", "ábaco"],
  ["milanesa", "mayonesa", "camisa", "manguera"],
  ["tarde", "arde", "alarde", "cobarde"],
  ["llego", "juego", "ruego", "fuego", "luego"],
  ["felpudo", "peludo", "menudo", "embudo"],
  ["quinta", "pinta", "cinta", "tinta", "quita"],
  ["reunión", "unión", "religión", "región"],
  ["trabajo", "tinglado", "atajo", "badajo"],
  ["escuela", "abuela", "espuela", "secuela"],
  ["camino", "molino", "pepino", "casino"],
  ["mesa", "besa", "presa", "fresa", "pesa"],
  ["gato", "pato", "rato", "dato", "plato"],
  ["playa", "raya", "vaya", "malla"],
  ["fiesta", "siesta", "cesta", "puesta"],
  ["plata", "lata", "mata", "pata", "chata"],
  ["auto", "asalto", "alto", "flauta"],
  ["cielo", "hielo", "pelo", "suelo", "abuelo"],
  ["barrio", "diario", "canario", "armario"],
  ["médico", "módico", "cómico"],
  ["tren", "sartén", "también", "andén"],
  ["café", "canapé", "bidé", "corsé"],
  ["ropa", "sopa", "copa", "tropa"],
  ["libro", "libre", "timbre", "mimbre"],
  ["dinero", "sendero", "sombrero", "enero", "cordero"],
  ["fútbol", "fósil", "fértil"],
  ["semana", "ventana", "fontana", "sotana"],
  ["hora", "ahora", "mora", "gorra", "aurora"],
  ["noche", "coche", "broche", "derroche"],
  ["frío", "río", "lío", "tío"],
  ["calor", "color", "dolor", "tambor", "temblor"],
  ["hijo", "fijo", "dijo", "lijo"],
  ["amigo", "abrigo", "ombligo", "castigo", "trigo"],
  ["cumple", "cumbre", "lumbre", "techumbre"],
  ["médicos", "cómicos", "módicos"],
  ["pileta", "carpeta", "maceta", "galleta", "bicicleta"],
  ["quilombo", "palomo", "plomo", "rombo"],
  ["bondi", "conde", "esconde"],
  ["mate", "tomate", "remate", "chocolate", "empate"],
  ["boludo", "peludo", "menudo", "saludo"],
];

/** Índice de doble mano: cada palabra apunta a las de su grupo. */
const INDICE = new Map<string, string[]>();
for (const grupo of PARECIDAS) {
  for (const palabra of grupo) {
    INDICE.set(palabra, grupo.filter((otra) => otra !== palabra));
  }
}

/** ¿Hay una que suene parecido Y exista? Sirve para elegir qué mitad cambiar:
 *  esas son las que dan el mejor malentendido. */
export function tieneParecida(palabra: string): boolean {
  const bajo = palabra.toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
  return INDICE.has(bajo) || INDICE.has(bajo.replace(/e?s$/, ""));
}

/**
 * Cuando la palabra no está en la lista, se le cambia UN sonido.
 *
 * No siempre sale una palabra del diccionario, y está bien: "felpudo" →
 * "pelpudo" no existe, pero suena a lo que dijiste y se lee como alguien que
 * escuchó mal, que es exactamente el personaje. Lo que no puede pasar es que
 * salga impronunciable, y por eso los cambios son entre sonidos que en
 * castellano se confunden de verdad: los que se oyen parecido al teléfono.
 */
const CONFUNDIBLES: Record<string, string> = {
  p: "t", t: "p", b: "d", d: "b", c: "t", g: "b",
  m: "n", n: "m", r: "l", l: "r", f: "j", j: "f",
  // Las vocales al final: cambian menos el sonido que una consonante y a veces
  // dejan algo que se lee como error de tipeo, no como algo mal escuchado.
  a: "e", e: "a", i: "e", o: "u", u: "o",
};

/**
 * Las que NO están arriba, y por qué: en rioplatense `s`/`z`, `v`/`b` y
 * `y`/`ll` suenan IGUAL. Cambiar una por otra no cambia el sonido, cambia la
 * ortografía — y ahí "llaves" → "llavez" deja de leerse como algo mal
 * escuchado y pasa a leerse como una falta. Es lo contrario de lo que la
 * cotorra hace: ella escucha mal, no escribe mal.
 */
const CONSONANTES = new Set(["p", "t", "b", "d", "c", "g", "m", "n", "r", "l", "f", "j"]);

/**
 * Las letras que en castellano son UNA sola letra aunque se escriban con dos.
 *
 * Partirlas no da una palabra mal escuchada, da una impronunciable: "llaves"
 * → "lraves", "que" → "qoe". Se protegen las dos posiciones de cada dígrafo.
 */
const DIGRAFOS = ["ll", "ch", "rr", "qu", "gu"];

function protegidas(bajo: string): Set<number> {
  const fuera = new Set<number>();
  for (const d of DIGRAFOS) {
    let i = bajo.indexOf(d);
    while (i !== -1) {
      fuera.add(i);
      fuera.add(i + 1);
      i = bajo.indexOf(d, i + 1);
    }
  }
  return fuera;
}

function sonidoCambiado(palabra: string, sortear: () => number): string {
  const letras = [...palabra];
  const fuera = protegidas(palabra.toLowerCase());
  // Se buscan las posiciones cambiables, salteando la primera —cambiar el
  // arranque la vuelve otra palabra, no una mal escuchada— y los dígrafos.
  const todas = letras
    .map((c, i) => (i > 0 && !fuera.has(i) && CONFUNDIBLES[c.toLowerCase()] ? i : -1))
    .filter((i) => i >= 0);
  // Consonante antes que vocal: cambiar "perro" por "pello" se escucha; cambiar
  // "estoy" por "estuy" se lee como si hubiera tipeado mal.
  const consonantes = todas.filter((i) => CONSONANTES.has(letras[i].toLowerCase()));
  const posibles = consonantes.length ? consonantes : todas;
  if (posibles.length === 0) return palabra;
  const donde = posibles[Math.floor(sortear() * posibles.length)];
  const original = letras[donde];
  const cambiada = CONFUNDIBLES[original.toLowerCase()];
  letras[donde] = /[A-ZÁÉÍÓÚÑ]/.test(original) ? cambiada.toUpperCase() : cambiada;
  return letras.join("");
}

/** Se le saca la puntuación, se le cambia el corazón y se le devuelve, con la
 *  mayúscula como estaba. Sin esto, "perros." perdería el punto. */
export function transformar(palabra: string, sortear: () => number): string {
  const m = palabra.match(/^([¿¡("'«]*)([^.,;:!?)"'»]*)([.,;:!?)"'»]*)$/);
  if (!m || !m[2]) return palabra;
  const [, antes, centro, despues] = m;

  const bajo = centro.toLowerCase();
  const plural = /s$/.test(bajo) && bajo.length > 3;
  const raiz = plural ? bajo.replace(/e?s$/, "") : bajo;

  let nuevo: string | null = null;
  // 1. Una que suene casi igual y exista de verdad: el mejor malentendido.
  const primos = INDICE.get(bajo) ?? INDICE.get(raiz);
  if (primos?.length) {
    const elegida = primos[Math.floor(sortear() * primos.length)];
    nuevo = plural && !/s$/.test(elegida) ? elegida + (/[aeiouáéíóú]$/.test(elegida) ? "s" : "es") : elegida;
  }
  // 2. Y si no, se le corre un sonido.
  if (!nuevo) nuevo = sonidoCambiado(centro, sortear);
  if (nuevo.toLowerCase() === centro.toLowerCase()) return palabra;

  if (/^[A-ZÁÉÍÓÚÑ]/.test(centro)) nuevo = nuevo[0].toUpperCase() + nuevo.slice(1);
  return `${antes}${nuevo}${despues}`;
}
