// Lo que comparten todas las rutas: respuestas sin caché, freno por IP y el
// guard de mismo origen.

import { idDeRequest } from "./sesion";
import { nido, type Nido } from "./datos";
import { store } from "./store";

const SIN_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Content-Type": "application/json; charset=utf-8",
} as const;

export function ok(datos: unknown, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(datos), {
    headers: { ...SIN_CACHE, ...(extra as any) },
  });
}

export function error(mensaje: string, status = 400, extra?: HeadersInit): Response {
  return new Response(JSON.stringify({ ok: false, error: mensaje }), {
    status,
    headers: { ...SIN_CACHE, ...(extra as any) },
  });
}

/**
 * El freno.
 *
 * Dos capas, y la de arriba es la que importa:
 *
 *   Con Upstash cuenta contra Redis, así que el límite es de verdad: lo
 *   comparten todas las instancias y sobrevive a los arranques en frío.
 *
 *   Sin Upstash cae a un contador en la memoria del proceso. En serverless eso
 *   frena poco —cada instancia tiene el suyo— y es lo que había antes en todos
 *   los casos: frenaba a los usuarios legítimos de una misma red y no frenaba
 *   a nadie decidido a abusar.
 *
 * Es asíncrono a propósito: contar contra Redis es un viaje de ida y vuelta, y
 * fingir que no lo es obligaría a decidir sin saber.
 */
const cubos = new Map<string, { n: number; hasta: number }>();

/** Cuántos pedidos lleva esta instancia en la ventana. Suma uno y lo devuelve. */
function contarEnMemoria(id: string, ventanaMs: number): number {
  const ahora = Date.now();
  if (cubos.size > 5000) {
    cubos.forEach((b, k) => {
      if (ahora > b.hasta) cubos.delete(k);
    });
  }
  const b = cubos.get(id);
  if (!b || ahora > b.hasta) {
    cubos.set(id, { n: 1, hasta: ahora + ventanaMs });
    return 1;
  }
  b.n += 1;
  return b.n;
}

/**
 * De quién es el pedido.
 *
 * El nido antes que la IP, y ese orden es el arreglo: los operadores móviles
 * usan CGNAT, así que miles de personas salen por la misma IP pública. Con la
 * clave puesta en la IP, un link que se movía dentro de una misma red llegaba
 * al tope y los siguientes no podían ni entrar — el freno castigaba justo al
 * caso de éxito. Quien ya tiene nido se cuenta por su nido; la IP queda solo
 * para quien todavía no tiene ninguno.
 */
function quien(req: Request): string {
  const id = idDeRequest(req);
  if (id) return `n:${id}`;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  return `ip:${ip}`;
}

/**
 * Dos velocidades, y ahí está el truco.
 *
 * Casi nadie se acerca al límite: `/api/estado` permite 900 consultas en cinco
 * minutos y una persona normal hace treinta. Preguntarle a Redis en cada una de
 * esas consultas es pagar un comando por pedido en el endpoint más caliente de
 * la app para hacer cumplir un tope que nunca se toca.
 *
 * Entonces: primero cuenta en memoria, que es gratis. Recién cuando alguien
 * pasa un cuarto del límite —o sea, cuando empieza a parecerse a un abuso— se
 * confirma contra Redis, que es la única cuenta que vale entre instancias.
 * El usuario común no toca la base; el que se pasa, sí.
 */
const UMBRAL = 0.25;

export async function freno(
  req: Request,
  clave: string,
  limite: number,
  ventanaMs: number
): Promise<boolean> {
  const id = `freno:${clave}:${quien(req)}`;
  const enMemoria = contarEnMemoria(id, ventanaMs);
  if (enMemoria > limite) return false;
  if (enMemoria <= limite * UMBRAL) return true;

  const n = await store().contador(id, Math.ceil(ventanaMs / 1000));
  return n === null || n <= limite;
}

/**
 * Que el pedido haya nacido en esta misma app. Sec-Fetch-Site sirve tanto como
 * Origin y encima el JavaScript de la página no lo puede escribir; se aceptan
 * los dos porque hay navegadores que omiten Origin en POST del mismo origen.
 */
export function mismoOrigen(req: Request): boolean {
  const host = req.headers.get("host");
  if (!host) return false;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const site = req.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "same-site" || site === "none";
}

/** El nido de quien hace el pedido, o null si no tiene cookie válida. */
export async function nidoDeRequest(req: Request): Promise<Nido | null> {
  const id = idDeRequest(req);
  return id ? nido(id) : null;
}

export async function cuerpo(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
