// Dar de alta y de baja un dispositivo para los avisos.
//
// Una suscripción por DISPOSITIVO, no por persona: el mismo nido puede estar
// abierto en el teléfono y en la compu, y quien está esperando un ave quiere
// enterarse en el que tenga a mano.
//
// El GET dice si el push está configurado y con qué clave pública suscribirse.
// Sin claves contesta que no y el navegador ni pregunta: pedir un permiso que
// después no vas a poder usar es la peor forma de gastarlo, porque si te lo
// niegan una vez, volver a pedirlo es casi imposible.

import { cuerpo, error, freno, mismoOrigen, nidoDeRequest, ok } from "../../../lib/api";
import { clavePublica, guardarSuscripcion, hayPush, olvidarSuscripcion } from "../../../lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ hay: hayPush(), clave: clavePublica() });
}

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  if (!(await freno(req, "push", 60, 10 * 60_000))) return error("Demasiados pedidos.", 429);

  const yo = await nidoDeRequest(req);
  if (!yo) return error("Todavía no tenés nido.", 401);
  if (!hayPush()) return error("Los avisos no están configurados en este servidor.", 503);

  const b = await cuerpo(req);
  const s = b?.suscripcion;
  // Se valida la forma: sin endpoint y sin las dos claves no hay a quién ni
  // cómo cifrar, y guardarla sería llenar la base de cosas que nunca van a
  // servir.
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) {
    return error("Esa suscripción no tiene la forma correcta.", 400);
  }
  const guardada = await guardarSuscripcion(yo.id, {
    endpoint: String(s.endpoint),
    keys: { p256dh: String(s.keys.p256dh), auth: String(s.keys.auth) },
  });
  if (!guardada) return error("No se pudo guardar la suscripción.", 500);
  return ok({ ok: true });
}

export async function DELETE(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  const yo = await nidoDeRequest(req);
  if (!yo) return error("Todavía no tenés nido.", 401);
  const endpoint = String((await cuerpo(req))?.endpoint || "");
  if (endpoint) await olvidarSuscripcion(yo.id, endpoint);
  return ok({ ok: true });
}
