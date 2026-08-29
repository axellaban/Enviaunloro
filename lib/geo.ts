// Geometría del vuelo: distancia real sobre la Tierra, ruta y posición actual.
//
// Todo lo de acá es puro y determinista: dadas la salida, la llegada y los dos
// puntos, cualquiera —el servidor o los dos navegadores— calcula exactamente la
// misma posición del ave. Por eso el vuelo se ve igual en las dos pantallas sin
// mandar un solo byte de "dónde está el loro ahora": se manda cuándo salió y
// cuándo llega, y el resto se deduce.

export type Punto = { lat: number; lng: number };

const R_TIERRA_KM = 6371.0088;

const aRad = (g: number) => (g * Math.PI) / 180;
const aGrados = (r: number) => (r * 180) / Math.PI;

/** Distancia sobre la superficie de la Tierra, en km (haversine). */
export function distanciaKm(a: Punto, b: Punto): number {
  const dLat = aRad(b.lat - a.lat);
  const dLng = aRad(b.lng - a.lng);
  const lat1 = aRad(a.lat);
  const lat2 = aRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Punto intermedio del círculo máximo (la ruta que vuela un ave de verdad, no
 * la recta del mapa plano). `t` va de 0 (origen) a 1 (destino).
 *
 * Es interpolación esférica: sobre distancias largas la diferencia con una
 * recta en pantalla es enorme —Buenos Aires a Madrid se curva bien al norte—
 * y es justo lo que hace que la ruta se vea como una ruta de vuelo.
 */
export function puntoEnRuta(a: Punto, b: Punto, t: number): Punto {
  const lat1 = aRad(a.lat);
  const lng1 = aRad(a.lng);
  const lat2 = aRad(b.lat);
  const lng2 = aRad(b.lng);

  const d = distanciaKm(a, b) / R_TIERRA_KM;
  // Origen y destino prácticamente iguales: no hay ruta que interpolar y la
  // división de abajo se iría a infinito.
  if (d < 1e-9) return { lat: a.lat, lng: a.lng };

  const sd = Math.sin(d);
  const A = Math.sin((1 - t) * d) / sd;
  const B = Math.sin(t * d) / sd;

  const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
  const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);

  return {
    lat: aGrados(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lng: aGrados(Math.atan2(y, x)),
  };
}

/** Hacia dónde mira el ave en este punto de la ruta, en grados (0 = norte). */
export function rumbo(a: Punto, b: Punto): number {
  const lat1 = aRad(a.lat);
  const lat2 = aRad(b.lat);
  const dLng = aRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (aGrados(Math.atan2(y, x)) + 360) % 360;
}

// ---------- el arco ----------
//
// Un ave no sale en línea recta hacia el destino: despega, toma altura, se
// deja llevar y baja del otro lado. En el mapa eso no se puede mostrar —no hay
// altura— pero sí se puede insinuar con una panza al costado, que es lo que
// hacen todos los mapas de vuelos y lo que ya dibujaba la portada de esta app
// con sus bezier. Adentro, en cambio, las rutas salían rectas: la promesa de la
// portada y lo que se ve al entrar no eran lo mismo.
//
// LO QUE NO CAMBIA, y es lo que importa: el arco es DIBUJO. La distancia con
// la que se calcula cuánto tarda cada ave sigue siendo la real entre las dos
// personas —el círculo máximo, `distanciaKm`— y de eso vive el producto. El
// camino dibujado es menos de un 1,5% más largo que esa recta, y ese 1,5% no se
// le cobra a nadie: el ave sale y llega exactamente cuando decía que iba a
// llegar.

/**
 * La panza del arco, como parte de la distancia. Es lo único que hay que tocar
 * para que las rutas se curven más o menos.
 *
 * Con esto en 0 vuelve a ser todo recto, sin sacar una línea de código.
 */
export const CURVA = 0.06;

/**
 * Pero con techo, porque los vuelos largos YA se curvan solos: el círculo
 * máximo de Buenos Aires a Madrid se va bien al norte por su cuenta, y una
 * panza de mil kilómetros arriba de eso lo deja pareciendo un rulo. En un vuelo
 * de barrio el arco es todo lo que hay; en uno que cruza el Atlántico es un
 * detalle arriba de una curva que ya existe.
 */
export const CURVA_TECHO_KM = 120;

/** Cuánto se despega el arco de la recta en su punto más alto, en km. */
export function flechaKm(km: number, curva = CURVA): number {
  return Math.min(km * curva, CURVA_TECHO_KM);
}

/**
 * Igual que `puntoEnRuta`, pero sobre el arco que se dibuja.
 *
 * La panza se abre perpendicular al camino y va con el seno de `t`: cero en las
 * dos puntas —el ave sale del nido y aterriza en el nido, no al lado— y máxima
 * en el medio. Siempre para el mismo lado de la marcha, y eso resuelve solo el
 * dibujo de la vuelta: como vuelve al revés, su arco cae del otro lado y las
 * dos líneas no se pisan.
 */
export function puntoEnArco(a: Punto, b: Punto, t: number, curva = CURVA): Punto {
  const base = puntoEnRuta(a, b, t);
  if (curva <= 0) return base;

  const alto = flechaKm(distanciaKm(a, b), curva) * Math.sin(Math.PI * t);
  // Menos de un metro no lo ve nadie, y de paso evita pedirle un rumbo a dos
  // puntos que son el mismo.
  if (!(alto > 0.001)) return base;

  // Perpendicular a la tangente de acá, y no a la recta entre las puntas: en un
  // vuelo largo el rumbo gira decenas de grados en el camino, y la panza tiene
  // que abrirse al costado del camino en cada tramo.
  const paso = 1e-3;
  const t0 = Math.max(0, Math.min(1 - paso, t - paso / 2));
  const tangente = rumbo(puntoEnRuta(a, b, t0), puntoEnRuta(a, b, t0 + paso));
  return desplazar(base, alto, tangente + 90);
}

/** El arco entero, para dibujarlo como línea en el mapa. */
export function arco(a: Punto, b: Punto, pasos = 64, curva = CURVA): Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i <= pasos; i++) puntos.push(puntoEnArco(a, b, i / pasos, curva));
  return puntos;
}

/** Coordenadas válidas y sobre el planeta. */
export function puntoValido(p: unknown): p is Punto {
  const x = p as Punto;
  return (
    !!x &&
    Number.isFinite(x.lat) &&
    Number.isFinite(x.lng) &&
    Math.abs(x.lat) <= 90 &&
    Math.abs(x.lng) <= 180
  );
}

/**
 * Mueve un punto una distancia y un rumbo dados. Se usa para plantar el nido
 * de Doña Cotorra cerca de quien se registra, sin importar en qué lugar del
 * mundo esté.
 */
export function desplazar(p: Punto, km: number, rumboGrados: number): Punto {
  const d = km / R_TIERRA_KM;
  const lat1 = aRad(p.lat);
  const lng1 = aRad(p.lng);
  const br = aRad(rumboGrados);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: aGrados(lat2), lng: ((aGrados(lng2) + 540) % 360) - 180 };
}

// ---------- formato ----------

export function formatearDistancia(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  // Coma decimal: se escribe en español y "2.0 km" ahí se lee raro.
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km).toLocaleString("es-AR")} km`;
}

/**
 * "45 s", "1 min 15 s", "13 min", "2 h 15 min", "4 días 3 h". Redondea hacia
 * arriba: nadie quiere un ETA optimista.
 *
 * Abajo de diez minutos van también los segundos, y no por prolijidad: en los
 * vuelos cortos es lo único que distingue a un ave de otra. Sin eso, la cotorra
 * y el loro dicen los dos "2 min" y elegir deja de tener sentido.
 */
export function formatearDuracion(ms: number): string {
  if (ms <= 0) return "ya";
  const seg = Math.ceil(ms / 1000);
  if (seg < 60) return `${seg} s`;
  if (seg < 600) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
  }
  const min = Math.ceil(seg / 60);
  if (min < 60) return `${min} min`;
  const horas = Math.floor(min / 60);
  const restoMin = min % 60;
  if (horas < 24) return restoMin ? `${horas} h ${restoMin} min` : `${horas} h`;
  const dias = Math.floor(horas / 24);
  const restoHoras = horas % 24;
  const d = dias === 1 ? "1 día" : `${dias} días`;
  return restoHoras ? `${d} ${restoHoras} h` : d;
}

/** Countdown fino para el vuelo en curso: "04:31", "1:12:09". */
export function cuentaRegresiva(ms: number): string {
  if (ms <= 0) return "00:00";
  const total = Math.ceil(ms / 1000);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const dd = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dd(m)}:${dd(s)}` : `${dd(m)}:${dd(s)}`;
}
