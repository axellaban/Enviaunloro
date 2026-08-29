// Prueba de punta a punta contra la API, con dos personas de verdad.
//
// Lo que de verdad se está chequeando es una sola cosa, la que sostiene el
// producto: que el texto de un loro NO llegue al navegador de quien lo recibe
// hasta que el ave aterriza. Si eso se rompe algún día, esta prueba lo dice.
//
//   npm run dev           (en otra terminal)
//   npm run prueba
//
// Deja tres nidos de mentira en .data/loros.json. Para limpiar: rm -rf .data

import { readFile, writeFile } from "node:fs/promises";

// Node avisa por consola cada vez que lee un .ts sin "type": "module".
// Es ruido en una salida que se lee a mano.
process.removeAllListeners("warning");
process.on("warning", () => {});

const BASE = process.env.LOROS_URL || "http://localhost:3000";

// Con el servidor arrancado con LOROS_PROB_EXTRAVIO=1 (todos los loros se
// pierden), pasale la misma variable a la prueba y verifica ese camino en vez
// del normal:
//   LOROS_PROB_EXTRAVIO=1 npm run start
//   LOROS_PROB_EXTRAVIO=1 npm run prueba
const MODO_EXTRAVIO = process.env.LOROS_PROB_EXTRAVIO === "1";

// Lo mismo para el romance del perico: con LOROS_PROB_ROMANCE=1 se distraen
// todos y se puede verificar el desvío sin mandar diez y cruzar los dedos.
const MODO_ROMANCE = process.env.LOROS_PROB_ROMANCE === "1";

function cliente(nombre) {
  let cookie = "";
  return {
    nombre,
    async llamar(ruta, datos) {
      const r = await fetch(BASE + ruta, {
        method: datos ? "POST" : "GET",
        headers: {
          ...(datos ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { cookie } : {}),
          origin: BASE,
        },
        body: datos ? JSON.stringify(datos) : undefined,
      });
      const set = r.headers.getSetCookie?.() ?? [r.headers.get("set-cookie")].filter(Boolean);
      if (set.length) cookie = set[0].split(";")[0];
      const j = await r.json();
      if (!r.ok) throw new Error(`${ruta} → ${r.status}: ${j.error}`);
      return j;
    },
    /** Sigue un link crudo (sin JSON): para /entrar?llave=… */
    async abrir(ruta) {
      const r = await fetch(BASE + ruta, { redirect: "manual" });
      const set = r.headers.getSetCookie?.() ?? [r.headers.get("set-cookie")].filter(Boolean);
      if (set.length) cookie = set[0].split(";")[0];
      return r;
    },
  };
}

/** Metros entre dos puntos, para chequear que lo que se muestra no es lo real. */
function metros(a, b) {
  const R = 6371008.8, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const ok = (c, m) => console.log(`${c ? "✓" : "✗"} ${m}`);
let fallos = 0;
const chequear = (c, m) => { if (!c) fallos++; ok(c, m); };

// --- el SQL de la mano y el del código son el mismo ---
{
  const { readFileSync } = await import("node:fs");
  const ts = readFileSync(new URL("../lib/esquema.ts", import.meta.url), "utf8");
  const ddl = ts.split("export const ESQUEMA = `")[1].split("`.trim();")[0].trim();
  const archivo = readFileSync(new URL("../supabase.sql", import.meta.url), "utf8");
  // supabase.sql lleva encabezado propio; lo que tiene que coincidir es el DDL.
  chequear(
    archivo.includes(ddl),
    "supabase.sql sigue igual a lib/esquema.ts (si no, el camino manual y el automático crean cosas distintas)"
  );
}

// --- alta de las dos puntas ---
const ana = cliente("Ana");
const beto = cliente("Beto");
const alta = await ana.llamar("/api/nido", { nombre: "Ana", ave: "loro", lat: -34.6037, lng: -58.3816 }); // Buenos Aires
// El alta tiene que traer TODO lo necesario para entrar al mapa. Si el código
// no viniera acá, la app dependería de una segunda consulta para arrancar — que
// es exactamente lo que la dejaba clavada en "Armando el nido…".
chequear(
  !!alta.yo && /^[a-z]{3,}[a-z0-9]*$/.test(alta.codigo || ""),
  `crear el nido devuelve el nido y su código de dos palabras (${alta.codigo})`
);
await beto.llamar("/api/nido", { nombre: "Beto", ave: "cotorra", lat: -34.9011, lng: -56.1645 }); // Montevideo

const estAna = await ana.llamar("/api/estado");
chequear(
  ["upstash", "supabase", "archivo"].includes(estAna.almacenamiento),
  `el estado dice dónde guarda (${estAna.almacenamiento})`
);
const estBeto = await beto.llamar("/api/estado");
console.log(`  Ana ${estAna.codigo} · Beto ${estBeto.codigo}`);
chequear(estAna.codigo !== estBeto.codigo, "cada nido tiene su propio código");
chequear(estAna.amigos.some((a) => a.bot), "a Ana le crearon su Doña Cotorra");

// --- amistad por código ---
const sumado = await beto.llamar("/api/amigos", { codigo: estAna.codigo });
chequear(sumado.amigo.nombre === "Ana", "Beto sumó a Ana con el código");
const anaAhora = await ana.llamar("/api/estado");
chequear(anaAhora.amigos.some((a) => a.id === sumado.amigo.id) === false, "(control) Ana no se agrega a sí misma");
chequear(anaAhora.amigos.some((a) => a.nombre === "Beto"), "la amistad quedó de los dos lados");

// --- privacidad de la ubicación ---
const REAL_ANA = { lat: -34.6037, lng: -58.3816 };
const anaSegunBeto = (await beto.llamar("/api/estado")).amigos.find((a) => a.nombre === "Ana");
const corrimiento = metros(REAL_ANA, { lat: anaSegunBeto.lat, lng: anaSegunBeto.lng });
console.log(`  Beto ve a Ana corrida ${Math.round(corrimiento)} m de donde está`);
// El corrimiento es al azar dentro del radio, así que no se puede exigir un
// mínimo grande sin volver la prueba caprichosa. Lo que sí es un error seguro:
// que salga el punto exacto, o que se pase del radio declarado.
chequear(corrimiento > 1, "las coordenadas de Ana NO son las reales");
chequear(corrimiento <= anaSegunBeto.radioKm * 1000 + 1, "el corrimiento entra en el radio declarado");
chequear(anaSegunBeto.radioKm > 0, "viene el radio de la zona para dibujarla");
chequear(
  Math.abs(anaSegunBeto.distanciaKm - 205) < 3,
  `la distancia real sí es exacta (${anaSegunBeto.distanciaKm?.toFixed(1)} km)`
);

const anaSegunAna = (await ana.llamar("/api/estado")).yo;
chequear(metros(REAL_ANA, anaSegunAna) < 1, "Ana sí ve su propia ubicación exacta");
chequear(anaSegunAna.radioKm === 0, "el nido propio va sin zona");

const otraVez = (await beto.llamar("/api/estado")).amigos.find((a) => a.nombre === "Ana");
chequear(
  otraVez.lat === anaSegunBeto.lat && otraVez.lng === anaSegunBeto.lng,
  "el punto corrido es SIEMPRE el mismo (si bailara, se promedia y se recupera el real)"
);

// --- los códigos: los de ahora y los de antes ---
//
// El código pasó de seis caracteres al azar a dos palabras, y lo importante no
// es que las palabras anden: es que los códigos VIEJOS sigan andando. Quien ya
// repartió el suyo por WhatsApp no puede quedarse sin que lo sumen.
{
  const antigua = cliente("Antigua");
  await antigua.llamar("/api/nido", { nombre: "Antigua", lat: 41.39, lng: 2.16 });
  const suyo = (await antigua.llamar("/api/estado")).codigo;
  chequear(suyo.length > 6, `los códigos nuevos son palabras, no seis caracteres (${suyo})`);

  // Da igual cómo lo tipeen: con mayúsculas, con espacios o con un guion.
  for (const forma of [suyo, suyo.toUpperCase(), ` ${suyo} `]) {
    const quien = cliente("Suma");
    await quien.llamar("/api/nido", { nombre: "Suma", lat: 41.4, lng: 2.17 });
    try {
      const r = await quien.llamar("/api/amigos", { codigo: forma });
      chequear(r.amigo.nombre === "Antigua", `se puede tipear "${forma}" y encuentra el nido`);
    } catch (e) {
      chequear(false, `se puede tipear "${forma}" (${e.message})`);
    }
  }

  const inv = await antigua.llamar(`/api/invitacion?n=${encodeURIComponent(suyo)}`);
  chequear(inv.invita?.nombre === "Antigua", "el link de invitación resuelve un código de palabras");

  // Y ahora lo que de verdad importa: un código del formato de ANTES. Se planta
  // a mano en el archivo —tal cual lo habría dejado la versión anterior— y se
  // pide por la API como lo pediría alguien que lo tiene anotado en un papel.
  // Solo corre contra el backend de archivo; con Upstash o Supabase de por
  // medio no hay dónde plantarlo desde acá.
  const archivo = new URL("../.data/loros.json", import.meta.url);
  let plantado = false;
  try {
    const datos = JSON.parse(await readFile(archivo, "utf8"));
    const id = datos[`codigo:${suyo.toUpperCase()}`];
    if (id) {
      datos["codigo:K7M2QX"] = id;
      await writeFile(archivo, JSON.stringify(datos), "utf8");
      plantado = true;
    }
  } catch {}

  if (!plantado) {
    console.log("   (sin backend de archivo: no se puede plantar un código viejo)");
  } else {
    for (const forma of ["K7M2QX", "k7m2qx", " K7M2QX ", "k7m2-qx"]) {
      const quien = cliente("Vieja");
      await quien.llamar("/api/nido", { nombre: "Vieja", lat: 41.41, lng: 2.18 });
      try {
        const r = await quien.llamar("/api/amigos", { codigo: forma });
        chequear(r.amigo.nombre === "Antigua", `un código VIEJO tipeado "${forma}" sigue abriendo su nido`);
      } catch (e) {
        chequear(false, `un código VIEJO tipeado "${forma}" (${e.message})`);
      }
    }
    const invVieja = await antigua.llamar("/api/invitacion?n=K7M2QX");
    chequear(invVieja.invita?.nombre === "Antigua", "y su link de invitación de siempre también");

    // Que un código nuevo NO pueda pisar a uno viejo no es cuestión de tener
    // muchas combinaciones: los viejos miden seis caracteres exactos y el más
    // corto que puede salir del sorteo mide siete. Se verifica contra las
    // listas de verdad, no con una muestra — cubre las 4.060 de una.
    let minimo = null;
    try {
      minimo = (await import("../lib/codigo.ts")).LARGO_MINIMO_NUEVO;
    } catch {
      console.log("   (este Node no lee TypeScript: sin chequeo del largo mínimo)");
    }
    if (minimo !== null) {
      chequear(minimo >= 7, `ningún código nuevo puede medir seis, así que ninguno pisa a uno viejo (mínimo ${minimo})`);
    }

    // Y con nidos nuevos entrando, el viejo sigue apuntando a donde apuntaba.
    for (let i = 0; i < 5; i++) {
      const otro = cliente("Nuevo");
      await otro.llamar("/api/nido", { nombre: "Nuevo", lat: 41.42, lng: 2.19 });
    }
    const deNuevo = await antigua.llamar("/api/invitacion?n=K7M2QX");
    chequear(deNuevo.invita?.nombre === "Antigua", "y con nidos nuevos entrando, el viejo sigue en su lugar");
  }
}

// --- código inexistente y código propio ---
for (const [codigo, motivo] of [["ZZZZZZ", "código inexistente"], [estBeto.codigo, "código propio"]]) {
  try { await beto.llamar("/api/amigos", { codigo }); chequear(false, `rechaza ${motivo}`); }
  catch { chequear(true, `rechaza ${motivo}`); }
}

// --- mandar a alguien que no es de la bandada ---
const carla = cliente("Carla");
await carla.llamar("/api/nido", { nombre: "Carla", ave: "perico", lat: 40.4168, lng: -3.7038 });
try {
  await carla.llamar("/api/loros", { para: sumado.amigo.id, ave: "perico", texto: "hola" });
  chequear(false, "bloquea escribirle a un nido ajeno");
} catch (e) { chequear(String(e).includes("403"), "bloquea escribirle a un nido ajeno"); }

// --- exceso de caracteres ---
try {
  await ana.llamar("/api/loros", {
    para: anaAhora.amigos.find((a) => a.nombre === "Beto").id,
    ave: "perico", texto: "x".repeat(121),
  });
  chequear(false, "el perico rechaza más de 120 caracteres");
} catch { chequear(true, "el perico rechaza más de 120 caracteres"); }

// --- las seis aves no tardan lo mismo, ni siquiera pegadas ---
//
// Antes había un piso de 25 segundos por vuelo, y a corta distancia las seis
// daban exactamente ese número: elegir ave dejaba de significar nada justo con
// la gente que uno tiene cerca. Ahora el piso es de distancia (400 m), así que
// las proporciones sobreviven. Beto se muda al lado de Ana para probarlo — y de
// paso los vuelos de acá abajo duran segundos y no horas.
const idBeto = anaAhora.amigos.find((a) => a.nombre === "Beto").id;
await beto.llamar("/api/ubicacion", { lat: -34.6082, lng: -58.3816 }); // ~500 m de Ana
const cerca = (await ana.llamar("/api/estado")).amigos.find((a) => a.id === idBeto);
console.log(`  Beto se mudó a ${Math.round((cerca.distanciaKm ?? 0) * 1000)} m de Ana`);
chequear((cerca.distanciaKm ?? 9) < 1, "Beto quedó a menos de un kilómetro");

//
// El perico queda afuera de esta comparación a propósito: es el único cuyo
// tiempo no es determinista —si se enamora, llega después que todos— y meterlo
// acá haría fallar la prueba cuatro de cada diez corridas por el motivo
// equivocado. Su desvío se verifica más abajo, con su propia variable.
const ORDEN = ["cuervo", "cotorra", "loro", "guacamayo"];
const duraciones = {};
for (const especie of ORDEN) {
  const l = (await ana.llamar("/api/loros", { para: idBeto, ave: especie, texto: `probando el ${especie}` })).loro;
  duraciones[especie] = l.llegada - l.salida;
}
console.log("  " + ORDEN.map((k) => `${k} ${Math.round(duraciones[k] / 1000)}s`).join(" · "));
chequear(
  ORDEN.every((especie, i) => i === 0 || duraciones[ORDEN[i - 1]] < duraciones[especie]),
  "a 500 m las aves siguen tardando distinto, y en el orden correcto"
);
chequear(
  duraciones.guacamayo / duraciones.cuervo > 2.5,
  "y la proporción se mantiene: el guacamayo tarda casi el triple que el cuervo"
);

// --- el vuelo ---
const SECRETO = "Esto no lo puede leer Beto hasta que aterrice el ave.";
const envio = await ana.llamar("/api/loros", { para: idBeto, ave: "loro", texto: SECRETO });
const vuelo = envio.loro;
const segundos = Math.round((vuelo.llegada - vuelo.salida) / 1000);
console.log(`  vuelo de ${Math.round(vuelo.distanciaKm * 1000)} m · ${segundos} s`);

const enVueloBeto = (await beto.llamar("/api/estado")).loros.find((l) => l.id === vuelo.id);
chequear(!!enVueloBeto, "a Beto le aparece el loro en el aire");
chequear(enVueloBeto.texto === null, "EL TEXTO NO VIAJA mientras el ave vuela");
chequear(enVueloBeto.llego === false, "figura como en vuelo");
chequear(enVueloBeto.otro.nombre === "Ana", "sabe de quién viene");
chequear(
  enVueloBeto.perdido === false && enVueloBeto.extravio === null,
  "mientras vuela no se filtra si se va a perder"
);

const enVueloAna = (await ana.llamar("/api/estado")).loros.find((l) => l.id === vuelo.id);
chequear(enVueloAna.texto === SECRETO, "Ana sí ve su propio texto desde el minuto cero");

// --- leer antes de tiempo ---
try {
  const r = await beto.llamar("/api/loros/leer", { id: vuelo.id });
  chequear(r.loro.texto === null, "abrirlo antes de tiempo no revela nada");
} catch { chequear(true, "abrirlo antes de tiempo no revela nada"); }

// --- esperar el final del vuelo ---
console.log(`  esperando ${segundos + 4} s…`);
await new Promise((r) => setTimeout(r, (segundos + 4) * 1000));

const final = (await beto.llamar("/api/estado")).loros.find((l) => l.id === vuelo.id);

if (MODO_EXTRAVIO) {
  console.log("  (modo extravío: todos los loros se pierden)");
  chequear(final.perdido === true, "el loro se perdió");
  chequear(final.llego === false, "y NO figura como llegado");
  chequear(final.texto === null, "Beto NUNCA ve el texto de un loro perdido");
  chequear(Boolean(final.motivo), "viene el motivo de lo que le pasó");
  chequear(
    final.extravio > vuelo.salida && final.extravio < vuelo.llegada,
    "se perdió en el medio del camino, no al despegar ni al llegar"
  );

  const deAna = (await ana.llamar("/api/estado")).loros.find((l) => l.id === vuelo.id);
  chequear(deAna.perdido === true, "Ana también se entera");
  chequear(deAna.texto === SECRETO, "y recupera su texto para volver a mandarlo");

  const intento = await beto.llamar("/api/loros/leer", { id: vuelo.id });
  chequear(
    intento.loro.texto === null && !intento.loro.leido,
    "abrir un loro perdido no revela nada ni lo marca leído"
  );
} else {
  chequear(final.llego === true, "aterrizó");
  chequear(final.perdido === false, "no se perdió");
  chequear(final.texto === SECRETO, "recién ahora Beto lee el mensaje");

  const leido = await beto.llamar("/api/loros/leer", { id: vuelo.id });
  chequear(!!leido.loro.leido, "queda marcado como leído");
}

// --- Carla no ve nada de esto ---
const deCarla = await carla.llamar("/api/estado");
chequear(!deCarla.loros.some((l) => l.id === vuelo.id), "un tercero no ve el loro ajeno");

// --- la cotorra repite tanto el mensaje que se le mezcla ---
const CARTA = "Che acordate de traer el cargador que me lo dejé en tu casa el finde pasado";
const conCotorra = (
  await ana.llamar("/api/loros", { para: idBeto, ave: "cotorra", texto: CARTA })
).loro;
const esperaCotorra = Math.round((conCotorra.llegada - conCotorra.salida) / 1000) + 4;
console.log(`  cotorra en el aire, ${esperaCotorra} s…`);

const volando = (await beto.llamar("/api/estado")).loros.find((l) => l.id === conCotorra.id);
chequear(volando.olvido === false, "mientras vuela no se adelanta que va a llegar mezclado");

await new Promise((r) => setTimeout(r, esperaCotorra * 1000));
const mordido = (await beto.llamar("/api/estado")).loros.find((l) => l.id === conCotorra.id);
chequear(mordido.llego === true, "la cotorra aterrizó");
chequear(mordido.olvido === true, "avisa que llegó cambiado");
chequear(mordido.texto !== CARTA, `a Beto le llega mezclado: "${mordido.texto}"`);

// Cambiado, no destruido: tiene que seguir entendiéndose.
const comunes = CARTA.split(" ").filter((w) => mordido.texto.includes(w)).length;
chequear(comunes / CARTA.split(" ").length > 0.7, "pero se entiende igual: quedan casi todas las palabras");
chequear(
  mordido.texto.split(" ")[0] === "Che" && mordido.texto.endsWith("pasado"),
  "no toca ni la primera ni la última palabra"
);

const delLadoDeAna = (await ana.llamar("/api/estado")).loros.find((l) => l.id === conCotorra.id);
chequear(delLadoDeAna.texto === CARTA, "Ana sigue viendo lo que escribió");
chequear(delLadoDeAna.entregado === mordido.texto, "y ve cómo llegó del otro lado");

const otraVezMordido = (await beto.llamar("/api/estado")).loros.find((l) => l.id === conCotorra.id);
chequear(otraVezMordido.texto === mordido.texto, "la mezcla es la misma en cada consulta");

// --- el loro clásico no toca nada ---
const conLoro = (await ana.llamar("/api/loros", { para: idBeto, ave: "loro", texto: CARTA })).loro;
await new Promise((r) => setTimeout(r, (conLoro.llegada - conLoro.salida) + 3000));
const intacto = (await beto.llamar("/api/estado")).loros.find((l) => l.id === conLoro.id);
chequear(intacto.texto === CARTA, "el loro entrega el mensaje tal cual se escribió");
chequear(intacto.olvido === false, "y no dice que lo haya cambiado");

// --- qué hace Beto con el ave que le quedó en la ventana ---
chequear(intacto.suerte === null, "el ave queda posada, sin destino decidido");
const soltado = (await beto.llamar("/api/loros/suerte", { id: conLoro.id, suerte: "soltado" })).loro;
chequear(soltado.suerte === "soltado", "Beto lo suelta");
chequear(!!soltado.vuelta, "y aparece el vuelo de vuelta");
chequear(
  Math.abs((soltado.vuelta.llegada - soltado.vuelta.salida) - (conLoro.llegada - conLoro.salida)) < 2000,
  "volver cuesta lo mismo que venir"
);
const deVueltaAna = (await ana.llamar("/api/estado")).loros.find((l) => l.id === conLoro.id);
chequear(!!deVueltaAna.vuelta, "Ana ve que su loro vuelve, sin que Beto le haya escrito nada");

// No se puede cambiar de opinión, ni decidir por un ave ajena.
const otraVezSuerte = (await beto.llamar("/api/loros/suerte", { id: conLoro.id, suerte: "puchero" })).loro;
chequear(otraVezSuerte.suerte === "soltado", "una vez decidido no se cambia");
try {
  await ana.llamar("/api/loros/suerte", { id: conLoro.id, suerte: "enjaulado" });
  chequear(false, "quien lo mandó no decide el destino del ave");
} catch { chequear(true, "quien lo mandó no decide el destino del ave"); }

// --- las dos aves nuevas ---
const conPaloma = (await ana.llamar("/api/loros", { para: idBeto, ave: "paloma", texto: "te quiero" })).loro;
chequear(conPaloma.ave === "paloma", "la paloma vuela");
const conCuervo = (await ana.llamar("/api/loros", { para: idBeto, ave: "cuervo", texto: "malas noticias" })).loro;
chequear(conCuervo.ave === "cuervo", "el cuervo también");
chequear(
  conCuervo.llegada - conCuervo.salida < conPaloma.llegada - conPaloma.salida,
  "y el cuervo llega antes que la paloma: las malas noticias no se demoran"
);
try {
  await ana.llamar("/api/loros", { para: idBeto, ave: "cuervo", texto: "x".repeat(251) });
  chequear(false, "el cuervo rechaza más de 250 caracteres");
} catch { chequear(true, "el cuervo rechaza más de 250 caracteres"); }

// --- el perico se distrae ---
const conPerico = (await ana.llamar("/api/loros", { para: idBeto, ave: "perico", texto: CARTA.slice(0, 110) })).loro;
const recienSalido = (await beto.llamar("/api/estado")).loros.find((l) => l.id === conPerico.id);
chequear(
  recienSalido.desvio === null,
  "recién salido no se filtra si se va a distraer (igual que el extravío)"
);
if (MODO_ROMANCE) {
  console.log("  (modo romance: todos los pericos se distraen)");
  // El perico limpio recorre 500 m en unos 20 s. Con el desvío, el piso son 40
  // segundos más de vueltas.
  chequear(
    conPerico.llegada - conPerico.salida > 55_000,
    `con romance forzado el vuelo dura mucho más que el limpio (${Math.round(
      (conPerico.llegada - conPerico.salida) / 1000
    )} s)`
  );
  const retocado = (await ana.llamar("/api/estado")).loros.find((l) => l.id === conPerico.id);
  chequear(retocado.texto.startsWith("Che"), "quien lo mandó sigue viendo su propio texto");
}

// --- carreras: lo que se rompía solo con gente de verdad ---
//
// Estos cuatro no fallaban nunca de a uno. Fallaban cuando dos pedidos caían
// en el mismo instante, que es lo que pasa apenas hay tráfico — y fallaban en
// silencio, sin un error que mirar. Van acá para que no vuelvan.
console.log("\n— concurrencia —");
{
  const popular = cliente("Popular");
  await popular.llamar("/api/nido", { nombre: "Popular", lat: -34.55, lng: -58.5 });
  const suCodigo = (await popular.llamar("/api/estado")).codigo;

  const fans = [];
  for (let i = 0; i < 6; i++) {
    const f = cliente(`Fan${i}`);
    await f.llamar("/api/nido", { nombre: `Fan${i}`, lat: -34.5 + i * 0.01, lng: -58.5 });
    fans.push(f);
  }
  // Seis personas tocando el mismo link de invitación a la vez. Antes quedaba
  // UNA: la bandada era un documento y cada uno pisaba al anterior.
  await Promise.all(fans.map((f) => f.llamar("/api/amigos", { codigo: suCodigo })));
  const bandada = (await popular.llamar("/api/estado")).amigos.filter((a) => !a.bot);
  chequear(bandada.length === 6, `seis personas te agregan a la vez y quedan las seis (${bandada.length})`);

  let deUnLado = 0;
  for (const f of fans) {
    if (!(await f.llamar("/api/estado")).amigos.some((a) => a.nombre === "Popular")) deUnLado++;
  }
  chequear(deUnLado === 0, "y la amistad queda de los dos lados en todos los casos");
}

{
  // Doña Cotorra contestaba cuatro veces el mismo loro si cuatro consultas de
  // estado caían encimadas — la app abierta en dos pestañas alcanza.
  const solo = cliente("Sola");
  await solo.llamar("/api/nido", { nombre: "Sola", lat: 19.43, lng: -99.13 });
  const vecina = (await solo.llamar("/api/estado")).amigos.find((a) => a.bot);
  const aVecina = (await solo.llamar("/api/loros", { para: vecina.id, ave: "perico", texto: "hola" })).loro;
  await new Promise((r) => setTimeout(r, aVecina.llegada - aVecina.salida + 1500));
  await Promise.all([1, 2, 3, 4].map(() => solo.llamar("/api/estado")));
  await new Promise((r) => setTimeout(r, 500));
  const respuestas = (await solo.llamar("/api/estado")).loros.filter(
    (l) => l.direccion === "recibido" && l.otro.bot
  );
  chequear(respuestas.length === 1, `Doña Cotorra contesta UNA vez, no cuatro (${respuestas.length})`);
}

{
  // Doble toque en el destino del ave: las dos respuestas tienen que coincidir
  // con lo que quedó guardado. Antes una decía "soltado" y el ave terminaba en
  // el puchero.
  const doble = (await ana.llamar("/api/loros", { para: idBeto, ave: "cuervo", texto: "doble toque" })).loro;
  await new Promise((r) => setTimeout(r, doble.llegada - doble.salida + 2000));
  const dos = await Promise.all([
    beto.llamar("/api/loros/suerte", { id: doble.id, suerte: "soltado" }).catch(() => ({})),
    beto.llamar("/api/loros/suerte", { id: doble.id, suerte: "puchero" }).catch(() => ({})),
  ]);
  const guardado = (await beto.llamar("/api/estado")).loros.find((l) => l.id === doble.id).suerte;
  chequear(
    dos.every((d) => !d.loro || d.loro.suerte === guardado),
    `un doble toque no puede dar dos destinos distintos (${dos.map((d) => d.loro?.suerte).join("/")} · guardado ${guardado})`
  );

  // Y quien lo mandó tiene que poder enterarse: el destino viaja en su vista.
  const deAna = (await ana.llamar("/api/estado")).loros.find((l) => l.id === doble.id);
  chequear(deAna.suerte === guardado, "quien lo mandó ve qué hicieron con su ave");
}

// --- la vista del resto ---
//
// Lo que se chequea acá no es que la lista tenga cosas: es que lo que tiene NO
// alcance para saber de quién son. Un mapa del mundo que filtra nombres o
// coordenadas de verdad es peor que no tener mapa del mundo.
// Un vuelo largo recién soltado, para tener algo garantizado en el aire: los
// de más arriba ya aterrizaron mientras corrían las pruebas de concurrencia.
await ana.llamar("/api/loros", { para: idBeto, ave: "guacamayo", texto: "para mirar desde arriba" });
const carlaVe = await carla.llamar("/api/mundo");
const mio = carlaVe.vuelos.find((v) => v.ave === "guacamayo");
chequear(carlaVe.vuelos.length > 0, `Carla ve vuelos ajenos en el mundo (${carlaVe.vuelos.length})`);
chequear(!!mio, "entre ellos, aves que ella no mandó");

const crudo = JSON.stringify(carlaVe);
for (const [aguja, que] of [
  ["Ana", "el nombre de quien lo mandó"],
  ["Beto", "el nombre de quien lo recibe"],
  [idBeto, "el id del nido"],
  [estAna.codigo, "el código del nido"],
  ["te quiero", "el texto del mensaje"],
  ["malas noticias", "el texto del mensaje"],
]) {
  chequear(!crudo.includes(aguja), `la vista del resto NO filtra ${que}`);
}
chequear(
  mio.origen && !("nombre" in mio) && !("otro" in mio) && !("texto" in mio),
  "cada vuelo trae ruta y horarios, y nada más"
);

// Las puntas están a escala de ciudad, no de casa.
const lejos = metros(REAL_ANA, mio.origen);
console.log(`  la punta del vuelo se ve a ${(lejos / 1000).toFixed(1)} km de donde salió`);
chequear(lejos > 1000, "la punta NO está donde está el nido de verdad");
chequear(lejos <= 25_000 + 500, "pero sí adentro de los 25 km declarados");

// Y el corrimiento del mundo no es el mismo que el de la bandada: si lo fuera,
// cruzar las dos vistas daría el rumbo del desvío, que es medio secreto.
const enLaBandada = (await beto.llamar("/api/estado")).amigos.find((a) => a.nombre === "Ana");
chequear(
  metros(enLaBandada, mio.origen) > 500,
  "el punto del mundo y el de la bandada son distintos (semillas separadas)"
);

// Apagar el interruptor saca TODOS tus vuelos, no solo los próximos.
await ana.llamar("/api/nido", { nombre: "Ana", publico: false });
const despues = await carla.llamar("/api/mundo");
chequear(
  despues.vuelos.length < carlaVe.vuelos.length,
  `apagando «Del resto» los vuelos de Ana desaparecen (${carlaVe.vuelos.length} → ${despues.vuelos.length})`
);
await ana.llamar("/api/nido", { nombre: "Ana", publico: true });
chequear(
  (await carla.llamar("/api/mundo")).vuelos.length === carlaVe.vuelos.length,
  "y volviéndolo a prender, vuelven"
);
// Guardar el nombre no puede volver a prenderlo solo.
await ana.llamar("/api/nido", { nombre: "Ana", publico: false });
await ana.llamar("/api/nido", { nombre: "Ana Laura" });
chequear(
  (await carla.llamar("/api/mundo")).vuelos.length < carlaVe.vuelos.length,
  "y editar el nombre no te vuelve a meter en el mapa sin querer"
);
await ana.llamar("/api/nido", { nombre: "Ana", publico: true });

// Doña Cotorra no cuenta como gente.
chequear(
  !JSON.stringify(await ana.llamar("/api/mundo")).includes("vecina-"),
  "los vuelos de Doña Cotorra no entran al mundo"
);

// Y sin nido no se mira el mundo.
const nadie = cliente("sin nido");
try {
  await nadie.llamar("/api/mundo");
  chequear(false, "sin nido no se puede mirar el mundo");
} catch (e) { chequear(String(e).includes("401"), "sin nido no se puede mirar el mundo"); }

// --- la bandada perdida vuelve ---
//
// Una versión anterior migraba la bandada al formato nuevo y borraba el
// documento viejo SIN mirar si la escritura había entrado. Con la tabla de
// conjuntos sin crear —o con un timeout— las amistades desaparecían de verdad.
// Acá se reproduce el daño a mano y se verifica que la app las reconstruye
// sola desde el historial de loros, que es lo que quedó.
{
  const archivo = new URL("../.data/loros.json", import.meta.url);
  let dañado = false;
  let idAna = null;
  try {
    const datos = JSON.parse(await readFile(archivo, "utf8"));
    idAna = datos[`codigo:${estAna.codigo.toUpperCase()}`];
    if (idAna && Array.isArray(datos[`bandada:${idAna}`])) {
      // El daño exacto: la bandada vacía y ningún documento viejo del que tirar.
      delete datos[`bandada:${idAna}`];
      delete datos[`amigos:${idAna}`];
      await writeFile(archivo, JSON.stringify(datos), "utf8");
      dañado = true;
    }
  } catch {}

  if (!dañado) {
    console.log("   (sin backend de archivo: no se puede simular la pérdida)");
  } else {
    const rota = await ana.llamar("/api/estado");
    const vuelta = rota.amigos.map((a) => a.nombre);
    chequear(
      vuelta.includes("Beto"),
      `la bandada borrada se reconstruye desde el historial (${vuelta.join(", ") || "vacía"})`
    );
    // Y del otro lado también: `emparejar` escribe las dos puntas, así que con
    // que UNA de las dos personas abra la app, la amistad vuelve para ambas.
    chequear(
      (await beto.llamar("/api/estado")).amigos.some((a) => a.nombre === "Ana"),
      "y Beto también recupera a Ana sin tocar nada"
    );
  }
}

// --- la llave: el mismo nido en otro dispositivo ---
const { llave } = await ana.llamar("/api/sesion");
const compuDeAna = cliente("Ana (compu)");
const r = await compuDeAna.abrir(`/entrar?llave=${encodeURIComponent(llave)}`);
chequear(r.status === 303, "la llave redirige al mapa");
const enLaCompu = await compuDeAna.llamar("/api/estado");
chequear(enLaCompu.codigo === estAna.codigo, "es el MISMO nido, con su código y su bandada");
chequear(enLaCompu.loros.some((l) => l.id === vuelo.id), "y con su historial de loros");

const conLlaveTrucha = cliente("intruso");
await conLlaveTrucha.abrir("/entrar?llave=aaaaaaaaaaaa.bbbbbbbbbbbb");
chequear((await conLlaveTrucha.llamar("/api/estado")).yo === null, "una llave falsa no abre nada");

console.log(fallos ? `\n${fallos} FALLO(S)` : "\nTodo en verde ✓");
process.exit(fallos ? 1 : 0);
