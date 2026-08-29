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

import { error, freno, ok } from "../../../lib/api";
import { nidoPorCodigo } from "../../../lib/datos";
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
  // Solo lo mínimo para saludar: nombre, ciudad y con qué ave se anuncia.
  return ok({ invita: n ? { nombre: n.nombre, lugar: n.lugar, ave: n.ave } : null });
}
