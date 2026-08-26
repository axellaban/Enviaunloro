// Dónde viven los datos.
//
// Dos backends, elegidos solos según lo que haya configurado:
//
//   Upstash Redis  si están las variables (KV_REST_API_URL / _TOKEN). Es el
//                  modo para producción: varias instancias serverless comparten
//                  el mismo estado. Se usa la API REST y no el cliente oficial
//                  porque es un `fetch` contra una URL — cero dependencias.
//
//   Supabase       si están SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Mismo
//                  papel que Upstash, para quien ya tiene Postgres ahí. Habla
//                  PostgREST por HTTP, que en serverless es lo correcto: sin
//                  conexiones que mantener ni pool que se agote. Necesita correr
//                  una vez el SQL de supabase.sql.
//
//   Archivo        si no. Todo vive en memoria del proceso y se vuelca a
//                  .data/loros.json cada tanto, para que `npm run dev` no
//                  pierda los nidos al reiniciar. Es el modo "clonás el repo y
//                  anda", sin cuenta en ningún lado.
//
// Si el disco no se deja escribir (Vercel sin Upstash, por ejemplo) el archivo
// se apaga solo y queda todo en memoria: la app sigue funcionando, pero los
// datos duran lo que dure la instancia. Se avisa por consola una vez.

import { promises as fs } from "node:fs";
import path from "node:path";

export interface Backend {
  leer(clave: string): Promise<string | null>;
  escribir(clave: string, valor: string): Promise<void>;
  borrar(clave: string): Promise<void>;
  /** Varias claves de una. Evita N viajes de ida y vuelta al abrir un buzón. */
  leerVarios(claves: string[]): Promise<(string | null)[]>;
  /** Agrega al principio de una lista y la recorta. Atómico donde importa. */
  agregarALista(clave: string, valor: string, max: number): Promise<void>;
  leerLista(clave: string): Promise<string[]>;
  nombre: string;
}

// ---------- Upstash ----------

function credencialesUpstash(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

function backendUpstash(c: { url: string; token: string }): Backend {
  async function cmd(args: (string | number)[]): Promise<any> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try {
      const r = await fetch(c.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args.map(String)),
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!r.ok) {
        console.error(`[store] ${args[0]} devolvió ${r.status}`);
        return undefined;
      }
      return (await r.json())?.result;
    } catch (err: any) {
      console.error(`[store] ${args[0]} falló:`, err?.message || err);
      return undefined;
    } finally {
      clearTimeout(t);
    }
  }

  return {
    nombre: "upstash",
    async leer(clave) {
      const r = await cmd(["GET", clave]);
      return typeof r === "string" ? r : null;
    },
    async leerVarios(claves) {
      if (claves.length === 0) return [];
      const r = await cmd(["MGET", ...claves]);
      if (!Array.isArray(r)) return claves.map(() => null);
      return r.map((x) => (typeof x === "string" ? x : null));
    },
    async escribir(clave, valor) {
      await cmd(["SET", clave, valor]);
    },
    async borrar(clave) {
      await cmd(["DEL", clave]);
    },
    async agregarALista(clave, valor, max) {
      await cmd(["LPUSH", clave, valor]);
      await cmd(["LTRIM", clave, 0, max - 1]);
    },
    async leerLista(clave) {
      const r = await cmd(["LRANGE", clave, 0, -1]);
      return Array.isArray(r) ? r.map(String) : [];
    },
  };
}

// ---------- Supabase (PostgREST) ----------

function credencialesSupabase(): { url: string; key: string } | null {
  // La URL del proyecto no es secreta, así que se acepta también con el prefijo
  // público (es como la deja la integración de Supabase en Vercel).
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  // La service_role saltea RLS: es acceso total a la base. Con prefijo público
  // queda adentro del JavaScript que baja cualquier visitante, así que si
  // aparece así no se usa y se grita.
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "[store] NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY está cargada. Esa clave da acceso TOTAL a la base y con el prefijo NEXT_PUBLIC_ viaja al navegador de cualquiera. Borrala, rotá la clave en Supabase y cargala como SUPABASE_SERVICE_ROLE_KEY, sin prefijo."
    );
  }
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

function backendSupabase(c: { url: string; key: string }): Backend {
  const base = `${c.url}/rest/v1`;
  const cabeceras = {
    apikey: c.key,
    Authorization: `Bearer ${c.key}`,
    "Content-Type": "application/json",
  };

  async function pedir(
    ruta: string,
    opciones: { metodo?: string; cuerpo?: unknown; extra?: Record<string, string> } = {}
  ): Promise<any> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try {
      const r = await fetch(`${base}/${ruta}`, {
        method: opciones.metodo || "GET",
        headers: { ...cabeceras, ...(opciones.extra || {}) },
        body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!r.ok) {
        const detalle = await r.text().catch(() => "");
        console.error(`[store] supabase ${ruta} devolvió ${r.status}: ${detalle.slice(0, 300)}`);
        return undefined;
      }
      // DELETE y POST sin `Prefer: return=representation` vuelven vacíos.
      const texto = await r.text();
      return texto ? JSON.parse(texto) : [];
    } catch (err: any) {
      console.error(`[store] supabase ${ruta} falló:`, err?.message || err);
      return undefined;
    } finally {
      clearTimeout(t);
    }
  }

  /** Filtro `in.(...)`: las claves llevan comas (lugar:-34.6,-58.4) y sin las
   *  comillas PostgREST las partiría en dos valores. */
  function listaIn(claves: string[]): string {
    const entre = claves.map((k) => `"${k.replace(/["\\]/g, (m) => "\\" + m)}"`).join(",");
    return `in.(${entre})`;
  }

  function consulta(params: Record<string, string>): string {
    return new URLSearchParams(params).toString();
  }

  /**
   * Recorta lo viejo de una lista, de vez en cuando.
   *
   * Acá agregar es un INSERT, así que nada borra solo y el buzón crecería para
   * siempre. Hacerlo en cada envío serían dos pedidos extra siempre; una de
   * cada veinticinco veces alcanza para que la tabla no se dispare.
   */
  async function recortar(clave: string, max: number): Promise<void> {
    if (Math.random() > 0.04) return;
    const borde = await pedir(
      `loros_lista?${consulta({
        select: "id",
        clave: `eq.${clave}`,
        order: "id.desc",
        offset: String(max),
        limit: "1",
      })}`
    );
    const id = Array.isArray(borde) && borde[0]?.id;
    if (!id) return;
    await pedir(`loros_lista?${consulta({ clave: `eq.${clave}`, id: `lte.${id}` })}`, {
      metodo: "DELETE",
    });
  }

  return {
    nombre: "supabase",
    async leer(clave) {
      const r = await pedir(`loros_doc?${consulta({ select: "valor", clave: `eq.${clave}` })}`);
      const v = Array.isArray(r) ? r[0]?.valor : undefined;
      return typeof v === "string" ? v : null;
    },
    async leerVarios(claves) {
      if (claves.length === 0) return [];
      const r = await pedir(
        `loros_doc?${consulta({ select: "clave,valor", clave: listaIn(claves) })}`
      );
      if (!Array.isArray(r)) return claves.map(() => null);
      const porClave = new Map<string, string>();
      for (const fila of r) porClave.set(String(fila.clave), String(fila.valor));
      return claves.map((k) => porClave.get(k) ?? null);
    },
    async escribir(clave, valor) {
      // merge-duplicates = upsert sobre la clave primaria.
      await pedir("loros_doc", {
        metodo: "POST",
        cuerpo: [{ clave, valor }],
        extra: { Prefer: "resolution=merge-duplicates" },
      });
    },
    async borrar(clave) {
      await pedir(`loros_doc?${consulta({ clave: `eq.${clave}` })}`, { metodo: "DELETE" });
    },
    async agregarALista(clave, valor, max) {
      await pedir("loros_lista", { metodo: "POST", cuerpo: [{ clave, valor }] });
      await recortar(clave, max);
    },
    async leerLista(clave) {
      const r = await pedir(
        `loros_lista?${consulta({
          select: "valor",
          clave: `eq.${clave}`,
          order: "id.desc",
          limit: "200",
        })}`
      );
      return Array.isArray(r) ? r.map((f) => String(f.valor)) : [];
    },
  };
}

// ---------- Archivo (+ memoria) ----------

function backendArchivo(): Backend {
  const dir = process.env.LOROS_DATA_DIR || path.join(process.cwd(), ".data");
  const archivo = path.join(dir, "loros.json");

  type Datos = Record<string, string | string[]>;

  // El disco manda, no la memoria. Parece más lento y es lo correcto: en
  // `next dev` cada ruta puede terminar con su propia copia del módulo, así que
  // un mapa en memoria hace que /api/loros no vea los nidos que creó
  // /api/nido. (Pasó. El síntoma era un 401 "todavía no tenés nido" con la
  // cookie perfectamente válida.) Con estos volúmenes, leer un JSON chico por
  // pedido no se nota.
  let cache: { mtime: number; datos: Datos } | null = null;
  // Solo si el disco no se deja escribir. Es la red de contención, no el modo
  // normal de funcionar.
  let memoriaSola = false;
  const memoria: Datos = {};

  async function leerTodo(): Promise<Datos> {
    if (memoriaSola) return memoria;
    try {
      const st = await fs.stat(archivo);
      if (cache && cache.mtime === st.mtimeMs) return cache.datos;
      const datos = JSON.parse(await fs.readFile(archivo, "utf8")) as Datos;
      cache = { mtime: st.mtimeMs, datos };
      return datos;
    } catch {
      // No existe todavía, o quedó ilegible. Se arranca vacío: perder un MVP de
      // nidos no justifica no arrancar.
      return cache?.datos ?? {};
    }
  }

  async function guardar(datos: Datos): Promise<void> {
    if (memoriaSola) return;
    try {
      await fs.mkdir(dir, { recursive: true });
      const tmp = `${archivo}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(datos), "utf8");
      // rename es atómico: quien lea mientras tanto nunca ve un JSON a medias.
      await fs.rename(tmp, archivo);
      cache = null;
    } catch (err: any) {
      memoriaSola = true;
      Object.assign(memoria, datos);
      console.warn(
        `[store] no se puede escribir ${archivo} (${err?.message}). Sigo solo en memoria: los datos duran lo que dure el proceso. Para que persistan, configurá Upstash.`
      );
    }
  }

  // Las escrituras van de a una. Sin esto, dos loros soltados al mismo tiempo
  // hacen leer-modificar-escribir en paralelo y el segundo pisa al primero.
  //
  // Vale dentro de este proceso. Si mañana corren dos instancias contra el
  // mismo archivo, la ventana vuelve: para eso está Upstash.
  let cola: Promise<unknown> = Promise.resolve();
  function mutar(fn: (datos: Datos) => void): Promise<void> {
    const siguiente = cola.then(async () => {
      const datos = await leerTodo();
      const copia: Datos = { ...datos };
      fn(copia);
      await guardar(copia);
    });
    // La cola no se puede cortar por un error: si una escritura falla, las que
    // vienen atrás tienen que correr igual.
    cola = siguiente.catch(() => {});
    return siguiente;
  }

  return {
    nombre: "archivo",
    async leer(clave) {
      const v = (await leerTodo())[clave];
      return typeof v === "string" ? v : null;
    },
    async leerVarios(claves) {
      const datos = await leerTodo();
      return claves.map((k) => {
        const v = datos[k];
        return typeof v === "string" ? v : null;
      });
    },
    async escribir(clave, valor) {
      await mutar((d) => {
        d[clave] = valor;
      });
    },
    async borrar(clave) {
      await mutar((d) => {
        delete d[clave];
      });
    },
    async agregarALista(clave, valor, max) {
      await mutar((d) => {
        const actual = d[clave];
        const lista = Array.isArray(actual) ? [...actual] : [];
        lista.unshift(valor);
        d[clave] = lista.slice(0, max);
      });
    },
    async leerLista(clave) {
      const v = (await leerTodo())[clave];
      return Array.isArray(v) ? [...v] : [];
    },
  };
}

// ---------- elección ----------

let elegido: Backend | null = null;

export function store(): Backend {
  if (!elegido) {
    const up = credencialesUpstash();
    const sb = credencialesSupabase();
    elegido = up ? backendUpstash(up) : sb ? backendSupabase(sb) : backendArchivo();
  }
  return elegido;
}

/** Helpers de documentos JSON, que es como se guarda todo lo de la app. */
export async function leerDoc<T>(clave: string): Promise<T | null> {
  const crudo = await store().leer(clave);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as T;
  } catch {
    return null;
  }
}

export async function escribirDoc(clave: string, valor: unknown): Promise<void> {
  await store().escribir(clave, JSON.stringify(valor));
}
