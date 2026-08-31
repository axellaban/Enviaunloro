// Lo que está cruzando el mapa ahora mismo, de cualquiera.
//
// Es el respaldo de la pestaña "Del resto". Devuelve vuelos anónimos: especie,
// horarios y las dos puntas corridas 25 km, sin nombres, sin ids de nido y sin
// una sola letra del mensaje. Las reglas de qué sale y qué no viven en
// lib/vista.ts (`verVueloMundial`), igual que las de la bandada.
//
// Y "del resto" quiere decir del resto: los vuelos de quien pregunta NO salen
// acá. Los tuyos ya los ves en la otra pestaña, exactos; repetirlos acá
// corridos veinte kilómetros solo servía para que parecieran un error.
//
// Pide nido igual que el resto de la app. No porque haga falta para armar la
// respuesta —es anónima— sino porque una vista del mundo abierta a internet es
// un raspador esperando: cualquiera podría consultarla en bucle y juntar el
// mapa de dónde vive la gente, aunque cada punto esté corrido.

import { error, freno, nidoDeRequest, ok } from "../../../lib/api";
import { enElAire, guardarMundo, mundoCacheado, nidos, type EnLaFoto } from "../../../lib/datos";
import { apareceEnElMundo, verVueloMundial } from "../../../lib/vista";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tope de vuelos por respuesta. Más que esto no se lee en un mapa. */
const MAXIMO = 80;

export async function GET(req: Request) {
  if (!(await freno(req, "mundo", 400, 5 * 60_000))) {
    return error("Estás consultando demasiado seguido.", 429);
  }
  const yo = await nidoDeRequest(req);
  if (!yo) return error("Todavía no tenés nido.", 401);

  const ahora = Date.now();
  // La foto de hace un momento sirve igual: la parte cara —la lista global, los
  // loros, los nidos de las dos puntas— es la misma para todos, y las aves se
  // mueven solas en el navegador entre una consulta y la siguiente.
  let foto = mundoCacheado(ahora);

  if (!foto) {
    const enVuelo = await enElAire(ahora);

    // Quién aceptó aparecer. Todos los nidos involucrados se leen de una sola
    // vez: preguntando de a uno adentro del bucle, un mapa con cien vuelos son
    // doscientas idas a la base, en serie, en cada consulta.
    const puntas = await nidos(enVuelo.flatMap((l) => [l.de, l.para]));

    const enLaFoto: EnLaFoto[] = [];
    for (const l of enVuelo) {
      // Las dos puntas tienen que aceptar: el arco muestra las dos.
      if (!apareceEnElMundo(puntas.get(l.de))) continue;
      if (!apareceEnElMundo(puntas.get(l.para))) continue;
      enLaFoto.push({ de: l.de, para: l.para, vista: verVueloMundial(l, ahora) });
      if (enLaFoto.length >= MAXIMO) break;
    }
    guardarMundo(enLaFoto, ahora);
    foto = { ahora, vuelos: enLaFoto };
  }

  // Y acá sale lo tuyo. La pestaña se llama "Del resto" y hasta hace poco te
  // devolvía también tus propios vuelos —corridos 25 km como los de cualquier
  // desconocido—, así que en el mapa se veía tu ave saliendo de un lugar donde
  // no estás, a veinte kilómetros de tu propio nido, que ahí al lado se dibuja
  // exacto. Parecía un error y era uno: ese corrimiento existe para que no te
  // ubiquen los demás, y contra vos mismo no protege de nada.
  //
  // Se filtra acá y no al armar la foto para no romper la caché: la parte cara
  // se calcula una vez para todos y lo único que cambia por persona es esta
  // resta. Los ids no salen: se quedan del lado de adentro.
  const vuelos = foto.vuelos
    .filter((v) => v.de !== yo.id && v.para !== yo.id)
    .map((v) => v.vista);
  return ok({ ahora: foto.ahora, vuelos });
}
