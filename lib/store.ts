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

/**
 * El último error del almacenamiento, para que /api/salud pueda decir QUÉ pasó.
 *
 * Sin esto, un Supabase mal configurado y una cookie borrada se ven exactamente
 * igual desde el teléfono: "no encuentro tu nido". El motivo real —que falta
 * correr el SQL, o que la clave es la pública— queda enterrado en los logs de
 * una función serverless, que es justo donde nadie mira.
 */
let ultimoError = "";
export function errorDeStore(): string {
  return ultimoError;
}
function anotarError(mensaje: string): void {
  ultimoError = mensaje;
  console.error(`[store] ${mensaje}`);
}

export interface Backend {
  leer(clave: string): Promise<string | null>;
  escribir(clave: string, valor: string): Promise<void>;
  borrar(clave: string): Promise<void>;
  /** Varias claves de una. Evita N viajes de ida y vuelta al abrir un buzón. */
  leerVarios(claves: string[]): Promise<(string | null)[]>;
  /** Agrega al principio de una lista y la recorta. Atómico donde importa. */
  agregarALista(clave: string, valor: string, max: number): Promise<void>;
  leerLista(clave: string, max?: number): Promise<string[]>;

  /**
   * Agrega a un conjunto, sin repetidos y sin leerlo antes.
   *
   * Existe por un bug que costaba amistades: la bandada era un documento con
   * un array, y sumar a alguien era leer-modificar-escribir. Dos personas
   * tocando tu link de invitación al mismo tiempo leían la misma lista y la
   * segunda pisaba a la primera. Con dos ya se perdía una; con seis quedaba
   * una sola. Acá la base resuelve el choque y no hay nada que pisar.
   */
  agregarAConjunto(clave: string, valor: string): Promise<boolean>;
  leerConjunto(clave: string): Promise<string[]>;
  /** Saca un valor de un conjunto. Lo usa el push para tirar las suscripciones
   *  muertas —un teléfono que desinstaló la app contesta 410— porque si no la
   *  lista crece para siempre y cada aviso paga hablarle a nadie. */
  borrarDeConjunto(clave: string, valor: string): Promise<void>;

  /**
   * Pedir un turno único. Devuelve true solo al PRIMERO que lo pide.
   *
   * Es lo que convierte "comprobar y después escribir" en una sola operación.
   * Sin esto, dos consultas encimadas hacían que Doña Cotorra contestara el
   * mismo loro cuatro veces, y que un doble toque en el destino del ave
   * devolviera dos respuestas distintas.
   *
   * `segundos` 0 = para siempre, que es lo correcto cuando el turno representa
   * una decisión que tampoco se deshace.
   */
  reservar(clave: string, segundos: number): Promise<boolean>;

  /**
   * Suma uno y devuelve el total de la ventana, o null si este backend no
   * puede hacerlo de forma atómica (y entonces el freno cae al de memoria).
   */
  contador(clave: string, segundos: number): Promise<number | null>;

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
    async leerLista(clave, max) {
      const r = await cmd(["LRANGE", clave, 0, max ? max - 1 : -1]);
      return Array.isArray(r) ? r.map(String) : [];
    },
    async agregarAConjunto(clave, valor) {
      // SADD devuelve 0 o 1. Cualquier otra cosa —undefined— es que la
      // operación NO entró, y quien llama tiene que enterarse: hay un lugar
      // donde de esto depende un borrado.
      return typeof (await cmd(["SADD", clave, valor])) === "number";
    },
    async leerConjunto(clave) {
      const r = await cmd(["SMEMBERS", clave]);
      return Array.isArray(r) ? r.map(String) : [];
    },
    async borrarDeConjunto(clave, valor) {
      await cmd(["SREM", clave, valor]);
    },
    async reservar(clave, segundos) {
      // NX: solo escribe si la clave NO existe. La respuesta distingue al
      // primero de todos los demás, en una sola operación. Sin EX cuando el
      // turno no vence: Redis rechaza `EX 0`.
      const args =
        segundos > 0 ? ["SET", clave, "1", "NX", "EX", segundos] : ["SET", clave, "1", "NX"];
      return (await cmd(args)) === "OK";
    },
    async contador(clave, segundos) {
      const n = await cmd(["INCR", clave]);
      if (typeof n !== "number") return null;
      // Solo el primero pone el vencimiento; si no, la ventana no terminaría
      // nunca de correrse hacia adelante.
      if (n === 1) await cmd(["EXPIRE", clave, segundos]);
      return n;
    },
  };
}

// ---------- Supabase (PostgREST) ----------

/**
 * Qué rol trae la clave, sin llamar a ningún lado.
 *
 * Importa porque con la clave `anon` —la pública— y RLS prendido, PostgREST
 * contesta 200 con lista vacía en las lecturas y rechaza las escrituras. O sea:
 * la app parece andar y no guarda nada. Distinguirlo acá evita horas de buscar
 * en el lugar equivocado.
 *
 * Las claves nuevas de Supabase se reconocen por el prefijo; las viejas son
 * JWT y llevan el rol en el payload, que no es secreto (viaja en la propia
 * clave y no se valida acá: solo se lee para avisar).
 */
export function rolDeClaveSupabase(key: string): string {
  if (key.startsWith("sb_secret_")) return "service_role";
  if (key.startsWith("sb_publishable_")) return "anon";
  const partes = key.split(".");
  if (partes.length !== 3) return "desconocido";
  try {
    const payload = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
    return String(payload?.role || "desconocido");
  } catch {
    return "desconocido";
  }
}

function credencialesSupabase(): { url: string; key: string } | null {
  // Varios nombres a propósito: la integración de Supabase en Vercel inyecta un
  // juego, la consola de Supabase muestra otro, y desde el cambio de claves de
  // Supabase (anon/service_role → publishable/secret) hay proyectos nuevos que
  // no tienen ninguna "service_role" a la vista. Aceptarlos todos evita el peor
  // final posible: que esté todo bien cargado, no se reconozca, y la app se
  // caiga en silencio al modo memoria.
  //
  // La URL del proyecto no es secreta, así que también se acepta con prefijo
  // público, que es como la deja esa integración.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_KEY;

  // La service_role saltea RLS: es acceso total a la base. Con prefijo público
  // queda adentro del JavaScript que baja cualquier visitante, así que si
  // aparece así no se usa y se grita.
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "[store] NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY está cargada. Esa clave da acceso TOTAL a la base y con el prefijo NEXT_PUBLIC_ viaja al navegador de cualquiera. Borrala, rotá la clave en Supabase y cargala como SUPABASE_SERVICE_ROLE_KEY, sin prefijo."
    );
  }
  if (!url || !key) return null;

  const rol = rolDeClaveSupabase(key);
  if (rol === "anon") {
    anotarError(
      "La clave de Supabase configurada es la PÚBLICA (anon / publishable). Con RLS prendido no puede escribir nada, así que la app no va a guardar. Usá la service_role (en proyectos nuevos figura como secret key) en SUPABASE_SERVICE_ROLE_KEY."
    );
  }
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
    opciones: {
      metodo?: string;
      cuerpo?: unknown;
      extra?: Record<string, string>;
      /** Devolver el código en vez de tratarlo como falla. Lo usa `reservar`:
       *  ahí un 409 no es un error, es la respuesta "llegaste segundo". */
      estado?: (n: number) => boolean;
    } = {}
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
      if (opciones.estado?.(r.status)) return { estado: r.status };
      if (!r.ok) {
        const detalle = await r.text().catch(() => "");
        anotarError(`supabase ${ruta.split("?")[0]} devolvió ${r.status}: ${detalle.slice(0, 300)}`);
        return undefined;
      }
      // DELETE y POST sin `Prefer: return=representation` vuelven vacíos.
      const texto = await r.text();
      return texto ? JSON.parse(texto) : [];
    } catch (err: any) {
      anotarError(`supabase ${ruta.split("?")[0]} falló: ${err?.message || err}`);
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
    async leerLista(clave, max) {
      const r = await pedir(
        `loros_lista?${consulta({
          select: "valor",
          clave: `eq.${clave}`,
          order: "id.desc",
          // El tope venía fijo en 200 mientras el índice del mundo guardaba
          // 300: la misma app mostraba distinto según dónde estuviera guardando.
          limit: String(max ?? 200),
        })}`
      );
      return Array.isArray(r) ? r.map((f) => String(f.valor)) : [];
    },
    async agregarAConjunto(clave, valor) {
      // ignore-duplicates: la clave primaria (clave, valor) hace el trabajo.
      // `pedir` devuelve undefined si falló —tabla que no existe, permiso,
      // timeout—, y eso tiene que salir de acá como `false`: sin la tabla
      // `loros_conjunto` creada, esto fallaba en silencio.
      const r = await pedir("loros_conjunto", {
        metodo: "POST",
        cuerpo: [{ clave, valor }],
        extra: { Prefer: "resolution=ignore-duplicates" },
      });
      return Array.isArray(r);
    },
    async leerConjunto(clave) {
      const r = await pedir(
        `loros_conjunto?${consulta({ select: "valor", clave: `eq.${clave}` })}`
      );
      return Array.isArray(r) ? r.map((f) => String(f.valor)) : [];
    },
    async borrarDeConjunto(clave, valor) {
      await pedir(`loros_conjunto?${consulta({ clave: `eq.${clave}`, valor: `eq.${valor}` })}`, {
        metodo: "DELETE",
      });
    },
    async reservar(clave) {
      // Sin `ignore-duplicates` a propósito: acá el choque es la respuesta.
      // 409 = la clave primaria ya existía = alguien reservó antes.
      const r = await pedir("loros_conjunto", {
        metodo: "POST",
        cuerpo: [{ clave, valor: "1" }],
        estado: (n) => n === 409,
      });
      return Array.isArray(r);
    },
    async contador() {
      // PostgREST no tiene un INCR atómico. El freno cae al de memoria y lo
      // dice en /api/salud, en vez de aparentar un límite que no cumple.
      return null;
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
    async leerLista(clave, max) {
      const v = (await leerTodo())[clave];
      const lista = Array.isArray(v) ? [...v] : [];
      return max ? lista.slice(0, max) : lista;
    },
    async agregarAConjunto(clave, valor) {
      // La lectura va ADENTRO de la mutación, que es lo que la hace atómica:
      // la cola serializa leer-modificar-escribir enteros. Leyendo afuera
      // —como hacía la bandada— dos pedidos leen lo mismo y el segundo pisa.
      await mutar((d) => {
        const actual = d[clave];
        const lista = Array.isArray(actual) ? actual : [];
        if (!lista.includes(valor)) d[clave] = [...lista, valor];
      });
      // `mutar` propaga el error si el disco falla; llegar acá es que entró.
      return true;
    },
    async borrarDeConjunto(clave, valor) {
      await mutar((d) => {
        const actual = d[clave];
        if (Array.isArray(actual)) d[clave] = actual.filter((x) => x !== valor);
      });
    },
    async leerConjunto(clave) {
      const v = (await leerTodo())[clave];
      return Array.isArray(v) ? [...v] : [];
    },
    async reservar(clave, segundos) {
      let gane = false;
      await mutar((d) => {
        const previo = d[clave];
        if (typeof previo === "string") {
          const vence = Number(previo);
          // 0 = sin vencimiento. Un turno vencido se puede volver a tomar.
          if (vence === 0 || Date.now() < vence) return;
        }
        d[clave] = String(segundos > 0 ? Date.now() + segundos * 1000 : 0);
        gane = true;
      });
      return gane;
    },
    async contador() {
      // Null a propósito: el freno cae al contador en memoria, que acá es
      // exactamente equivalente —este backend es de un solo proceso— y no
      // cuesta una escritura a disco en cada pedido.
      return null;
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

export type Diagnostico = {
  almacenamiento: string;
  /** La ida y vuelta funcionó. */
  ok: boolean;
  /** Los datos sobreviven a otra instancia. El archivo local NO. */
  persistente: boolean;
  detalle: string;
  sugerencia: string;
};

/**
 * Escribe, lee y borra una clave de prueba. Es la única forma honesta de
 * responder "¿la base anda?": preguntarle a la base.
 */
export async function diagnosticar(): Promise<Diagnostico> {
  const b = store();
  const clave = `salud:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  ultimoError = "";

  let ok = false;
  try {
    await b.escribir(clave, "ping");
    ok = (await b.leer(clave)) === "ping";
    await b.borrar(clave);
  } catch (err: any) {
    anotarError(`la prueba falló: ${err?.message || err}`);
  }

  // Los conjuntos, aparte. Viven en OTRA tabla (`loros_conjunto`) y de ellos
  // depende la bandada entera. Una base con la tabla de documentos creada y
  // esta no daba "todo bien" mientras las amistades se caían en silencio: pasó,
  // y por eso ahora se prueba lo que la app realmente usa, no una parte.
  let conjuntos = false;
  try {
    // Clave FIJA a propósito: en Supabase los conjuntos viven en otra tabla y
    // `borrar` no los alcanza, así que una clave nueva por consulta dejaría una
    // fila de basura cada vez. Con una fija queda una sola, para siempre.
    const cc = "salud:conjunto";
    conjuntos =
      (await b.agregarAConjunto(cc, "ping")) && (await b.leerConjunto(cc)).includes("ping");
  } catch (err: any) {
    anotarError(`la prueba de conjuntos falló: ${err?.message || err}`);
  }

  const detalle = ok
    ? conjuntos
      ? ""
      : errorDeStore() ||
        "los documentos andan pero los conjuntos no: sin eso la bandada queda vacía."
    : errorDeStore() || "se escribió y al leer no estaba.";
  ok = ok && conjuntos;
  // El backend de archivo pasa la prueba aunque no sirva: escribir y leer
  // dentro del MISMO proceso siempre funciona, incluso cuando cayó al modo
  // memoria. Lo que ahí falla es lo que esta prueba no puede ver — la instancia
  // siguiente. Por eso se informa aparte.
  const persistente = b.nombre !== "archivo";
  return {
    almacenamiento: b.nombre,
    ok,
    persistente,
    detalle,
    sugerencia: ok && persistente ? "" : sugerir(b.nombre, detalle),
  };
}

function sugerir(backend: string, detalle: string): string {
  if (backend === "archivo") {
    return "No hay base configurada: se está guardando en memoria y cada instancia arranca vacía. Cargá Upstash o Supabase y volvé a deployar (las variables nuevas no entran en un deploy ya hecho).";
  }
  if (backend === "supabase") {
    if (/does not exist|PGRST205|schema cache/i.test(detalle)) {
      return "Faltan las tablas. Lo más rápido: abrí /api/instalar?confirmar=si en este mismo sitio y las crea solas. Si preferís a mano, corré supabase.sql en el SQL Editor de Supabase.";
    }
    if (/permission denied|JWT|401|403|RLS/i.test(detalle)) {
      return "La clave no tiene permiso. Tiene que ser la service_role (en proyectos nuevos, la secret key), no la anon/publishable: con RLS prendido esa no puede escribir nada.";
    }
    return "Revisá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, y que hayas corrido supabase.sql.";
  }
  return "Revisá las credenciales de la base y volvé a deployar.";
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
