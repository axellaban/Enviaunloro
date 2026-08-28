// El modelo: nidos, amistades y loros en vuelo.
//
// La idea central del producto está en `duracionVuelo`: un loro no "se entrega",
// vuela. La distancia real entre las dos personas dividida por la velocidad del
// ave da un tiempo, y hasta que ese tiempo no pasa el mensaje no existe para
// quien lo recibe. Todo lo demás en este archivo está al servicio de eso.

import { AVES, esAveId, type AveId } from "./aves";
import {
  desplazar,
  distanciaKm,
  formatearDistancia,
  puntoValido,
  type Punto,
} from "./geo";
import { lugarDe } from "./geocode";
import { escribirDoc, leerDoc, store } from "./store";
import {
  duracionVuelo,
  probabilidadExtravio,
  sortearDesvio,
  type Desvio,
} from "./vuelo";
import { loQueRepiteLaCotorra, loQueRetocaLaPerica } from "./olvido";
import { nuevoId } from "./sesion";

export type Nido = {
  id: string;
  nombre: string;
  /** Código de 6 para que te agreguen. Se comparte por WhatsApp. */
  codigo: string;
  /** El ave con la que manda por defecto. */
  ave: AveId;
  lat: number;
  lng: number;
  /** "Palermo, Argentina". Puede estar vacío: es best-effort. */
  lugar: string;
  /** Doña Cotorra, la vecina de práctica. */
  bot: boolean;
  creado: number;
  visto: number;
};

export type Loro = {
  id: string;
  de: string;
  para: string;
  ave: AveId;
  /** Lo que se escribió. Quien lo mandó ve siempre esto. */
  texto: string;
  /**
   * Lo que llega del otro lado. Igual al original salvo con la cotorra —que
   * repite el mensaje todo el viaje hasta mezclarlo— y con el perico al que lo
   * agarró una perica en el camino (lib/olvido.ts). Se calcula al despegar y
   * queda escrito: si se calculara al leer, cada consulta entregaría un
   * mensaje distinto.
   */
  textoEntregado: string;
  origen: Punto;
  destino: Punto;
  distanciaKm: number;
  /** Epoch ms del despegue y del aterrizaje. El vuelo es la diferencia. */
  salida: number;
  llegada: number;
  /**
   * Epoch ms en que el ave se pierde, o null si llega bien. Se sortea al
   * soltarla y queda escrito: si se decidiera al mirar, dos personas mirando
   * el mismo vuelo obtendrían resultados distintos.
   */
  extravio: number | null;
  /** Qué le pasó. Vacío si no se perdió. */
  motivo: string;
  /**
   * El romance del perico: cuándo se cruzó con la perica, hasta cuándo estuvo
   * dando vueltas y en qué punto del camino. null si el viaje salió derecho.
   * La hora de llegada ya lo tiene sumado.
   */
  desvio: Desvio | null;
  leido: number | null;
  /**
   * Qué hizo con el ave quien la recibió. null mientras no haya decidido: el
   * ave está posada en su ventana esperando.
   */
  suerte?: Suerte | null;
  /** Cuándo lo decidió. */
  suerteEn?: number | null;
  /** Si la soltó: cuándo llega de vuelta al nido de origen. */
  regreso?: number | null;
  /** Interno de Doña Cotorra: si ya devolvió el ave con su respuesta. */
  respondido?: boolean;
};

/**
 * Qué hace con el ave quien recibió el mensaje.
 *
 * El vuelo termina cuando el mensaje llega, pero el ave sigue ahí, posada del
 * otro lado. Que la decisión sea de quien la recibió —y no automática— es lo
 * que le da consecuencia a mandar: soltarla te la devuelve volando y se ve en
 * el mapa; enjaularla o mandarla al puchero significa que ese loro no vuelve
 * más, y quien lo mandó se entera.
 */
export type Suerte = "soltado" | "enjaulado" | "puchero";

export function esSuerte(x: unknown): x is Suerte {
  return x === "soltado" || x === "enjaulado" || x === "puchero";
}

/**
 * Qué le pasó al ave que no llegó. Da lo mismo cuál toque —ninguna es más
 * cierta que otra— pero que haya una explicación concreta es lo que separa
 * "se perdió" de "la app falló".
 */
const MOTIVOS = [
  "Lo distrajo una bandada y se fue con ellos.",
  "Paró a comer semillas en un balcón y no volvió a salir.",
  "Se lo llevó el viento para el otro lado.",
  "Se metió en una tormenta y perdió el rumbo.",
  "Encontró un árbol que le gustó más que tu destinatario.",
  "Confundió el destino con otro balcón parecido y se quedó ahí.",
  "Lo vieron por última vez dando vueltas sobre un campanario.",
];

/** Tope por buzón. Un MVP no necesita historial infinito. */
const MAX_BUZON = 80;

/**
 * Acelerador global del tiempo de vuelo, por si alguien quiere correr la app
 * con distancias reales pero en escala de demo. 1 = tiempo real. Viaja al
 * navegador en /api/estado para que el tiempo que se promete antes de mandar
 * sea el mismo que después se cumple.
 */
export function escalaGlobal(): number {
  const n = Number(process.env.LOROS_ESCALA_TIEMPO || "1");
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// ---------- nidos ----------

/** Sin 0/O/1/I: este código se dicta por teléfono y se copia a mano. */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function codigoNuevo(): string {
  let c = "";
  for (let i = 0; i < 6; i++) {
    c += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return c;
}

export const claveNido = (id: string) => `nido:${id}`;
const claveCodigo = (c: string) => `codigo:${c.toUpperCase()}`;
const claveAmigos = (id: string) => `amigos:${id}`;
const claveBuzon = (id: string) => `buzon:${id}`;
const claveLoro = (id: string) => `loro:${id}`;

export async function nido(id: string): Promise<Nido | null> {
  return leerDoc<Nido>(claveNido(id));
}

export async function guardarNido(n: Nido): Promise<void> {
  await escribirDoc(claveNido(n.id), n);
}

export async function nidoPorCodigo(codigo: string): Promise<Nido | null> {
  const id = await store().leer(claveCodigo(codigo));
  return id ? nido(id) : null;
}

/**
 * Busca el lugar y lo guarda cuando llega, sin hacer esperar a nadie. Si
 * Nominatim tarda cuatro segundos, el nido igual ya está creado y el mapa ya
 * se está dibujando.
 */
function completarLugar(id: string, lat: number, lng: number): void {
  lugarDe(lat, lng)
    .then(async (lugar) => {
      if (!lugar) return;
      const actual = await nido(id);
      if (actual) await guardarNido({ ...actual, lugar });
    })
    .catch(() => {});
}

export async function crearNido(datos: {
  nombre: string;
  ave: AveId;
  punto: Punto;
}): Promise<Nido> {
  const id = nuevoId();
  // Colisión de código: con 32^6 combinaciones es rarísimo, pero un choque
  // silencioso haría que agregar a alguien por código te agregue a otra
  // persona. Se reintenta y listo.
  let codigo = codigoNuevo();
  for (let i = 0; i < 5; i++) {
    if (!(await store().leer(claveCodigo(codigo)))) break;
    codigo = codigoNuevo();
  }

  const ahora = Date.now();
  const n: Nido = {
    id,
    nombre: datos.nombre,
    codigo,
    ave: datos.ave,
    lat: datos.punto.lat,
    lng: datos.punto.lng,
    lugar: "",
    bot: false,
    creado: ahora,
    visto: ahora,
  };
  await guardarNido(n);
  await store().escribir(claveCodigo(codigo), id);
  completarLugar(id, n.lat, n.lng);
  await crearVecina(n);
  return n;
}

export async function actualizarUbicacion(id: string, punto: Punto): Promise<Nido | null> {
  const n = await nido(id);
  if (!n) return null;
  const movido = distanciaKm({ lat: n.lat, lng: n.lng }, punto);
  const actualizado: Nido = { ...n, lat: punto.lat, lng: punto.lng, visto: Date.now() };
  // Menos de 300 m no cambia el nombre del lugar: no gastamos un pedido a
  // Nominatim cada vez que el GPS del celular tiembla.
  if (movido > 0.3) actualizado.lugar = "";
  await guardarNido(actualizado);
  if (movido > 0.3) completarLugar(id, punto.lat, punto.lng);
  return actualizado;
}

// ---------- amistades ----------

export async function idsAmigos(id: string): Promise<string[]> {
  return (await leerDoc<string[]>(claveAmigos(id))) || [];
}

export async function amigos(id: string): Promise<Nido[]> {
  const ids = await idsAmigos(id);
  if (ids.length === 0) return [];
  const crudos = await store().leerVarios(ids.map(claveNido));
  const lista: Nido[] = [];
  for (const c of crudos) {
    if (!c) continue;
    try {
      lista.push(JSON.parse(c) as Nido);
    } catch {}
  }
  return lista;
}

/** La amistad es de a dos: agregar por código te agrega también del otro lado. */
export async function emparejar(a: string, b: string): Promise<void> {
  for (const [uno, otro] of [
    [a, b],
    [b, a],
  ]) {
    const lista = await idsAmigos(uno);
    if (!lista.includes(otro)) {
      await escribirDoc(claveAmigos(uno), [...lista, otro]);
    }
  }
}

// ---------- loros ----------

export type ResultadoEnvio =
  | { ok: true; loro: Loro }
  | { ok: false; error: string };

/** Qué texto llega efectivamente del otro lado, según el ave y cómo le fue. */
function retocarTexto(
  aveId: AveId,
  texto: string,
  semilla: string,
  desvio: Desvio | null
): string {
  if (AVES[aveId].rareza === "olvida") return loQueRepiteLaCotorra(texto, semilla);
  if (desvio) return loQueRetocaLaPerica(texto, semilla);
  return texto;
}

export async function enviarLoro(datos: {
  de: Nido;
  para: Nido;
  ave: AveId;
  texto: string;
}): Promise<ResultadoEnvio> {
  const texto = datos.texto.trim();
  if (!texto) return { ok: false, error: "El loro no puede volar sin nada que decir." };

  const a = AVES[datos.ave];
  if (texto.length > a.maxCaracteres) {
    return {
      ok: false,
      error: `${a.nombre === "Cotorra" ? "A la" : "Al"} ${a.nombre.toLowerCase()} no le entran más de ${a.maxCaracteres} caracteres.`,
    };
  }

  const origen: Punto = { lat: datos.de.lat, lng: datos.de.lng };
  const destino: Punto = { lat: datos.para.lat, lng: datos.para.lng };
  const km = distanciaKm(origen, destino);
  const salida = Date.now();
  const escala = escalaGlobal();
  // Lo que iba a tardar si nada raro pasaba. Todo lo demás se mide contra esto.
  const duracionLimpia = duracionVuelo(km, datos.ave, escala);

  // El sorteo va acá, una sola vez, y el resultado queda guardado. Ni cerca
  // del principio ni del final: perderse a los tres segundos de despegar no se
  // vive como un viaje que salió mal, y perderse rozando el destino es una
  // crueldad innecesaria.
  const seExtravia = Math.random() < probabilidadExtravio();
  const dondeSePierde = 0.15 + Math.random() * 0.7;

  // Un ave que se pierde no se enamora: la historia de cada vuelo es una sola.
  const desvio = seExtravia
    ? null
    : sortearDesvio(datos.ave, salida, duracionLimpia, escala);
  const duracion = duracionLimpia + (desvio ? desvio.hasta - desvio.desde : 0);

  const id = nuevoId();
  const loro: Loro = {
    id,
    de: datos.de.id,
    para: datos.para.id,
    ave: datos.ave,
    texto,
    origen,
    destino,
    distanciaKm: km,
    salida,
    // Dos aves entregan otra cosa: la cotorra por hablar de más, y el perico
    // al que la perica le metió mano mientras estaba distraído. Un perico que
    // no se distrajo entrega el mensaje intacto — es el premio por mandar el
    // ave más rápida y que salga bien.
    textoEntregado: retocarTexto(datos.ave, texto, id, desvio),
    llegada: salida + duracion,
    extravio: seExtravia
      ? salida + Math.round(duracionLimpia * dondeSePierde)
      : null,
    motivo: seExtravia ? MOTIVOS[Math.floor(Math.random() * MOTIVOS.length)] : "",
    desvio,
    leido: null,
    suerte: null,
    suerteEn: null,
    regreso: null,
  };

  await escribirDoc(claveLoro(loro.id), loro);
  // El mismo id en los dos buzones: el loro es uno solo, visto desde las dos
  // puntas. Quien lo mandó ve su texto desde el minuto cero; quien lo recibe,
  // recién cuando aterriza (eso lo resuelve la vista, en la API).
  await store().agregarALista(claveBuzon(datos.de.id), loro.id, MAX_BUZON);
  await store().agregarALista(claveBuzon(datos.para.id), loro.id, MAX_BUZON);

  return { ok: true, loro };
}

export async function loro(id: string): Promise<Loro | null> {
  return leerDoc<Loro>(claveLoro(id));
}

export async function buzon(id: string): Promise<Loro[]> {
  const ids = await store().leerLista(claveBuzon(id));
  if (ids.length === 0) return [];
  const crudos = await store().leerVarios(ids.map(claveLoro));
  const lista: Loro[] = [];
  for (const c of crudos) {
    if (!c) continue;
    try {
      lista.push(JSON.parse(c) as Loro);
    } catch {}
  }
  return lista.sort((x, y) => y.salida - x.salida);
}

/** Abrir un loro. Solo cuenta si ya aterrizó y si lo abre su destinatario. */
export async function marcarLeido(loroId: string, lector: string): Promise<Loro | null> {
  const l = await loro(loroId);
  if (!l || l.para !== lector) return null;
  // Nunca llegó: no hay nada que abrir, y menos que marcar como leído.
  if (l.extravio !== null && Date.now() >= l.extravio) return l;
  if (Date.now() < l.llegada) return l;
  if (l.leido) return l;
  const actualizado = { ...l, leido: Date.now() };
  await escribirDoc(claveLoro(loroId), actualizado);
  return actualizado;
}

/**
 * Qué hace el destinatario con el ave, una vez leído el mensaje.
 *
 * Solo decide quien la recibió, solo una vez, y solo cuando el ave ya aterrizó:
 * antes de eso el ave no está de su lado y no hay nada que decidir. Y no se
 * puede cambiar de opinión — un ave que ya salió de vuelta no se puede
 * desenjaular.
 */
export async function decidirSuerte(
  loroId: string,
  quien: string,
  suerte: Suerte
): Promise<Loro | null> {
  const l = await loro(loroId);
  if (!l || l.para !== quien) return null;
  const ahora = Date.now();
  // Un ave que nunca llegó no está posada en la ventana de nadie.
  if (l.extravio !== null && ahora >= l.extravio) return null;
  if (ahora < l.llegada) return null;
  if (l.suerte) return l;

  const actualizado: Loro = {
    ...l,
    suerte,
    suerteEn: ahora,
    // Volver cuesta lo mismo que venir: misma ave, misma distancia. Y sin
    // romances: el perico ya gastó el suyo en la ida.
    regreso:
      suerte === "soltado"
        ? ahora + duracionVuelo(l.distanciaKm, l.ave, escalaGlobal())
        : null,
  };
  await escribirDoc(claveLoro(loroId), actualizado);
  return actualizado;
}

// ---------- Doña Cotorra ----------
//
// La vecina de práctica. Existe por una razón concreta: sin ella, la primera
// persona que entra a la app no tiene a quién mandarle nada y el producto no se
// puede probar. Vive a 2,2 km —lo bastante lejos para que el vuelo se vea, lo
// bastante cerca para no aburrir— y contesta con la misma ave que le mandaste,
// porque no tiene aves propias.

const VECINA_KM = 2.2;

const RESPUESTAS = [
  "¡Llegó tu {ave}! Se posó en mi ventana, repitió todo dos veces y se comió mis semillas. Te lo devuelvo con la respuesta.",
  "Recibido. Acá a {km} de vos también está lindo el día. Mandame otro cuando quieras, esta vez probá con el guacamayo.",
  "Che, tu {ave} venía cansadísimo. Descansó un rato y ya sale de vuelta con esto.",
  "Lo leí tres veces. Muy bueno. Ojo con la cotorra, que de tanto repetirlo te lo entrega todo mezclado — para las cosas importantes mandá el loro.",
  "Confirmo recepción. {km} de vuelo para decirme eso, y valió la pena.",
];

/**
 * Para las aves que traen algo más que texto, contestar con la frase genérica
 * quedaría sordo: mandarle un cuervo a la vecina y que responda "¡qué lindo
 * día!" rompe el chiste que la persona acaba de hacer.
 */
const RESPUESTAS_POR_AVE: Partial<Record<AveId, string>> = {
  paloma:
    "¡Ay, tu paloma! Llegó con las flores medio aplastadas del viaje pero llegó, y el chocolate estaba entero. Te devuelvo una igual, que esto no se agradece con un loro cualquiera.",
  cuervo:
    "Uf. Me llegó tu cuervo y lo leí sentada. No sé bien qué decirte, así que te lo mando de vuelta con un abrazo y nada más.",
  perico:
    "Tu perico llegó… en algún momento. Espero que lo que dice sea lo que escribiste. Acá a {km} igual te leo.",
  cotorra:
    "Tu cotorra llegó hablando sola y me entregó esto medio mezclado, pero se entendió. {km} de chusmerío bien invertidos.",
};

function idVecina(idUsuario: string): string {
  return `vecina-${idUsuario}`;
}

/** Le planta una vecina a quien recién se registra, y los hace amigos. */
async function crearVecina(dueño: Nido): Promise<void> {
  const id = idVecina(dueño.id);
  if (await nido(id)) return;

  // Rumbo al azar: así no todas las Doña Cotorra del mundo quedan al norte.
  const punto = desplazar({ lat: dueño.lat, lng: dueño.lng }, VECINA_KM, Math.random() * 360);
  const ahora = Date.now();
  const vecina: Nido = {
    id,
    nombre: "Doña Cotorra",
    codigo: "VECINA",
    ave: "cotorra",
    lat: punto.lat,
    lng: punto.lng,
    lugar: "Tu barrio",
    bot: true,
    creado: ahora,
    visto: ahora,
  };
  await guardarNido(vecina);
  await emparejar(dueño.id, id);
  completarLugar(id, punto.lat, punto.lng);
}

/**
 * Contesta los loros que ya le aterrizaron. Se llama en cada consulta de estado:
 * no hace falta un worker ni un cron para un MVP, y el efecto es el mismo —
 * cuando mirás, ya está.
 */
export async function atenderVecina(idUsuario: string): Promise<void> {
  const id = idVecina(idUsuario);
  const vecina = await nido(id);
  if (!vecina) return;

  const ahora = Date.now();
  for (const l of await buzon(id)) {
    if (l.para !== id || l.respondido || l.llegada > ahora) continue;
    // A la vecina tampoco le llegan los que se pierden.
    if (l.extravio !== null && ahora >= l.extravio) continue;
    await escribirDoc(claveLoro(l.id), { ...l, respondido: true, leido: l.leido || ahora });

    // Doña Cotorra siempre suelta el ave. Es la manera de que alguien que
    // todavía no tiene a nadie en la bandada vea las dos mitades del producto
    // el primer día: su loro volviendo por el mapa, y una respuesta aparte.
    await decidirSuerte(l.id, id, "soltado");

    const plantilla =
      RESPUESTAS_POR_AVE[l.ave] ||
      RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)];
    const texto = plantilla
      .replace("{ave}", AVES[l.ave].nombre.toLowerCase())
      .replace("{km}", formatearDistancia(l.distanciaKm));

    await enviarLoro({
      de: vecina,
      para: (await nido(idUsuario))!,
      // Devuelve el ave que le mandaste: la respuesta tarda lo mismo que la ida.
      ave: l.ave,
      texto: texto.slice(0, AVES[l.ave].maxCaracteres),
    });
  }
}

// ---------- validación de entrada ----------

export function nombreValido(x: unknown): string {
  const s = String(x ?? "").trim().replace(/\s+/g, " ");
  return s.slice(0, 24);
}

export function aveValida(x: unknown, porDefecto: AveId = "loro"): AveId {
  return esAveId(x) ? x : porDefecto;
}

export function puntoDe(x: any): Punto | null {
  const p = { lat: Number(x?.lat), lng: Number(x?.lng) };
  return puntoValido(p) ? p : null;
}
