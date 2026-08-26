// Crear las tablas sin salir de la app.
//
// Levantar Supabase desde Vercel deja un Postgres vacío: las tablas no las crea
// ninguna integración, y entrar al SQL Editor a pegarlas es el paso donde se
// traba todo el mundo. Esto lo hace por vos.
//
// Por qué es seguro dejarlo abierto, que es la pregunta obvia:
//
//   - Lo único que puede hacer es CREATE TABLE IF NOT EXISTS de dos tablas con
//     nombre fijo, su índice, y prender RLS. No lee, no escribe, no borra, no
//     toca nada más. En el peor caso alguien crea las tablas que la app
//     necesita igual.
//   - Se apaga solo: si el almacenamiento ya responde, contesta que no hay nada
//     que hacer y no se conecta a ningún lado.
//   - Pide `?confirmar=si`, así ningún prefetch ni robot lo dispara de paso, y
//     tiene freno por IP.
//
// Se conecta con la cadena de Postgres que inyecta la integración de Vercel
// (POSTGRES_URL). Es la única parte de la app que NO habla por PostgREST, y no
// puede ser de otra forma: PostgREST no ejecuta DDL.

import postgres from "postgres";
import { error, freno, ok } from "../../../lib/api";
import { ESQUEMA } from "../../../lib/esquema";
import { diagnosticar } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cadena(): string | null {
  // La directa antes que la del pooler: el pooler de transacciones no es el
  // lugar para correr DDL.
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    null
  );
}

export async function GET(req: Request) {
  if (!freno(req, "instalar", 10, 10 * 60_000)) {
    return error("Demasiados intentos. Esperá unos minutos.", 429);
  }
  if (new URL(req.url).searchParams.get("confirmar") !== "si") {
    return ok({
      ok: false,
      mensaje:
        "Esto crea las tablas que la app necesita en tu base. Para confirmarlo, volvé a abrir esta dirección agregándole ?confirmar=si al final.",
    });
  }

  const antes = await diagnosticar();
  if (antes.ok) {
    return ok({ ok: true, mensaje: "Las tablas ya estaban. No se tocó nada.", diagnostico: antes });
  }

  const url = cadena();
  if (!url) {
    return ok({
      ok: false,
      mensaje:
        "No hay cadena de conexión a Postgres en este deploy (POSTGRES_URL). Si levantaste Supabase desde Vercel debería estar; si no, corré supabase.sql a mano en el SQL Editor de Supabase.",
      diagnostico: antes,
    });
  }

  // En local no hay TLS; contra Supabase siempre.
  const local = /localhost|127\.0\.0\.1|sslmode=disable/.test(url);
  const sql = postgres(url, {
    ssl: local ? false : "require",
    // Los poolers de transacciones no soportan sentencias preparadas.
    prepare: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    await sql.unsafe(ESQUEMA);
    // PostgREST sirve desde una copia en memoria del esquema. Sin este aviso
    // puede seguir contestando "no encuentro la tabla" un rato largo después
    // de que la tabla exista — que es exactamente el error PGRST205.
    await sql.unsafe("notify pgrst, 'reload schema'");
  } catch (err: any) {
    return ok({
      ok: false,
      mensaje: `No se pudieron crear las tablas: ${err?.message || err}`,
      diagnostico: antes,
    });
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }

  // La caché de PostgREST tarda un instante en levantar el aviso.
  await new Promise((r) => setTimeout(r, 1500));
  const despues = await diagnosticar();

  return ok({
    ok: despues.ok,
    mensaje: despues.ok
      ? "Listo: las tablas están creadas y la base responde. Ya podés usar la app."
      : "Las tablas se crearon pero la base todavía no responde. Esperá un minuto y recargá /api/salud: PostgREST a veces tarda en recargar su caché de esquema.",
    diagnostico: despues,
  });
}
