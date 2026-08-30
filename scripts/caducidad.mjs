// El ave que se cansó de esperar.
//
// A las 48 horas deja la barra y se vuelve al nido. Con el reloj de la app muy
// acelerado eso pasa en un segundo, y se puede verificar lo que de verdad
// importa: que el link NO se muera, que el ave salga desde el nido y no desde
// la cervecería, y que entregue el mensaje sobria porque durmió la mona.
//
// Va aparte de la suite porque necesita una escala que dejaría al resto de las
// pruebas corriendo en milisegundos:
//
//   LOROS_ESCALA_TIEMPO=60000 npm run start      (en otra terminal)
//   npm run prueba:caducidad
//
// Encontró un bug de verdad la primera vez que corrió: el ave decía que salía
// del nido y despegaba igual de la cervecería, porque `enviarLoro` nunca leía
// el punto de despegue que se le pasaba. TypeScript no lo vio —una propiedad
// de más adentro de un spread no se chequea— y a ojo tampoco se veía: el
// mensaje llegaba bien, solo que desde el lugar equivocado.
const BASE = "http://localhost:3000";
let fallos = 0;
const chequear = (c, m) => { if (!c) fallos++; console.log(`${c ? "✓" : "✗"} ${m}`); };

function cliente() {
  let cookie = "";
  return async function llamar(ruta, datos, metodo) {
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
  };
}

const ana = cliente();
await ana("/api/nido", { nombre: "Ana", ave: "perico", lat: -34.6037, lng: -58.3816 });
const est = await ana("/api/estado");
const escala = Number(est.escala) || 1;
console.log(`  escala del servidor: ${escala}× · 48 h = ${(48 * 3600 / escala).toFixed(1)} s`);
chequear(escala >= 20000, "el servidor corre con el reloj acelerado (si no, esto tarda dos días)");

const SECRETO = "Che, bajate esto que te quiero mandar un loro de verdad.";
const c = (await ana("/api/convite", { ave: "perico", texto: SECRETO, para: "Jez" })).convite;
console.log(`  el ave llega a la barra en ${((c.llegadaPosada - Date.now()) / 1000).toFixed(2)} s y se cansa ${((c.abandona - c.llegadaPosada) / 1000).toFixed(2)} s después`);

// Esperar a que se canse, se vuelva y llegue a casa.
await new Promise((r) => setTimeout(r, c.enCasa - Date.now() + 1200));

const enCasa = await ana("/api/estado");
const suyo = enCasa.convites?.[0];
chequear(suyo?.estado === "encasa", `el ave se volvió al nido y está durmiendo la mona (estado: ${suyo?.estado})`);

// Y el link, que es lo que importa: sigue sirviendo.
const jez = cliente();
const publico = await jez(`/api/convite?c=${encodeURIComponent(c.id)}`);
chequear(publico.convite?.estado === "encasa", "el link no se murió: la portada cuenta que se volvió");
chequear(!JSON.stringify(publico).includes("bajate esto"), "y el mensaje sigue sin viajar");

await jez("/api/nido", { nombre: "Jez", lat: -34.62, lng: -58.40 });
const r = await jez("/api/convite/reclamar", { c: c.id });
const vuelo = r.loro;
chequear(Boolean(vuelo), "abrir el link igual destraba el lorito");
chequear(vuelo.parada?.durmioLaMona === true, "el loro sabe que la durmió en el nido");
chequear(vuelo.parada?.nivel === 0, "y que sale sobrio, por más copetines que se haya tomado");
console.log(`  se había tomado ${vuelo.parada?.copetines} copetines antes de volverse`);

// Sale del NIDO y no de la barra: se compara contra los dos puntos conocidos.
const dist = (a, b) => {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};
const alNido = dist(vuelo.origen, suyo.origen);
const aLaBarra = dist(vuelo.origen, suyo.posada);
console.log(`  despega a ${alNido.toFixed(2)} km del nido y a ${aLaBarra.toFixed(2)} km de la barra`);
chequear(alNido < aLaBarra, "y despega desde el nido, no desde la cervecería");

await new Promise((res) => setTimeout(res, vuelo.llegada - Date.now() + 1500));
const buzon = await jez("/api/estado");
const llegado = buzon.loros.find((l) => l.id === vuelo.id);
chequear(llegado?.llego === true, "el mensaje aterriza");
console.log(`  llegó: "${llegado?.texto}"`);
chequear(llegado?.texto === SECRETO, "y llega ENTERO, sin una sola eñe de más: durmió la mona");

console.log(fallos ? `\n${fallos} en rojo ✗` : "\nTodo en verde ✓");
process.exit(fallos ? 1 : 0);
