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
import { desplazar, puntoEnRuta, rumbo, ruta, type Punto } from "../lib/geo";
import { avanceVuelo } from "../lib/vuelo";
import { tramosDelMundo, tramosEnElAire, type Tramo } from "../lib/tramos";
import { aveHtml } from "./Ave";
import type { LoroVista, NidoVista, VueloMundo } from "../lib/vista";
import { coloresDeBandada, MI_COLOR } from "../lib/colorNido";
import { pintura } from "../lib/tema";

const MAPBOX = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function capaBase(): L.TileLayer {
  if (MAPBOX) {
    return L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/${pintura.mosaicoMapbox}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX}`,
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
    `https://{s}.basemaps.cartocdn.com/${pintura.mosaicoCarto}/{z}/{x}/{y}{r}.png`,
    {
      maxZoom: 20,
      subdomains: "abcd",
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
    }
  );
}

function iconoNido(n: NidoVista, esMio: boolean, color: string): L.DivIcon {
  // Solo el nido propio late y es un punto lleno. El de los demás es apenas un
  // centro tenue adentro de su zona: el dato preciso no existe, y el dibujo no
  // tiene que aparentar que sí.
  const cuerpo = esMio
    ? `<span style="position:absolute;inset:0;border-radius:99px;background:${color};animation:latido 2.4s ease-out infinite"></span>
       <span style="position:absolute;inset:0;border-radius:99px;background:${color};border:2px solid ${pintura.anilloNido};box-shadow:0 0 12px ${color}88"></span>`
    : `<span style="position:absolute;inset:3px;border-radius:99px;background:${color};opacity:.75;border:2px solid ${pintura.anilloNido}"></span>`;
  return L.divIcon({
    className: "marcador-nido",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: `<div style="position:relative;width:14px;height:14px">
      ${cuerpo}
      <span style="position:absolute;left:50%;top:17px;transform:translateX(-50%);white-space:nowrap;font:600 11px/1 ui-sans-serif,system-ui;color:${pintura.rotuloMapa};text-shadow:${pintura.rotuloHalo};pointer-events:none">${escapar(
        esMio ? "Tu nido" : n.nombre
      )}</span>
    </div>`,
  });
}

function iconoAve(especie: AveId, grados: number): L.DivIcon {
  // La paloma no viaja sola: lleva el corazón de chocolate colgando. Va PEGADO
  // al ave y fuera del div que rota, o giraría de cabeza a mitad de vuelo.
  const carga =
    especie === "paloma"
      ? `<span style="position:absolute;left:50%;top:19px;transform:translateX(-50%);font-size:13px;filter:drop-shadow(0 1px 3px #000)">🍫</span>`
      : "";
  return L.divIcon({
    className: "marcador-ave",
    iconSize: [34, 28],
    iconAnchor: [17, 14],
    // El rotado va en un div interno: el externo lo posiciona Leaflet con su
    // propio transform y pisarlo rompe el mapa.
    html: `<div style="position:relative;width:34px;height:28px;display:grid;place-items:center">
      <div data-rot style="transform:rotate(${grados}deg);filter:${pintura.sombraAve}">${aveHtml(
        especie,
        34
      )}</div>${carga}
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
      <div style="filter:${pintura.sombraAve} hue-rotate(-95deg) saturate(1.5)">${aveHtml(
        "perico",
        30
      )}</div>
      <span style="position:absolute;left:50%;top:-12px;transform:translateX(-50%);font-size:14px">💗</span>
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
  ahora: number
): Tramo[] {
  return vista === "resto"
    ? tramosDelMundo(mundo ?? [], ahora)
    : tramosEnElAire(vuelos, ahora);
}

type CapaVuelo = {
  completa: L.Polyline;
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
};

export default function Mapa({
  yo,
  amigos,
  vuelos,
  mundo,
  vista = "tuyos",
  ahoraServidor,
  foco,
  modoElegir = false,
  alElegirPunto,
}: {
  yo: NidoVista | null;
  amigos: NidoVista[];
  vuelos: LoroVista[];
  /** Los vuelos anónimos de la vista del resto. */
  mundo?: VueloMundo[];
  vista?: "tuyos" | "resto";
  ahoraServidor: () => number;
  /** "<id>#<nonce>": id de un loro o de un nido para centrar la cámara. El
   *  número de atrás permite volver a enfocar lo mismo dos veces seguidas. */
  foco?: string | null;
  modoElegir?: boolean;
  alElegirPunto?: (p: Punto) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const nidos = useRef(new Map<string, L.Marker>());
  const zonas = useRef(new Map<string, L.Circle>());
  const capas = useRef(new Map<string, CapaVuelo>());
  const encuadrado = useRef(false);
  const alElegirRef = useRef(alElegirPunto);
  alElegirRef.current = alElegirPunto;
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
    if (el) el.style.cursor = modoElegir ? "crosshair" : "";
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
      } else {
        nidos.current.set(n.id, L.marker([n.lat, n.lng], { icon: icono }).addTo(m));
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
              color: colores.get(n.id) ?? pintura.zonaSinColor,
              weight: 1,
              opacity: 0.35,
              dashArray: "4 7",
              fillColor: colores.get(n.id) ?? pintura.zonaSinColor,
              fillOpacity: 0.07,
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
    if (!encuadrado.current && todos.length > 0) {
      encuadrado.current = true;
      // Leaflet encuadra contra el tamaño que CREE que tiene el contenedor. Si
      // los datos llegan antes de que se entere del tamaño real, calcula el
      // zoom para una caja equivocada y deja los dos nidos pegados.
      m.invalidateSize();
      if (todos.length === 1 && todos[0].radioKm === 0) {
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
        m.fitBounds(limites, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [yo, amigos, vista]);

  /** Saca del mapa todo lo que dibuja un tramo. */
  function borrarCapa(clave: string) {
    const capa = capas.current.get(clave);
    if (!capa) return;
    capa.completa.remove();
    capa.recorrida.remove();
    capa.ave.remove();
    for (const f of capa.flores) f.remove();
    capa.giro?.circulo.remove();
    capa.giro?.perica.remove();
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

    for (const v of loQueSeDibuja(vista, vuelos, mundo, ahoraRef.current())) {
      const color = AVES[v.ave].color;
      const existente = capas.current.get(v.clave);

      // El desvío del perico no viene desde el principio: aparece recién cuando
      // se distrae. Por eso se comprueba también sobre capas ya creadas.
      if (existente) {
        if (v.desvio && !existente.giro) {
          const centro = puntoEnRuta(v.origen, v.destino, v.desvio.en);
          existente.giro = {
            circulo: L.circle([centro.lat, centro.lng], {
              radius: radioGiro(v.distanciaKm) * 1000,
              color: AVES.paloma.color,
              weight: 1.5,
              opacity: 0.75,
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
        continue;
      }

      const puntos = ruta(v.origen, v.destino, 96);
      const latlngs = puntos.map((p) => [p.lat, p.lng] as [number, number]);

      // La paloma va sembrando flores. Se crean las siete de una y arrancan
      // invisibles: crear marcadores adentro del bucle de animación es la
      // forma más rápida de que el mapa se ponga a tironear.
      const flores: L.Marker[] =
        v.ave === "paloma" && !v.vuelta
          ? Array.from({ length: FLORES }, (_, i) => {
              const p = puntoEnRuta(v.origen, v.destino, (i + 1) / (FLORES + 1));
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
        completa: L.polyline(latlngs, {
          color,
          weight: 1.5,
          opacity: v.vuelta ? 0.18 : 0.3,
          // La vuelta se dibuja más fina y más punteada: es el mismo mensaje
          // volviendo, no uno nuevo, y no tiene que competir con las idas.
          dashArray: v.vuelta ? "2 10" : "3 9",
          interactive: false,
        }).addTo(m),
        recorrida: L.polyline([], {
          color,
          weight: v.vuelta ? 2 : 3.5,
          opacity: v.vuelta ? 0.7 : 0.95,
          dashArray: v.vuelta ? "6 5" : undefined,
          interactive: false,
        }).addTo(m),
        ave: L.marker([v.origen.lat, v.origen.lng], {
          icon: iconoAve(v.ave, 0),
          interactive: false,
          zIndexOffset: 500,
        }).addTo(m),
      });
    }
  }, [vuelos, mundo, vista]);

  // ---- animación ----
  useEffect(() => {
    let vivo = true;
    let cuadro = 0;

    const paso = () => {
      if (!vivo) return;
      const ahora = ahoraRef.current();
      const tramos = loQueSeDibuja(vista, vuelos, mundo, ahora);
      const vivos = new Set(tramos.map((t) => t.clave));

      for (const v of tramos) {
        const capa = capas.current.get(v.clave);
        if (!capa) continue;

        const { avance: t, girando } = avanceVuelo(v, ahora);

        // Dónde está y hacia dónde mira. Mientras da vueltas, el ave no avanza:
        // orbita el punto donde se distrajo, y apunta a la tangente.
        const enRuta = puntoEnRuta(v.origen, v.destino, t);
        let pos = enRuta;
        let grados: number;
        if (girando) {
          const angulo = ((ahora % GIRO_MS) / GIRO_MS) * 360;
          pos = desplazar(enRuta, radioGiro(v.distanciaKm), angulo);
          grados = angulo + 90;
        } else {
          const adelante = puntoEnRuta(v.origen, v.destino, Math.min(1, t + 0.01));
          grados =
            t < 0.995 ? rumbo(pos, adelante) : rumbo(puntoEnRuta(v.origen, v.destino, 0.98), pos);
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

        const el = capa.ave.getElement()?.querySelector("[data-rot]") as HTMLElement | null;
        if (el) el.style.transform = orientar(grados + rumboRef.current);


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

      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);

    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
    };
  }, [vuelos, mundo, vista]);

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

    const tramos = loQueSeDibuja(vista, vuelos, mundo, ahoraRef.current());
    // Todavía no llegó nada: se vuelve a intentar cuando llegue.
    if (vista === "resto" && tramos.length === 0) return;

    // Sobre los puntos de la ruta y no sobre las dos puntas: un vuelo largo se
    // curva bastante afuera de la caja que forman su origen y su destino, y
    // encuadrando las puntas el arco se salía por arriba de la pantalla.
    const limites = L.latLngBounds([]);
    for (const t of tramos) {
      for (const p of ruta(t.origen, t.destino, 16)) limites.extend([p.lat, p.lng]);
    }
    if (vista === "tuyos" && yo) limites.extend([yo.lat, yo.lng]);
    if (!limites.isValid()) return;

    porEncuadrar.current = false;
    m.flyToBounds(limites, { padding: [60, 60], maxZoom: 13, duration: 0.8 });
  }, [vista, mundo, vuelos, yo]);

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
      const p = puntoEnRuta(tramo.origen, tramo.destino, avance);
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
              <path d="M12 21 L8 11 L12 13 Z" fill="${pintura.nidoSinColor}" />
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
