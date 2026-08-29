// De quién es este código de invitación.
//
// Existe para que la portada pueda ser estática. Antes resolvía el código en el
// servidor con `searchParams`, y eso obligaba a renderizarla en cada visita:
// justo la página que se comparte por WhatsApp —la que querés que aguante un
// pico— era la única que el CDN no podía guardar. Ahora la página sale del
// borde al instante y el saludo entra desde el navegador un momento después.
//
// Devuelve un nombre a quien ya tiene el código, que es algo que se comparte a
// propósito. Recorrer los códigos posibles para juntar apodos no lleva a ningún
// lado: no dan acceso a nada por sí solos, la amistad hay que aceptarla igual,
// y mandar exige estar en la bandada del otro. El freno de acá arriba está para
// que tampoco sirva de raspador.

import { error, freno, nidoDeRequest, ok } from "../../../lib/api";
import { idsAmigos, nidoPorCodigo } from "../../../lib/datos";
import { esCodigo, normalizarCodigo } from "../../../lib/codigo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await freno(req, "invitacion", 60, 10 * 60_000))) {
    return error("Demasiadas consultas.", 429);
  }
  const codigo = normalizarCodigo(new URL(req.url).searchParams.get("n"));
  if (!esCodigo(codigo)) return ok({ invita: null });

  const n = await nidoPorCodigo(codigo);

  // Y quién está mirando. Sin esto el botón de la portada le decía "Armar mi
  // nido" a alguien que ya tiene nido —le prometía un trámite que no
  // corresponde— y a alguien que ya era de esa bandada le ofrecía sumarla otra
  // vez. Va acá y no en una consulta aparte porque el navegador ya está
  // haciendo esta.
  const yo = await nidoDeRequest(req).catch(() => null);
  // Abrir el propio link es lo primero que hace cualquiera después de
  // compartirlo, para ver que ande. Antes la portada le contestaba con su
  // propio nombre —"Fulana te quiere mandar un loro"— y con un botón para
  // sumarse a sí misma.
  const sosVos = Boolean(yo && n && yo.id === n.id);
  const yaEsAmigo =
    sosVos || Boolean(yo && n && (await idsAmigos(yo.id)).includes(n.id));

  // Solo lo mínimo para saludar: nombre, ciudad y con qué ave se anuncia.
  return ok({
    invita: n ? { nombre: n.nombre, lugar: n.lugar, ave: n.ave } : null,
    // Del que mira, nada más que estos tres booleanos: ni su nombre ni su id.
    // Es un endpoint público y lo que se contesta de más nunca se recupera.
    tenesNido: Boolean(yo),
    yaEsAmigo,
    sosVos,
  });
}
