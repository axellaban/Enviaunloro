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
//   3. Los mosaicos del mapa ya no hacen falta tocarlos: van por su cuenta
//      (MOSAICOS, más abajo) y de fábrica ya son claros. El mapa y el panel
//      son dos cosas distintas y hoy no coinciden: panel oscuro, mapa claro.
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
}> = {
  oscuro: {
    rotuloMapa: "#e9f3f0",
    rotuloHalo: "0 1px 4px #000,0 0 10px #000",
    anilloNido: "rgba(6,13,12,.9)",
    sombraAve: "drop-shadow(0 2px 6px rgba(0,0,0,.8))",
    nidoSinColor: "#e9f3f0",
    zonaSinColor: "#cbd5e1",
    confeti: ["#f472b6", "#fbbf24", "#22d3ee", "#a3e635", "#f43f5e", "#ffffff"],
  },
  claro: {
    rotuloMapa: "#111",
    rotuloHalo: "0 1px 3px #fff,0 0 8px #fff,0 0 3px #fff",
    anilloNido: "rgba(255,255,255,.95)",
    sombraAve: "drop-shadow(0 1px 3px rgba(0,0,0,.35))",
    nidoSinColor: "#111827",
    zonaSinColor: "#6b7280",
    confeti: ["#db2777", "#d97706", "#0891b2", "#65a30d", "#e11d48", "#7c3aed"],
  },
};

/** Atajo para el tema activo. */
export const pintura = PINTURA[TEMA];

// ---------- los mosaicos del mapa ----------
//
// EL MAPA TIENE SU PROPIA PINTURA, y no la del tema de la app. Son dos cosas
// distintas y confundirlas fue el error obvio: el panel puede ser oscuro y el
// mapa claro al mismo tiempo, y de hecho así está ahora. Lo que decide si el
// nombre de un nido lleva halo negro o blanco no es el color del panel: es el
// color de lo que hay abajo del rótulo.
//
// Y se pueden probar en vivo, sin redeployar: /nido?mapa=calle y listo. La
// elección queda guardada en el navegador y se vuelve con ?mapa=claro.
//
// La lista es CERRADA a propósito. El nombre entra por la URL y termina
// adentro de la dirección de donde se piden los mosaicos: si se aceptara
// cualquier cosa, un link preparado podría hacer que el mapa de otra persona
// cargue imágenes de donde el que armó el link quiera.

export type Mosaico = {
  carto: string;
  mapbox: string;
  nombre: string;
  /** Si el fondo es claro. De esto sale con qué pintura se dibuja encima. */
  claro: boolean;
};

export const MOSAICOS: Record<string, Mosaico> = {
  /** Gris clarito, casi sin color: el fondo se calla y los vuelos hablan. */
  claro: { carto: "light_all", mapbox: "light-v11", nombre: "Claro", claro: true },
  /** Voyager: verdes de parque, agua celeste, calles grises. El que más se
   *  parece a los mapas de un teléfono. */
  calle: { carto: "rastertiles/voyager", mapbox: "streets-v12", nombre: "De calle", claro: true },
  /** Voyager sin nombres de lugares encima. */
  limpio: {
    carto: "rastertiles/voyager_nolabels",
    mapbox: "navigation-day-v1",
    nombre: "De calle, sin rótulos",
    claro: true,
  },
  /** La selva de noche, que fue el default hasta acá. */
  noche: { carto: "dark_all", mapbox: "dark-v11", nombre: "De noche", claro: false },
};

/** Cuál viene de fábrica. Es la única línea que hay que tocar para cambiarlo. */
export const MOSAICO_POR_DEFECTO = "claro";

const GUARDADO = "loros:mapa";

/**
 * Qué mosaicos usar. Sale de `?mapa=`, si no de lo último elegido, si no del
 * de fábrica.
 *
 * Se resuelve UNA vez y queda cacheado: lo consultan los dibujantes de íconos,
 * que corren muchas veces, y no tiene sentido volver a leer el almacenamiento
 * del navegador cada vez. Cambiar de mosaico pide recargar igual, porque la
 * capa de fondo se crea al montar el mapa.
 */
let elegido: Mosaico | null = null;

export function mosaicoElegido(): Mosaico {
  if (elegido) return elegido;
  const porDefecto = MOSAICOS[MOSAICO_POR_DEFECTO];
  if (typeof window === "undefined") return porDefecto;
  let cual = porDefecto;
  try {
    const pedido = new URLSearchParams(window.location.search).get("mapa");
    if (pedido && MOSAICOS[pedido]) {
      window.localStorage.setItem(GUARDADO, pedido);
      cual = MOSAICOS[pedido];
    } else {
      const guardado = window.localStorage.getItem(GUARDADO);
      if (guardado && MOSAICOS[guardado]) cual = MOSAICOS[guardado];
    }
  } catch {
    // Navegador con el almacenamiento bloqueado: se sigue con el de fábrica.
  }
  elegido = cual;
  return cual;
}

/**
 * Con qué pintar lo que va ENCIMA del mapa.
 *
 * Casi todo sigue al MOSAICO y no al tema: un rótulo con halo negro sobre un
 * mapa claro no se lee, aunque el panel de al lado sea oscuro.
 *
 * El anillo del nido es la excepción, y no por capricho: no separa el punto del
 * mapa, separa el punto de lo que tenga al lado, y el punto sale de la paleta
 * del TEMA. Con la paleta brillante —la oscura— el anillo va oscuro sobre
 * cualquier fondo; con la paleta oscura del tema claro iría blanco. Cada valor
 * sigue a aquello con lo que de verdad tiene que contrastar.
 *
 * Y sobre mapa claro las rutas necesitan ayuda. Los colores de las aves están
 * elegidos para brillar contra un fondo casi negro: el lima del perico da 1,5:1
 * sobre gris claro, o sea una línea que casi no está. La respuesta no es
 * cambiarles el color —el color del ave es el mismo en la tarjeta, en el mapa y
 * en el bicho, y romper eso rompe lo único que deja seguir un vuelo sin leer—
 * sino la de cualquier mapa de verdad: un contorno oscuro abajo de la línea de
 * color. La línea sigue siendo del ave y se ve sobre lo que sea.
 */
export function pinturaDelMapa() {
  const claro = mosaicoElegido().claro;
  return {
    ...PINTURA[claro ? "claro" : "oscuro"],
    anilloNido: PINTURA[TEMA].anilloNido,
    /** El contorno de la ruta. null en mapa oscuro: ahí no hace falta. */
    contorno: claro ? "rgba(8, 20, 18, .45)" : null,
    /** La ruta entera, la que todavía no recorrió. Sobre claro hay que
     *  levantarla: a 0,3 de opacidad un punteado lima se pierde en el gris. */
    opacidadRuta: claro ? 0.55 : 0.3,
    opacidadRutaVuelta: claro ? 0.34 : 0.18,
  };
}
