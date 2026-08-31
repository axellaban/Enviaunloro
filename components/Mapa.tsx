"use client";

// El mapa, con los nidos y las aves en vuelo.
//
// Dos decisiones que explican casi todo el archivo:
//
// 1. La posición del ave NO viene del servidor. Viene de la fórmula: con la
//    hora de salida, la de llegada y los dos puntos alcanza. El servidor se
//    consulta cada varios segundos y el ave igual se mueve a 60 cuadros por
//    segundo, porque cada cuadro se recalcula acá.
//
// 2. Leaflet no es React: no se puede redibujar el mapa entero en cada render.
//    Las capas se crean una vez por vuelo, se guardan en un ref indexadas por
//    id, y después solo se mueven. Cuando un vuelo desaparece de la lista, se
//    saca su capa.
//
// 3. El mapa gira con dos dedos, como Google Maps (leaflet-rotate). Leaflet no
//    sabe girar solo: el plugin le cambia la matemática de coordenadas para que
//    un toque siga cayendo donde uno lo ve, con el mapa torcido. Todo lo que
//    dibujamos —rutas, zonas, nidos— gira con el mapa; las aves necesitan una
//    corrección, y está explicada abajo, en `orientar`.
//
// Sin API key: los mosaicos salen de CARTO sobre OpenStreetMap. Si hay un token
// de Mapbox cargado, se usa ese en su lugar.

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Parchea L para que el mapa pueda girar. Va después de leaflet y antes de
// crear el mapa: lo que hace es reemplazar métodos de L.Map, así que un mapa
// creado antes de esta línea no giraría.
import "leaflet-rotate";
import { AVES, type AveId } from "../lib/aves";
import {
  arco,
  cuentaRegresiva,
  desplazar,
  formatearDistancia,
  puntoEnArco,
  rumbo,
  type Punto,
} from "../lib/geo";
import { avanceVuelo } from "../lib/vuelo";
import {
  tramosDeConvites,
  tramosDelMundo,
  tramosEnElAire,
  type Tramo,
} from "../lib/tramos";
import { aveHtml, polleraHtml, svgPlatoVolador } from "./Ave";
import type { ConviteVista, LoroVista, NidoVista, VueloMundo } from "../lib/vista";
import { coloresDeBandada, MI_COLOR } from "../lib/colorNido";
import { mosaicoElegido, pinturaDelMapa } from "../lib/tema";
import { borrachera } from "../lib/cerveceria";

const MAPBOX = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function capaBase(): L.TileLayer {
  // Cuáles, no está fijo: se puede probar otro con ?mapa=calle (lib/tema.ts).
  const mosaico = mosaicoElegido();
  if (MAPBOX) {
    return L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/${mosaico.mapbox}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX}`,
      {
        maxZoom: 20,
        tileSize: 512,
        zoomOffset: -1,
        attribution:
          '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    );
  }
  return L.tileLayer(
    `https://{s}.basemaps.cartocdn.com/${mosaico.carto}/{z}/{x}/{y}{r}.png`,
    {
      maxZoom: 20,
      subdomains: "abcd",
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
    }
  );
}

/**
 * El punto de un nido en el mapa, con su nombre debajo.
 *
 * El punto mide 14 px y se queda así: agrandarlo a 44 significaría una caja
 * invisible de 44 px por nido, y sobre un mapa esas cajas se comen el gesto de
 * arrastrar — con la bandada junta, el mapa dejaría de moverse. Lo que sí se
 * agranda es el NOMBRE de abajo, que además es donde la gente apunta: antes
 * tenía `pointer-events:none` y no se podía tocar.
 */
function iconoNido(n: NidoVista, esMio: boolean, color: string): L.DivIcon {
  // Solo el nido propio late y es un punto lleno. El de los demás es apenas un
  // centro tenue adentro de su zona: el dato preciso no existe, y el dibujo no
  // tiene que aparentar que sí.
  const cuerpo = esMio
    ? `<span style="position:absolute;inset:0;border-radius:99px;background:${color};animation:latido 2.4s ease-out infinite"></span>
       <span style="position:absolute;inset:0;border-radius:99px;background:${color};border:2px solid ${pinturaDelMapa().anilloNido};box-shadow:0 0 12px ${color}88"></span>`
    : `<span style="position:absolute;inset:3px;border-radius:99px;background:${color};opacity:.75;border:2px solid ${pinturaDelMapa().anilloNido}"></span>`;
  return L.divIcon({
    className: "marcador-nido",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: `<div style="position:relative;width:14px;height:14px">
      ${cuerpo}
      <span data-rotulo style="position:absolute;left:50%;top:17px;transform:translateX(-50%);white-space:nowrap;font:600 11px/1 ui-sans-serif,system-ui;color:${pinturaDelMapa().rotuloMapa};text-shadow:${pinturaDelMapa().rotuloHalo};padding:4px 6px">${escapar(
        esMio ? "Tu nido" : n.nombre
      )}</span>
    </div>`,
  });
}

/** El rosa de la pollera. El mismo de su dibujo, para que la ruta y lo que
 *  vuela por ella sean la misma cosa. */
const COLOR_POLLERA = "#f472b6";

/**
 * El plato volador que baja a llevarse un ave.
 *
 * No lleva `data-rot`: no apunta a ningún lado. Cae sobre un punto del mapa y
 * se va para arriba, y rotarla con el rumbo del vuelo la haría entrar torcida a
 * un lugar al que no va.
 */
function iconoNave(clave: string): L.DivIcon {
  return L.divIcon({
    className: "marcador-ave marcador-nave",
    iconSize: [46, 53],
    // Anclada abajo del todo y al medio: lo que tiene que caer justo sobre el
    // ave es la punta del rayo, no el centro del dibujo.
    iconAnchor: [23, 53],
    // La animación va en un div interno y NO en la raíz del marcador, por la
    // misma razón que la rotación del ave: la raíz la posiciona Leaflet con su
    // propio `transform: translate3d(...)`, y animar `transform` ahí lo pisa.
    // La nave aparecía en la esquina del mapa en vez de sobre el bicho.
    html: `<div class="nave-baja">${svgPlatoVolador(46, clave)}</div>`,
  });
}

function iconoAve(
  especie: AveId,
  grados: number,
  pollera = false,
  tocable = false
): L.DivIcon {
  // La paloma no viaja sola: lleva el corazón de chocolate colgando. Va PEGADO
  // al ave y fuera del div que rota, o giraría de cabeza a mitad de vuelo.
  const carga =
    !pollera && especie === "paloma"
      ? `<span style="position:absolute;left:50%;top:19px;transform:translateX(-50%);font-size:13px;filter:drop-shadow(0 1px 3px #000)">🍫</span>`
      : "";
  return L.divIcon({
    // `tocable` agranda el área sensible en CSS y pone el cursor de mano: el
    // ave mide 34×28 y un dedo no acierta eso en movimiento.
    className: tocable ? "marcador-ave tocable" : "marcador-ave",
    iconSize: [34, 28],
    iconAnchor: [17, 14],
    // El rotado va en un div interno: el externo lo posiciona Leaflet con su
    // propio transform y pisarlo rompe el mapa.
    //
    // Y la pollera NO rota. Un ave apunta adonde va porque tiene pico; una
    // pollera apuntando al noreste es una pollera dada vuelta. Se queda
    // derecha y cruza el mapa ondeando, que además es más gracioso.
    html: `<div style="position:relative;width:34px;height:28px;display:grid;place-items:center">
      <div${pollera ? "" : " data-rot"} style="transform:rotate(${
        pollera ? 0 : grados
      }deg);filter:${pinturaDelMapa().sombraAve}">${
        pollera ? polleraHtml(34) : aveHtml(especie, 34)
      }</div>${carga}
    </div>`,
  });
}

/** La perica: el mismo perico, de rosa, con un corazón encima. */
function iconoPerica(): L.DivIcon {
  return L.divIcon({
    className: "marcador-ave",
    iconSize: [30, 26],
    iconAnchor: [15, 13],
    html: `<div style="position:relative;width:30px;height:26px;display:grid;place-items:center">
      <div style="filter:${pinturaDelMapa().sombraAve} hue-rotate(-95deg) saturate(1.5)">${aveHtml(
        "perico",
        30
      )}</div>
      <span style="position:absolute;left:50%;top:-12px;transform:translateX(-50%);font-size:14px">💗</span>
    </div>`,
  });
}

/**
 * La cervecería: un LUGAR en el mapa, no un pájaro con un vasito al lado.
 *
 * Es el único punto del mapa que no es el nido de nadie, y tiene que leerse
 * como lo que es —un boliche donde hay un ave esperando— de un vistazo y desde
 * lejos. Por eso va con cartel propio, resplandor y nombre debajo, como los
 * nidos: si fuera un ícono chiquito más, sería otro pájaro en el mapa.
 *
 * El cartel cuelga POR DEBAJO del punto y el ave se para justo encima, así que
 * las dos cosas se ven juntas sin taparse: el bicho arriba de la barra.
 */
/**
 * En qué momento de la noche está la barra: 0 recién llegó, 3 ya no da más.
 *
 * Se saca del nivel de borrachera pero se redondea a cuatro escalones a
 * propósito. El nivel es un número continuo que cambia sesenta veces por
 * segundo; el dibujo tiene que cambiar cuatro veces en toda la espera, o el
 * marcador se estaría rehaciendo todo el tiempo para mover un papelito.
 */
export function etapaDeLaBarra(nivel: number): number {
  if (nivel >= 0.75) return 3;
  if (nivel >= 0.45) return 2;
  if (nivel >= 0.2) return 1;
  return 0;
}

/**
 * Las que se van sumando a la mesa, en orden de llegada.
 *
 * Las posiciones están FUERA del cartel a propósito: el cartel mide 38 px y
 * está centrado en (62, 30), así que ocupa de x=43 a x=81. Puestas más cerca
 * quedaban detrás y solo se les veía la cola. Las dos primeras se sientan a
 * los costados y la tercera adelante, abajo, pisando un poco el cartel.
 */
const LA_BARRA: { ave: AveId; x: number; y: number; tam: number; espejo: boolean; copa: string }[] = [
  { ave: "cotorra", x: 2, y: 24, tam: 30, espejo: false, copa: "🍺" },
  { ave: "cotorra", x: 88, y: 26, tam: 28, espejo: true, copa: "🍺" },
  { ave: "loro", x: 44, y: 50, tam: 28, espejo: false, copa: "🍻" },
];

/**
 * La cervecería, con la mesa que se va llenando.
 *
 * Arrancaba siendo un cartel con un pájaro al lado, y la espera —que puede
 * durar dos días— era un ícono quieto. Ahora es una escena que crece: a los
 * primeros minutos hay una cotorra tomando, más tarde son dos, y cuando el ave
 * ya está de jarola son tres, con música y todo. Es la única parte de la app
 * donde no pasa nada durante horas, así que es justo donde tiene que haber
 * algo para volver a mirar.
 *
 * El cartel cuelga POR DEBAJO del punto y el ave del convite se para justo
 * encima, así que las dos cosas se ven juntas sin taparse: el bicho arriba de
 * la barra, y la mesa alrededor.
 */
function iconoCerveceria(nivel: number, rotulo: string): L.DivIcon {
  const pin = pinturaDelMapa();
  const etapa = etapaDeLaBarra(nivel);
  const jarana = etapa >= 3;
  // Una más en la mesa por escalón. En el escalón 0 la barra está vacía: el
  // ave acaba de sentarse y todavía no la acompaña nadie.
  const mesa = LA_BARRA.slice(0, Math.min(etapa, LA_BARRA.length))
    .map(
      (b, i) => `<span class="ave-tomada" style="position:absolute;left:${b.x}px;top:${b.y}px;animation-delay:${(i * 0.43).toFixed(2)}s">
        <span style="display:block;filter:${pin.sombraAve}${b.espejo ? ";transform:scaleX(-1)" : ""}">${aveHtml(b.ave, b.tam)}</span>
        <span style="position:absolute;left:${b.espejo ? -9 : b.tam - 5}px;top:${Math.round(b.tam * 0.46)}px;font-size:13px;line-height:1">${b.copa}</span>
      </span>`
    )
    .join("");
  // La música empieza cuando hay con quién: una sola ave tomando sola no hace
  // ruido. Y cuando ya está de jarola, la nota se cambia por la cara.
  const ruido = jarana
    ? `<span class="cerveceria-nota" style="position:absolute;left:84px;top:0;font-size:16px;line-height:1">🥴</span>
       <span class="cerveceria-nota" style="position:absolute;left:22px;top:0;font-size:13px;line-height:1;animation-delay:.8s">🎶</span>`
    : etapa >= 1
      ? `<span class="cerveceria-nota" style="position:absolute;left:84px;top:2px;font-size:14px;line-height:1">🎵</span>`
      : "";
  return L.divIcon({
    className: "marcador-ave",
    iconSize: [124, 96],
    // El ancla queda arriba del cartel: el punto de verdad es donde se posa el
    // ave del convite, y la barra se dibuja abajo.
    iconAnchor: [62, 8],
    // La mesa va DESPUÉS del cartel: dibujada antes quedaba atrás y de las
    // cotorras solo asomaba la cola.
    html: `<div style="position:relative;width:124px;height:96px">
      <span style="position:absolute;left:62px;top:30px;transform:translate(-50%,-50%);width:${jarana ? 104 : 84}px;height:${jarana ? 104 : 84}px;border-radius:99px;background:radial-gradient(circle,rgba(251,191,36,${jarana ? ".5" : ".42"}),rgba(251,191,36,0) 68%)"></span>
      <span class="cerveceria-cartel" style="position:absolute;left:62px;top:30px;transform:translate(-50%,-50%);width:38px;height:38px;border-radius:13px;background:linear-gradient(160deg,#fbbf24,#f59e0b);border:2px solid ${pin.anilloNido};box-shadow:0 3px 12px rgba(0,0,0,.4);display:grid;place-items:center;font-size:19px;line-height:1">🍻</span>
      ${mesa}
      ${ruido}
      <span data-rotulo style="position:absolute;left:62px;top:80px;transform:translateX(-50%);white-space:nowrap;font:700 10.5px/1 ui-sans-serif,system-ui;color:${pin.rotuloMapa};text-shadow:${pin.rotuloHalo};padding:3px 5px">${escapar(rotulo)}</span>
    </div>`,
  });
}

/**
 * El ave posada en la barra. Se para justo arriba del cartel y se bambolea:
 * en el mapa hay que poder distinguir de un vistazo un ave que vuela de una
 * que está sentada en una cervecería hace dos días.
 */
function iconoPosada(ave: AveId): L.DivIcon {
  return L.divIcon({
    className: "marcador-ave",
    iconSize: [34, 30],
    // Apoyada sobre el cartel, que cuelga 22 px por debajo del punto: el ave
    // tiene que tocarlo, no flotar arriba.
    iconAnchor: [17, 13],
    html: `<div class="ave-tomada" style="position:relative;width:34px;height:30px;display:grid;place-items:center">
      <div style="filter:${pinturaDelMapa().sombraAve}">${aveHtml(ave, 28)}</div>
    </div>`,
  });
}

/** Cuántas flores deja la paloma por el camino. */
const FLORES = 7;

/**
 * El radio de las vueltas que da el perico distraído, en km.
 *
 * Proporcional al viaje —para que se vea igual de grande en un vuelo de 2 km
 * que en uno de 10.000— pero acotado: sin el piso, en un vuelo corto el bucle
 * sería un punto; sin el techo, en uno intercontinental taparía un país.
 */
function radioGiro(km: number): number {
  return Math.min(60, Math.max(0.22, km * 0.035));
}

/** Una vuelta completa cada seis segundos. */
const GIRO_MS = 6000;

/**
 * Cómo se para el ave para ir hacia `grados`.
 *
 * Los dibujos miran a la derecha, así que rotar y listo alcanza para ir al
 * este. Al oeste no: rotar media vuelta deja al bicho volando panza arriba.
 * Entonces, en vez de seguir rotando, se lo espeja sobre su propio eje largo —
 * la nariz apunta igual y la panza vuelve abajo, que es como vuelan los pájaros.
 *
 * `grados` ya viene con el rumbo del mapa sumado, y eso hace falta: las rutas y
 * las zonas viven adentro del panel que Leaflet gira, pero los marcadores no
 * —por eso los nombres de los nidos se siguen leyendo derechos con el mapa
 * torcido—. Sin esa suma, al girar el mapa el ave se quedaba mirando al norte
 * de la pantalla mientras su propia línea se iba para otro lado.
 */
function orientar(grados: number): string {
  const giro = grados - 90;
  const normal = ((giro % 360) + 360) % 360;
  const cabezaAbajo = normal > 90 && normal < 270;
  return cabezaAbajo ? `rotate(${giro}deg) scaleY(-1)` : `rotate(${giro}deg)`;
}

function escapar(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string
  );
}

/** Qué tramos van en el mapa según la vista elegida. */
function loQueSeDibuja(
  vista: "tuyos" | "resto",
  vuelos: LoroVista[],
  mundo: VueloMundo[] | undefined,
  convites: ConviteVista[],
  ahora: number
): Tramo[] {
  return vista === "resto"
    ? tramosDelMundo(mundo ?? [], ahora)
    : [...tramosEnElAire(vuelos, ahora), ...tramosDeConvites(convites, ahora)];
}

type CapaVuelo = {
  completa: L.Polyline;
  /** El contorno oscuro abajo de lo recorrido. Solo sobre mapa claro: ahí una
   *  línea lima de 3,5 px se pierde contra el gris. null sobre mapa oscuro. */
  contorno: L.Polyline | null;
  recorrida: L.Polyline;
  ave: L.Marker;
  puntos: Punto[];
  /** Cuándo deja de existir este tramo. La poda la hace la animación: el
   *  tramo no termina por un cambio de datos sino por el paso del tiempo. */
  llegada: number;
  /** Solo la paloma: las flores que va soltando. Se crean apagadas y se
   *  encienden al pasar por encima. */
  flores: L.Marker[];
  /** Solo el perico enamorado, y recién cuando efectivamente se distrae. */
  giro: { circulo: L.Circle; perica: L.Marker } | null;
  /** Si esta capa ya se dibuja como pollera. Se guarda porque puede cambiar con
   *  la capa ya en el mapa: el lorito que salió de una cervecería se convierte
   *  al despegar, no al crearse. */
  pollera: boolean;
  /** La nave que vino a llevarse el ave, cuando la hay. Se crea recién al
   *  pedirse la abducción: hasta ese momento este vuelo es uno cualquiera. */
  nave: L.Marker | null;
};

export default function Mapa({
  yo,
  amigos,
  vuelos,
  mundo,
  convites = [],
  escala = 1,
  vista = "tuyos",
  ahoraServidor,
  foco,
  modoElegir = false,
  alElegirPunto,
  alEscribirle,
  alAbducir,
}: {
  yo: NidoVista | null;
  amigos: NidoVista[];
  vuelos: LoroVista[];
  /** Los vuelos anónimos de la vista del resto. */
  mundo?: VueloMundo[];
  /** Los loritos de convite: van hasta la cervecería y ahí se quedan. */
  convites?: ConviteVista[];
  /** La escala de tiempo del servidor, para contar copetines igual que el panel. */
  escala?: number;
  vista?: "tuyos" | "resto";
  ahoraServidor: () => number;
  /** "<id>#<nonce>": id de un loro o de un nido para centrar la cámara. El
   *  número de atrás permite volver a enfocar lo mismo dos veces seguidas. */
  foco?: string | null;
  modoElegir?: boolean;
  alElegirPunto?: (p: Punto) => void;
  /** Tocar el nido de alguien de tu bandada abre el compositor con esa persona
   *  ya elegida. El mapa es donde están todos; hasta ahora era lo único de la
   *  app donde verlos no servía para nada. */
  alEscribirle?: (idAmigo: string) => void;
  /** Tocar un ave tuya en el aire ofrece llamar al plato volador. Devuelve la
   *  promesa de la abducción para que el globo pueda mostrar el error si la
   *  nave no vino. */
  alAbducir?: (idLoro: string) => Promise<void>;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const nidos = useRef(new Map<string, L.Marker>());
  const zonas = useRef(new Map<string, L.Circle>());
  const capas = useRef(new Map<string, CapaVuelo>());
  /** Las aves posadas en una cervecería. No son vuelos: no avanzan.
   *  Se guarda la etapa dibujada para no rehacer el cartel en cada cuadro:
   *  la mesa cambia cuatro veces en toda la espera, no sesenta veces por
   *  segundo. */
  const posadas = useRef(
    new Map<string, { cartel: L.Marker; ave: L.Marker | null; etapa: number }>()
  );
  const encuadrado = useRef(false);
  const alElegirRef = useRef(alElegirPunto);
  alElegirRef.current = alElegirPunto;
  const alEscribirleRef = useRef(alEscribirle);
  alEscribirleRef.current = alEscribirle;
  const alAbducirRef = useRef(alAbducir);
  alAbducirRef.current = alAbducir;
  // El globo del ave se arma en el momento en que se abre, y para eso necesita
  // los vuelos de la consulta mas reciente y no los de cuando se creo la capa:
  // la capa vive todo el vuelo y el estado del loro cambia abajo de ella.
  const vuelosRef = useRef(vuelos);
  vuelosRef.current = vuelos;
  /** El nombre que muestra cada globo, para poder cambiarlo sin rearmarlo. */
  const rotulosPopup = useRef(new Map<string, HTMLElement>());
  const ahoraRef = useRef(ahoraServidor);
  ahoraRef.current = ahoraServidor;
  const [sinMosaicos, setSinMosaicos] = useState(false);
  /** Hacia dónde mira el mapa. 0 = norte arriba. */
  const [rumboMapa, setRumboMapa] = useState(0);
  // El mismo dato, en un ref, para el bucle de animación: si dependiera del
  // estado, girar el mapa recrearía el bucle sesenta veces por segundo.
  const rumboRef = useRef(0);

  // ---- crear el mapa una sola vez ----
  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    // Para que el CSS sepa qué hay abajo. Lo que Leaflet pinta cuando todavía
    // no llegaron los mosaicos tiene que parecerse a los mosaicos que vienen:
    // si no, cada paneo abre agujeros negros en un mapa claro.
    contenedor.current.dataset.mapa = mosaicoElegido().claro ? "claro" : "oscuro";
    const m = L.map(contenedor.current, {
      zoomControl: true,
      worldCopyJump: true,
      // El zoom con la rueda sin modificador secuestra el scroll de la página
      // en mobile; con el mapa a pantalla completa no molesta.
      scrollWheelZoom: true,
      // Girar con dos dedos en el celular y con shift + arrastrar en la compu.
      // La brújula la dibuja la app (abajo): la del plugin no se parece a nada
      // más de esta pantalla.
      rotate: true,
      touchRotate: true,
      shiftKeyRotate: true,
      rotateControl: false,
    }).setView([-34.6, -58.44], 11);

    // Los mosaicos vienen de un proveedor externo. Si no llegan —sin internet,
    // una red que los bloquea— el mapa igual sirve: las rutas y las aves se
    // dibujan sobre el fondo. Pero hay que decirlo, o parece que se rompió.
    const base = capaBase();
    let fallos = 0;
    let alguno = false;
    base.on("tileload", () => {
      alguno = true;
      setSinMosaicos(false);
    });
    base.on("tileerror", () => {
      fallos += 1;
      if (!alguno && fallos > 4) setSinMosaicos(true);
    });
    base.addTo(m);
    m.on("rotate", () => {
      const r = m.getBearing() || 0;
      rumboRef.current = r;
      setRumboMapa(r);
    });
    m.on("click", (e: L.LeafletMouseEvent) => {
      alElegirRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapa.current = m;

    // Si el contenedor cambia de tamaño (rotar el celular, abrir el panel),
    // Leaflet no se entera solo y quedan mosaicos grises.
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(contenedor.current);

    return () => {
      ro.disconnect();
      m.remove();
      mapa.current = null;
      nidos.current.clear();
      zonas.current.clear();
      capas.current.clear();
    };
  }, []);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    el.style.cursor = modoElegir ? "crosshair" : "";
    // Mientras se elige dónde poner el nido, las aves vuelven a ser dibujo: un
    // marcador interactivo se come el toque y el mapa nunca se entera, así que
    // tocar justo donde pasaba un loro no plantaría el nido en ningún lado.
    el.classList.toggle("eligiendo", modoElegir);
  }, [modoElegir]);

  // ---- nidos ----
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;

    // En la vista del resto no se dibuja ni un nido ajeno: los arcos ya vienen
    // corridos 25 km, y marcar sus puntas con un pin diría "acá vive alguien"
    // con una precisión que no tenemos y que además no nos corresponde. Queda
    // el propio, para no perder de vista dónde estás parado.
    const todos = vista === "resto" ? (yo ? [yo] : []) : [...(yo ? [yo] : []), ...amigos];
    // Un color por persona, sin choques dentro de la bandada. El nido propio
    // queda afuera del reparto: es siempre el verde de la app, y compartir
    // color con un amigo sería el único choque que de verdad confunde.
    const colores = coloresDeBandada(amigos.map((a) => a.id));
    if (yo) colores.set(yo.id, MI_COLOR);
    const vistos = new Set<string>();

    for (const n of todos) {
      vistos.add(n.id);
      const esMio = n.id === yo?.id;
      const existente = nidos.current.get(n.id);
      const icono = iconoNido(n, esMio, colores.get(n.id) ?? MI_COLOR);
      if (existente) {
        existente.setLatLng([n.lat, n.lng]);
        existente.setIcon(icono);
        // El nombre puede cambiar; el globo no se rearma. Este efecto corre en
        // cada consulta al servidor, y volver a llamar a bindPopup le cerraría
        // el globo en la cara a quien lo tiene abierto.
        const rotulo = rotulosPopup.current.get(n.id);
        if (rotulo && rotulo.textContent !== n.nombre) rotulo.textContent = n.nombre;
      } else {
        const marcador = L.marker([n.lat, n.lng], { icon: icono }).addTo(m);
        if (!esMio) marcador.bindPopup(globoDeNido(n, marcador));
        nidos.current.set(n.id, marcador);
      }

      // El círculo NO es decoración: es el tamaño real de lo que no sabemos.
      // De la otra persona llega un punto corrido al azar hasta `radioKm`, así
      // que dibujar un pin sería mentir con precisión de metros.
      if (n.radioKm > 0) {
        const zona = zonas.current.get(n.id);
        if (zona) {
          zona.setLatLng([n.lat, n.lng]);
        } else {
          zonas.current.set(
            n.id,
            L.circle([n.lat, n.lng], {
              radius: n.radioKm * 1000,
              color: colores.get(n.id) ?? pinturaDelMapa().zonaSinColor,
              weight: 1,
              opacity: pinturaDelMapa().opacidadZona,
              dashArray: "4 7",
              fillColor: colores.get(n.id) ?? pinturaDelMapa().zonaSinColor,
              fillOpacity: pinturaDelMapa().opacidadZonaRelleno,
              interactive: false,
            }).addTo(m)
          );
        }
      }
    }
    for (const [id, marcador] of nidos.current) {
      if (!vistos.has(id)) {
        marcador.remove();
        nidos.current.delete(id);
        rotulosPopup.current.delete(id);
      }
    }
    for (const [id, zona] of zonas.current) {
      if (!vistos.has(id)) {
        zona.remove();
        zonas.current.delete(id);
      }
    }

    // Encuadre inicial: una sola vez, cuando ya hay algo que encuadrar. Después
    // manda la persona — nada peor que un mapa que te devuelve al centro solo.
    // La cervecería entra en el encuadre inicial. Sin esto, quien acaba de
    // soltar un lorito abre el mapa y ve sus nidos y nada más: el ave, que es
    // lo único que pasó, queda fuera de pantalla.
    if (!encuadrado.current && todos.length > 0) {
      encuadrado.current = true;
      // Leaflet encuadra contra el tamaño que CREE que tiene el contenedor. Si
      // los datos llegan antes de que se entere del tamaño real, calcula el
      // zoom para una caja equivocada y deja los dos nidos pegados.
      m.invalidateSize();
      const barras = vista === "tuyos" ? convites.map((c) => c.posada) : [];
      if (todos.length === 1 && todos[0].radioKm === 0 && barras.length === 0) {
        m.setView([todos[0].lat, todos[0].lng], 13);
      } else {
        // El encuadre tiene que abarcar las ZONAS, no los puntos: si se calcula
        // sobre los centros, la zona de un vecino termina ocupando toda la
        // pantalla y no se entiende nada.
        const limites = L.latLngBounds([]);
        for (const n of todos) {
          if (n.radioKm > 0) {
            for (const grados of [0, 90, 180, 270]) {
              const p = desplazar({ lat: n.lat, lng: n.lng }, n.radioKm, grados);
              limites.extend([p.lat, p.lng]);
            }
          } else {
            limites.extend([n.lat, n.lng]);
          }
        }
        for (const b of barras) limites.extend([b.lat, b.lng]);
        m.fitBounds(limites, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [yo, amigos, convites, vista]);

  /**
   * El globo que aparece al tocar el nido de alguien de tu bandada.
   *
   * Se arma con DOM a mano y no con React: Leaflet maneja su propio globo y
   * meterle un portal para dos líneas de texto y un botón es más maquinaria
   * que la que resuelve. El botón usa las mismas clases que el resto de la
   * app, así que se pinta solo con el tema que esté puesto.
   */
  function globoDeNido(n: NidoVista, marcador: L.Marker): HTMLElement {
    const caja = document.createElement("div");
    caja.className = "globo-nido";

    const nombre = document.createElement("strong");
    nombre.textContent = n.nombre;
    caja.appendChild(nombre);
    rotulosPopup.current.set(n.id, nombre);

    if (n.lugar || n.distanciaKm !== undefined) {
      const donde = document.createElement("span");
      donde.className = "globo-donde";
      donde.textContent = [
        n.lugar,
        n.distanciaKm !== undefined ? `a ${formatearDistancia(n.distanciaKm)}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      caja.appendChild(donde);
    }

    const boton = document.createElement("button");
    boton.className = "boton chico";
    boton.textContent = "Envíale un lorito";
    boton.onclick = () => {
      marcador.closePopup();
      alEscribirleRef.current?.(n.id);
    };
    caja.appendChild(boton);
    return caja;
  }

  /**
   * El marcador del ave, tocable salvo que sea de un desconocido.
   *
   * En la vista del resto los vuelos son anónimos y vienen corridos 25 km:
   * abrirles un globo sería contar de quién es y adónde va, que es exactamente
   * lo que esa vista existe para no contar. Esas aves siguen siendo dibujo.
   */
  function aveTocable(v: Tramo, m: L.Map): L.Marker {
    const propio = !v.ajeno;
    const marcador = L.marker([v.origen.lat, v.origen.lng], {
      icon: iconoAve(v.ave, 0, v.pollera, propio),
      interactive: propio,
      zIndexOffset: 500,
    }).addTo(m);
    // Leaflet acepta una función como contenido y la llama en cada apertura.
    // Es lo que mantiene el globo al día sin tener que ir a refrescarlo desde
    // el bucle de animación.
    if (propio) {
      marcador.bindPopup(() => globoDeAve(v.loroId, v.vuelta, marcador) ?? "", {
        closeButton: false,
        autoPan: false,
      });
    }
    return marcador;
  }

  /**
   * El globo que aparece al tocar un ave en vuelo.
   *
   * Hasta ahora el ave era decoración: `interactive: false`, no se podía tocar.
   * Pero el bicho volando ES el objeto de esta app, y es el primer lugar donde
   * la mano va a buscar qué hacer con él. El botón de la abducción también
   * vive en la tarjeta del panel; este es el mismo acto desde el otro lado.
   *
   * Se arma con DOM y no con React, igual que `globoDeNido` y por lo mismo.
   * Y se arma DENTRO de la función que Leaflet llama al abrirlo, no al crear
   * la capa: entre que el ave despega y que alguien la toca pasan horas, y
   * "faltan 3 h" congelado en el momento del despegue sería mentira.
   */
  function globoDeAve(
    loroId: string,
    vuelta: boolean,
    marcador: L.Marker
  ): HTMLElement | null {
    const l = vuelosRef.current.find((x) => x.id === loroId);
    if (!l) return null;

    const a = AVES[l.ave];
    const ahora = ahoraRef.current();
    const caja = document.createElement("div");
    caja.className = "globo-nido";

    const nombre = document.createElement("strong");
    const quien = l.otro.nombre;
    nombre.textContent = vuelta
      ? `${a.nombre} volviendo de ${quien}`
      : l.direccion === "enviado"
        ? `${a.nombre} → ${quien}`
        : `${a.nombre} de ${quien}`;
    caja.appendChild(nombre);

    const donde = document.createElement("span");
    donde.className = "globo-donde";
    // Un lorito de convite que todavía no despegó está sentado en la barra:
    // decir "llega en" con el bicho quieto en una cervecería es la misma
    // mentira chica que el panel ya evita.
    donde.textContent =
      l.parada && ahora < l.salida
        ? `🍺 Terminando el copetín · sale en ${cuentaRegresiva(l.salida - ahora)}`
        : `Llega en ${cuentaRegresiva(Math.max(0, l.llegada - ahora))} · ${formatearDistancia(
            l.distanciaKm
          )} en total`;
    caja.appendChild(donde);

    // Solo sobre lo tuyo, solo mientras esté en el aire, y nunca sobre la
    // vuelta: eso ya es un ave que entregó y se la está devolviendo el otro.
    const sePuede =
      !vuelta &&
      l.direccion === "enviado" &&
      !l.llego &&
      !l.perdido &&
      l.abducido == null &&
      Boolean(alAbducirRef.current);
    if (!sePuede) return caja;

    const boton = document.createElement("button");
    boton.className = "boton chico fantasma";
    boton.textContent = "🛸 Solicitar abducción";
    // Dos toques, como todo lo que no tiene vuelta atrás en esta app, y el
    // segundo dice qué pasa y no "¿seguro?".
    let armado = false;
    boton.onclick = async () => {
      if (!armado) {
        armado = true;
        boton.textContent = "🛸 Confirmar (el mensaje se pierde en el espacio infinito)";
        return;
      }
      boton.disabled = true;
      boton.textContent = "Llamando a la nave…";
      try {
        await alAbducirRef.current?.(loroId);
        // La capa se poda sola cuando el servidor confirme; cerrar el globo
        // acá deja ver la nave, que es el punto de todo esto.
        marcador.closePopup();
      } catch (e: any) {
        boton.disabled = false;
        armado = false;
        boton.textContent = "🛸 Solicitar abducción";
        const error = document.createElement("span");
        error.className = "globo-donde";
        error.style.color = "#fca5a5";
        error.textContent = e?.message || "La nave no vino.";
        caja.appendChild(error);
      }
    };
    caja.appendChild(boton);
    return caja;
  }

  /**
   * Los nombres que no entran, se callan.
   *
   * Doña Cotorra se planta a trescientos metros de tu nido, así que en cuanto
   * el mapa se aleja un poco los dos nombres quedan uno encima del otro y no
   * se lee ninguno —"Doña hidorra"—. Dos nombres pisados son peores que uno
   * solo: el que se pierde no es el de abajo, son los dos.
   *
   * Se resuelve como en cualquier mapa: por prioridad y a los codazos. El tuyo
   * nunca se calla, después la bandada, después la vecina de práctica, y al
   * final la cervecería. Cada rótulo que no choca con ninguno de los que ya se
   * quedaron, se queda; el que choca, se apaga.
   *
   * Se apagan con opacidad y no con `display`, y no es un detalle: un rótulo
   * sin caja no se puede medir, y el pase siguiente no sabría si ya podría
   * volver. Así se mide siempre y prende y apaga solo al alejar y acercar.
   */
  function acomodarRotulos() {
    const m = mapa.current;
    if (!m) return;
    const candidatos: { el: HTMLElement; caja: DOMRect; prioridad: number }[] = [];
    const juntar = (marcador: L.Marker | undefined, prioridad: number) => {
      const raiz = marcador?.getElement();
      const el = raiz?.querySelector("[data-rotulo]") as HTMLElement | null;
      if (raiz && el) candidatos.push({ el: raiz, caja: el.getBoundingClientRect(), prioridad });
    };
    for (const [id, marcador] of nidos.current) {
      juntar(marcador, id === yo?.id ? 0 : amigos.find((a) => a.id === id)?.bot ? 2 : 1);
    }
    for (const [, barra] of posadas.current) juntar(barra.cartel, 3);

    candidatos.sort((a, b) => a.prioridad - b.prioridad);
    const quedan: DOMRect[] = [];
    for (const c of candidatos) {
      // Un par de píxeles de aire: dos nombres que se tocan justo tampoco se
      // leen como dos nombres.
      const choca = quedan.some(
        (q) =>
          c.caja.left < q.right + 3 &&
          c.caja.right > q.left - 3 &&
          c.caja.top < q.bottom + 2 &&
          c.caja.bottom > q.top - 2
      );
      c.el.classList.toggle("sin-rotulo", choca);
      if (!choca) quedan.push(c.caja);
    }
  }

  /** Saca del mapa todo lo que dibuja un tramo. */
  function borrarCapa(clave: string) {
    const capa = capas.current.get(clave);
    if (!capa) return;
    capa.completa.remove();
    capa.contorno?.remove();
    capa.recorrida.remove();
    capa.ave.remove();
    for (const f of capa.flores) f.remove();
    capa.giro?.circulo.remove();
    capa.giro?.perica.remove();
    capa.nave?.remove();
    capas.current.delete(clave);
  }

  // ---- vuelos: crear capas ----
  //
  // Solo CREA. Sacarlas es cosa de la animación: un tramo no termina porque
  // cambien los datos sino porque pasó la hora de llegada, y entre dos
  // consultas al servidor pueden pasar varios segundos.
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;

    for (const v of loQueSeDibuja(vista, vuelos, mundo, convites, ahoraRef.current())) {
      // La pollera vuela con su propio color y no con el verde del loro: si la
      // ruta sigue siendo la de siempre, en el mapa no se nota que cambió nada.
      const color = v.pollera ? COLOR_POLLERA : AVES[v.ave].color;
      const existente = capas.current.get(v.clave);

      // El desvío del perico no viene desde el principio: aparece recién cuando
      // se distrae. Por eso se comprueba también sobre capas ya creadas.
      if (existente) {
        if (v.desvio && !existente.giro) {
          const centro = puntoEnArco(v.origen, v.destino, v.desvio.en);
          existente.giro = {
            circulo: L.circle([centro.lat, centro.lng], {
              radius: radioGiro(v.distanciaKm) * 1000,
              color: AVES.paloma.color,
              // Sobre mapa claro el rosa da 2,4:1 y un punteado de 1,5 px se
              // pierde. Es el rastro de lo único raro que está pasando en el
              // mapa: si no se ve, la demora del perico no tiene explicación.
              weight: pinturaDelMapa().contorno ? 2.5 : 1.5,
              opacity: pinturaDelMapa().contorno ? 1 : 0.75,
              dashArray: "3 5",
              fill: false,
              interactive: false,
            }).addTo(m),
            perica: L.marker([centro.lat, centro.lng], {
              icon: iconoPerica(),
              interactive: false,
              zIndexOffset: 480,
            }).addTo(m),
          };
        }

        // Y la pollera, por el mismo motivo: tampoco viene desde el principio.
        // El lorito de convite se pasa un minuto más en la barra terminando el
        // copetín, y en ese minuto todavía es un loro; se convierte cuando
        // despega, con la capa ya dibujada. Hay que cambiarle las tres cosas
        // que lo hacen un loro: el dibujo, la ruta y lo recorrido.
        //
        // Llega en la consulta siguiente al despegue y no en el cuadro exacto,
        // porque el servidor es el que decide cuándo contarlo. Son unos
        // segundos con el ave ya en el aire, y se prefieren a mandar el campo
        // antes de tiempo: adelantado, el chiste se lee en las herramientas de
        // desarrollo; atrasado, no lo nota nadie.
        if (v.pollera && !existente.pollera) {
          existente.pollera = true;
          existente.ave.setIcon(iconoAve(v.ave, 0, true, !v.ajeno));
          existente.completa.setStyle({ color: COLOR_POLLERA });
          existente.recorrida.setStyle({ color: COLOR_POLLERA });
        }
        continue;
      }

      const puntos = arco(v.origen, v.destino, 96);
      const latlngs = puntos.map((p) => [p.lat, p.lng] as [number, number]);

      // La paloma va sembrando flores. Se crean las siete de una y arrancan
      // invisibles: crear marcadores adentro del bucle de animación es la
      // forma más rápida de que el mapa se ponga a tironear.
      const flores: L.Marker[] =
        v.ave === "paloma" && !v.vuelta
          ? Array.from({ length: FLORES }, (_, i) => {
              const p = puntoEnArco(v.origen, v.destino, (i + 1) / (FLORES + 1));
              return L.marker([p.lat, p.lng], {
                icon: L.divIcon({
                  className: "marcador-ave",
                  iconSize: [16, 16],
                  iconAnchor: [8, 8],
                  html: `<span style="font-size:13px;filter:drop-shadow(0 1px 3px #000)">${
                    i % 2 ? "🌷" : "🌹"
                  }</span>`,
                }),
                interactive: false,
                opacity: 0,
                zIndexOffset: 400,
              }).addTo(m);
            })
          : [];

      capas.current.set(v.clave, {
        puntos,
        llegada: v.llegada,
        flores,
        giro: null,
        nave: null,
        pollera: Boolean(v.pollera),
        completa: L.polyline(latlngs, {
          color,
          weight: 1.5,
          opacity: v.vuelta ? pinturaDelMapa().opacidadRutaVuelta : pinturaDelMapa().opacidadRuta,
          // La vuelta se dibuja más fina y más punteada: es el mismo mensaje
          // volviendo, no uno nuevo, y no tiene que competir con las idas.
          dashArray: v.vuelta ? "2 10" : "3 9",
          interactive: false,
        }).addTo(m),
        // Se crea antes que `recorrida` para quedar debajo: Leaflet apila en
        // el orden en que se agregan.
        contorno: pinturaDelMapa().contorno
          ? L.polyline([], {
              color: pinturaDelMapa().contorno!,
              weight: v.vuelta ? 4.5 : 6,
              opacity: 1,
              lineCap: "round",
              interactive: false,
            }).addTo(m)
          : null,
        recorrida: L.polyline([], {
          color,
          weight: v.vuelta ? 2 : 3.5,
          opacity: v.vuelta ? 0.7 : 0.95,
          dashArray: v.vuelta ? "6 5" : undefined,
          interactive: false,
        }).addTo(m),
        ave: aveTocable(v, m),
      });
    }
  }, [vuelos, mundo, vista]);

  // ---- animación ----
  useEffect(() => {
    let vivo = true;
    let cuadro = 0;
    let ultimoAcomodo = 0;

    const paso = () => {
      if (!vivo) return;
      const ahora = ahoraRef.current();
      const tramos = loQueSeDibuja(vista, vuelos, mundo, convites, ahora);
      const vivos = new Set(tramos.map((t) => t.clave));

      for (const v of tramos) {
        const capa = capas.current.get(v.clave);
        if (!capa) continue;

        // Un ave abducida no avanza más: se queda donde la interceptó el rayo.
        // Se congela el reloj del vuelo en ese instante y todo lo demás —la
        // posición, la línea recorrida, el rumbo— sale igual que siempre, sin
        // una sola rama extra.
        const seLoLlevan = v.abducido != null;
        const relojDelAve = seLoLlevan ? Math.min(ahora, v.abducido!) : ahora;
        const { avance: t, girando } = avanceVuelo(v, relojDelAve);

        // Dónde está y hacia dónde mira. Mientras da vueltas, el ave no avanza:
        // orbita el punto donde se distrajo, y apunta a la tangente.
        const enArco = puntoEnArco(v.origen, v.destino, t);
        let pos = enArco;
        let grados: number;
        if (girando) {
          const angulo = ((ahora % GIRO_MS) / GIRO_MS) * 360;
          pos = desplazar(enArco, radioGiro(v.distanciaKm), angulo);
          grados = angulo + 90;
        } else {
          const adelante = puntoEnArco(v.origen, v.destino, Math.min(1, t + 0.01));
          grados =
            t < 0.995 ? rumbo(pos, adelante) : rumbo(puntoEnArco(v.origen, v.destino, 0.98), pos);
        }
        capa.ave.setLatLng([pos.lat, pos.lng]);

        // Lo recorrido: los puntos de la ruta que quedaron atrás, más el punto
        // exacto donde está el ave, para que la línea le llegue justo al pico.
        const corte = Math.floor(t * (capa.puntos.length - 1));
        const trozo = capa.puntos
          .slice(0, corte + 1)
          .map((p) => [p.lat, p.lng] as [number, number]);
        trozo.push([pos.lat, pos.lng]);
        capa.recorrida.setLatLngs(trozo);
        capa.contorno?.setLatLngs(trozo);

        const el = capa.ave.getElement()?.querySelector("[data-rot]") as HTMLElement | null;
        if (el) el.style.transform = orientar(grados + rumboRef.current);

        // La nave. Se crea el primer cuadro en que hay abducción y desde ahí
        // sigue al ave —que ya no se mueve— hasta que la capa entera se poda,
        // MS_ABDUCCION después. Bajar, quedarse y subir es todo CSS.
        if (seLoLlevan) {
          if (!capa.nave && mapa.current) {
            capa.nave = L.marker([pos.lat, pos.lng], {
              icon: iconoNave(v.clave),
              interactive: false,
              // Por encima del ave: la nave está arriba, es lo que la levanta.
              zIndexOffset: 900,
            }).addTo(mapa.current);
          }
          capa.nave?.setLatLng([pos.lat, pos.lng]);
        }


        // Las flores aparecen cuando la paloma ya pasó por encima.
        for (let i = 0; i < capa.flores.length; i++) {
          const donde = (i + 1) / (capa.flores.length + 1);
          capa.flores[i].setOpacity(t >= donde ? 0.95 : 0);
        }
      }

      // Poda: los tramos que ya aterrizaron dejan de dibujarse acá, sin esperar
      // a la próxima consulta al servidor.
      for (const clave of [...capas.current.keys()]) {
        if (!vivos.has(clave)) borrarCapa(clave);
      }

      // Las cervecerías. Se manejan acá y no en un efecto porque el momento en
      // que un lorito pasa de volar a estar sentado en una barra lo decide el
      // reloj, no una consulta al servidor: mismo criterio que la poda.
      //
      // Hay barra en dos casos, y los dos tienen que verse igual: un convite
      // que todavía nadie abrió, y un lorito ya destrabado que salió de ahí.
      //
      // La cervecería NO se borra cuando el ave se levanta de la mesa. Se
      // queda hasta que el lorito aterriza. Mientras el ave viaja, ese punto
      // en el mapa es la mitad de la historia —de dónde viene y por qué va a
      // llegar hablando raro— y borrarlo justo cuando empieza lo interesante
      // deja el vuelo saliendo de la nada. La fiesta sigue sin ella: los que
      // se quedaron tomando no se van porque se fue una.
      //
      // El ave posada va solo mientras esté SENTADA. Apenas despega la dibuja
      // la capa de vuelo, y dibujarla dos veces la pondría en negrita sin
      // querer.
      const barras = new Map<string, { punto: Punto; ave: AveId | null; nivel: number }>();
      const mapaActual = mapa.current;
      if (vista === "tuyos" && mapaActual) {
        for (const c of convites) {
          // Sentada en la barra, o volviéndose al nido después de las 48 horas:
          // en los dos casos la cervecería sigue estando. Cuando ya llegó a
          // dormirla, la historia terminó y el cartel se va con ella.
          if (c.estado !== "barra" && c.estado !== "volviendo") continue;
          barras.set(`convite:${c.id}`, {
            punto: c.posada,
            ave: c.estado === "barra" ? c.ave : null,
            nivel: borrachera(Math.min(ahora, c.abandona) - c.llegadaPosada, escala).nivel,
          });
        }
        for (const l of vuelos) {
          // Desde que se sienta hasta que aterriza en el nido de la otra
          // persona. Ni antes —todavía va camino a la barra— ni después.
          if (!l.parada || ahora < l.parada.llegada || ahora >= l.llegada) continue;
          barras.set(`loro:${l.id}`, { punto: l.parada.punto, ave: null, nivel: l.parada.nivel });
        }
      }
      for (const [clave, b] of barras) {
        const etapa = etapaDeLaBarra(b.nivel);
        const ya = posadas.current.get(clave);
        if (ya) {
          // La mesa se llena mientras espera: cuando cambia de escalón se
          // redibuja el cartel, y solo entonces.
          if (ya.etapa !== etapa) {
            ya.cartel.setIcon(iconoCerveceria(b.nivel, "La cervecería"));
            ya.etapa = etapa;
          }
          // Y cuando el ave se levanta de la mesa, se saca de ahí: el resto de
          // la barra se queda.
          if (!b.ave && ya.ave) {
            ya.ave.remove();
            ya.ave = null;
          }
          continue;
        }
        posadas.current.set(clave, {
          etapa,
          cartel: L.marker([b.punto.lat, b.punto.lng], {
            icon: iconoCerveceria(b.nivel, "La cervecería"),
            interactive: false,
            zIndexOffset: 440,
          }).addTo(mapaActual!),
          ave: b.ave
            ? L.marker([b.punto.lat, b.punto.lng], {
                icon: iconoPosada(b.ave),
                interactive: false,
                zIndexOffset: 470,
              }).addTo(mapaActual!)
            : null,
        });
      }
      for (const [clave, m] of posadas.current) {
        if (!barras.has(clave)) {
          m.cartel.remove();
          m.ave?.remove();
          posadas.current.delete(clave);
        }
      }

      // Los rótulos, cuatro veces por segundo. Alcanza de sobra para que no se
      // note —el mapa no se mueve más rápido que eso a ojo— y evita medir cajas
      // sesenta veces por segundo.
      if (ahora - ultimoAcomodo > 250) {
        ultimoAcomodo = ahora;
        acomodarRotulos();
      }

      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);

    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
    };
  }, [vuelos, mundo, convites, escala, vista]);

  // ---- al cambiar de vista, encuadrar lo que hay ----
  //
  // Sin esto, tocar "Del resto" con el mapa en tu barrio deja una pantalla
  // vacía: los vuelos del mundo están a miles de kilómetros y no hay forma de
  // adivinar hacia dónde mover el mapa.
  const vistaPrevia = useRef(vista);
  /* Queda pendiente encuadrar. Hace falta separarlo del cambio de vista: al
     tocar "Del resto" los vuelos del mundo todavía no llegaron —recién ahí
     sale la consulta— así que en ese instante no hay nada que encuadrar, y el
     mapa se quedaba mirando tu barrio con los vuelos a diez mil kilómetros. */
  const porEncuadrar = useRef(false);
  useEffect(() => {
    if (vista !== vistaPrevia.current) {
      vistaPrevia.current = vista;
      porEncuadrar.current = true;
    }
    const m = mapa.current;
    if (!m || !porEncuadrar.current) return;

    const tramos = loQueSeDibuja(vista, vuelos, mundo, convites, ahoraRef.current());
    // Todavía no llegó nada: se vuelve a intentar cuando llegue.
    if (vista === "resto" && tramos.length === 0) return;

    // Sobre los puntos del arco y no sobre las dos puntas: la panza se sale
    // de la caja que forman origen y destino —y un vuelo largo, además, se
    // curva solo—, así que encuadrando las puntas el arco quedaba cortado.
    const limites = L.latLngBounds([]);
    for (const t of tramos) {
      for (const p of arco(t.origen, t.destino, 16)) limites.extend([p.lat, p.lng]);
    }
    if (vista === "tuyos") {
      for (const c of convites) limites.extend([c.posada.lat, c.posada.lng]);
    }
    if (vista === "tuyos" && yo) limites.extend([yo.lat, yo.lng]);
    if (!limites.isValid()) return;

    porEncuadrar.current = false;
    m.flyToBounds(limites, { padding: [60, 60], maxZoom: 13, duration: 0.8 });
  }, [vista, mundo, vuelos, convites, yo]);

  // ---- cámara ----
  useEffect(() => {
    const m = mapa.current;
    if (!m || !foco) return;
    const id = foco.split("#")[0];

    const ahora = ahoraRef.current();
    // Un loro puede tener dos tramos en el aire (la ida terminó, la vuelta no).
    // Se enfoca el que todavía se está moviendo.
    const tramo = tramosEnElAire(vuelos, ahora).find((t) => t.loroId === id);
    if (tramo) {
      const { avance } = avanceVuelo(tramo, ahora);
      const p = puntoEnArco(tramo.origen, tramo.destino, avance);
      m.flyTo([p.lat, p.lng], Math.max(m.getZoom(), 11), { duration: 0.9 });
      return;
    }
    const nido = [...(yo ? [yo] : []), ...amigos].find((n) => n.id === id);
    if (nido) m.flyTo([nido.lat, nido.lng], Math.max(m.getZoom(), 13), { duration: 0.9 });
    // `vuelos` a propósito fuera de las dependencias: cambia en cada consulta y
    // volvería a mover la cámara sola cada vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foco]);

  /** Volver a poner el norte arriba. Solo aparece cuando hay algo que enderezar. */
  const torcido = Math.abs(((rumboMapa % 360) + 360) % 360) > 0.5;

  return (
    <>
      <div ref={contenedor} style={{ position: "absolute", inset: 0 }} />

      {/* La brújula. Aparece recién cuando el mapa está girado: un botón para
          "poner el norte arriba" cuando el norte YA está arriba es ruido.
          Arriba a la derecha, al lado de "Mi nido", y no bajo el zoom: ahí la
          tapaban los avisos, que arrancan a 58 px y ocupan todo el ancho. */}
      {torcido && (
        <button
          className="flotante entra"
          style={{ top: 12, right: 120, padding: 8 }}
          onClick={() => mapa.current?.setBearing(0)}
          title="Poner el norte arriba"
          aria-label="Poner el norte arriba"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <g transform={`rotate(${-rumboMapa} 12 12)`}>
              <path d="M12 3 L16 13 L12 11 Z" fill="#f87171" />
              <path d="M12 21 L8 11 L12 13 Z" fill="${pinturaDelMapa().nidoSinColor}" />
            </g>
          </svg>
        </button>
      )}

      {sinMosaicos && (
        <div
          className="flotante sin-mosaicos"
          style={{ color: "var(--suave)", cursor: "default" }}
        >
          🗺 Sin mosaicos del mapa — los vuelos se siguen viendo
        </div>
      )}
    </>
  );
}
