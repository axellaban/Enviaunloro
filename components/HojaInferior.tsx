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

type Altura = "baja" | "media" | "alta";
const ORDEN: Altura[] = ["baja", "media", "alta"];

/** Arriba de esto el panel es una columna y no una hoja. */
const ANCHA = "(min-width: 900px)";

/** Cuánto de la pantalla ocupa cada tope. La baja se mide aparte. */
const PROPORCION: Record<Exclude<Altura, "baja">, number> = { media: 0.58, alta: 0.8 };

/** Arriba de esta velocidad (px por ms) el gesto manda sobre la posición: un
 *  golpe corto y rápido hacia abajo baja el panel aunque no lo hayas movido
 *  ni la mitad del camino. */
const VELOCIDAD_GOLPE = 0.45;

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
  // El mínimo real, medido después de pintar. 196 es solo el valor con el que
  // arranca hasta que se mide.
  const minimo = useRef(196);

  const topes = useCallback((): Record<Altura, number> => {
    const alto = window.innerHeight;
    return {
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

  // El tope de abajo: hasta dónde llega la fila de pestañas, más el botón. Se
  // mide en vez de fijarlo porque depende del tamaño de letra del sistema y de
  // la barra de gestos del teléfono.
  useEffect(() => {
    const el = caja.current;
    if (!el || !hoja) return;
    const medir = () => {
      const pestañas = el.querySelector("[data-pestanas]");
      const pie = el.querySelector("[data-pie]");
      if (!pestañas) return;
      const arriba = el.getBoundingClientRect().top;
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
    setAlto(Math.min(t.alta, Math.max(t.baja, crudo)));
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

  /** Tocar el agarre alterna entre el default y el mínimo: es lo que se quiere
   *  hacer nueve de cada diez veces, y no obliga a arrastrar. */
  function alTocar() {
    // Un arrastre termina en un click; ese click no es un toque.
    if (!hoja || arrastró.current) {
      arrastró.current = false;
      return;
    }
    irA(tope === "baja" ? "media" : "baja");
  }

  return (
    <div
      ref={caja}
      className="app-panel"
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
            tope === "baja" ? "Agrandar el panel" : "Achicar el panel para ver el mapa"
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
