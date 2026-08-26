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

import { error, freno, ok } from "../../../lib/api";
import { diagnosticar, rolDeClaveSupabase } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // La prueba escribe en la base, así que no puede quedar abierta a repetición.
  if (!freno(req, "salud", 20, 10 * 60_000)) {
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

  return ok({
    ...d,
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
