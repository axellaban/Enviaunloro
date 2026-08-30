// El lorito de convite: mandarle un mensaje a alguien que todavía no está.
//
// Hasta ahora había una sola forma de traer gente: compartir tu nido. Un link
// genérico, el mismo para todos, que del otro lado se lee como "bajate esta
// app". Funciona, pero es una invitación a una herramienta, no un mensaje de
// alguien.
//
// Esto es lo otro: le escribís algo a una persona puntual, elegís con qué ave
// se lo mandás, y el ave SALE. No espera en una bandeja: despega de tu nido,
// cruza un pedazo de mapa y se posa en una cervecería a dos minutos de vuelo
// (lib/cerveceria.ts). Ahí espera. El link que compartís no dice "bajate una
// app": dice que hay un guacamayo tomando cerveza a doce kilómetros con un
// mensaje tuyo adentro, y que sale en cuanto esa persona tenga un nido adonde
// ir.
//
// Del otro lado, armar el nido deja de ser un trámite y pasa a ser lo que
// destraba el ave.
//
// POR QUÉ UN DOCUMENTO APARTE Y NO UN LORO. Un `Loro` tiene destino, distancia
// y hora de llegada desde el momento cero, y de eso vive el resto de la app.
// Un convite no tiene nada de eso hasta que alguien lo reclama: no se sabe
// adónde va. Meterlo en la misma tabla obligaría a que la mitad de los campos
// pudieran ser null en todos lados. El loro nace en el momento en que hay
// adónde ir, que es exactamente cuando existe de verdad.
//
// LA LLAVE. El id del convite ES el link, y son 96 bits de `randomBytes`: no
// se adivina probando. No va firmado como la llave de sesión porque no da
// acceso a un nido, solo al mensaje que alguien escribió para quien reciba ese
// link — y esa es justo la persona a la que se lo mandaron.

import type { AveId } from "./aves";
import { AVES } from "./aves";
import {
  borrachera,
  dondeLaCerveceria,
  esperaMaximaEnLaBarra,
  esperaMinimaEnLaBarra,
  MINUTOS_HASTA_LA_PARADA,
  type Parada,
} from "./cerveceria";
import {
  claveTurno,
  emparejar,
  enviarLoro,
  escalaGlobal,
  loro as leerLoro,
  nido,
  type Loro,
  type Nido,
} from "./datos";
import { lugarDe } from "./geocode";
import { duracionVuelo } from "./vuelo";
import { distanciaKm, type Punto } from "./geo";
import { escribirDoc, leerDoc, store } from "./store";
import { nuevoId } from "./sesion";

export type Convite = {
  /** También la llave del link: /?c=<id>. */
  id: string;
  /** El nido que lo manda. */
  de: string;
  ave: AveId;
  texto: string;
  /** A quién va dirigido, para poder decir "para Jez". Puede estar vacío. */
  para: string;
  /** Cuándo despegó del nido. */
  salida: number;
  /** La cervecería, y cuándo se posó ahí. */
  posada: Punto;
  lugar: string;
  llegadaPosada: number;
  /** Quién lo abrió, cuándo, y el loro que salió de ahí. null mientras espera. */
  reclamado: { nido: string; cuando: number; loro: string } | null;
  /**
   * Cuándo lo llamaste de vuelta. null si sigue su curso.
   *
   * Es lo único que MATA un convite: el ave vuelve y el link deja de servir.
   * Existe porque un lorito soltado por error no tenía arreglo — el mensaje ya
   * estaba escrito, el link ya estaba mandado, y lo único que quedaba era
   * esperar a que alguien lo abriera. Volverse a las 48 horas resuelve el ave
   * olvidada; esto resuelve el arrepentimiento, que es otra cosa y es ya.
   */
  cancelado: number | null;
};

const claveConvite = (id: string) => `convite:${id}`;
const claveConvitesDe = (idNido: string) => `convites:${idNido}`;

/** Cuántos loritos puede tener alguien esperando en la barra a la vez. */
export const MAX_CONVITES = 20;

/** Y cuántos guarda la lista, contando los ya reclamados. */
const MAX_LISTA = 60;

export type ResultadoConvite =
  | { ok: true; convite: Convite }
  | { ok: false; error: string };

/**
 * Suelta un lorito para alguien que todavía no tiene nido.
 *
 * El ave despega en el acto: la hora de llegada a la cervecería se fija acá y
 * no depende de que nadie mire. Lo único que queda abierto es adónde sigue.
 */
export async function crearConvite(datos: {
  de: Nido;
  ave: AveId;
  texto: string;
  para: string;
}): Promise<ResultadoConvite> {
  const texto = datos.texto.trim();
  if (!texto) return { ok: false, error: "El loro no puede volar sin nada que decir." };

  const a = AVES[datos.ave];
  if (texto.length > a.maxCaracteres) {
    return {
      ok: false,
      error: `${a.nombre === "Cotorra" ? "A la" : "Al"} ${a.nombre.toLowerCase()} no le entran más de ${a.maxCaracteres} caracteres.`,
    };
  }

  // Un tope, porque cada convite deja un ave posada para siempre si nadie lo
  // abre. Veinte es más que suficiente para invitar gente y poco para usarlo
  // de depósito.
  const abiertos = (await convitesDe(datos.de.id)).filter((c) => !c.reclamado);
  if (abiertos.length >= MAX_CONVITES) {
    return {
      ok: false,
      error: `Ya tenés ${MAX_CONVITES} loritos esperando en la barra. Que alguno salga antes de mandar otro.`,
    };
  }

  const id = nuevoId();
  const nidoPunto: Punto = { lat: datos.de.lat, lng: datos.de.lng };
  const posada = dondeLaCerveceria(nidoPunto, id, datos.ave);
  const salida = Date.now();

  const c: Convite = {
    id,
    de: datos.de.id,
    ave: datos.ave,
    texto,
    para: datos.para.trim().slice(0, 40),
    salida,
    posada,
    lugar: "",
    // Los dos minutos salen de la misma cuenta que todo lo demás: la distancia
    // hasta la barra dividida por la velocidad del ave. Así el ave que llega
    // antes es la misma que llega antes en el resto de la app.
    llegadaPosada:
      salida +
      duracionVuelo(
        AVES[datos.ave].velocidadKmh * (MINUTOS_HASTA_LA_PARADA / 60),
        datos.ave,
        escalaGlobal()
      ),
    reclamado: null,
    cancelado: null,
  };

  await escribirDoc(claveConvite(id), c);
  await store().agregarALista(claveConvitesDe(datos.de.id), id, MAX_LISTA);
  // Cómo se llama el barrio de la cervecería. Best-effort y en segundo plano,
  // igual que el del nido: si Nominatim no contesta, el ave para en una
  // cervecería sin nombre y no pasa nada.
  ponerleNombreALaCerveceria(id, posada);
  return { ok: true, convite: c };
}

function ponerleNombreALaCerveceria(id: string, p: Punto): void {
  lugarDe(p.lat, p.lng)
    .then(async (lugar) => {
      if (!lugar) return;
      const actual = await convite(id);
      if (actual) await escribirDoc(claveConvite(id), { ...actual, lugar });
    })
    .catch(() => {});
}

/**
 * Los dos horarios que no se guardan: cuándo se cansa y cuándo llega a casa.
 *
 * Se calculan y no se escriben, igual que la posición de un ave en vuelo: son
 * consecuencia de horarios que ya están guardados, y un campo más es un campo
 * más que puede quedar desactualizado.
 */
export function horariosDelConvite(
  c: Convite,
  nido: Punto,
  escala = 1
): { abandona: number; enCasa: number } {
  const abandona = c.llegadaPosada + esperaMaximaEnLaBarra(escala);
  return {
    abandona,
    enCasa: abandona + duracionVuelo(distanciaKm(c.posada, nido), c.ave, escala),
  };
}

export async function convite(id: string): Promise<Convite | null> {
  return leerDoc<Convite>(claveConvite(id));
}

export async function convitesDe(idNido: string): Promise<Convite[]> {
  const ids = await store().leerLista(claveConvitesDe(idNido));
  if (ids.length === 0) return [];
  const crudos = await store().leerVarios(ids.map(claveConvite));
  const lista: Convite[] = [];
  for (const c of crudos) {
    if (!c) continue;
    try {
      lista.push(JSON.parse(c) as Convite);
    } catch {}
  }
  return lista.sort((x, y) => y.salida - x.salida);
}

export type ResultadoReclamo =
  | { ok: true; convite: Convite; loro: Loro; deNombre: string }
  | { ok: false; error: string };

/**
 * Alguien abrió el link y ya tiene nido: el ave se levanta de la mesa.
 *
 * Es idempotente para quien ya lo reclamó, y eso no es un lujo: la página que
 * lo llama corre un efecto que puede dispararse dos veces, y recargar con el
 * link todavía en la barra de direcciones tiene que devolver el mismo loro, no
 * un error.
 */
export async function reclamarConvite(
  llave: string,
  quien: Nido
): Promise<ResultadoReclamo> {
  const c = await convite(llave);
  if (!c) return { ok: false, error: "Ese lorito no existe o ya no está." };

  const de = await nido(c.de);
  if (!de) return { ok: false, error: "El nido que te lo mandó ya no está." };

  if (c.reclamado) {
    if (c.reclamado.nido !== quien.id) {
      return { ok: false, error: "Ese lorito ya salió para otro lado." };
    }
    const yaEsta = await leerLoro(c.reclamado.loro);
    if (yaEsta) return { ok: true, convite: c, loro: yaEsta, deNombre: de.nombre };
    return { ok: false, error: "Ese lorito ya salió." };
  }

  if (c.de === quien.id) {
    return { ok: false, error: "Ese lorito lo mandaste vos." };
  }

  if (c.cancelado !== null) {
    return { ok: false, error: "Ese lorito volvió a su nido: quien lo mandó lo llamó de vuelta." };
  }

  // Dos personas abriendo el mismo link en el mismo segundo: gana una sola. El
  // mensaje fue escrito para una persona y el ave es una.
  if (!(await store().reservar(claveTurno("convite", c.id), 0))) {
    return { ok: false, error: "Ese lorito ya salió para otro lado." };
  }

  // Quedan conectados, y eso pasa antes que el vuelo: si el loro sale y la
  // amistad no entró, del otro lado aparece un mensaje de alguien que no está
  // en la bandada y no se le puede contestar.
  await emparejar(c.de, quien.id);

  const ahora = Date.now();
  const escala = escalaGlobal();
  const nidoDeQuienMando: Punto = { lat: de.lat, lng: de.lng };
  const { abandona, enCasa } = horariosDelConvite(c, nidoDeQuienMando, escala);

  // Dónde está el ave cuando abren el link, que es lo que decide todo lo demás.
  // A las 48 horas se cansa de esperar y se vuelve; si abrieron después de eso,
  // el ave ya está —o va a estar— en el nido de quien la mandó.
  const seVolvio = ahora >= abandona;

  // Cuándo se levanta, y de dónde sale. Tres pisos, y los tres importan:
  //
  //   No antes de haber LLEGADO a la barra. Si abrieron el link a los treinta
  //   segundos, el ave todavía está en el aire rumbo a ella; llega y recién ahí
  //   se pone a terminar. No se teletransporta ni pega la vuelta.
  //
  //   Ni antes de haber llegado A CASA, si ya se había vuelto. Misma razón.
  //
  //   Y nunca antes de un minuto DESDE QUE ABRIERON EL LINK. Es el mejor
  //   momento de todo esto: alguien acaba de armar su nido y lo primero que ve
  //   en su mapa es el ave despidiéndose antes de salir para su casa.
  const piso = seVolvio ? enCasa : c.llegadaPosada;
  const salida = Math.max(piso, ahora + esperaMinimaEnLaBarra(escala));

  // Los copetines se cuentan por lo que estuvo EN LA BARRA, no por lo que
  // tardaron en abrir el link: una vez que se volvió al nido, lo que pasa es
  // que la duerme.
  const b = borrachera((seVolvio ? abandona : salida) - c.llegadaPosada, escala);

  const parada: Parada = {
    punto: c.posada,
    lugar: c.lugar,
    llegada: c.llegadaPosada,
    salida,
    // Durmiendo la mona no arrastra la lengua: el mensaje sale entero.
    nivel: seVolvio ? 0 : b.nivel,
    copetines: b.copetines,
    ...(seVolvio ? { durmioLaMona: true } : {}),
  };

  const r = await enviarLoro({
    de,
    para: quien,
    ave: c.ave,
    texto: c.texto,
    parada,
    // Y sale de donde está: de la barra, o del nido si ya se había vuelto.
    ...(seVolvio ? { desde: nidoDeQuienMando } : {}),
  });
  if (!r.ok) return { ok: false, error: r.error };

  await escribirDoc(claveConvite(c.id), {
    ...c,
    reclamado: { nido: quien.id, cuando: ahora, loro: r.loro.id },
  } satisfies Convite);

  return { ok: true, convite: c, loro: r.loro, deNombre: de.nombre };
}


export type ResultadoCancelar =
  | { ok: true; convite: Convite; vuelveEn: number }
  | { ok: false; error: string };

/**
 * Llamarlo de vuelta.
 *
 * Un silbido, no un botón de borrar: el ave deja la barra y se vuelve al nido,
 * y el link deja de servir. Es la única forma de deshacer un lorito soltado por
 * error —el mensaje equivocado, el link al contacto equivocado— y no hay otra:
 * a las 48 horas se vuelve solo, pero arrepentirse es ahora.
 *
 * Solo lo puede llamar quien lo soltó, y solo mientras nadie lo haya abierto:
 * después de eso ya no es un convite, es un loro en vuelo, y lo que se hace con
 * un loro que ya llegó lo decide quien lo recibió.
 */
export async function cancelarConvite(
  llave: string,
  quien: Nido
): Promise<ResultadoCancelar> {
  const c = await convite(llave);
  if (!c) return { ok: false, error: "Ese lorito no existe o ya no está." };
  if (c.de !== quien.id) return { ok: false, error: "Ese lorito no es tuyo." };
  if (c.reclamado) {
    return { ok: false, error: "Ese lorito ya salió: ahora es un loro en vuelo." };
  }
  if (c.cancelado !== null) return { ok: true, convite: c, vuelveEn: 0 };

  const ahora = Date.now();
  const escala = escalaGlobal();
  const nido: Punto = { lat: quien.lat, lng: quien.lng };
  // Vuelve desde donde esté: si todavía va camino a la barra, desde la barra
  // igual —no da media vuelta en el aire, termina de llegar— y si ya se estaba
  // volviendo sola, no se le suma nada.
  const desde = Math.max(ahora, c.llegadaPosada);
  const vuelve = desde + duracionVuelo(distanciaKm(c.posada, nido), c.ave, escala);

  await escribirDoc(claveConvite(c.id), { ...c, cancelado: ahora } satisfies Convite);
  return { ok: true, convite: c, vuelveEn: Math.max(0, vuelve - ahora) };
}
