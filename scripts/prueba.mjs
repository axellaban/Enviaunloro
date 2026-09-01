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
    async llamar(ruta, datos, metodo) {
      const r = await fetch(BASE + ruta, {
        method: metodo || (datos ? "POST" : "GET"),
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

// --- el arco del mapa ---
//
// Las rutas se dibujan con una panza al costado: un ave despega, toma altura y
// baja del otro lado, y una recta no cuenta nada de eso. Lo que se verifica acá
// es que el adorno no toque el producto —el ave sale del nido, llega al nido, y
// la distancia con la que se calcula el tiempo sigue siendo la real— porque un
// dibujo lindo que mueve las cuentas es un bug con buena presencia.
{
  let geo = null;
  try {
    geo = await import("../lib/geo.ts");
  } catch {
    console.log("   (este Node no lee TypeScript: sin chequeo del arco)");
  }
  if (geo) {
    const { distanciaKm, puntoEnRuta, puntoEnArco, arco, flechaKm, CURVA, CURVA_TECHO_KM } = geo;
    const largo = (ps) => ps.slice(1).reduce((t, q, i) => t + distanciaKm(ps[i], q), 0);
    const casos = [
      ["vecinos", { lat: -34.6037, lng: -58.3816 }, { lat: -34.606, lng: -58.38 }],
      ["misma ciudad", { lat: -34.6037, lng: -58.3816 }, { lat: -34.69, lng: -58.29 }],
      ["cruzando el Atlántico", { lat: -34.6037, lng: -58.3816 }, { lat: 40.4168, lng: -3.7038 }],
    ];
    for (const [nombre, a, b] of casos) {
      const ps = arco(a, b, 256);
      chequear(
        distanciaKm(ps[0], a) < 1e-6 && distanciaKm(ps[ps.length - 1], b) < 1e-6,
        `${nombre}: el arco sale del nido y aterriza en el nido, no al lado`
      );

      const panza = distanciaKm(puntoEnArco(a, b, 0.5), puntoEnRuta(a, b, 0.5));
      const esperada = flechaKm(distanciaKm(a, b));
      chequear(
        Math.abs(panza - esperada) < Math.max(1e-6, esperada * 0.01),
        `${nombre}: la panza mide lo que dice (${panza.toFixed(2)} km)`
      );

      // Lo que importa: el camino dibujado no alarga el viaje. Si esto se
      // dispara, el ave estaría cruzando la pantalla más rápido que los km/h
      // que promete su tarjeta.
      const recto = largo(Array.from({ length: 257 }, (_, i) => puntoEnRuta(a, b, i / 256)));
      const extra = (largo(ps) / recto - 1) * 100;
      chequear(extra < 3, `${nombre}: el dibujo es ${extra.toFixed(2)}% más largo que la distancia real`);

      // La vuelta cae del otro lado sola, porque la panza va siempre al mismo
      // lado de la marcha. Si se pisaran, un mensaje que va y vuelve sería una
      // sola línea.
      chequear(
        distanciaKm(puntoEnArco(a, b, 0.5), puntoEnArco(b, a, 0.5)) > esperada * 1.5,
        `${nombre}: la vuelta se dibuja del otro lado`
      );
    }

    // Los vuelos largos ya se curvan solos: ahí la panza toca el techo y no
    // convierte el cruce del Atlántico en un rulo.
    chequear(
      flechaKm(10_000) === CURVA_TECHO_KM && Math.abs(flechaKm(100) - 100 * CURVA) < 1e-9,
      `la panza es proporcional hasta el techo de ${CURVA_TECHO_KM} km`
    );

    // Y con la curva en cero vuelve a ser lo de antes, sin sacar una línea.
    const recto = arco({ lat: 0, lng: 0 }, { lat: 10, lng: 10 }, 32, 0);
    chequear(
      recto.every((q, i) => distanciaKm(q, puntoEnRuta({ lat: 0, lng: 0 }, { lat: 10, lng: 10 }, i / 32)) < 1e-9),
      "con la curva en 0 las rutas vuelven a ser el círculo máximo pelado"
    );
  }
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

// --- qué le contesta el link de invitación a cada uno ---
//
// El mismo link lo abren cuatro personas distintas y la portada tiene que
// decirles cosas distintas. Les decía a todas lo mismo —"Armar mi nido y sumar
// a Fulana"— también a quien ya tenía nido, prometiéndole un trámite que no
// existe, y a quien abría su propio link, ofreciéndole sumarse a sí mismo. Lo
// que pasaba al tocar el botón siempre estuvo bien: el nido detecta que ya
// está armado y solo suma al otro. Era el texto el que mentía.
{
  const deAna = `/api/invitacion?n=${encodeURIComponent(estAna.codigo)}`;

  const afuera = cliente("Afuera");
  const v1 = await afuera.llamar(deAna);
  chequear(
    v1.invita?.nombre === "Ana" && v1.tenesNido === false && v1.yaEsAmigo === false,
    "sin nido: la portada ofrece armarlo y sumar a Ana"
  );

  const v2 = await beto.llamar(deAna);
  chequear(
    v2.tenesNido === true && v2.yaEsAmigo === true && v2.sosVos === false,
    "con nido y ya en esa bandada: no le ofrece sumarla de nuevo"
  );

  const v3 = await ana.llamar(deAna);
  chequear(v3.sosVos === true, "abriendo su propio link, a Ana no le ofrece sumarse a sí misma");

  const dina = cliente("Dina");
  await dina.llamar("/api/nido", { nombre: "Dina", lat: -31.42, lng: -64.18 });
  const v4 = await dina.llamar(deAna);
  chequear(
    v4.tenesNido === true && v4.yaEsAmigo === false && v4.sosVos === false,
    "con nido y sin ser de esa bandada: le ofrece sumar a Ana, no armar un nido"
  );

  // Y del que mira no sale NADA más que esos tres booleanos: es un endpoint
  // público, y lo que se contesta de más no se recupera nunca.
  chequear(
    Object.keys(v4).sort().join(",") === "invita,sosVos,tenesNido,yaEsAmigo",
    "y del que mira no sale nada más: ni su nombre ni su id"
  );

  await dina.llamar("/api/amigos", { codigo: estAna.codigo });
  const v5 = await dina.llamar(deAna);
  chequear(v5.yaEsAmigo === true, "apenas la suma, el mismo link deja de ofrecerlo");
}

// --- el lorito de convite: el que espera en la cervecería ---
//
// Mandarle un mensaje a alguien que TODAVÍA NO ESTÁ en la app. El ave despega
// igual, se posa en una cervecería a dos minutos de vuelo y espera ahí a que
// esa persona abra el link y arme su nido. Lo que se verifica es lo que
// sostiene el invento:
//
//   El texto NO sale del servidor por el link. Si saliera, el link SERÍA el
//   mensaje, armar el nido no destrabaría nada y la app entera dejaría de
//   tener sentido. Es la misma regla que la del loro en vuelo, y acá es la
//   que más fácil se rompe sin darse cuenta.
//
//   Tampoco salen las coordenadas de la barra: están a pocos kilómetros del
//   nido de quien lo mandó, así que darlas es contar dónde vive.
//
//   El ave sale DE LA BARRA, no del nido. Es de donde está.
{
  const emisor = cliente("Convidante");
  await emisor.llamar("/api/nido", { nombre: "Convidante", ave: "perico", lat: -34.6, lng: -58.38 });
  const est = await emisor.llamar("/api/estado");
  const escala = Number(est.escala) || 1;

  const SECRETO = "Traete el vino tinto que quedó en casa de tu vieja";
  const nuevo = await emisor.llamar("/api/convite", {
    ave: "perico",
    texto: SECRETO,
    para: "Jez",
  });
  const llave = nuevo.convite.id;
  chequear(Boolean(llave), "se puede soltar un lorito para alguien que no tiene nido");
  chequear(
    nuevo.convite.llegadaPosada > nuevo.convite.salida,
    `el ave sale ya y tarda en llegar a la barra (${Math.round((nuevo.convite.llegadaPosada - nuevo.convite.salida) / 1000)} s)`
  );

  const conEsperando = await emisor.llamar("/api/estado");
  chequear(
    conEsperando.convites?.length === 1 && conEsperando.convites[0].texto === SECRETO,
    "quien lo mandó lo ve esperando, y puede releer lo que escribió"
  );

  // Y que se vea desde afuera si algo no anda: "el ave no salió nunca" y "nadie
  // abrió el link" se ven idénticos si /api/salud no lo cuenta.
  const salud = await emisor.llamar("/api/salud");
  chequear(
    salud.convites?.esperando === 1 && salud.convites?.reclamados === 0,
    "/api/salud dice cuántos loritos hay esperando en la barra"
  );
  // Y todavía nadie lo abrió. Es la mitad del embudo que faltaba: sin este
  // número, "nadie abrió el link" y "lo abrieron y no armaron el nido" se ven
  // exactamente igual, y se arreglan para lados opuestos.
  chequear(salud.convites?.abiertos === 0, "y que a este todavía no lo abrió nadie");

  // El dueño mirando su propio link no cuenta. Es la visita más común de todas
  // —"a ver si anda"— y la única que no significa nada.
  await emisor.llamar(`/api/convite?c=${encodeURIComponent(llave)}`);
  chequear(
    (await emisor.llamar("/api/salud")).convites?.abiertos === 0,
    "y que el dueño probando su propio link no cuenta como apertura"
  );

  // El ave no espera para siempre: a las 48 horas se cansa y se vuelve. Los dos
  // horarios se calculan, no se guardan, así que lo que se verifica es la
  // cuenta —esperar dos días de reloj para ver el resto no es una prueba.
  const c0 = conEsperando.convites[0];
  const CUARENTA_Y_OCHO = (48 * 3_600_000) / escala;
  chequear(
    Math.abs(c0.abandona - (c0.llegadaPosada + CUARENTA_Y_OCHO)) < 1500,
    "se cansa de esperar a las 48 horas, ni antes ni nunca"
  );
  chequear(
    c0.enCasa > c0.abandona && c0.estado === "yendo",
    "y después tarda en volver lo que tardó en ir"
  );

  // Y ahora lo que de verdad importa: qué se cuenta por el link.
  const afuera = cliente("Afuera");
  const publico = await afuera.llamar(`/api/convite?c=${encodeURIComponent(llave)}`);
  chequear(publico.convite?.de === "Convidante", "el link dice quién lo mandó");
  chequear(publico.convite?.ave === "perico", "y con qué ave");
  chequear(publico.convite?.para === "Jez", "y a quién iba dirigido");
  const crudo = JSON.stringify(publico);
  chequear(!crudo.includes(SECRETO), "pero NO el mensaje: para eso hay que armar el nido");
  chequear(!crudo.includes("vino"), "ni un pedazo de él");
  // Por claves y no por substring: "La Plata" contiene "lat", y una prueba que
  // se rompe según en qué ciudad viva la persona no prueba nada.
  chequear(
    Object.keys(publico.convite).sort().join(",") ===
      "ave,barrio,copetines,de,enLaBarra,estado,haciendo,llegadaPosada,lugar,para,salida,yaSalio",
    "ni dónde queda la cervecería, que está a metros de la casa de quien lo mandó"
  );

  // Pero el de afuera sí, y una sola vez por link aunque lo abra seis veces:
  // se cuentan links, no visitas. Es lo que hace que el porcentaje signifique
  // algo — y de paso, la página lo pide dos veces sola, así que sin dedup el
  // número saldría al doble.
  await afuera.llamar(`/api/convite?c=${encodeURIComponent(llave)}`);
  await afuera.llamar(`/api/convite?c=${encodeURIComponent(llave)}`);
  const conApertura = await emisor.llamar("/api/salud");
  chequear(
    conApertura.convites?.abiertos === 1,
    `pero alguien de afuera sí, y una sola vez por link (${conApertura.convites?.abiertos})`
  );

  // Del otro lado: alguien arma su nido y el ave se levanta de la mesa. Se lo
  // planta cerca de la barra para que el segundo tramo dure poco.
  const barra = conEsperando.convites[0].posada;
  const receptor = cliente("Jez");
  await receptor.llamar("/api/nido", { nombre: "Jez", lat: barra.lat + 0.004, lng: barra.lng + 0.004 });

  // Si la escala está acelerada se lo deja tomar unos copetines antes de
  // abrirlo; si no, se abre enseguida y el ave llega sobria.
  const seEmborracha = escala >= 100;
  if (seEmborracha) {
    console.log("   (escala acelerada: se lo deja tomando unos copetines)");
    await new Promise((r) => setTimeout(r, 12_000));
  }

  const antesDelReclamo = Date.now();
  const reclamo = await receptor.llamar("/api/convite/reclamar", { c: llave });
  chequear(reclamo.de === "Convidante", "abrir el link con nido propio destraba el lorito");
  const vuelo = reclamo.loro;
  chequear(vuelo.texto === null, "y el texto SIGUE sin viajar: el ave todavía está en el aire");
  chequear(Boolean(vuelo.parada), "el loro sabe que salió de una cervecería");
  chequear(
    vuelo.parada.salida >= vuelo.parada.llegada,
    "y que se levantó de la mesa después de haberse sentado"
  );
  // No sale corriendo apenas abren el link: se queda un minuto más terminando.
  // Es el mejor momento de todo esto —alguien acaba de armar su nido y lo
  // primero que ve es un ave en una barra— y si el ave saliera en el acto no
  // llegaría a verlo nadie.
  const minimo = 60_000 / escala;
  chequear(
    vuelo.salida - antesDelReclamo >= minimo * 0.9,
    `y que no sale hasta dentro de al menos un minuto (${Math.round((vuelo.salida - antesDelReclamo) / (minimo / 60))} s de reloj de la app)`
  );

  const jezEnVuelo = await receptor.llamar("/api/estado");
  chequear(
    !JSON.stringify(jezEnVuelo).includes(SECRETO),
    "tampoco viaja en la consulta de estado mientras vuela"
  );
  chequear(
    jezEnVuelo.amigos.some((a) => a.nombre === "Convidante"),
    "quedaron en la misma bandada, de este lado"
  );
  const emisorAhora = await emisor.llamar("/api/estado");
  chequear(
    emisorAhora.amigos.some((a) => a.nombre === "Jez"),
    "y del otro"
  );
  chequear(
    (emisorAhora.convites ?? []).length === 0,
    "y el convite deja de estar esperando: ahora la historia la cuenta el loro"
  );

  // El embudo, ya completo: se abrió y se convirtió. Un reclamado sigue
  // contando como abierto —para reclamarlo hubo que abrirlo— y eso importa
  // porque desde el reclamo se deja de escribir la apertura: si no se contara
  // acá, el número bajaría solo justo cuando el link funcionó.
  const saludFinal = await emisor.llamar("/api/salud");
  chequear(
    saludFinal.convites?.abiertos === 1 && saludFinal.convites?.reclamados === 1,
    `y el embudo cierra: 1 abierto, 1 reclamado (${saludFinal.convites?.abiertos}/${saludFinal.convites?.reclamados})`
  );

  // El ave es una y el mensaje era para una persona.
  const otro = cliente("Colado");
  await otro.llamar("/api/nido", { nombre: "Colado", lat: -34.7, lng: -58.5 });
  try {
    await otro.llamar("/api/convite/reclamar", { c: llave });
    chequear(false, "un tercero no puede quedarse con un lorito ya reclamado");
  } catch {
    chequear(true, "un tercero no puede quedarse con un lorito ya reclamado");
  }
  try {
    await emisor.llamar("/api/convite/reclamar", { c: llave });
    chequear(false, "y quien lo mandó no se lo puede reclamar a sí mismo");
  } catch {
    chequear(true, "y quien lo mandó no se lo puede reclamar a sí mismo");
  }
  // Pero recargar la página con el link todavía en la barra de direcciones no
  // puede explotar: es el mismo loro, no uno nuevo ni un error.
  const otraVez = await receptor.llamar("/api/convite/reclamar", { c: llave });
  chequear(otraVez.loro.id === vuelo.id, "y abrirlo dos veces devuelve el mismo loro, no dos");

  // --- llamarlo de vuelta ---
  //
  // La única forma de deshacer un lorito soltado por error. Un silbido: el ave
  // vuelve y el link deja de servir.
  {
    const arrepentido = cliente("Arrepentido");
    await arrepentido.llamar("/api/nido", { nombre: "Arrepentido", ave: "loro", lat: -34.55, lng: -58.45 });
    const suyo = (await arrepentido.llamar("/api/convite", { ave: "loro", texto: "Uy, no era para vos.", para: "Nadie" })).convite;

    const ajeno = cliente("Ajeno");
    await ajeno.llamar("/api/nido", { nombre: "Ajeno", lat: -34.56, lng: -58.46 });
    try {
      await ajeno.llamar("/api/convite", { c: suyo.id }, "DELETE");
      chequear(false, "un lorito ajeno no se puede llamar de vuelta");
    } catch {
      chequear(true, "un lorito ajeno no se puede llamar de vuelta");
    }

    const baja = await arrepentido.llamar("/api/convite", { c: suyo.id }, "DELETE");
    chequear(baja.ok === true, "pero el propio sí, y el ave arranca de vuelta");

    // Y el link, que ya está mandado, deja de traer nada.
    const tarde = cliente("Tarde");
    await tarde.llamar("/api/nido", { nombre: "Tarde", lat: -34.57, lng: -58.47 });
    try {
      await tarde.llamar("/api/convite/reclamar", { c: suyo.id });
      chequear(false, "y el link deja de servir: es todo el punto de llamarlo");
    } catch {
      chequear(true, "y el link deja de servir: es todo el punto de llamarlo");
    }
    const publico2 = await tarde.llamar(`/api/convite?c=${encodeURIComponent(suyo.id)}`);
    chequear(publico2.convite?.estado === "cancelado", "y la portada lo cuenta en vez de prometer un ave");

    // Un loro ya reclamado no se llama de vuelta: eso ya es un vuelo, y lo que
    // se hace con un ave que llegó lo decide quien la recibió.
    try {
      await emisor.llamar("/api/convite", { c: llave }, "DELETE");
      chequear(false, "un lorito ya reclamado no se puede llamar de vuelta");
    } catch {
      chequear(true, "un lorito ya reclamado no se puede llamar de vuelta");
    }
  }

  // Y al aterrizar: el mensaje entero, con o sin hipo según lo que esperó.
  await new Promise((r) => setTimeout(r, vuelo.llegada - Date.now() + 2500));
  const buzon = await receptor.llamar("/api/estado");
  const llegado = buzon.loros.find((l) => l.id === vuelo.id);
  chequear(Boolean(llegado?.llego), "el lorito aterriza en el nido recién armado");
  console.log(`  llegó: "${llegado?.texto}"`);
  const palabras = (t) => (t || "").split(/\s+/).filter((w) => w !== "¡hip!").length;
  chequear(
    palabras(llegado?.texto) === palabras(SECRETO),
    "y no le falta ni una palabra del mensaje: es lo primero que esa persona lee de la app"
  );
  if (seEmborracha) {
    chequear(llegado.parada.copetines > 0, `se tomó ${llegado?.parada?.copetines} copetines esperando`);
    chequear(String(llegado?.texto).includes("¡hip!"), "y lo entrega con hipo");
  } else {
    chequear(llegado?.texto === SECRETO, "abierto enseguida, el ave no llegó ni a pedir: llega tal cual");
    console.log("   (escala normal: para ver los copetines, LOROS_ESCALA_TIEMPO=600)");
  }
}

// --- la abducción alienígena ---
//
// Lo único que puede hacer quien MANDÓ un loro después de soltarlo: llamar a un
// plato volador que se lo lleve en pleno vuelo. Es la contraparte de la suerte
// del ave —lo que se hace con uno que ya llegó lo decide quien lo recibió— y lo
// que se verifica acá es que sea de verdad irreversible:
//
//   El mensaje NO se entrega, ni siquiera cuando pase su hora de llegada. La
//   hora está escrita desde el despegue, así que sin taparlo el loro
//   "aterrizaba" solo unas horas después y entregaba el texto que la nave se
//   había llevado. Sería un borrado que no borra, que es el peor resultado
//   posible: quien lo pidió se queda creyendo que sí.
//
//   Y no la puede pedir cualquiera sobre el ave de cualquiera.
{
  const emi = cliente("Abductor");
  const rec = cliente("Abducida");
  const nEmi = await emi.llamar("/api/nido", { nombre: "Abductor", ave: "guacamayo", lat: -34.60, lng: -58.40 });
  await rec.llamar("/api/nido", { nombre: "Abducida", ave: "loro", lat: -34.90, lng: -58.70 });
  const codRec = (await rec.llamar("/api/estado")).codigo;
  await emi.llamar("/api/amigos", { codigo: codRec });
  const idRec = (await emi.llamar("/api/estado")).amigos.find((x) => x.nombre === "Abducida").id;

  const SECRETO = "Esto no lo tendria que haber mandado nunca";
  const vuelo = (await emi.llamar("/api/loros", {
    para: idRec, ave: "guacamayo", texto: SECRETO,
  })).loro;
  chequear(vuelo.llegada > Date.now(), "hay un guacamayo en el aire, con su mensaje adentro");

  // Un ave ajena no se abduce: el ave es de quien la mandó.
  const ajeno = cliente("Ajeno a la nave");
  await ajeno.llamar("/api/nido", { nombre: "Ajeno a la nave", lat: -34.7, lng: -58.5 });
  try {
    await ajeno.llamar("/api/loros/abducir", { id: vuelo.id });
    chequear(false, "un tercero no puede abducir un ave que no es suya");
  } catch { chequear(true, "un tercero no puede abducir un ave que no es suya"); }
  // Ni quien la recibe: lo que se hace con un ave que llegó se decide DESPUÉS.
  try {
    await rec.llamar("/api/loros/abducir", { id: vuelo.id });
    chequear(false, "ni quien lo está esperando");
  } catch { chequear(true, "ni quien lo está esperando"); }

  const r = await emi.llamar("/api/loros/abducir", { id: vuelo.id });
  chequear(typeof r.loro.abducido === "number", "pero quien lo mandó sí: vino la nave");

  // Idempotente: recargar con el pedido en vuelo no puede explotar ni mandar
  // dos naves.
  const otraVez = await emi.llamar("/api/loros/abducir", { id: vuelo.id });
  chequear(otraVez.loro.abducido === r.loro.abducido, "y pedirla dos veces no manda dos naves");

  // Lo que de verdad importa: pasada la hora de llegada, el mensaje NO llega.
  await new Promise((res) => setTimeout(res, Math.max(0, vuelo.llegada - Date.now()) + 2500));
  const paraElla = (await rec.llamar("/api/estado")).loros.find((x) => x.id === vuelo.id);
  chequear(Boolean(paraElla), "del otro lado el loro sigue existiendo: no desaparece en silencio");
  chequear(paraElla.llego === false, "pero NO llegó, aunque su hora de llegada ya pasó");
  chequear(paraElla.texto === null, "y el mensaje no se entrega: se lo llevó la nave");
  chequear(
    !JSON.stringify(await rec.llamar("/api/estado")).includes(SECRETO),
    "ni aparece escondido en ningún campo de la consulta"
  );
  chequear(
    typeof paraElla.abducido === "number",
    "y sabe qué le pasó: una nave se lo llevó, no se perdió solo"
  );

  // Ya no se puede abducir algo que ya no está en el aire.
  const yaEsta = (await emi.llamar("/api/loros", { para: idRec, ave: "perico", texto: "otro" })).loro;
  await new Promise((res) => setTimeout(res, Math.max(0, yaEsta.llegada - Date.now()) + 2500));
  try {
    await emi.llamar("/api/loros/abducir", { id: yaEsta.id });
    chequear(false, "y un ave que ya aterrizó no se abduce: ese mensaje ya es del otro");
  } catch { chequear(true, "y un ave que ya aterrizó no se abduce: ese mensaje ya es del otro"); }
}

// --- el lorito de convite que sale en pollera ---
//
// La pollera del loro, pero para alguien que todavía no tiene nido. Lo que se
// verifica es CUÁNDO se cuenta, que es todo el invento: el ave entra a la
// cervecería siendo un loro y sale convertida.
//
//   Por el link no viaja. Es público: lo abre cualquiera a quien se lo
//   reenvíen, y si dijera de antemano que va a salir en pollera no quedaría
//   nada que ver cuando pase. Misma regla que el texto.
//
//   Y en el loro que sale, tampoco hasta que DESPEGA. Entre que abren el link
//   y que el ave se levanta de la mesa pasa un minuto, y en ese minuto sigue
//   siendo un loro: si el campo viajara en el reclamo, la pollera aparecería
//   sentada en la barra contando el final antes de tiempo.
{
  const dona = cliente("Pollerudo");
  await dona.llamar("/api/nido", { nombre: "Pollerudo", ave: "loro", lat: -34.61, lng: -58.39 });
  const escala = Number((await dona.llamar("/api/estado")).escala) || 1;

  const c = (await dona.llamar("/api/convite", {
    ave: "loro", texto: "Abrí el link y vas a ver.", para: "Nico", pollera: true,
  })).convite;
  chequear(c.pollera === true, "un lorito de convite puede salir en pollera");

  // Ninguna otra ave, igual que en un envío común: se ignora en silencio.
  const guaca = (await dona.llamar("/api/convite", {
    ave: "guacamayo", texto: "Un guacamayo con ínfulas.", para: "Nadie", pollera: true,
  })).convite;
  chequear(guaca.pollera === false, "y ninguna otra ave, aunque se lo pidan");

  // Lo ve quien lo mandó, y sólo él: la eligió, esconderla de su lado sería un
  // interruptor que no se sabe si anduvo.
  const mio = (await dona.llamar("/api/estado")).convites.find((x) => x.id === c.id);
  chequear(mio?.pollera === true, "quien lo mandó la ve en su tarjeta mientras el ave espera");

  // Pero el link no la cuenta. Por claves y no por substring: lo que importa es
  // que el campo no esté, no que la palabra no aparezca.
  const miron = cliente("Miron");
  const publico = await miron.llamar(`/api/convite?c=${encodeURIComponent(c.id)}`);
  chequear(publico.convite?.ave === "loro", "el link sigue diciendo con qué ave viene");
  chequear(
    !("pollera" in publico.convite) && !JSON.stringify(publico).includes("pollera"),
    "pero NO que va a salir en pollera: eso se ve cuando pasa, no antes"
  );

  // Del otro lado: se lo planta pegado a la barra para que el vuelo dure poco.
  const nico = cliente("Nico");
  await nico.llamar("/api/nido", { nombre: "Nico", lat: mio.posada.lat + 0.002, lng: mio.posada.lng + 0.002 });
  const reclamo = await nico.llamar("/api/convite/reclamar", { c: c.id });
  chequear(
    reclamo.loro.pollera === false && reclamo.loro.salida > Date.now(),
    "al abrir el link el ave todavía es un loro: le queda un copetín en la barra"
  );

  // Y el momento: despega, y recién ahí es una pollera. Sólo se espera si la
  // escala lo hace barato — el minuto de barra es un minuto de reloj.
  const falta = reclamo.loro.salida - Date.now();
  if (falta < 8000) {
    await new Promise((r) => setTimeout(r, falta + 1200));
    const enElAire = (await nico.llamar("/api/estado")).loros.find((l) => l.id === reclamo.loro.id);
    chequear(enElAire?.pollera === true, "y al despegar de la cervecería se convierte en pollera");
  } else {
    console.log("   (escala normal: para ver la conversión, LOROS_ESCALA_TIEMPO=600)");
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

// --- sacar a alguien de la bandada ---
//
// Lo que de verdad se chequea acá es que la baja NO SE DESHAGA SOLA. El
// rescate de bandada reconstruye amistades leyendo el historial de loros, y
// Ana y Beto ya se mandaron varios: sin la marca de baja, la primera consulta
// con la bandada vacía los volvía a emparejar.
{
  const carlos = cliente("Carlos");
  const nCarlos = await carlos.llamar("/api/nido", {
    nombre: "Carlos", ave: "loro", lat: -34.55, lng: -58.45,
  });
  const anaAntes = await ana.llamar("/api/estado");
  await carlos.llamar("/api/amigos", { codigo: anaAntes.codigo });
  chequear(
    (await carlos.llamar("/api/estado")).amigos.some((a) => a.nombre === "Ana"),
    "Carlos sumó a Ana"
  );
  chequear(
    (await ana.llamar("/api/estado")).amigos.some((a) => a.nombre === "Carlos"),
    "y del lado de Ana también está"
  );

  // Se mandan un loro, que es lo que deja rastro en el historial.
  const idAna = anaAntes.yo.id;
  await carlos.llamar("/api/loros", { para: idAna, ave: "perico", texto: "Hola Ana." });

  const idCarlos = (await ana.llamar("/api/estado")).amigos.find((a) => a.nombre === "Carlos").id;
  await ana.llamar("/api/amigos", { id: idCarlos }, "DELETE");
  chequear(
    !(await ana.llamar("/api/estado")).amigos.some((a) => a.nombre === "Carlos"),
    "Ana lo saca y deja de verlo"
  );
  chequear(
    !(await carlos.llamar("/api/estado")).amigos.some((a) => a.nombre === "Ana"),
    "y del otro lado también: corta por los dos"
  );
  // Carlos quedó con la bandada vacía salvo su vecina, así que si el rescate
  // se dispara es acá.
  const deCarlos = await carlos.llamar("/api/estado");
  chequear(
    !deCarlos.amigos.some((a) => a.nombre === "Ana"),
    "y no vuelve sola por el rescate del historial"
  );
  chequear(
    deCarlos.loros.some((l) => l.otro.nombre === "Ana"),
    "el loro que ya estaba en el aire sigue su viaje"
  );

  // Y volver a sumarse con el código deshace la baja.
  await carlos.llamar("/api/amigos", { codigo: anaAntes.codigo });
  chequear(
    (await carlos.llamar("/api/estado")).amigos.some((a) => a.nombre === "Ana"),
    "y sumándose de nuevo con el código vuelven a verse"
  );

  // Nadie puede cortar amistades ajenas.
  try {
    const idBeto = (await ana.llamar("/api/estado")).amigos.find((a) => a.nombre === "Beto").id;
    await carlos.llamar("/api/amigos", { id: idBeto }, "DELETE");
    chequear(false, "no se puede sacar a alguien que no es de tu bandada");
  } catch (e) {
    chequear(String(e).includes("404"), "no se puede sacar a alguien que no es de tu bandada");
  }
}

// --- la pollera: la gracia del loro ---
//
// El chiste es del LORO y de nadie más. Pedirla con otra ave no rompe nada, y
// eso es justamente lo que hay que verificar: sale el ave de siempre, sin
// error y sin pollera.
{
  const betoId = anaAhora.amigos.find((a) => a.nombre === "Beto").id;
  const conPollera = await ana.llamar("/api/loros", {
    para: betoId, ave: "loro", texto: "Sabés bien por qué.", pollera: true,
  });
  chequear(conPollera.loro.pollera === true, "el loro se puede convertir en pollera");

  const sinPedirla = await ana.llamar("/api/loros", {
    para: betoId, ave: "loro", texto: "Este es un loro de los de siempre.",
  });
  chequear(sinPedirla.loro.pollera === false, "y sin pedirla, sale loro");

  const otraAve = await ana.llamar("/api/loros", {
    para: betoId, ave: "guacamayo", texto: "Un guacamayo con ínfulas.", pollera: true,
  });
  chequear(otraAve.loro.pollera === false, "ninguna otra ave se convierte, aunque se lo pidan");

  // Y del otro lado tiene que llegar igual: el chiste es el envoltorio, nunca
  // el mensaje.
  const deBeto = (await beto.llamar("/api/estado")).loros.find((l) => l.id === conPollera.loro.id);
  chequear(Boolean(deBeto) && deBeto.pollera === true, "y del otro lado también es una pollera");
}

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
// paso los vuelos de acá abajo duran segundos y no horas. (Con la escala
// acelerada duran DEMASIADO poco, así que el bloque siguiente lo vuelve a
// correr un poco más lejos: ver "el vuelo".)
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
//
// ANTES QUE NADA, UN VUELO QUE DURE. Todo lo de acá abajo afirma cosas sobre un
// ave EN EL AIRE —que el texto no viaja, que figura en vuelo, que abrirla antes
// de tiempo no revela nada— y cada una de esas afirmaciones cuesta un viaje al
// servidor, unos 40 ms. Con Beto a 500 m y la escala en 600, el vuelo entero
// dura 75 ms: para la tercera pregunta el ave ya aterrizó, y ahí ver el texto
// es la respuesta CORRECTA. La prueba fallaba por eso —medido— y no por un
// agujero de privacidad. Lo mismo que ya tiene en cuenta la cotorra, unas
// líneas más abajo.
//
// Beto se aleja lo justo para que el vuelo dure unos segundos A LA ESCALA QUE
// SE ESTÉ CORRIENDO, que la prueba ya sabe cuál es: la acaba de medir con las
// cuatro aves de arriba. En tiempo real (`duraciones.loro` son 45 s) no se
// mueve nada; a escala 600 se va a unos 50 km, que sigue siendo la misma
// ciudad. Así el bloque no depende de que la red le gane una carrera al ave.
const VUELO_MINIMO_MS = 8000;
if (duraciones.loro < VUELO_MINIMO_MS) {
  const factor = VUELO_MINIMO_MS / duraciones.loro;
  // Derecho al sur: en grados de latitud, los 500 m de recién son 0,0045.
  await beto.llamar("/api/ubicacion", { lat: -34.6082 - 0.0045 * (factor - 1), lng: -58.3816 });
  const lejos = (await ana.llamar("/api/estado")).amigos.find((a) => a.id === idBeto);
  console.log(`  Beto se corre a ${Math.round(lejos.distanciaKm)} km para que el vuelo se pueda mirar`);
}

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

// El mismo cuidado que el desvío del perico, y por lo mismo: con la escala
// acelerada esta cotorra está en el aire menos de lo que tarda un viaje de ida
// y vuelta al servidor, así que para cuando llega la respuesta puede haber
// aterrizado —y ahí `olvido` en true es lo correcto, no un adelanto—. Lo que
// de verdad no puede pasar es que se sepa MIENTRAS vuela, y eso es lo que se
// afirma acá.
const volando = (await beto.llamar("/api/estado")).loros.find((l) => l.id === conCotorra.id);
chequear(
  volando.llego === true || volando.olvido === false,
  "mientras vuela no se adelanta que va a llegar mezclado"
);

await new Promise((r) => setTimeout(r, esperaCotorra * 1000));
const mordido = (await beto.llamar("/api/estado")).loros.find((l) => l.id === conCotorra.id);
chequear(mordido.llego === true, "la cotorra aterrizó");
chequear(mordido.olvido === true, "avisa que llegó cambiado");
chequear(mordido.texto !== CARTA, `a Beto le llega mezclado: "${mordido.texto}"`);

// El contrato de la cotorra: cambia alrededor de un tercio de las palabras por
// otras que suenan parecido, y deja la frase con la misma cantidad de palabras.
//
// Antes acá se pedía que sobrevivieran más del 70% de las palabras y que no se
// tocaran ni la primera ni la última. Las dos cosas eran de la regla anterior
// —la que olvidaba y repetía— y se cambiaron con ella.
const originales = CARTA.split(" ");
const recibidas = mordido.texto.split(" ");
chequear(
  recibidas.length === originales.length,
  `no le falta ni le sobra ninguna palabra (${recibidas.length} de ${originales.length})`
);
const cambiadas = originales.filter((w, i) => w !== recibidas[i]).length;
// El tope sale del MISMO archivo que la regla. Si el número viviera acá
// copiado, el día que se toque la cotorra la prueba seguiría verificando lo de
// antes y no avisaría nada.
let tope = Math.ceil(originales.length * 0.4);
try {
  const { PARTE_QUE_CAMBIA } = await import("../lib/sanateo.ts");
  tope = Math.ceil(originales.length * PARTE_QUE_CAMBIA) + 1;
} catch {
  console.log("   (este Node no lee TypeScript: el tope va estimado)");
}
chequear(
  cambiadas > 0 && cambiadas <= tope,
  `cambia alrededor de un tercio, no más (${cambiadas} de ${originales.length}, tope ${tope})`
);
// Y que lo cambiado se parezca: la mitad intacta más las que comparten el
// arranque tienen que dar casi toda la frase. Es lo que separa "escuchó mal"
// de "escribió cualquier cosa".
const suenanParecido = originales.filter(
  (w, i) => w === recibidas[i] || (recibidas[i] && w.slice(0, 2).toLowerCase() === recibidas[i].slice(0, 2).toLowerCase())
).length;
chequear(
  suenanParecido / originales.length > 0.7,
  `y lo que cambió suena parecido, no es otra cosa (${suenanParecido} de ${originales.length})`
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
// El invariante es "el desvío NO viaja hasta que ocurre", y eso es lo que se
// comprueba: si vino uno, tiene que ser porque ya empezó.
//
// Decía `desvio === null` a secas y pasaba por suerte. El desvío arranca en un
// punto sorteado entre el 30 % y el 70 % del vuelo, así que con el reloj
// acelerado eso son un par de cientos de milisegundos — menos de lo que tarda
// la llamada siguiente—. O sea que el test sólo pasaba cuando a ESE perico no
// le tocaba romance, que es una moneda, no una propiedad del código. Se
// descubrió porque un cambio en otra parte del archivo corrió la secuencia de
// Math.random() del servidor y le empezó a tocar.
chequear(
  recienSalido.desvio === null || recienSalido.desvio.desde <= Date.now(),
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

// Las puntas del mundo salen de donde de verdad salieron.
//
// El radio del corrimiento está en cero (ver RADIO_MUNDO_KM en
// lib/privacidad.ts): la vista del resto muestra el punto real. Fue una
// decisión de producto, y lo que se entrega a cambio está escrito ahí.
//
// La prueba lee el radio de la perilla en vez de tenerlo escrito, para que
// mover LOROS_RADIO_MUNDO_KM no la haga fallar — que es justamente lo que la
// perilla existe para permitir. Y cubre los dos lados de la perilla: en cero
// exige que la punta caiga EXACTA, y con radio exige la rosca de siempre (un
// piso, porque el reparto por raíz cuadrada apelotona cerca del centro y sin
// piso una parte de los nidos se mostraría a los desconocidos más preciso que
// a su propia bandada, o sea al revés).
const leido = Number(process.env.LOROS_RADIO_MUNDO_KM);
const RADIO_MUNDO_KM = Number.isFinite(leido) && leido >= 0 ? leido : 0;
const PISO_MUNDO_KM = Math.min(1, RADIO_MUNDO_KM / 3);
const lejos = metros(REAL_ANA, mio.origen);
const enLaBandada = (await beto.llamar("/api/estado")).amigos.find((a) => a.nombre === "Ana");

if (RADIO_MUNDO_KM === 0) {
  console.log(`  la punta del vuelo se ve a ${lejos.toFixed(2)} m de donde salió`);
  // Un metro y no cero pelado: REAL_ANA viaja como JSON y vuelve a parsearse,
  // y `metros` es trigonometría en punto flotante. Un metro es cero para
  // cualquier mapa y sigue estando tres órdenes de magnitud abajo de los 300 m
  // de la bandada, que es lo que esta prueba tiene que poder distinguir.
  chequear(lejos < 1, "la punta del vuelo cae EXACTO donde salió: el mundo no corre nada");
  // Y la bandada SÍ sigue corriendo. Es lo único que quedó de esta sección, y
  // si se cayera junto con lo del mundo nadie se iba a enterar.
  chequear(
    metros(enLaBandada, REAL_ANA) > 20,
    "pero la bandada sigue viendo el nido corrido: eso no se tocó"
  );
} else {
  console.log(`  la punta del vuelo se ve a ${(lejos / 1000).toFixed(2)} km de donde salió`);
  chequear(
    lejos >= PISO_MUNDO_KM * 1000 - 50,
    `la punta NUNCA cae sobre el nido de verdad (piso ${PISO_MUNDO_KM} km)`
  );
  chequear(
    lejos <= RADIO_MUNDO_KM * 1000 + 500,
    `pero sí adentro de los ${RADIO_MUNDO_KM} km declarados`
  );
  // Y el corrimiento del mundo no es el mismo que el de la bandada: si lo
  // fuera, cruzar las dos vistas daría el rumbo del desvío, que es medio
  // secreto.
  chequear(
    metros(enLaBandada, mio.origen) > 500,
    "el punto del mundo y el de la bandada son distintos (semillas separadas)"
  );
}

// El globito del ícono: el servidor tiene que contar lo MISMO que la página.
//
// Cuenta los loritos que llegaron y NO se abrieron, como el globito de
// WhatsApp: un globito es una tarea pendiente. Antes contaba las aves en el
// aire, que no es una tarea —no hay nada que hacer con un ave volando— y que
// además no se apagaba nunca, porque siempre hay algo en el aire.
//
// El número lo pone un efecto de la página cuando la app está abierta, y el
// service worker cuando está cerrada, con el total que le manda el servidor en
// cada aviso. Si los dos lados contaran distinto, el número saltaría cada vez
// que abrís la app — que es peor que no tenerlo.
//
// Acá se replica la cuenta de la página sobre /api/estado y se la compara
// contra la del servidor, que /api/salud expone para poder mirarla.
{
  const est = await ana.llamar("/api/estado");
  const ahoraAna = est.ahora;
  const comoLaPagina = est.loros.filter(
    (l) =>
      l.direccion === "recibido" &&
      !l.abducido &&
      !l.perdido &&
      ahoraAna >= l.llegada &&
      !l.leido
  ).length;
  const salud = await ana.llamar("/api/salud");
  chequear(
    salud.insignia === comoLaPagina,
    `el globito del ícono cuenta igual del lado del servidor y de la página (${salud.insignia})`
  );
}

// "Del resto" quiere decir DEL RESTO: tus vuelos no están ahí.
//
// Estaban, y se veía roto: el mapa dibujaba tu propio arco corrido 25 km —el
// mismo corrimiento que se le aplica a un desconocido— al lado de tu nido, que
// ahí mismo se dibuja exacto. Tu ave salía de un lugar donde no estás. Ese
// corrimiento existe para que no te ubiquen LOS DEMÁS; contra vos no protege
// de nada y solo confunde.
//
// Las dos puntas cuentan, no solo quien lo mandó: el arco muestra las dos, así
// que también es de quien lo recibe.
const anaEnElMundo = await ana.llamar("/api/mundo");
chequear(
  !anaEnElMundo.vuelos.some((v) => v.ave === "guacamayo"),
  "tus propios vuelos NO están en «Del resto»"
);
const betoEnElMundo = await beto.llamar("/api/mundo");
chequear(
  !betoEnElMundo.vuelos.some((v) => v.ave === "guacamayo"),
  "ni los que vienen hacia vos: el arco también es tuyo"
);
// Y sacarlos de la vista de uno no puede sacarlos de la de los demás: la foto
// es una sola y compartida, así que el filtro tiene que ser por persona.
chequear(
  (await carla.llamar("/api/mundo")).vuelos.some((v) => v.ave === "guacamayo"),
  "pero una desconocida los sigue viendo (la caché se comparte, el filtro no)"
);

// El que VUELVE también cruza «Del resto».
//
// Esto salió de dos capturas: una cuenta con dos aves en el aire y la otra
// viendo una sola. Faltaba justo la que volvía. La causa era que `enElAire`
// descartaba el loro en el instante en que aterrizaba la IDA, así que el vuelo
// de regreso —que la vista de la bandada siempre dibujó— no llegaba nunca al
// mundo. Un ave que vuelve a su nido es un vuelo tan real como la ida.
//
// Va con nidos PROPIOS y no con los de Ana y Beto: a esta altura de la suite
// esos dos quedaron pegados por las pruebas de mudanza, y con la escala
// acelerada su vuelo de vuelta dura milisegundos. Afirmar algo sobre un vuelo
// más corto que un viaje al servidor es la trampa que ya nos comimos dos veces
// —el desvío del perico y el olvido de la cotorra—. Trescientos kilómetros y
// un perico dan veinte segundos de aire a cada pata, que alcanzan y sobran.
{
  const ida = cliente("Ida");
  const vuelve = cliente("Vuelve");
  const unIda = await ida.llamar("/api/nido", { nombre: "Ida", lat: -34.60, lng: -58.38 });
  const unVuelve = await vuelve.llamar("/api/nido", { nombre: "Vuelve", lat: -32.95, lng: -60.64 });
  await vuelve.llamar("/api/amigos", { codigo: unIda.codigo });

  const suyo = (
    await ida.llamar("/api/loros", { para: unVuelve.yo.id, ave: "perico", texto: "y volvé" })
  ).loro;
  const enAire = Math.round((suyo.llegada - suyo.salida) / 1000);
  console.log(`  el que vuelve: ${enAire} s de ida, otros tantos de vuelta…`);
  await new Promise((r) => setTimeout(r, suyo.llegada - Date.now() + 1500));
  await vuelve.llamar("/api/loros/suerte", { id: suyo.id, suerte: "soltado", texto: "voy" });

  // La foto del mundo se comparte tres segundos, así que la primera consulta
  // puede traer una anterior a la suelta. Se reintenta hasta que caduque.
  let loVe = false;
  for (let i = 0; i < 6 && !loVe; i++) {
    loVe = (await carla.llamar("/api/mundo")).vuelos.some((v) => v.ave === "perico");
    if (!loVe) await new Promise((r) => setTimeout(r, 800));
  }
  chequear(loVe, "el que vuelve también cruza «Del resto», no solo la ida");
}

// Apagar el interruptor saca TODOS tus vuelos, no solo los próximos.
//
// Se mira SI ESTÁ EL GUACAMAYO DE ANA, no cuántos vuelos hay en total. Antes
// esto comparaba el conteo global contra una foto tomada unas líneas más
// arriba, y ese número lo mueve cualquier cosa: un ave que aterriza en el
// medio, otra que despega, una prueba nueva al lado. La pregunta de verdad es
// si los vuelos de Ana están o no están.
const veElDeAna = async () =>
  (await carla.llamar("/api/mundo")).vuelos.some((v) => v.ave === "guacamayo");

// Y UN GUACAMAYO RECIÉN SOLTADO, porque si no esto no prueba lo que dice.
//
// La foto del mundo solo trae lo que está EN EL AIRE. El guacamayo que había
// se soltó treinta segundos más arriba, y entre medio pasa el bloque del ave
// que vuelve, que se toma sus veinte segundos de espera: para cuando se llega
// acá ya aterrizó, y entonces "no lo veo" es cierto por el motivo equivocado.
// Venía pasando de casualidad —alcanzaba con que cualquier otra prueba tuviera
// un guacamayo en vuelo justo en ese momento— y dejó de alcanzar apenas se
// movieron unos segundos las de más arriba. Uno propio, acá, y la pregunta
// vuelve a ser sobre el interruptor y no sobre el reloj.
//
// Con reintentos, igual que unas líneas más arriba y por lo mismo: la foto del
// mundo se comparte tres segundos, y soltar un ave no la invalida —sí lo hace
// tocar el interruptor, que es una decisión de privacidad y no espera nada—.
// Así que recién soltado el guacamayo puede no estar todavía en la foto que
// contesta. Las dos afirmaciones de abajo no necesitan esto: las dos vienen
// después de un cambio de interruptor, que tira la foto vieja.
await ana.llamar("/api/loros", { para: idBeto, ave: "guacamayo", texto: "a ver si me ven" });
let enElAireDeAna = false;
for (let i = 0; i < 8 && !enElAireDeAna; i++) {
  enElAireDeAna = await veElDeAna();
  if (!enElAireDeAna) await new Promise((r) => setTimeout(r, 700));
}
chequear(enElAireDeAna, "hay un guacamayo de Ana en el aire para preguntar por él");

await ana.llamar("/api/nido", { nombre: "Ana", publico: false });
chequear(!(await veElDeAna()), "apagando «Del resto» los vuelos de Ana desaparecen");
await ana.llamar("/api/nido", { nombre: "Ana", publico: true });
chequear(await veElDeAna(), "y volviéndolo a prender, vuelven");
// Guardar el nombre no puede volver a prenderlo solo.
await ana.llamar("/api/nido", { nombre: "Ana", publico: false });
await ana.llamar("/api/nido", { nombre: "Ana Laura" });
chequear(
  !(await veElDeAna()),
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

// --- soltar el ave ES contestar ---
//
// El ave queda posada en la ventana de quien la recibió. Soltarla la manda de
// vuelta, y ahora se va cargada: soltar es la forma de responder. Antes volvía
// vacía y para contestar había que arrancar un loro nuevo desde cero —elegir
// persona, elegir ave— con el bicho ahí mirándote.
//
// La regla del texto es la misma que a la ida, y es la promesa entera de la
// app: no sale del servidor hasta que el ave aterriza.
{
  const ida = (
    await ana.llamar("/api/loros", { para: idBeto, ave: "cuervo", texto: "¿venís el sábado?" })
  ).loro;
  await new Promise((r) => setTimeout(r, ida.llegada - ida.salida + 2500));

  const RESPUESTA = "Sí, llevo el vino";
  await beto.llamar("/api/loros/suerte", { id: ida.id, suerte: "soltado", texto: RESPUESTA });

  const enBeto = (await beto.llamar("/api/estado")).loros.find((l) => l.id === ida.id);
  chequear(enBeto.suerte === "soltado", "Beto lo soltó con una respuesta");
  chequear(enBeto.respuesta === RESPUESTA, "y ve lo que escribió, desde el momento cero");
  chequear(!!enBeto.vuelta, "el ave sale de vuelta y se puede dibujar en el mapa");


  // Lo que importa: mientras vuelve, el texto NO está del lado de Ana.
  const volando = (await ana.llamar("/api/estado")).loros.find((l) => l.id === ida.id);
  chequear(volando.respuesta === null, "mientras vuelve, la respuesta NO viajó a Ana");
  chequear(
    volando.traeRespuesta === true,
    "pero Ana sabe que trae algo adentro (sin saber qué)"
  );
  chequear(
    !JSON.stringify(volando).includes("vino"),
    "y la respuesta no está escondida en ningún campo de la consulta"
  );

  await new Promise((r) => setTimeout(r, enBeto.vuelta.llegada - Date.now() + 2500));
  const aterrizo = (await ana.llamar("/api/estado")).loros.find((l) => l.id === ida.id);
  chequear(aterrizo.respuesta === RESPUESTA, `recién al aterrizar Ana la lee: "${aterrizo.respuesta}"`);
}

// --- enjaular y al puchero no devuelven nada ---
for (const [suerte, como] of [["enjaulado", "enjaulada"], ["puchero", "al puchero"]]) {
  const l = (
    await ana.llamar("/api/loros", { para: idBeto, ave: "cuervo", texto: `probando ${suerte}` })
  ).loro;
  await new Promise((r) => setTimeout(r, l.llegada - l.salida + 2500));
  await beto.llamar("/api/loros/suerte", { id: l.id, suerte, texto: "esto no tiene quien lo lleve" });
  const enAna = (await ana.llamar("/api/estado")).loros.find((x) => x.id === l.id);
  chequear(enAna.suerte === suerte, `un ave ${como} queda marcada así`);
  chequear(enAna.vuelta === null, `un ave ${como} no vuelve`);
  chequear(
    enAna.respuesta === null && enAna.traeRespuesta === false,
    `y no trae nada: sin ave no hay quien lleve el mensaje`
  );
}

// --- los avisos con la app cerrada ---
//
// No se puede probar la entrega de verdad —eso lo hace un servicio del
// navegador, y desde acá no hay ninguno— pero sí todo lo que es nuestro: que
// sin claves la app no ofrezca suscribirse, que una suscripción mal formada se
// rechace, que una buena se guarde, y sobre todo que el DESPERTADOR esté
// cerrado sin secreto. Un despertador abierto es un botón de mandar
// notificaciones que cualquiera puede apretar.
{
  const cfg = await ana.llamar("/api/push");
  chequear(typeof cfg.hay === "boolean", `la app dice si el push está configurado (hay: ${cfg.hay})`);
  if (!cfg.hay) {
    chequear(cfg.clave === "", "y sin claves no ofrece ninguna, así no se gasta el permiso al pedo");
  }

  try {
    await ana.llamar("/api/push", { suscripcion: { endpoint: "https://x/y" } });
    chequear(false, "rechaza una suscripción sin claves de cifrado");
  } catch {
    chequear(true, "rechaza una suscripción sin claves de cifrado");
  }

  // El despertador, cerrado.
  const sinClave = await ana.abrir("/api/despertador");
  chequear(sinClave.status === 401, `el despertador está cerrado sin secreto (${sinClave.status})`);
  const conClaveMala = await ana.abrir("/api/despertador?clave=cualquiera");
  chequear(conClaveMala.status === 401, `y con un secreto equivocado también (${conClaveMala.status})`);
}

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
