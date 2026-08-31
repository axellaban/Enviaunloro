// Web Push: el aviso que llega con la app cerrada.
//
// Es la única pieza de la app que puede hablarle a alguien que no la está
// mirando, y por eso importa tanto: la promesa es "tu guacamayo llega en 1 día
// 6 h" y nadie deja una pestaña abierta un día.
//
// CÓMO SE PRENDE (no anda sin esto, y no rompe nada si falta):
//
//   1. `npm run vapid` — genera el par de claves. Se corre UNA vez.
//   2. Cargar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_CONTACTO`
//      (un mailto: tuyo) como variables de entorno, y redeployar.
//   3. Correr el SQL de supabase.sql: crea la tabla y programa el despertador.
//
// Sin las claves, `hayPush()` da false, la app no ofrece suscribirse y todo
// sigue funcionando como antes. Prenderlo no requiere migrar nada.
//
// POR QUÉ UNA DEPENDENCIA. Firmar el JWT de VAPID y cifrar el cuerpo con
// AES128GCM sobre ECDH+HKDF (RFC 8291) es criptografía, y es exactamente donde
// se esconden los errores que no se ven hasta que un navegador rechaza el
// envío en silencio. Acá el resto de los servicios se hablan con `fetch` pelado
// —Upstash, Supabase, Nominatim— porque son HTTP y se pueden leer; esto no.

import webpush from "web-push";
import { claveTurno } from "./datos";
import { store } from "./store";

export type Suscripcion = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function claves(): { publica: string; privada: string; contacto: string } | null {
  const publica = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privada = process.env.VAPID_PRIVATE_KEY || "";
  if (!publica || !privada) return null;
  // El contacto va en el JWT: es a quién le escribe el servicio de push si
  // algo anda mal. Un mailto que no existe no rompe, pero deja el problema sin
  // dueño.
  return { publica, privada, contacto: process.env.VAPID_CONTACTO || "mailto:hola@example.com" };
}

/** ¿Está configurado? Si no, la app no ofrece suscribirse y no pasa nada. */
export function hayPush(): boolean {
  return claves() !== null;
}

/** La pública, que el navegador necesita para suscribirse. No es secreta. */
export function clavePublica(): string {
  return claves()?.publica || "";
}

/** Los dispositivos de una persona. Una suscripción por dispositivo, no por
 *  persona: el mismo nido puede estar en el teléfono y en la compu. */
const clavePush = (idNido: string) => `push:${idNido}`;

export async function guardarSuscripcion(idNido: string, s: Suscripcion): Promise<boolean> {
  return store().agregarAConjunto(clavePush(idNido), JSON.stringify(s));
}

export async function olvidarSuscripcion(idNido: string, endpoint: string): Promise<void> {
  for (const crudo of await store().leerConjunto(clavePush(idNido))) {
    try {
      if ((JSON.parse(crudo) as Suscripcion).endpoint === endpoint) {
        await store().borrarDeConjunto(clavePush(idNido), crudo);
      }
    } catch {}
  }
}

export async function suscripcionesDe(idNido: string): Promise<{ crudo: string; s: Suscripcion }[]> {
  const salida: { crudo: string; s: Suscripcion }[] = [];
  for (const crudo of await store().leerConjunto(clavePush(idNido))) {
    try {
      const s = JSON.parse(crudo) as Suscripcion;
      if (s?.endpoint && s?.keys?.p256dh) salida.push({ crudo, s });
    } catch {}
  }
  return salida;
}

/**
 * Lo que viaja adentro de un push. Lo lee public/sw.js.
 *
 * `insignia` es el número del globito del ícono, y va en TODOS los avisos a
 * propósito: así el service worker lo pone al valor correcto en vez de sumarle
 * o restarle uno. Un contador que se corrige solo no se puede desincronizar;
 * uno que suma y resta se desincroniza el primer aviso que se pierda.
 */
export type Empujon = {
  titulo: string;
  cuerpo: string;
  tag?: string;
  url?: string;
  insignia?: number;
};

/**
 * Le manda un aviso a todos los dispositivos de una persona.
 *
 * Devuelve a cuántos llegó. Las suscripciones muertas —404 o 410, que es lo
 * que contesta el navegador cuando alguien desinstaló la app o borró los
 * datos— se borran acá mismo: si no, la lista crece para siempre y cada aviso
 * paga el intento de hablarle a un teléfono que ya no existe.
 */
export async function empujar(
  idNido: string,
  aviso: Empujon
): Promise<number> {
  const k = claves();
  if (!k) return 0;
  webpush.setVapidDetails(k.contacto, k.publica, k.privada);

  const cuerpo = JSON.stringify(aviso);
  let llegaron = 0;
  for (const { crudo, s } of await suscripcionesDe(idNido)) {
    try {
      await webpush.sendNotification(s as webpush.PushSubscription, cuerpo, { TTL: 60 * 60 * 24 });
      llegaron++;
    } catch (err: any) {
      const codigo = err?.statusCode;
      if (codigo === 404 || codigo === 410) {
        await store().borrarDeConjunto(clavePush(idNido), crudo);
      } else {
        console.error(`[push] ${codigo || ""} ${err?.message || err}`);
      }
    }
  }
  return llegaron;
}

/**
 * Un aviso, una sola vez, pase lo que pase.
 *
 * El despertador corre cada un minuto y puede solaparse consigo mismo —una
 * corrida lenta y la siguiente arrancando— así que sin esto una persona
 * recibiría el mismo aviso dos veces. El turno es la misma operación atómica
 * que ya usa el resto de la app, y no vence nunca: el ave aterriza una vez.
 */
export async function empujarUnaVez(
  idNido: string,
  motivo: string,
  aviso: Empujon
): Promise<boolean> {
  if (!(await store().reservar(claveTurno("aviso", motivo), 0))) return false;
  await empujar(idNido, aviso);
  return true;
}
