// Soltar un loro.

import { cuerpo, error, freno, mismoOrigen, nidoDeRequest, ok } from "../../../lib/api";
import { aveValida, enviarLoro, idsAmigos, nido } from "../../../lib/datos";
import { verLoro } from "../../../lib/vista";
import { empujarUnaVez } from "../../../lib/push";
import { avisoDespegue } from "../../../lib/avisos";
import type { Nido } from "../../../lib/datos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  if (!(await freno(req, "enviar", 40, 10 * 60_000))) {
    return error("Se te cansaron las aves. Probá de nuevo en un rato.", 429);
  }

  const yo = await nidoDeRequest(req);
  if (!yo) return error("Todavía no tenés nido.", 401);

  const b = await cuerpo(req);
  const paraId = String(b?.para || "");

  // Solo a tu bandada: si no, el id de un nido ajeno alcanzaría para escribirle
  // a cualquiera.
  if (!(await idsAmigos(yo.id)).includes(paraId)) {
    return error("Ese nido no está en tu bandada.", 403);
  }
  const para = await nido(paraId);
  if (!para) return error("Ese nido ya no existe.", 404);

  const r = await enviarLoro({
    de: yo,
    para,
    ave: aveValida(b?.ave, yo.ave),
    texto: String(b?.texto ?? ""),
    pollera: b?.pollera === true,
  });
  if (!r.ok) return error(r.error);

  // "Viene un loro, llega en 4 h", a quien lo va a recibir.
  //
  // Es la mitad del producto —saber que algo está en camino ES el producto, y
  // sin este aviso un guacamayo de un día no se distingue de no haber recibido
  // nada— y hasta ahora solo salía si esa persona tenía la app ABIERTA en el
  // mismo momento del despegue, que es la única circunstancia en la que no
  // hacía falta avisarle. El despertador cubre el aterrizaje, la vuelta y el
  // extravío; el despegue no lo cubría nadie, porque no es un momento futuro
  // que haya que ir a mirar: es ahora, acá.
  //
  // El texto no va, ni un pedazo, igual que en todos los demás.
  // El texto sale de lib/avisos.ts, que es el único lugar donde vive: la
  // pestaña abierta arma el mismo aviso con la misma función.
  void empujarUnaVez(
    para.id,
    `despegue:${r.loro.id}`,
    avisoDespegue({
      idLoro: r.loro.id,
      quien: yo.nombre,
      ave: r.loro.ave,
      pollera: Boolean(r.loro.pollera),
      falta: Math.max(0, r.loro.llegada - Date.now()),
    })
  ).catch(() => {});

  const nidos = new Map<string, Nido>([
    [yo.id, yo],
    [para.id, para],
  ]);
  return ok({ ok: true, loro: verLoro(r.loro, yo.id, nidos, Date.now()) });
}
