// El lorito de convite: soltarlo, y contarle a quien abre el link qué le llegó.
//
// El GET es PÚBLICO y no dice el texto. Esa es la regla número uno de toda la
// app —un mensaje que todavía vuela no sale del servidor— y acá pesa el doble:
// si el texto viajara, el link sería el mensaje y armar el nido no destrabaría
// nada. Lo que sí cuenta es todo lo demás, que es lo que da ganas de abrirlo:
// quién lo mandó, con qué ave, en qué barrio está esperando y cuántos
// copetines lleva encima.
//
// Tampoco salen las coordenadas de la cervecería. Están a pocos kilómetros del
// nido de quien lo mandó, así que darlas sería contar dónde vive esa persona a
// cualquiera que tenga el link. Va el nombre del barrio, que es la misma
// precisión que ya da /api/invitacion.

import { cuerpo, error, freno, mismoOrigen, nidoDeRequest, ok } from "../../../lib/api";
import { aveValida } from "../../../lib/datos";
import { borrachera, loQueEstaHaciendo } from "../../../lib/cerveceria";
import { convite, crearConvite } from "../../../lib/convite";
import { escalaGlobal } from "../../../lib/datos";
import { nido } from "../../../lib/datos";
import { verConvite } from "../../../lib/vista";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await freno(req, "convite", 60, 10 * 60_000))) {
    return error("Demasiadas consultas.", 429);
  }
  const llave = String(new URL(req.url).searchParams.get("c") || "");
  if (!llave) return ok({ convite: null });

  const c = await convite(llave);
  if (!c) return ok({ convite: null });

  const de = await nido(c.de);
  if (!de) return ok({ convite: null });

  const yo = await nidoDeRequest(req).catch(() => null);
  const ahora = Date.now();
  const enLaBarra = Math.max(0, ahora - c.llegadaPosada);
  const b = borrachera(c.reclamado ? 0 : enLaBarra, escalaGlobal());

  return ok({
    convite: {
      ave: c.ave,
      // Cómo se llama quien lo mandó y a quién se lo escribió. Nada más de
      // ninguno de los dos: es un endpoint público.
      de: de.nombre,
      lugar: de.lugar,
      para: c.para,
      salida: c.salida,
      llegadaPosada: c.llegadaPosada,
      // Dónde está esperando, con la precisión de un barrio y no de un punto.
      barrio: c.lugar,
      enLaBarra: c.reclamado ? 0 : enLaBarra,
      copetines: b.copetines,
      haciendo: c.reclamado ? "" : loQueEstaHaciendo(b, c.id, ahora),
      // Si ya salió, no hay nada que destrabar: el link llegó tarde.
      yaSalio: Boolean(c.reclamado),
    },
    // Del que mira, lo mínimo para que el botón no mienta. Igual que en
    // /api/invitacion: dos booleanos y nada más.
    tenesNido: Boolean(yo),
    sosVos: Boolean(yo && yo.id === c.de),
    // Y si ya lo reclamó esta misma persona, el botón la lleva a su nido.
    esTuyo: Boolean(yo && c.reclamado?.nido === yo.id),
  });
}

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  if (!(await freno(req, "convite-nuevo", 30, 10 * 60_000))) {
    return error("Muchos loritos en poco tiempo. Esperá un momento.", 429);
  }

  const yo = await nidoDeRequest(req);
  if (!yo) return error("Todavía no tenés nido.", 401);

  const b = await cuerpo(req);
  const r = await crearConvite({
    de: yo,
    ave: aveValida(b?.ave, yo.ave),
    texto: String(b?.texto ?? ""),
    para: String(b?.para ?? ""),
  });
  if (!r.ok) return error(r.error);

  return ok({ ok: true, convite: verConvite(r.convite, yo) });
}
