// Destrabar el lorito: el ave se levanta de la barra y sale para tu nido.
//
// Va aparte del alta del nido a propósito. Podría ir adentro de /api/nido y
// ahorrar un viaje, pero ahí metería una escritura más —y una que puede
// fallar— en el único camino que no se puede romper nunca: crear el nido. Si
// esto falla, la persona igual tiene su nido y el link sigue en su historial.
//
// Lo llama la página del nido cuando aparece el nido propio, que es el mismo
// mecanismo con el que ya se suma a alguien por ?n=. Sirve para los dos casos
// sin distinguirlos: recién armado o de hace un año, lo único que hace falta
// es tener adónde mandar el ave.

import { cuerpo, error, freno, mismoOrigen, nidoDeRequest, ok } from "../../../../lib/api";
import { reclamarConvite } from "../../../../lib/convite";
import { verLoro } from "../../../../lib/vista";
import { empujarUnaVez } from "../../../../lib/push";
import { avisoBandada } from "../../../../lib/avisos";
import { avesEnElAire, nido, type Nido } from "../../../../lib/datos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  if (!(await freno(req, "reclamar", 40, 10 * 60_000))) {
    return error("Demasiados intentos. Esperá un momento.", 429);
  }

  const yo = await nidoDeRequest(req);
  if (!yo) return error("Todavía no tenés nido.", 401);

  const llave = String((await cuerpo(req))?.c || "");
  if (!llave) return error("Falta el lorito.");

  const r = await reclamarConvite(llave, yo);
  if (!r.ok) return error(r.error);

  // Y se le avisa a quien lo mandó, acá y no en el despertador: esto pasa
  // cuando la OTRA persona está usando la app, así que el momento es ahora. Es
  // el aviso que más se merece de toda la app —alguien a quien invitaste acaba
  // de armar su nido— y quien lo mandó puede tener la app cerrada hace días,
  // que es exactamente para lo que existe el push.
  void empujarUnaVez(
    r.loro.de,
    `convite:${r.convite.id}`,
    {
      ...avisoBandada({
        idLoro: r.loro.id,
        quien: yo.nombre,
        ave: r.loro.ave,
        falta: Math.max(0, r.loro.llegada - Date.now()),
      }),
      insignia: await avesEnElAire(r.loro.de, Date.now()),
    }
  ).catch(() => {});

  // Se devuelve el vuelo ya visto desde este lado —sin el texto, que todavía
  // viaja— para que la pantalla pueda contar que el ave salió y cuánto falta,
  // sin esperar a la próxima consulta de estado.
  const de = await nido(r.loro.de);
  const nidos = new Map<string, Nido>([[yo.id, yo]]);
  if (de) nidos.set(de.id, de);
  return ok({
    ok: true,
    de: r.deNombre,
    loro: verLoro(r.loro, yo.id, nidos, Date.now()),
  });
}
