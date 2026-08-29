// ¿La base anda? Preguntándole a la base.
//
// Existe porque desde un teléfono todas las fallas de almacenamiento se ven
// igual: "el servidor no encuentra tu nido". El motivo real vive en los logs de
// una función serverless, que es el último lugar donde alguien va a mirar
// mientras prueba la app en la calle. Esto lo pone a un toque de distancia.
//
// Qué devuelve y qué no: el nombre del backend, si la ida y vuelta funcionó, el
// mensaje de error tal como lo manda el proveedor, y el ROL de la clave (no la
// clave). Nada de eso sirve para entrar a ningún lado, y sin eso no se puede
// diagnosticar nada desde afuera.

import { error, freno, nidoDeRequest, ok } from "../../../lib/api";
import { diagnosticar, rolDeClaveSupabase } from "../../../lib/store";
import { estadoDeBandada } from "../../../lib/datos";
import { probarGeocode } from "../../../lib/geocode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // La prueba escribe en la base, así que no puede quedar abierta a repetición.
  if (!(await freno(req, "salud", 20, 10 * 60_000))) {
    return error("Demasiadas consultas de salud. Esperá unos minutos.", 429);
  }

  const d = await diagnosticar();

  // Solo se informa QUÉ variables están presentes y con qué rol; nunca su valor.
  const claveSupabase =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_KEY ||
    "";

  // Avisos que no son sobre la base pero rompen igual, y que en una lista de
  // booleanos pasan de largo.
  const avisos: string[] = [];
  const secreto = process.env.LOROS_SECRET || "";
  // Un secreto corto se rompe por fuerza bruta sin conexión: alcanza con la
  // propia cookie de quien ataca —un par (id, firma) válido— para probar
  // millones de candidatos por segundo contra su propia máquina. 24 no es una
  // cifra mágica; es el piso por debajo del cual seguro está mal.
  if (secreto && secreto.length < 24) {
    avisos.push(
      `LOROS_SECRET es demasiado corto (${secreto.length} caracteres) y una palabra corta se adivina sin conexión, probando contra la cookie propia. Generá uno con \`openssl rand -base64 32\` (44 caracteres) y reemplazalo. Ojo: al cambiarlo, los nidos que ya existan quedan afuera.`
    );
  }
  if (!secreto) {
    avisos.push(
      "FALTA LOROS_SECRET. Sin esa variable las cookies de sesión se firman con el secreto de desarrollo, que está escrito en el código: cualquiera que lo lea puede firmarse una cookie y entrar al nido de otra persona. Generá uno con `openssl rand -base64 32`, cargalo y redeployá. Cambiarlo más adelante deja afuera a todos los nidos que ya existan, así que conviene antes de que la use alguien."
    );
  }
  if (!d.ok && d.almacenamiento === "supabase") {
    avisos.push("La base está configurada pero no responde: mirá `sugerencia`.");
  }

  // Y el estado de TU bandada, si estás con tu nido abierto. Sin esto, "no veo
  // a nadie" y "la base está rota" se ven idénticos desde afuera, y hay que
  // adivinar cuál de los dos es. Acá se ve de una: cuántas amistades hay
  // guardadas, cuántas quedaron en el formato viejo, y cuántas personas
  // aparecen en tu historial de loros (que es de dónde se reconstruyen).
  const yo = await nidoDeRequest(req).catch(() => null);
  const bandada = yo ? await estadoDeBandada(yo.id).catch(() => null) : null;
  if (bandada && bandada.guardadas === 0 && bandada.enHistorial > 0) {
    avisos.push(
      `Tu bandada figura vacía pero hay ${bandada.enHistorial} persona(s) en tu historial de loros. Se reconstruyen solas al abrir la app; si no vuelven, es porque la base no puede escribir (mirá \`sugerencia\`).`
    );
  }

  // Nominatim, preguntándole a Nominatim. Es lo único de la app que depende de
  // un servicio ajeno y gratuito, y cuando deja de andar el síntoma es un nido
  // sin nombre de lugar — que también es lo que se ve si de verdad no hay
  // nombre. Así se distinguen.
  const geo = await probarGeocode().catch(() => ({ ok: false, lugar: "", detalle: "no se pudo probar" }));
  if (!geo.ok) {
    avisos.push(
      `Los nidos van a quedar sin nombre de lugar: ${geo.detalle}. No rompe nada más —las distancias y los vuelos son exactos igual— pero en la bandada se ven coordenadas en vez de "Palermo, Argentina".`
    );
  }

  return ok({
    ...d,
    avisos,
    bandada,
    geocode: geo,
    variables: {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      claveSupabase: claveSupabase ? rolDeClaveSupabase(claveSupabase) : "falta",
      upstash: Boolean(
        (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
          (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
      ),
      LOROS_SECRET: Boolean(process.env.LOROS_SECRET),
    },
  });
}
