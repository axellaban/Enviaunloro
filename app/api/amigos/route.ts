// Sumar a alguien a tu bandada con su código de nido, y sacarlo.

import { cuerpo, error, freno, mismoOrigen, nidoDeRequest, ok } from "../../../lib/api";
import { desemparejar, emparejar, idsAmigos, nidoPorCodigo } from "../../../lib/datos";
import { esCodigo, normalizarCodigo } from "../../../lib/codigo";
import { verNido } from "../../../lib/vista";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  // Sin freno, un código se puede probar a fuerza bruta hasta caer en el nido
  // de un desconocido.
  if (!(await freno(req, "amigos", 20, 10 * 60_000))) {
    return error("Probaste demasiados códigos. Esperá unos minutos.", 429);
  }

  const yo = await nidoDeRequest(req);
  if (!yo) return error("Todavía no tenés nido.", 401);

  const codigo = normalizarCodigo((await cuerpo(req))?.codigo);
  if (!esCodigo(codigo)) return error("Ese código no tiene la forma correcta.");
  // Normalizado de los dos lados: el propio puede estar guardado en minúscula
  // (los nuevos) o en mayúscula (los de antes).
  if (codigo === normalizarCodigo(yo.codigo)) return error("Ese es tu propio código.");

  const otro = await nidoPorCodigo(codigo);
  if (!otro) return error("No hay ningún nido con ese código.");

  await emparejar(yo.id, otro.id);
  return ok({ ok: true, amigo: verNido(otro, yo) });
}

/** Sacar a alguien de la bandada. Corta de los dos lados. */
export async function DELETE(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  if (!(await freno(req, "amigos-baja", 40, 10 * 60_000))) {
    return error("Demasiados pedidos. Esperá un momento.", 429);
  }

  const yo = await nidoDeRequest(req);
  if (!yo) return error("Todavía no tenés nido.", 401);

  const otro = String((await cuerpo(req))?.id || "");
  if (!otro) return error("Falta a quién sacar.");
  if (otro === yo.id) return error("No te podés sacar a vos mismo.");

  // Solo se puede sacar a alguien de la PROPIA bandada. Sin esto, cualquiera
  // con un id ajeno podría cortar amistades de otras dos personas: los ids no
  // son secretos —viajan en cada consulta de estado— y lo único que separa
  // "sacar al mío" de "romper el de otro" es este chequeo.
  if (!(await idsAmigos(yo.id)).includes(otro)) {
    return error("Esa persona no está en tu bandada.", 404);
  }

  await desemparejar(yo.id, otro);
  return ok({ ok: true });
}
