// El despertador: quien mira si aterrizó algo mientras no había nadie.
//
// Es la pieza que faltaba para que los avisos sirvan. El ave aterriza en un
// momento futuro —a veces dentro de días— y en serverless no hay ningún
// proceso esperando ese instante: la hora se sabe al despegar, pero alguien
// tiene que levantarse a mirar. Eso hace esto, llamado por `pg_cron` desde el
// mismo Postgres de la app (el SQL está en supabase.sql).
//
// Tres momentos merecen un aviso, y los tres pasan cuando quien lo recibe NO
// está mirando:
//
//   ATERRIZÓ. Llegó un ave y tiene algo escrito adentro.
//   VOLVIÓ.   El ave que soltaste llegó a tu nido, con la respuesta.
//   SE PERDIÓ. Ese loro no va a llegar nunca, y quien lo escribió merece
//              saberlo en vez de esperar para siempre.
//
// Lo que hace el otro con tu ave —soltarla, enjaularla, el puchero— NO se
// avisa desde acá: eso pasa cuando esa persona está usando la app, así que el
// aviso sale en ese mismo momento (app/api/loros/suerte).
//
// SEGURIDAD. Se protege con un secreto en la cabecera, no por lo que revela
// —no devuelve datos de nadie— sino porque manda notificaciones: sin freno,
// cualquiera podría llamarlo en bucle. Los avisos igual no se duplicarían
// (cada uno pide su turno único), pero el trabajo sí.

import { error, ok } from "../../../lib/api";
import { formatearDuracion } from "../../../lib/geo";
import {
  loritosSinLeer,
  idsPendientes,
  loro as leerLoro,
  nido,
  olvidarPendiente,
  vueloTerminado,
} from "../../../lib/datos";
import { empujarUnaVez, hayPush } from "../../../lib/push";
import { avisoAterrizaje, avisoExtravio, avisoVuelta } from "../../../lib/avisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const esperado = process.env.LOROS_CRON_SECRET || "";
  // Sin secreto configurado el endpoint queda cerrado. Es lo contrario de lo
  // cómodo y es lo correcto: un despertador abierto es un botón de mandar
  // notificaciones que cualquiera puede apretar.
  if (!esperado) return false;
  const dado =
    req.headers.get("authorization")?.replace(/^Bearer /i, "") ||
    req.headers.get("x-loros-cron") ||
    new URL(req.url).searchParams.get("clave") ||
    "";
  return dado === esperado;
}

export async function GET(req: Request) {
  if (!autorizado(req)) return error("No.", 401);
  if (!hayPush()) return ok({ ok: true, nota: "El push no está configurado.", avisados: 0 });

  const ahora = Date.now();
  let avisados = 0;
  let cerrados = 0;

  for (const id of await idsPendientes()) {
    const l = await leerLoro(id);
    // Un vuelo cuyo loro ya no existe no tiene nada que avisar.
    if (!l) {
      await olvidarPendiente(id);
      cerrados++;
      continue;
    }
    const perdido = l.extravio !== null && ahora >= l.extravio;

    if (perdido) {
      const de = await nido(l.de);
      const para = await nido(l.para);
      if (
        de &&
        (await empujarUnaVez(
          l.de,
          `perdido:${l.id}`,
          {
            ...avisoExtravio({
              idLoro: l.id,
              quien: para?.nombre || "alguien",
              ave: l.ave,
              motivo: l.motivo || "No llegó, y no va a llegar.",
              mio: true,
            }),
            insignia: await loritosSinLeer(l.de, ahora),
          }
        ))
      ) {
        avisados++;
      }
    } else if (ahora >= l.llegada) {
      // Aterrizó: le avisa a quien lo esperaba. El texto NO va en el aviso, ni
      // siquiera un pedazo: abrirlo es la ceremonia de la app y adelantarlo en
      // la pantalla de bloqueo la arruina.
      const para = await nido(l.para);
      const de = await nido(l.de);
      if (
        para &&
        (await empujarUnaVez(
          l.para,
          `llegada:${l.id}`,
          {
            ...avisoAterrizaje({ idLoro: l.id, quien: de?.nombre || "Alguien", ave: l.ave }),
            insignia: await loritosSinLeer(l.para, ahora),
          }
        ))
      ) {
        avisados++;
      }

      // Y si volvió, le avisa a quien lo había mandado.
      if (l.suerte === "soltado" && l.regreso && ahora >= l.regreso) {
        if (
          await empujarUnaVez(
            l.de,
            `vuelta:${l.id}`,
            {
              ...avisoVuelta({
                idLoro: l.id,
                quien: para?.nombre || "Alguien",
                ave: l.ave,
                conRespuesta: Boolean(l.respuesta),
              }),
              insignia: await loritosSinLeer(l.de, ahora),
            }
          )
        ) {
          avisados++;
        }
      }
    }

    if (vueloTerminado(l, ahora)) {
      await olvidarPendiente(id);
      cerrados++;
    }
  }

  return ok({ ok: true, avisados, cerrados, revisados: (await idsPendientes()).length });
}
