// Solicitar la abducción de tu propia ave, en pleno vuelo.
//
// Es la contraparte exacta de /api/loros/suerte, y las dos juntas cierran una
// simetría que faltaba: lo que se hace con un loro que YA LLEGÓ lo decide quien
// lo recibió, y lo que se hace con uno que todavía está en el aire lo decide
// quien lo soltó. Hasta acá la segunda mitad no existía — un ave soltada era
// irreversible del lado de quien la mandó, y lo único que quedaba era mirarla
// cruzar el mapa.
//
// No es un "deshacer" y la interfaz no lo disfraza de eso: el ave no vuelve, el
// mensaje no se recupera, y del otro lado se ve pasar la nave.

import { cuerpo, error, freno, mismoOrigen, nidoDeRequest, ok } from "../../../../lib/api";
import { abducirLoro, avesEnElAire, nido } from "../../../../lib/datos";
import { verLoro } from "../../../../lib/vista";
import { empujarUnaVez } from "../../../../lib/push";
import { avisoAbduccion } from "../../../../lib/avisos";
import type { Nido } from "../../../../lib/datos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  if (!(await freno(req, "abducir", 60, 10 * 60_000))) return error("Demasiados pedidos.", 429);

  const yo = await nidoDeRequest(req);
  if (!yo) return error("Todavía no tenés nido.", 401);

  const l = await abducirLoro(String((await cuerpo(req))?.id || ""), yo.id);
  // Un solo mensaje para los tres motivos —no es tuyo, ya aterrizó, ya se
  // perdió— y a propósito: el detalle solo le serviría a alguien probando ids
  // ajenos para averiguar cuáles existen.
  if (!l) return error("Esa ave ya no está en el aire.", 404);

  // Del otro lado había alguien a quien ya se le avisó que venía un loro.
  // Hacerlo desaparecer en silencio lo deja esperando algo que no llega nunca,
  // que es exactamente lo que la app evita hasta con los que se pierden solos.
  //
  // El texto no va, igual que en todos los demás: el mensaje se lo llevó la
  // nave y nadie de este lado lo va a leer.
  void empujarUnaVez(
    l.para,
    `abduccion:${l.id}`,
    {
      ...avisoAbduccion({ idLoro: l.id, quien: yo.nombre, ave: l.ave }),
      insignia: await avesEnElAire(l.para, Date.now()),
    }
  ).catch(() => {});

  const para = await nido(l.para);
  const nidos = new Map<string, Nido>([[yo.id, yo]]);
  if (para) nidos.set(para.id, para);
  return ok({ ok: true, loro: verLoro(l, yo.id, nidos, Date.now()) });
}
