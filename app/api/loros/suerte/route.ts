// Qué hace el destinatario con el ave, después de leer el mensaje.
//
// El vuelo termina cuando llega el mensaje, pero el ave sigue posada del otro
// lado. Soltarla la devuelve volando —y ahí va la respuesta, porque soltar el
// ave ES contestar—; enjaularla o mandarla al puchero significa que ese loro no
// vuelve más. La decisión es de quien lo recibió, se toma una sola vez y no se
// puede desdecir.

import { cuerpo, error, freno, mismoOrigen, nidoDeRequest, ok } from "../../../../lib/api";
import { decidirSuerte, esSuerte, nido } from "../../../../lib/datos";
import { verLoro } from "../../../../lib/vista";
import { empujarUnaVez } from "../../../../lib/push";
import { AVES } from "../../../../lib/aves";
import type { Nido } from "../../../../lib/datos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  if (!(await freno(req, "suerte", 200, 10 * 60_000))) return error("Demasiados pedidos.", 429);

  const yo = await nidoDeRequest(req);
  if (!yo) return error("Todavía no tenés nido.", 401);

  const b = await cuerpo(req);
  const suerte = b?.suerte;
  if (!esSuerte(suerte)) return error("No sé qué hacer con esa ave.", 400);

  // El texto solo viaja si el ave viaja. `decidirSuerte` lo recorta al máximo
  // del ave y lo ignora si no la soltó.
  const l = await decidirSuerte(String(b?.id || ""), yo.id, suerte, String(b?.texto ?? ""));
  if (!l) return error("Esa ave no está posada en tu ventana.", 404);

  const otro = await nido(l.de);

  // El aviso de la suerte sale ACÁ y no del despertador: esto pasa cuando esta
  // persona está usando la app, así que el momento ya es ahora. El despertador
  // solo se ocupa de lo que ocurre sin nadie mirando.
  //
  // Y no espera: quien decidió no tiene por qué mirar una rueda girando
  // mientras se le habla al teléfono de otro.
  const ave = AVES[l.ave].nombre.toLowerCase();
  const texto =
    suerte === "soltado"
      ? l.respuesta
        ? `${yo.nombre} lo soltó, y vuelve con una respuesta.`
        : `${yo.nombre} lo soltó. Vuelve a tu nido.`
      : suerte === "enjaulado"
        ? `${yo.nombre} se quedó con tu ${ave}. Ese no vuelve más.`
        : `Tu ${ave} no volvió de lo de ${yo.nombre}. Mejor no preguntes.`;
  void empujarUnaVez(l.de, `suerte:${l.id}`, {
    titulo: `Novedades de tu ${ave}`,
    cuerpo: texto,
    tag: `loro:${l.id}`,
  }).catch(() => {});
  const nidos = new Map<string, Nido>([[yo.id, yo]]);
  if (otro) nidos.set(otro.id, otro);
  return ok({ ok: true, loro: verLoro(l, yo.id, nidos, Date.now()) });
}
