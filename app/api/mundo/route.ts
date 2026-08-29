// Lo que está cruzando el mapa ahora mismo, de cualquiera.
//
// Es el respaldo de la pestaña "Del resto". Devuelve vuelos anónimos: especie,
// horarios y las dos puntas corridas 25 km, sin nombres, sin ids de nido y sin
// una sola letra del mensaje. Las reglas de qué sale y qué no viven en
// lib/vista.ts (`verVueloMundial`), igual que las de la bandada.
//
// Pide nido igual que el resto de la app. No porque haga falta para armar la
// respuesta —es anónima— sino porque una vista del mundo abierta a internet es
// un raspador esperando: cualquiera podría consultarla en bucle y juntar el
// mapa de dónde vive la gente, aunque cada punto esté corrido.

import { error, freno, nidoDeRequest, ok } from "../../../lib/api";
import { enElAire, nidos } from "../../../lib/datos";
import { apareceEnElMundo, verVueloMundial } from "../../../lib/vista";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tope de vuelos por respuesta. Más que esto no se lee en un mapa. */
const MAXIMO = 80;

export async function GET(req: Request) {
  if (!freno(req, "mundo", 400, 5 * 60_000)) {
    return error("Estás consultando demasiado seguido.", 429);
  }
  const yo = await nidoDeRequest(req);
  if (!yo) return error("Todavía no tenés nido.", 401);

  const ahora = Date.now();
  const enVuelo = await enElAire(ahora);

  // Quién aceptó aparecer. Todos los nidos involucrados se leen de una sola
  // vez: preguntando de a uno adentro del bucle, un mapa con cien vuelos son
  // doscientas idas a la base, en serie, en cada consulta.
  const puntas = await nidos(enVuelo.flatMap((l) => [l.de, l.para]));

  const vuelos = [];
  for (const l of enVuelo) {
    // Las dos puntas tienen que aceptar: el arco muestra las dos.
    if (!apareceEnElMundo(puntas.get(l.de))) continue;
    if (!apareceEnElMundo(puntas.get(l.para))) continue;
    vuelos.push(verVueloMundial(l, ahora));
    if (vuelos.length >= MAXIMO) break;
  }

  return ok({ ahora, vuelos });
}
