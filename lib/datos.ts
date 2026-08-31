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
import { codigoNuevo, codigoNumerado, normalizarCodigo } from "./codigo";
import { escribirDoc, leerDoc, store } from "./store";
import {
  duracionVuelo,
  MS_ABDUCCION,
  probabilidadExtravio,
  sortearDesvio,
  type Desvio,
} from "./vuelo";
import {
  loQueBalbuceaElBorracho,
  loQueRepiteLaCotorra,
  loQueRetocaLaPerica,
} from "./olvido";
import { demoraPorCopetines, type Parada } from "./cerveceria";
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
  /**
   * Si sus vuelos aparecen en la vista del resto, anónimos y corridos 25 km.
   * Sin definir cuenta como sí: los nidos que existían antes de que hubiera
   * vista del resto no tienen el campo, y dejarlos afuera vaciaría el mapa.
   * Se apaga desde el panel, en Nido.
   */
  publico?: boolean;
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
  /**
   * Lo que le escribió al soltarla, y lo que llega del otro lado.
   *
   * Soltar el ave ES la forma de contestar: está posada en tu ventana, la
   * cargás y se va. Antes volvía vacía y para responder había que arrancar un
   * loro nuevo desde cero —elegir persona, elegir ave— con el bicho ahí
   * mirándote. El círculo se cortaba justo donde se tenía que cerrar.
   *
   * Van los dos textos por la misma razón que en la ida: la misma ave hace lo
   * mismo a la vuelta. Una cotorra que escuchó mal a la ida escucha mal a la
   * vuelta, y quien contesta ve lo que escribió, no lo que llegó.
   */
  respuesta?: string | null;
  respuestaEntregada?: string | null;
  /** Interno de Doña Cotorra: si ya devolvió el ave con su respuesta. */
  respondido?: boolean;
  /**
   * El loro se convirtió en pollera antes de salir.
   *
   * Es del LORO y de nadie más: es su gracia, la que tiene en vez de una
   * rareza. Lo que cruza el mapa entonces no es un ave sino una pollera, y del
   * otro lado llueven polleras al abrirlo. El mensaje no se toca — el chiste
   * es el envoltorio, no el contenido.
   *
   * Va escrito en el vuelo y no calculado después, por lo mismo que todo acá:
   * si se decidiera al mirar, el mismo loro sería pollera para uno y no para
   * el otro.
   */
  pollera?: boolean;
  /**
   * Cuándo se lo llevó el plato volador. null si nadie pidió la abducción.
   *
   * Es lo único que puede hacer quien MANDÓ un loro después de soltarlo, y por
   * eso existe: hasta acá, un ave en el aire era irreversible del lado de quien
   * la mandó —el mensaje equivocado, la persona equivocada, el arrepentimiento
   * a los treinta segundos— y lo único que quedaba era mirarla cruzar el mapa.
   * El lorito de convite ya tenía su silbido para llamarlo de vuelta; el loro
   * en vuelo no tenía nada.
   *
   * NO es un "deshacer" y no se disfraza de eso. El ave no vuelve, el mensaje
   * no se recupera y del otro lado se ve pasar la nave: alguien que estaba
   * esperando algo se entera de que ese algo no va a llegar. Es tan definitivo
   * como el extravío, con la diferencia de que este lo elegiste vos.
   */
  abducido?: number | null;
  /**
   * La parada en la cervecería, si este loro viene de un convite.
   *
   * Un lorito mandado a alguien que todavía no estaba en la app no despega
   * desde el nido: despega desde la cervecería donde estuvo esperando a que
   * esa persona abriera el link (lib/cerveceria.ts). `origen` es la
   * cervecería, no el nido, porque es de donde sale de verdad; esto guarda el
   * resto de la historia, incluidos los copetines que se tomó mientras tanto.
   */
  parada?: Parada | null;
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

/**
 * Un código libre, reservado de forma atómica.
 *
 * Dos cosas que antes estaban mal en las diez líneas que había acá:
 *
 *   Si los cinco intentos chocaban, se usaba igual el último —el que estaba
 *   ocupado— y se pisaba el `codigo:` de otra persona. Su código pasaba a
 *   apuntar al nido nuevo y quedaba sin forma de que la sumaran.
 *
 *   Y era comprobar-y-después-escribir: dos nidos creados en el mismo instante
 *   veían libre el mismo código y los dos lo escribían. La misma carrera que
 *   costaba amistades, en el alta.
 *
 * Ahora el turno se pide con `reservar`, que es una sola operación y solo la
 * gana uno. Y si de verdad chocan todos los intentos, se numera en vez de
 * pisar.
 */
async function codigoLibre(): Promise<string> {
  /**
   * Pide el turno, y si no lo consigue distingue las dos razones posibles:
   * que el código esté ocupado, o que la base no pueda reservar nada. Sin esta
   * distinción, una base rota convierte el alta en 500 viajes de ida y vuelta
   * y un "Armando el nido…" que no termina nunca — y `reservar`, en Supabase,
   * escribe en la MISMA tabla de conjuntos que se rompió y nos costó las
   * bandadas.
   */
  async function tomar(c: string): Promise<boolean> {
    if (await store().reservar(claveTurno("codigo", normalizarCodigo(c)), 0)) return true;
    // No se pudo reservar y el código no está usado por nadie: no es un
    // choque, es la base. Se usa igual, que es lo único que deja entrar.
    return !(await store().leer(claveCodigo(c)));
  }

  for (let i = 0; i < 8; i++) {
    const c = codigoNuevo();
    if (await tomar(c)) return c;
  }
  // Ocho choques seguidos: con cuatro mil combinaciones esto no pasa hasta
  // tener miles de nidos, y aun ahí se resuelve numerando.
  const base = codigoNuevo();
  for (let n = 2; n < 500; n++) {
    const c = codigoNumerado(base, n);
    if (await tomar(c)) return c;
  }
  // Inalcanzable en la práctica; si pasara, un código único igual.
  return codigoNumerado(base, Date.now() % 100000);
}

export const claveNido = (id: string) => `nido:${id}`;
/** La clave con la que vive un código en la base. Siempre en mayúsculas: es lo
 *  que hace que `ABC123` de antes y `loroparlanchin` de ahora convivan sin
 *  migrar nada. */
const claveCodigo = (c: string) => `codigo:${normalizarCodigo(c)}`;
const claveAmigos = (id: string) => `bandada:${id}`;
/** La bandada de antes, como documento. Solo se lee, nunca se escribe. */
const claveAmigosViejo = (id: string) => `amigos:${id}`;
/**
 * A quién sacaste de tu bandada, a mano.
 *
 * Existe por una sola razón, y sin ella "sacar a alguien" no funcionaría: el
 * rescate de más abajo reconstruye la bandada leyendo el historial de loros.
 * Si sacás a la única persona que tenías, tu conjunto queda vacío, el rescate
 * se dispara, encuentra los loros que se mandaron y la vuelve a poner. La
 * decisión se deshacía sola en la consulta siguiente.
 *
 * El rescate está para recuperar datos perdidos; una baja a propósito no es un
 * dato perdido. Esto los distingue. Se anota en las DOS puntas: si quedara
 * anotado de un solo lado, el rescate del otro los volvería a emparejar —y
 * emparejar escribe los dos lados— con lo que la baja se caía igual.
 */
const claveEchados = (id: string) => `echados:${id}`;
const claveBuzon = (id: string) => `buzon:${id}`;
const claveLoro = (id: string) => `loro:${id}`;
/** Turnos únicos. Ver `reservar` en lib/store.ts. */
export const claveTurno = (que: string, id: string) => `turno:${que}:${id}`;
/**
 * El índice de la vista del resto: los últimos loros soltados, de todo el
 * mundo. Una lista y no una consulta sobre todos los loros porque el store es
 * clave-valor: sin este índice, "qué hay en el aire ahora" obligaría a leer la
 * base entera en cada consulta.
 */
const CLAVE_MUNDO = "mundo";

/**
 * Los vuelos que todavía tienen algo por pasar, para el despertador de los
 * avisos (lib/push.ts, app/api/despertador).
 *
 * Es un conjunto aparte y no el índice del mundo, por dos razones: aquel
 * descarta a Doña Cotorra —y un ave suya que aterriza igual merece aviso— y
 * está recortado a 300, así que un guacamayo cruzando el Atlántico se le puede
 * caer a mitad de viaje y nadie se enteraría de que llegó.
 *
 * Se mantiene chico solo: cada vuelo sale de acá cuando ya no queda nada que
 * avisar de él.
 */
const CLAVE_PENDIENTES = "pendientes";

/**
 * Cuántos loros recordar en el índice. Los vuelos largos duran días, así que
 * la lista tiene que ser bastante más larga que lo que entra en pantalla: con
 * una lista corta, un guacamayo cruzando el Atlántico se caería del índice a
 * mitad de viaje y desaparecería del mapa mientras sigue volando.
 */
const MAX_MUNDO = 300;

export async function nido(id: string): Promise<Nido | null> {
  return leerDoc<Nido>(claveNido(id));
}

export async function guardarNido(n: Nido): Promise<void> {
  await escribirDoc(claveNido(n.id), n);
}

/** Los vuelos con algo por avisar. Solo lo usa el despertador. */
export async function idsPendientes(): Promise<string[]> {
  return store().leerConjunto(CLAVE_PENDIENTES);
}

/** Se saca de la lista cuando ya no queda nada que contar de ese vuelo. */
export async function olvidarPendiente(id: string): Promise<void> {
  await store().borrarDeConjunto(CLAVE_PENDIENTES, id);
}

/**
 * ¿Este vuelo terminó del todo?
 *
 * Terminó cuando ya no puede generar un aviso más: se perdió, o el ave se
 * quedó del otro lado, o volvió y ya aterrizó. El corte de los 30 días es la
 * red: alguien que recibe un ave y nunca decide qué hacer con ella dejaría el
 * vuelo pendiente para siempre, y la lista tiene que poder vaciarse.
 */
export function vueloTerminado(l: Loro, ahora: number): boolean {
  if (l.extravio !== null && ahora >= l.extravio) return true;
  // Se lo llevaron, y la nave ya se fue con él.
  if (l.abducido != null && ahora >= l.abducido + MS_ABDUCCION) return true;
  if (ahora < l.llegada) return false;
  if (l.suerte === "enjaulado" || l.suerte === "puchero") return true;
  if (l.suerte === "soltado") return Boolean(l.regreso && ahora >= l.regreso);
  return ahora > l.llegada + 30 * 24 * 60 * 60 * 1000;
}

export async function nidoPorCodigo(codigo: string): Promise<Nido | null> {
  const id = await store().leer(claveCodigo(codigo));
  return id ? nido(id) : null;
}

/**
 * Busca el lugar y lo guarda cuando llega, sin hacer esperar a nadie. Si
 * Nominatim tarda cuatro segundos, el nido igual ya está creado y el mapa ya
 * se está dibujando.
 *
 * Ojo con dónde se llama: en serverless la función se puede congelar apenas
 * responde, así que una promesa suelta después de la respuesta no tiene
 * garantía de terminar. Por eso además se reintenta desde la consulta de
 * estado (`asegurarLugar`): el nido tiene muchas oportunidades de conseguir su
 * ciudad, no una sola. Nominatim está cacheado, así que reintentar es barato.
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
  const codigo = await codigoLibre();

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

/**
 * Si el nido todavía no tiene ciudad, volver a intentarlo. Se llama desde la
 * consulta de estado, que corre muchas veces: alcanza con que una sola de esas
 * ejecuciones viva lo suficiente.
 */
const reintentos = new Map<string, number>();
export function asegurarLugar(n: Nido): void {
  if (n.lugar || n.bot) return;
  const ultimo = reintentos.get(n.id) ?? 0;
  if (Date.now() - ultimo < 60_000) return;
  if (reintentos.size > 2000) reintentos.clear();
  reintentos.set(n.id, Date.now());
  completarLugar(n.id, n.lat, n.lng);
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

// ---------- amistades ----------
//
// La bandada era un documento con un array hasta que se descubrió que agregar
// a alguien era leer-modificar-escribir: dos personas tocando tu link en el
// mismo segundo leían la misma lista y la segunda pisaba a la primera. Ahora
// cada amistad es su propia fila en un conjunto y no hay nada que pisar.
//
// La migración del formato viejo VIVIÓ ACÁ y ya no está: producción reporta
// cero bandadas en formato viejo (`enFormatoViejo` en /api/salud), así que
// leer ese documento en cada consulta era pagar un viaje a la base, en el
// endpoint más consultado de la app, para no encontrar nunca nada. El
// detector sigue en `estadoDeBandada`, que corre a pedido: si alguna vez
// vuelve a dar distinto de cero, la migración está en el historial de git.

/** Nidos a los que ya se les intentó el rescate en esta instancia. */
const yaRescatado = new Set<string>();

/**
 * Reconstruye una bandada perdida desde el historial de loros.
 *
 * Existe porque la migración de bandadas tenía un agujero que costó amistades
 * de verdad: escribía el conjunto nuevo y borraba el documento viejo SIN
 * fijarse si la escritura había entrado. Con la tabla `loros_conjunto` sin
 * crear en Supabase —o con un timeout, o un 429 de Upstash— las escrituras no
 * entraban, el borrado sí, y la bandada quedaba vacía para siempre.
 *
 * El buzón salva la situación: al soltar un loro se indexa en el buzón de LOS
 * DOS, así que el historial guarda con quién estuviste conectado aunque la
 * bandada ya no lo diga. Se rearma con `emparejar`, que escribe las dos
 * puntas: con que una sola de las dos personas abra la app, la amistad vuelve
 * para ambas.
 *
 * No recupera a alguien con quien nunca intercambiaste un loro. Para eso no
 * quedó rastro, y prefiero decirlo a inventarlo.
 */
async function rescatarBandada(id: string): Promise<{ ids: string[]; persistió: boolean }> {
  const enBuzon = await store().leerLista(claveBuzon(id));
  if (enBuzon.length === 0) return { ids: [], persistió: true };

  // Sin candado a propósito. La primera versión pedía turno con `reservar`
  // para no repetir trabajo, y eso tenía un defecto fatal: en Supabase
  // `reservar` escribe en `loros_conjunto`, LA MISMA TABLA cuya ausencia
  // causó la pérdida. El rescate quedaba bloqueado exactamente en el único
  // caso para el que existe. Y un turno ya tomado tampoco significa que la
  // bandada haya vuelto: si el intento anterior no persistió, negarse a
  // reintentar deja al nido vacío para siempre.
  //
  // `emparejar` es idempotente, así que repetirlo no cuesta nada más que unas
  // escrituras. La recuperación no puede depender de lo que se rompió.
  const crudos = await store().leerVarios(enBuzon.map(claveLoro));
  const otros = new Set<string>();
  for (const c of crudos) {
    if (!c) continue;
    try {
      const l = JSON.parse(c) as Loro;
      const otro = l.de === id ? l.para : l.de;
      if (otro && otro !== id) otros.add(otro);
    } catch {}
  }
  // Los que sacaste a mano no vuelven. El rescate recupera lo que se perdió,
  // no lo que decidiste.
  for (const echado of await store().leerConjunto(claveEchados(id))) otros.delete(echado);
  if (otros.size === 0) return { ids: [], persistió: true };

  const entraron = await Promise.all([...otros].map((otro) => emparejar(id, otro)));
  const persistió = entraron.every(Boolean);
  console.warn(
    `[bandada] ${otros.size} amistades de ${id} reconstruidas desde el historial` +
      (persistió ? "" : " — PERO no se pudieron guardar: revisá /api/salud")
  );
  // Se devuelven igual aunque no hayan persistido: es mejor que las veas
  // mientras la base se arregla. `persistió` decide si se reintenta.
  return { ids: [...otros], persistió };
}

/** Con quién estás conectado. Una sola lectura, que es la del conjunto. */
export async function idsAmigos(id: string): Promise<string[]> {
  const nuevos = await store().leerConjunto(claveAmigos(id));
  if (nuevos.length > 0 || yaRescatado.has(id)) return nuevos;

  // Bandada vacía: puede ser un nido recién hecho, o uno al que la migración
  // rota le borró todo. El rescate distingue mirando el historial de loros, y
  // no cuesta nada para quien de verdad no tiene a nadie. Se queda —aunque
  // aquel bug ya esté arreglado— porque el día que la base falle a mitad de
  // camino esto es lo único que devuelve una bandada.
  const r = await rescatarBandada(id);
  // Solo se marca si de verdad quedó guardado. Marcar un rescate que no
  // persistió es prometerle al nido que ya está resuelto y no volver a mirarlo
  // nunca: se verían las amistades una vez y desaparecerían en la siguiente.
  if (r.persistió) {
    if (yaRescatado.size > 5000) yaRescatado.clear();
    yaRescatado.add(id);
  }
  return r.ids.length ? r.ids : nuevos;
}

/**
 * Qué hay realmente detrás de "no veo a nadie en mi bandada".
 *
 * Desde el teléfono, una bandada vacía y una base que no puede leer se ven
 * exactamente igual. Esto separa las dos cosas mirando las tres fuentes por
 * separado, para /api/salud. No escribe nada: solo cuenta.
 */
export async function estadoDeBandada(id: string): Promise<{
  guardadas: number;
  enFormatoViejo: number;
  enHistorial: number;
}> {
  // El documento viejo se sigue mirando ACÁ y en ningún otro lado: la
  // migración se sacó de `idsAmigos` porque en producción no encuentra nada
  // nunca, pero este endpoint corre a pedido y es el único lugar donde
  // enterarse sale barato. Si alguna vez da distinto de cero, avisá.
  const [conjunto, viejo, buzon] = await Promise.all([
    store().leerConjunto(claveAmigos(id)),
    leerDoc<string[]>(claveAmigosViejo(id)),
    store().leerLista(claveBuzon(id)),
  ]);
  const otros = new Set<string>();
  if (buzon.length) {
    for (const c of await store().leerVarios(buzon.map(claveLoro))) {
      if (!c) continue;
      try {
        const l = JSON.parse(c) as Loro;
        const otro = l.de === id ? l.para : l.de;
        if (otro && otro !== id) otros.add(otro);
      } catch {}
    }
  }
  return {
    guardadas: conjunto.length,
    enFormatoViejo: viejo?.length ?? 0,
    enHistorial: otros.size,
  };
}

/** Varios nidos de una, por id. Una sola ida a la base y no una por nido. */
export async function nidos(ids: string[]): Promise<Map<string, Nido>> {
  const mapa = new Map<string, Nido>();
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return mapa;
  const crudos = await store().leerVarios(unicos.map(claveNido));
  for (const c of crudos) {
    if (!c) continue;
    try {
      const n = JSON.parse(c) as Nido;
      mapa.set(n.id, n);
    } catch {}
  }
  return mapa;
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

/**
 * La amistad es de a dos: agregar por código te agrega también del otro lado.
 *
 * Dos escrituras a conjuntos, sin leer nada antes. Ahí está todo el arreglo:
 * la base resuelve el choque, así que seis personas tocando el mismo link en
 * el mismo segundo quedan las seis.
 */
/**
 * Sacar a alguien de la bandada. Corta por los dos lados.
 *
 * No es una asimetría lo que se quiere: si te saco, no quiero que me sigas
 * viendo en el mapa. Una baja de un solo lado dejaría a la otra persona con tu
 * zona, tu distancia y un botón para mandarte loros — o sea, sin sacar nada.
 *
 * Lo que ya está en el aire NO se toca. El ave salió, el mensaje está escrito
 * y aterriza igual: hacerla desaparecer sería contarle una mentira a quien la
 * soltó. Se dejan de ver de acá en adelante.
 */
export async function desemparejar(a: string, b: string): Promise<void> {
  await Promise.all([
    store().borrarDeConjunto(claveAmigos(a), b),
    store().borrarDeConjunto(claveAmigos(b), a),
    store().agregarAConjunto(claveEchados(a), b),
    store().agregarAConjunto(claveEchados(b), a),
  ]);
}

export async function emparejar(a: string, b: string): Promise<boolean> {
  // Devuelve si las DOS puntas entraron. Una amistad a medias es una amistad
  // rota, y quien llama tiene que poder distinguirla de una que anduvo.
  // Y se borra la marca de baja: volver a sumarse con el código es la forma
  // explícita de deshacerla, y tiene que alcanzar. Sin esto, dos personas que
  // se sacaron y se arrepintieron quedaban emparejadas pero marcadas, y el
  // primer rescate que corriera las separaba de nuevo.
  const lados = await Promise.all([
    store().agregarAConjunto(claveAmigos(a), b),
    store().agregarAConjunto(claveAmigos(b), a),
    store().borrarDeConjunto(claveEchados(a), b).then(() => true),
    store().borrarDeConjunto(claveEchados(b), a).then(() => true),
  ]);
  return lados.every(Boolean);
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
  /**
   * La parada en la cervecería, cuando el ave no despega del nido sino de
   * donde estuvo esperando (lib/cerveceria.ts). Cambia tres cosas: de dónde
   * sale, cuándo sale —puede ser en el futuro, si todavía no llegó a la
   * barra— y cómo entrega el mensaje.
   */
  parada?: Parada;
  /**
   * De dónde despega, cuando no es ni el nido ni la parada.
   *
   * Existe para un caso: el ave que se cansó de esperar en la barra, se volvió
   * al nido y sale de ahí cuando finalmente abren el link. La parada igual
   * viaja —la historia pasó, los copetines se tomaron— pero el punto de
   * despegue es otro. Sin esto, `parada.punto` mandaba siempre y el ave
   * despegaba de una cervecería en la que ya no estaba.
   */
  desde?: Punto;
  /** Que salga convertido en pollera. Solo el loro puede. */
  pollera?: boolean;
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

  const parada = datos.parada ?? null;
  // El ave que viene de un convite despega de la cervecería, no del nido: ahí
  // es donde estuvo esperando. Y sale cuando se levanta de la mesa, que puede
  // ser en el futuro —si abrieron el link antes de que llegara a la barra,
  // sale recién al llegar; el ave no se teletransporta ni pega la vuelta.
  const origen: Punto =
    datos.desde ?? (parada ? parada.punto : { lat: datos.de.lat, lng: datos.de.lng });
  const destino: Punto = { lat: datos.para.lat, lng: datos.para.lng };
  const km = distanciaKm(origen, destino);
  const salida = parada ? parada.salida : Date.now();
  const escala = escalaGlobal();
  // Lo que iba a tardar si nada raro pasaba. Todo lo demás se mide contra esto.
  // El que viene de la cervecería tarda de más, en proporción a lo que se tomó.
  const duracionLimpia = Math.round(
    duracionVuelo(km, datos.ave, escala) * (parada ? demoraPorCopetines(parada.nivel) : 1)
  );

  // El sorteo va acá, una sola vez, y el resultado queda guardado. Ni cerca
  // del principio ni del final: perderse a los tres segundos de despegar no se
  // vive como un viaje que salió mal, y perderse rozando el destino es una
  // crueldad innecesaria.
  //
  // EL LORITO DE CONVITE NO SE PIERDE NI SE ENAMORA, y no es una excepción
  // caprichosa: es el PRIMER mensaje que esa persona recibe en la app, muchas
  // veces lo primero que ve de quien la invitó. Perderlo sería recibir a
  // alguien que acaba de armar su nido con un nido vacío y ninguna razón para
  // volver. El ave ya tuvo su noche en la cervecería; con eso alcanza.
  const seExtravia = !parada && Math.random() < probabilidadExtravio();
  const dondeSePierde = 0.15 + Math.random() * 0.7;

  // Un ave que se pierde no se enamora: la historia de cada vuelo es una sola.
  const desvio =
    seExtravia || parada
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
    // Y si viene de la cervecería, encima de lo que haga el ave, el hipo. Van
    // en este orden porque así pasó: primero el bicho escuchó lo que escuchó
    // durante el viaje, después se tomó los copetines.
    textoEntregado: parada
      ? loQueBalbuceaElBorracho(retocarTexto(datos.ave, texto, id, desvio), id, parada.nivel)
      : retocarTexto(datos.ave, texto, id, desvio),
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
    parada,
    // Solo el loro. Pedirlo con otra ave no es un error que valga la pena
    // contarle a nadie: se ignora y sale el ave de siempre.
    pollera: datos.ave === "loro" && datos.pollera === true,
  };

  await escribirDoc(claveLoro(loro.id), loro);
  // El mismo id en los dos buzones: el loro es uno solo, visto desde las dos
  // puntas. Quien lo mandó ve su texto desde el minuto cero; quien lo recibe,
  // recién cuando aterriza (eso lo resuelve la vista, en la API).
  await store().agregarALista(claveBuzon(datos.de.id), loro.id, MAX_BUZON);
  await store().agregarALista(claveBuzon(datos.para.id), loro.id, MAX_BUZON);
  // El índice de la vista del resto. Los de Doña Cotorra no entran: es una
  // vecina de práctica, y hacerla pasar por gente sería inflar el mapa con
  // vuelos que no existen.
  if (!datos.de.bot && !datos.para.bot) {
    await store().agregarALista(CLAVE_MUNDO, loro.id, MAX_MUNDO);
  }
  // Este sí incluye a la vecina: su ave también aterriza.
  await store().agregarAConjunto(CLAVE_PENDIENTES, loro.id);

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

/**
 * Los loros que ahora mismo están cruzando el mapa, de cualquiera.
 *
 * Devuelve los loros crudos: quién puede ver qué de ellos lo decide
 * lib/vista.ts, que es donde vive esa regla para todo lo demás.
 */
export async function enElAire(ahora: number): Promise<Loro[]> {
  const ids = await store().leerLista(CLAVE_MUNDO, MAX_MUNDO);
  if (ids.length === 0) return [];
  const crudos = await store().leerVarios(ids.map(claveLoro));
  const lista: Loro[] = [];
  for (const c of crudos) {
    if (!c) continue;
    try {
      const l = JSON.parse(c) as Loro;
      // Ya llegó, o se perdió por el camino: en los dos casos no está en el aire.
      if (ahora >= l.llegada) continue;
      if (l.extravio !== null && ahora >= l.extravio) continue;
      lista.push(l);
    } catch {}
  }
  return lista;
}

/**
 * La respuesta de la vista del resto, guardada unos segundos.
 *
 * Es el endpoint más caro —la lista global, más los loros, más los nidos de las
 * dos puntas de cada uno— y todos los que están mirando piden exactamente lo
 * mismo, así que repartir una sola respuesta cambia el orden de magnitud.
 *
 * Tres segundos y no diez, y el motivo es el interruptor de privacidad: con
 * diez, apagar "Aparecer en «Del resto»" tardaba diez segundos en surtir
 * efecto, y una decisión sobre dónde te ven no puede quedar en cola. Con tres
 * la caché sigue absorbiendo casi todo —cien personas mirando comparten el 97 %
 * de las respuestas— y además se tira a la basura en cuanto alguien cambia el
 * interruptor.
 */
const CACHE_MUNDO_MS = 3000;

/**
 * Un vuelo en la foto del mundo, con las dos puntas SIN anonimizar al lado.
 *
 * Los dos ids no salen nunca hacia afuera: existen para que cada quien pueda
 * sacar sus propios vuelos de su vista del mundo. La foto se calcula una sola
 * vez para todos —es el endpoint más caro— y la respuesta se arma por persona
 * a partir de ella, que es más barato que calcular una foto por cabeza.
 */
export type EnLaFoto = { de: string; para: string; vista: unknown };
let cacheMundo: { hasta: number; ahora: number; cuerpo: string } | null = null;

export function mundoCacheado(ahora: number): { ahora: number; vuelos: EnLaFoto[] } | null {
  if (!cacheMundo || ahora >= cacheMundo.hasta) return null;
  return { ahora: cacheMundo.ahora, vuelos: JSON.parse(cacheMundo.cuerpo) };
}

export function guardarMundo(vuelos: EnLaFoto[], ahora: number): void {
  cacheMundo = { hasta: ahora + CACHE_MUNDO_MS, ahora, cuerpo: JSON.stringify(vuelos) };
}

/** Alguien cambió si aparece o no. La foto vieja ya no sirve. */
export function olvidarMundo(): void {
  cacheMundo = null;
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
/**
 * Solicitar la abducción: un plato volador se lleva tu propia ave, en pleno
 * vuelo, con el mensaje adentro.
 *
 * Tres reglas, y las tres son sobre de quién es la decisión:
 *
 *   SOLO QUIEN LO MANDÓ. Es la contraparte exacta de la suerte del ave: lo que
 *   se hace con un loro que YA LLEGÓ lo decide quien lo recibió, y lo que se
 *   hace con uno que todavía está en el aire lo decide quien lo soltó. Nadie
 *   puede abducir el ave de otro.
 *
 *   SOLO EN VUELO. Después de aterrizar el mensaje ya se puede leer, y llamar
 *   a una nave para borrar algo que la otra persona quizá ya leyó no borra
 *   nada: deja a las dos con la misma historia y a una con la ilusión de
 *   haberla deshecho.
 *
 *   UNA SOLA VEZ. El turno atómico es el mismo que usa la suerte del ave, por
 *   la misma razón: dos toques rápidos no pueden mandar dos naves.
 *
 * @returns el loro ya abducido, o null si no se puede.
 */
export async function abducirLoro(loroId: string, quien: string): Promise<Loro | null> {
  const l = await loro(loroId);
  // El ave es tuya solo si la mandaste vos.
  if (!l || l.de !== quien) return null;
  const ahora = Date.now();
  // Ya se lo llevaron: contestar el mismo loro es lo correcto, no un error.
  // La pantalla puede reintentar y recargar tiene que dar lo mismo.
  if (l.abducido != null) return l;
  // Un ave que ya se perdió no tiene a quién abducir.
  if (l.extravio !== null && ahora >= l.extravio) return null;
  // Ni una que ya aterrizó: ahí el mensaje ya es del otro.
  if (ahora >= l.llegada) return null;

  if (!(await store().reservar(claveTurno("abduccion", loroId), 0))) {
    // Perdió el turno contra otro toque suyo. Se espera a que aparezca escrito,
    // igual que en la suerte: contestar "no se pudo" cuando la nave ya salió
    // sería mentirle a quien la llamó.
    for (let i = 0; i < 4; i++) {
      const actual = await loro(loroId);
      if (actual?.abducido != null) return actual;
      await new Promise((r) => setTimeout(r, 70));
    }
    return (await loro(loroId)) ?? l;
  }

  const actualizado: Loro = { ...l, abducido: ahora };
  await escribirDoc(claveLoro(loroId), actualizado);
  return actualizado;
}

export async function decidirSuerte(
  loroId: string,
  quien: string,
  suerte: Suerte,
  respuesta = ""
): Promise<Loro | null> {
  const l = await loro(loroId);
  if (!l || l.para !== quien) return null;
  const ahora = Date.now();
  // Un ave que nunca llegó no está posada en la ventana de nadie.
  if (l.extravio !== null && ahora >= l.extravio) return null;
  if (ahora < l.llegada) return null;
  if (l.suerte) return l;

  // Un solo destino por ave. Sin este turno, dos toques rápidos pasaban los dos
  // el `if (l.suerte)` de arriba y cada uno recibía una respuesta distinta:
  // a quien tocó primero le decía "lo soltaste" y el ave terminaba en el
  // puchero. El turno no vence nunca: la decisión tampoco.
  if (!(await store().reservar(claveTurno("suerte", loroId), 0))) {
    // Perdió el turno: quien ganó está escribiendo justo ahora. Se espera un
    // momento a que aparezca su decisión, para no contestar "todavía no se
    // decidió nada" cuando en realidad ya se decidió.
    for (let i = 0; i < 4; i++) {
      const actual = await loro(loroId);
      if (actual?.suerte) return actual;
      await new Promise((r) => setTimeout(r, 70));
    }
    return (await loro(loroId)) ?? l;
  }

  // El mensaje de vuelta solo existe si el ave vuelve. Enjaulada o al puchero
  // no hay quien lo lleve, y guardarlo sería guardar algo que nadie va a leer.
  const texto =
    suerte === "soltado" ? respuesta.trim().slice(0, AVES[l.ave].maxCaracteres) : "";

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
    respuesta: texto || null,
    // La misma ave hace lo mismo a la vuelta: si es cotorra, vuelve a escuchar
    // mal. Se calcula ACÁ y queda escrito, igual que a la ida — si se calculara
    // al leer, cada consulta entregaría un mensaje distinto.
    respuestaEntregada: texto
      ? AVES[l.ave].rareza === "olvida"
        ? loQueRepiteLaCotorra(texto, `vuelta:${l.id}`)
        : texto
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

export function idVecina(idUsuario: string): string {
  return `vecina-${idUsuario}`;
}

/**
 * ¿Hay algo que la vecina tenga que contestar?
 *
 * Se responde con el buzón que la consulta de estado YA cargó, sin tocar la
 * base. Antes `atenderVecina` salía a leer su nido, su lista y sus loros en
 * cada sondeo —tres viajes de los siete que costaba `/api/estado`— y en el
 * 99 % de las veces no había nada que hacer. Casi la mitad del costo del
 * endpoint más llamado se iba en preguntar si había que hacer algo.
 */
export function vecinaTienePendiente(idUsuario: string, buzonPropio: Loro[], ahora: number): boolean {
  const vecina = idVecina(idUsuario);
  return buzonPropio.some(
    (l) =>
      l.para === vecina &&
      !l.respondido &&
      l.llegada <= ahora &&
      !(l.extravio !== null && ahora >= l.extravio)
  );
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
    // Una sola respuesta por loro. Con la app abierta en dos pestañas —o con
    // el reintento pendiente del cliente— dos consultas de estado entraban acá
    // a la vez, las dos veían `respondido` en falso, y Doña Cotorra contestaba
    // el mismo loro cuatro veces.
    if (!(await store().reservar(claveTurno("vecina", l.id), 0))) continue;
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
