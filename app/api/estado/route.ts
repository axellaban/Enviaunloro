// La foto completa: quién sos, tu bandada y todos los loros que hay en el aire.
//
// Es el único endpoint que consulta la app mientras está abierta. El vuelo NO
// se transmite posición por posición: se manda cuándo salió cada loro y cuándo
// llega, y el navegador calcula el resto cuadro a cuadro. Por eso el ave se
// mueve suave aunque esto se consulte cada varios segundos.
//
// `ahora` viene del servidor a propósito: si el reloj del celular está corrido
// —y suele estarlo— el cliente lo compensa en vez de mostrar un ETA falso.

import { error, freno, nidoDeRequest, ok } from "../../../lib/api";
import {
  amigos,
  asegurarLugar,
  atenderVecina,
  buzon,
  escalaGlobal,
  vecinaTienePendiente,
  type Nido,
} from "../../../lib/datos";
import { verLoro, verNido } from "../../../lib/vista";
import { store } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await freno(req, "estado", 900, 5 * 60_000))) {
    return error("Estás consultando demasiado seguido.", 429);
  }

  const yo = await nidoDeRequest(req);
  // `almacenamiento` no es telemetría: es lo único que distingue "se borró tu
  // cookie" de "el deploy no tiene base y cada instancia arranca vacía", que
  // desde el navegador se ven exactamente igual.
  if (!yo) {
    return ok({
      yo: null,
      ahora: Date.now(),
      escala: escalaGlobal(),
      almacenamiento: store().nombre,
      amigos: [],
      loros: [],
    });
  }

  // Si al crear el nido no llegó a resolverse la ciudad —en serverless la
  // función se congela apenas responde— se vuelve a intentar acá.
  asegurarLugar(yo);

  const ahora = Date.now();
  // Las dos consultas que hacen falta siempre, en paralelo.
  const [bandada, propio] = await Promise.all([amigos(yo.id), buzon(yo.id)]);

  // Doña Cotorra contesta acá: sin worker ni cron, cuando mirás ya está. Pero
  // solo se la llama si el buzón que acabamos de leer dice que hay algo sin
  // contestar — si no, son tres viajes a la base para descubrir que no hay
  // nada que hacer.
  let loros = propio;
  if (vecinaTienePendiente(yo.id, propio, ahora)) {
    await atenderVecina(yo.id);
    loros = await buzon(yo.id);
  }

  const nidos = new Map<string, Nido>([[yo.id, yo]]);
  for (const a of bandada) nidos.set(a.id, a);
  const vistas = loros.map((l) => verLoro(l, yo.id, nidos, ahora));

  return ok({
    ahora,
    escala: escalaGlobal(),
    almacenamiento: store().nombre,
    yo: verNido(yo, yo),
    codigo: yo.codigo,
    amigos: bandada.map((a) => verNido(a, yo)),
    loros: vistas,
  });
}
