// Los dos temas de Loros, en un solo lugar.
//
// La app nació oscura —selva de noche— y por un rato fue clara, con los grises
// de Instagram. Volvió a oscura por defecto, pero la paleta clara NO se tiró:
// quedó acá al lado, medida y lista, porque el día que haya un interruptor lo
// que va a costar no es elegir los colores sino acordarse de todos los lugares
// donde hay uno.
//
// Por qué un archivo de TypeScript y no solo variables de CSS: la mitad de los
// colores de esta app no los pinta el navegador. Las rutas del mapa se las
// pasa Leaflet a SVG como texto, el confeti se dibuja en un canvas, y las aves
// son SVG que se arma a mano. Nada de eso lee una variable de CSS sin ayuda.
// Las variables están igual (app/globals.css, `:root` y `[data-tema="claro"]`)
// para todo lo que sí es CSS; esto es para el resto.
//
// CÓMO SE PRENDE EL INTERRUPTOR, cuando lo quieras:
//
//   1. `document.documentElement.dataset.tema = "claro"` — con eso solo, toda
//      la UI de CSS ya cambia: fondos, bordes, textos, botones, la hoja de
//      abajo, el mapa de Leaflet.
//   2. Pasar `tema` a `coloresDeBandada()` y a los lugares marcados abajo.
//   3. Cambiar los mosaicos del mapa: `dark_all` ↔ `light_all` en CARTO, y
//      `dark-v11` ↔ `light-v11` en Mapbox (components/Mapa.tsx).
//   4. Guardar la elección donde vos quieras y leerla al arrancar.
//
// Lo que falta para que sea completo está en el README, sección "El color".

export type Tema = "oscuro" | "claro";

/** El de siempre. Cambiar esto NO alcanza: ver la lista de arriba. */
export const TEMA: Tema = "oscuro";

/**
 * Los colores de las seis aves, en los dos temas.
 *
 * No son los mismos con otro nombre. Los oscuros están elegidos para brillar
 * contra un fondo casi negro y sobre blanco dan entre 1,51:1 y 2,72:1 —todos
 * ilegibles, el mínimo es 4,5:1—. Los claros son la misma familia dos o tres
 * pasos más oscura: el perico sigue siendo verde lima y el guacamayo sigue
 * siendo ámbar, pero se leen. Van de 4,99:1 a 7,10:1 sobre blanco.
 */
export const COLOR_AVE: Record<string, Record<Tema, string>> = {
  perico: { oscuro: "#a3e635", claro: "#4d7c0f" },
  cotorra: { oscuro: "#22d3ee", claro: "#0e7490" },
  loro: { oscuro: "#10b981", claro: "#047857" },
  guacamayo: { oscuro: "#fbbf24", claro: "#b45309" },
  paloma: { oscuro: "#f472b6", claro: "#be185d" },
  cuervo: { oscuro: "#a78bfa", claro: "#6d28d9" },
};

/**
 * Lo que no es un ave ni un token de CSS: lo que se dibuja a mano.
 *
 * Cada valor está medido contra el fondo de su propio tema. Los de un tema no
 * sirven en el otro y eso no es un detalle: los 15 colores de bandada claros
 * dan entre 2,2:1 y 3,9:1 sobre el fondo oscuro, o sea que la mitad de tu
 * bandada sería invisible.
 */
export const PINTURA: Record<Tema, {
  /** El nombre de cada nido, escrito sobre el mapa. */
  rotuloMapa: string;
  /** El halo que lo despega del mapa: oscuro sobre mapa oscuro y al revés. */
  rotuloHalo: string;
  /** El anillo que separa el punto de un nido del mapa de atrás. */
  anilloNido: string;
  /** La sombra del ave que vuela. */
  sombraAve: string;
  /** El punto de un nido ajeno cuando no tiene color propio. */
  nidoSinColor: string;
  /** La zona punteada alrededor de un nido ajeno. */
  zonaSinColor: string;
  /** El confeti de la paloma. Sin blanco en claro: sería invisible. */
  confeti: string[];
  /** Los mosaicos del mapa. */
  mosaicoCarto: string;
  mosaicoMapbox: string;
}> = {
  oscuro: {
    rotuloMapa: "#e9f3f0",
    rotuloHalo: "0 1px 4px #000,0 0 10px #000",
    anilloNido: "rgba(6,13,12,.9)",
    sombraAve: "drop-shadow(0 2px 6px rgba(0,0,0,.8))",
    nidoSinColor: "#e9f3f0",
    zonaSinColor: "#cbd5e1",
    confeti: ["#f472b6", "#fbbf24", "#22d3ee", "#a3e635", "#f43f5e", "#ffffff"],
    mosaicoCarto: "dark_all",
    mosaicoMapbox: "dark-v11",
  },
  claro: {
    rotuloMapa: "#111",
    rotuloHalo: "0 1px 3px #fff,0 0 8px #fff,0 0 3px #fff",
    anilloNido: "rgba(255,255,255,.95)",
    sombraAve: "drop-shadow(0 1px 3px rgba(0,0,0,.35))",
    nidoSinColor: "#111827",
    zonaSinColor: "#6b7280",
    confeti: ["#db2777", "#d97706", "#0891b2", "#65a30d", "#e11d48", "#7c3aed"],
    mosaicoCarto: "light_all",
    mosaicoMapbox: "light-v11",
  },
};

/** Atajo para el tema activo. */
export const pintura = PINTURA[TEMA];

// ---------- probar mosaicos sin redeployar ----------
//
// "Quiero ver cómo queda" es una pregunta razonable y hasta ahora la única
// forma de contestarla era cambiar una constante, buildear y deployar. Con
// esto se prueba en vivo: /nido?mapa=calle y listo. La elección queda guardada
// en el navegador, así que se sigue viendo al navegar, y se vuelve con
// ?mapa=noche.
//
// La lista es CERRADA a propósito. El nombre entra por la URL y termina
// adentro de la dirección de donde se piden los mosaicos: si se aceptara
// cualquier cosa, un link preparado podría hacer que el mapa de otra persona
// cargue imágenes de donde el que armó el link quiera.

export type Mosaico = { carto: string; mapbox: string; nombre: string };

export const MOSAICOS: Record<string, Mosaico> = {
  /** El de siempre: selva de noche. */
  noche: { carto: "dark_all", mapbox: "dark-v11", nombre: "De noche" },
  /** Gris clarito, sin color: el que usa el tema claro. */
  claro: { carto: "light_all", mapbox: "light-v11", nombre: "Claro" },
  /** Voyager: verdes de parque, agua celeste, calles grises. El que más se
   *  parece a los mapas de un teléfono. */
  calle: { carto: "rastertiles/voyager", mapbox: "streets-v12", nombre: "De calle" },
  /** Voyager sin nombres de lugares encima. */
  limpio: {
    carto: "rastertiles/voyager_nolabels",
    mapbox: "navigation-day-v1",
    nombre: "De calle, sin rótulos",
  },
};

const GUARDADO = "loros:mapa";

/**
 * Qué mosaicos usar. Sale de `?mapa=`, si no de lo último elegido, si no del
 * tema. Solo corre en el navegador; en el servidor devuelve el del tema.
 */
export function mosaicoElegido(): Mosaico {
  const porDefecto: Mosaico = {
    carto: pintura.mosaicoCarto,
    mapbox: pintura.mosaicoMapbox,
    nombre: TEMA === "oscuro" ? "De noche" : "Claro",
  };
  if (typeof window === "undefined") return porDefecto;
  try {
    const pedido = new URLSearchParams(window.location.search).get("mapa");
    if (pedido && MOSAICOS[pedido]) {
      window.localStorage.setItem(GUARDADO, pedido);
      return MOSAICOS[pedido];
    }
    const guardado = window.localStorage.getItem(GUARDADO);
    if (guardado && MOSAICOS[guardado]) return MOSAICOS[guardado];
  } catch {
    // Navegador con el almacenamiento bloqueado: se sigue con el del tema.
  }
  return porDefecto;
}
