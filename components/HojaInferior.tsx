"use client";

// El panel de abajo, arrastrable.
//
// En el celular el panel y el mapa se pelean por la misma pantalla: con el
// panel fijo en 58dvh, ver el vuelo entero de un loro obligaba a hacer zoom out
// hasta que los dos nidos entraban en la mitad de arriba. Ahora el panel se
// baja con el dedo y el mapa se queda con todo lo demás.
//
// Tres alturas y no un arrastre libre: un panel que queda a una altura
// cualquiera se siente roto, y encima obliga a acomodarlo a mano cada vez. Los
// topes son
//
//   baja   lo mínimo para seguir viendo quién sos, las pestañas y el botón.
//          Se mide, no se inventa: depende de la tipografía del sistema y del
//          alto de la barra de gestos, que cambian de teléfono en teléfono.
//   media  el default de siempre.
//   alta   casi toda la pantalla, para leer el buzón.
//
// El mapa se entera solo: components/Mapa.tsx tiene un ResizeObserver que llama
// a invalidateSize(), así que Leaflet se reacomoda mientras el panel se mueve.
//
// En pantalla ancha esto no corre: ahí el panel es una columna al costado y no
// le saca espacio a nada.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Altura = "oculta" | "baja" | "media" | "alta";
const ORDEN: Altura[] = ["oculta", "baja", "media", "alta"];

/** Arriba de esto el panel es una columna y no una hoja. */
const ANCHA = "(min-width: 900px)";

/** Cuánto de la pantalla ocupa cada tope. Los dos de abajo se miden aparte. */
const PROPORCION: Record<"media" | "alta", number> = { media: 0.58, alta: 0.8 };

/** Arriba de esta velocidad (px por ms) el gesto manda sobre la posición: un
 *  golpe corto y rápido hacia abajo baja el panel aunque no lo hayas movido
 *  ni la mitad del camino. */
const VELOCIDAD_GOLPE = 0.45;

/**
 * Lo mínimo que puede medir el asa cuando el panel está en el fondo.
 *
 * Ahí es la única cosa tocable de toda la pantalla, y medida sola daba 18 px:
 * un blanco al que hay que apuntar. 44 es el mínimo que recomiendan iOS y
 * Android para algo que se toca con el dedo, y el mapa igual se queda con el
 * 95 % de la pantalla.
 */
const AGARRE_MINIMO = 44;

/**
 * Cuánto mide la barra de gestos de abajo, en píxeles.
 *
 * Se mide con un elemento de mentira en vez de leer la variable CSS: `env()`
 * adentro de una custom property no siempre llega resuelto a
 * getComputedStyle, y acá un número equivocado deja el asa del panel justo
 * debajo del dedo del sistema.
 */
let margenAbajo: number | null = null;
function margenDeAbajo(): number {
  if (margenAbajo !== null) return margenAbajo;
  const sonda = document.createElement("div");
  sonda.style.cssText =
    "position:fixed;left:-9999px;bottom:0;width:1px;height:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(sonda);
  margenAbajo = sonda.getBoundingClientRect().height;
  sonda.remove();
  return margenAbajo;
}

/** El nombre del evento que le pide a la hoja que se corra. Ver el efecto que
 *  lo escucha, más abajo. */
export const MIRAR_EL_MAPA = "loros:mirar-el-mapa";

/** Pedirle a la hoja que baje para que se vea el mapa. En pantalla ancha y con
 *  la hoja ya abajo no hace nada, así que se puede llamar sin preguntar. */
export function mirarElMapa(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(MIRAR_EL_MAPA));
}

export function HojaInferior({ children }: { children: ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const [tope, setTope] = useState<Altura>("media");
  const [alto, setAlto] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [hoja, setHoja] = useState(false);
  /* Sube de a uno cada vez que cambia el tamaño de la ventana. Girar el
     teléfono cambia los tres topes —58% de una pantalla apaisada no son los
     mismos píxeles— y también el mínimo, que se mide. */
  const [medida, setMedida] = useState(0);
  // Los dos de abajo, medidos después de pintar. Los números de acá son solo
  // el punto de partida hasta que se miden.
  const minimo = useRef(196);
  const soloAgarre = useRef(26);

  const topes = useCallback((): Record<Altura, number> => {
    const alto = window.innerHeight;
    return {
      oculta: soloAgarre.current,
      baja: minimo.current,
      media: Math.round(alto * PROPORCION.media),
      alta: Math.round(alto * PROPORCION.alta),
    };
  }, []);

  // ¿Es una hoja o una columna? Se decide acá y se rehace al girar el teléfono.
  useEffect(() => {
    const mq = window.matchMedia(ANCHA);
    const mirar = () => {
      const ancha = mq.matches;
      setHoja(!ancha);
      setMedida((n) => n + 1);
      // En columna manda el CSS: dejar un alto en línea la dejaría clavada en
      // los píxeles que tenía el panel del celular.
      if (ancha) setAlto(null);
    };
    mirar();
    mq.addEventListener("change", mirar);
    window.addEventListener("resize", mirar);
    return () => {
      mq.removeEventListener("change", mirar);
      window.removeEventListener("resize", mirar);
    };
  }, []);

  // Los dos topes de abajo. Se miden en vez de fijarlos porque dependen del
  // tamaño de letra del sistema y de la barra de gestos del teléfono, que
  // cambian de aparato en aparato.
  useEffect(() => {
    const el = caja.current;
    if (!el || !hoja) return;
    const medir = () => {
      const pestañas = el.querySelector("[data-pestanas]");
      const pie = el.querySelector("[data-pie]");
      const agarre = el.querySelector("[data-agarre]");
      const arriba = el.getBoundingClientRect().top;

      // Todo abajo: solo el agarre, más el hueco de la barra de gestos para
      // que no quede el asa debajo del dedo del sistema.
      if (agarre) {
        const suyo = agarre.getBoundingClientRect().height;
        soloAgarre.current = Math.round(Math.max(suyo, AGARRE_MINIMO) + margenDeAbajo());
      }
      if (!pestañas) return;
      const hasta = pestañas.getBoundingClientRect().bottom - arriba;
      minimo.current = Math.round(hasta + (pie?.getBoundingClientRect().height ?? 0) + 16);
    };
    medir();
    // La primera medición cae antes de que el navegador termine de acomodar
    // las fuentes; una segunda pasada la corrige.
    const t = setTimeout(medir, 400);
    return () => clearTimeout(t);
  }, [hoja, medida]);

  const irA = useCallback(
    (t: Altura) => {
      setTope(t);
      setAlto(topes()[t]);
    },
    [topes]
  );

  /**
   * "Sacate de encima el mapa."
   *
   * Cuando algo pasa a ser digno de mirarse EN el mapa —acabás de soltar un
   * loro, entró alguien a tu bandada, llamaste al plato volador— la hoja está
   * tapando el 58% de la pantalla justo donde está lo que hay que ver. Bajarla
   * es parte del acto, no una cortesía.
   *
   * Va por evento y no por prop porque el alto es asunto privado de esta hoja
   * y de nadie más: cablear un ref hasta acá desde la página obligaría a todos
   * los del medio a saber que existe un tope. Solo baja: si ya estás abajo, o
   * si estás en pantalla ancha —donde la hoja es una columna al costado y no le
   * saca espacio a nada—, no hace nada.
   */
  useEffect(() => {
    if (!hoja) return;
    const bajar = () => setTope((t) => (t === "media" || t === "alta" ? "baja" : t));
    window.addEventListener(MIRAR_EL_MAPA, bajar);
    return () => window.removeEventListener(MIRAR_EL_MAPA, bajar);
  }, [hoja]);

  // El alto arranca en el default, y se recalcula al girar el teléfono: 58% de
  // una pantalla apaisada no son los mismos píxeles.
  useEffect(() => {
    if (!hoja) return;
    setAlto(topes()[tope]);
  }, [hoja, tope, topes, medida]);

  const gesto = useRef({ y: 0, alto: 0, t: 0 });
  /* Soltar el dedo sobre el agarre dispara además un click, y el click alterna
     el tope: sin esto, cada arrastre se deshacía solo al levantar el dedo. */
  const arrastró = useRef(false);

  function alEmpezar(e: React.PointerEvent) {
    if (!hoja || !caja.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesto.current = { y: e.clientY, alto: caja.current.offsetHeight, t: performance.now() };
    arrastró.current = false;
    setArrastrando(true);
  }

  function alMover(e: React.PointerEvent) {
    if (!arrastrando) return;
    const t = topes();
    // Hacia arriba el panel crece; hacia abajo se achica.
    const corrido = gesto.current.y - e.clientY;
    if (Math.abs(corrido) > 6) arrastró.current = true;
    const crudo = gesto.current.alto + corrido;
    // El piso es `oculta`, no `baja`: si el arrastre se topa en `baja`, el
    // fondo del todo —donde el mapa se ve entero— solo se alcanza tocando el
    // asa, y arrastrar hasta abajo no llega nunca. Que es justo lo que se
    // espera de una hoja que se arrastra. Lo que sobra se recorta solo
    // (`overflow: hidden` en .app-panel).
    setAlto(Math.min(t.alta, Math.max(t.oculta, crudo)));
  }

  function alTerminar(e: React.PointerEvent) {
    if (!arrastrando) return;
    setArrastrando(false);
    const t = topes();
    const actual = caja.current?.offsetHeight ?? t[tope];
    const recorrido = actual - gesto.current.alto;
    const velocidad = recorrido / Math.max(1, performance.now() - gesto.current.t);

    // Primero, el tope más cercano a donde quedó el dedo.
    let destino: Altura = "media";
    for (const k of ORDEN) if (Math.abs(t[k] - actual) < Math.abs(t[destino] - actual)) destino = k;

    // Y si además fue un golpe rápido, uno más en esa dirección. Contado desde
    // donde quedó y no desde donde arrancó: así un tirón largo y rápido llega
    // hasta el final en vez de avanzar un solo tope.
    if (Math.abs(velocidad) > VELOCIDAD_GOLPE) {
      const i = ORDEN.indexOf(destino);
      destino = ORDEN[Math.min(ORDEN.length - 1, Math.max(0, i + (velocidad > 0 ? 1 : -1)))];
    }
    irA(destino);
  }

  /**
   * Tocar el agarre: desde el default se va al fondo, y desde cualquier otro
   * lado vuelve al default.
   *
   * O sea que un toque siempre significa "mostrame el mapa" o "traeme el panel
   * de vuelta", que son las dos cosas que se quieren hacer. Las alturas
   * intermedias quedan para el arrastre, que es el control fino.
   */
  function alTocar() {
    // Un arrastre termina en un click; ese click no es un toque.
    if (!hoja || arrastró.current) {
      arrastró.current = false;
      return;
    }
    irA(tope === "media" ? "oculta" : "media");
  }

  return (
    <div
      ref={caja}
      className="app-panel"
      /* Lo lee el CSS para esconder todo menos el asa cuando está en el fondo:
         el botón de abajo está posicionado contra el borde inferior del panel
         y, con la hoja de 26 px, se dibujaba encima del agarre. */
      data-tope={hoja ? tope : undefined}
      style={
        hoja && alto !== null
          ? {
              height: alto,
              transition: arrastrando
                ? "none"
                : "height .3s cubic-bezier(.32, .72, 0, 1)",
            }
          : undefined
      }
    >
      {hoja && (
        <button
          className="agarre"
          data-agarre
          aria-label={
            tope === "media" ? "Bajar el panel para ver el mapa entero" : "Subir el panel"
          }
          onPointerDown={alEmpezar}
          onPointerMove={alMover}
          onPointerUp={alTerminar}
          onPointerCancel={alTerminar}
          onClick={alTocar}
          onKeyDown={(e) => {
            const i = ORDEN.indexOf(tope);
            if (e.key === "ArrowUp") irA(ORDEN[Math.min(ORDEN.length - 1, i + 1)]);
            else if (e.key === "ArrowDown") irA(ORDEN[Math.max(0, i - 1)]);
            else return;
            e.preventDefault();
          }}
        >
          <span />
        </button>
      )}
      {children}
    </div>
  );
}
