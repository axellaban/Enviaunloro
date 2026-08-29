// Tu nido: crearlo, actualizarlo, abandonarlo.

import { cuerpo, error, freno, mismoOrigen, nidoDeRequest, ok } from "../../../lib/api";
import { cookieBorrada, cookieDeSesion } from "../../../lib/sesion";
import {
  aveValida,
  crearNido,
  guardarNido,
  nombreValido,
  olvidarMundo,
  puntoDe,
} from "../../../lib/datos";
import { verNido } from "../../../lib/vista";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const yo = await nidoDeRequest(req);
  return ok({ yo: yo ? verNido(yo) : null });
}

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  // 200 y no 20: quien todavía no tiene nido se cuenta por IP, y en el celular
  // una IP son miles de personas (CGNAT). Con el número viejo, un link que se
  // movía dentro de una misma red dejaba afuera a los siguientes — el freno
  // castigaba exactamente el caso de éxito.
  if (!(await freno(req, "nido", 200, 10 * 60_000))) {
    return error("Demasiados nidos en poco tiempo. Esperá un momento.", 429);
  }

  const b = await cuerpo(req);
  const nombre = nombreValido(b?.nombre);
  if (!nombre) return error("Poné un nombre para tu nido.");

  const existente = await nidoDeRequest(req);
  const ave = aveValida(b?.ave, existente?.ave ?? "loro");

  // Ya tiene nido: es una edición de perfil, no un alta.
  if (existente) {
    const punto = puntoDe(b);
    const actualizado = {
      ...existente,
      nombre,
      ave,
      visto: Date.now(),
      // Aparecer o no en la vista del resto. Solo se toca si vino en el
      // cuerpo: este endpoint también lo usa el panel para guardar el nombre,
      // y ahí no manda `publico`. Sin esta comprobación, cambiarse el nombre
      // te volvía a meter en el mapa del mundo sin que lo pidieras.
      ...(typeof b?.publico === "boolean" ? { publico: b.publico } : {}),
      ...(punto ? { lat: punto.lat, lng: punto.lng } : {}),
    };
    await guardarNido(actualizado);
    // Si cambió si aparece o no en la vista del resto, la foto guardada de esa
    // vista ya no sirve: una decisión de privacidad no espera a que venza nada.
    if (typeof b?.publico === "boolean" && b.publico !== (existente.publico !== false)) {
      olvidarMundo();
    }
    return ok({ ok: true, yo: verNido(actualizado, actualizado), codigo: existente.codigo });
  }

  const punto = puntoDe(b);
  if (!punto) {
    return error(
      "Sin ubicación no hay vuelo: la app necesita saber desde dónde despega tu loro."
    );
  }

  const creado = await crearNido({ nombre, ave, punto });
  // El código va acá y no solo en /api/estado: con esto la app entra al mapa
  // con todo lo que necesita, sin depender de una segunda consulta.
  return ok(
    { ok: true, yo: verNido(creado, creado), codigo: creado.codigo },
    { "Set-Cookie": cookieDeSesion(creado.id) }
  );
}

/** Soltar el nido: borra la cookie. Los datos quedan, pero ya no son de nadie. */
export async function DELETE(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  return ok({ ok: true }, { "Set-Cookie": cookieBorrada() });
}
