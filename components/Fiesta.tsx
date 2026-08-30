"use client";

// Lo que pasa en la PANTALLA ENTERA cuando la app tiene algo que festejar.
//
// Tres ceremonias sobre el mismo motor, porque son la misma idea con distinto
// humor:
//
//   paloma  — entregó su mensaje: confeti, flores y bombones, con la paloma
//             grande en el medio de la pantalla.
//   barra   — alguien abrió el link de un convite y se encontró con que su
//             lorito está de copetines: confeti, cerveza y las cotorras de la
//             mesa, de fiesta.
//   luto    — el cuervo. La única que NO festeja: apaga la pantalla y deja
//             caer plumas negras, despacio. La alegría es un golpe y la mala
//             noticia se asienta.
//
// Antes era un canvas de partículas que a propósito NO tapaba nada: se veía el
// confeti y abajo se leía el mensaje. Ahora tapa, y es una decisión tomada:
// son los dos momentos de toda la app que merecen la pantalla completa, y el
// que quiere seguir la toca y se va. Igual se cierra sola.
//
// Son elementos del DOM animados por CSS y no un canvas. Lo que hace falta acá
// no es física fina sino que caigan COSAS —un bombón, una rosa, una jarra— y
// eso en un canvas obliga a dibujar emojis a mano. Ciento y pico de nodos que
// solo mueven `transform` y `opacity` los resuelve el compositor sin tocar el
// hilo principal.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AVES, type AveId } from "../lib/aves";
import { svgAve } from "./Ave";

export type Motivo = "paloma" | "barra" | "luto";

type Receta = {
  /** Cuánto dura la ceremonia entera, en ms. */
  duracion: number;
  /** Los colores del baño y de los papelitos. Vacío = sin baño de color. */
  colores: string[];
  /** Lo que cae, además de los papelitos. */
  cosas: string[];
  cuantosPapelitos: number;
  cuantasCosas: number;
  /** Cuánto tarda en cruzar la pantalla, en segundos. El luto cae lentísimo. */
  caida: [number, number];
  titulo: string;
  texto: string;
};

const RECETAS: Record<Motivo, Receta> = {
  paloma: {
    duracion: 5200,
    colores: ["#f472b6", "#fb7185", "#fbbf24", "#a3e635", "#22d3ee", "#ffffff"],
    cosas: ["🌹", "🍫", "💐", "🌷", "💗", "🍬", "✨", "🎀"],
    cuantosPapelitos: 110,
    cuantasCosas: 34,
    caida: [2.4, 4.6],
    titulo: "Llegó la paloma",
    texto: "Te dejó flores y bombones en la ventana.",
  },
  barra: {
    duracion: 5200,
    colores: ["#fbbf24", "#f59e0b", "#a3e635", "#22d3ee", "#f472b6", "#ffffff"],
    cosas: ["🍺", "🍻", "🥴", "🎉", "🎶", "🥨", "✨", "🕺"],
    cuantosPapelitos: 110,
    cuantasCosas: 34,
    caida: [2.4, 4.6],
    titulo: "Está de jarola",
    texto: "Tu lorito te espera en una cervecería del barrio.",
  },
  luto: {
    duracion: 4600,
    // Sin baño de color: el cuervo apaga la pantalla, no la enciende.
    colores: [],
    cosas: ["🖤", "🪶"],
    cuantosPapelitos: 0,
    cuantasCosas: 46,
    caida: [5.5, 8],
    titulo: "",
    texto: "",
  },
};

/**
 * La escena del medio.
 *
 * Es el ave de la app dibujada grande —no un emoji— porque es la protagonista
 * del momento: la paloma que acaba de entregar, o el lorito que está tomando
 * en la barra mientras vos armás tu nido. En la de la barra van además las
 * cotorras de la mesa, que es lo que hace que se lea como una fiesta y no como
 * un pájaro solo.
 */
function escena(motivo: Motivo, ave: AveId): string {
  const grande = `<span class="fiesta-ave">${svgAve(ave, 168, true)}</span>`;
  if (motivo !== "barra") return `<span class="fiesta-mesa">${grande}</span>`;
  return `<span class="fiesta-mesa">
    <span class="fiesta-acompanante" style="animation-delay:.35s">
      ${svgAve("cotorra", 88)}<span class="fiesta-copa">🍺</span>
    </span>
    ${grande}
    <span class="fiesta-acompanante fiesta-espejo" style="animation-delay:.7s">
      ${svgAve("cotorra", 82)}<span class="fiesta-copa">🍻</span>
    </span>
  </span>`;
}

export function Fiesta({
  motivo,
  ave,
  alTerminar,
}: {
  motivo: Motivo;
  /** El ave que protagoniza: decide el dibujo del medio. */
  ave: AveId;
  alTerminar: () => void;
}) {
  const r = RECETAS[motivo];

  // Se sortea UNA vez. Recalculándolo en cada render, los papelitos saltarían
  // de lugar en el medio de la caída.
  const cae = useMemo(() => {
    const al = (a: number, b: number) => a + Math.random() * (b - a);
    const papelitos = Array.from({ length: r.cuantosPapelitos }, (_, i) => ({
      clave: `p${i}`,
      izq: al(0, 100),
      demora: al(0, 2.2),
      dura: al(r.caida[0], r.caida[1]),
      deriva: al(-16, 16),
      giro: al(360, 1200) * (Math.random() < 0.5 ? -1 : 1),
      ancho: al(6, 12),
      alto: al(9, 18),
      color: r.colores[i % Math.max(1, r.colores.length)],
      redondo: Math.random() < 0.25,
    }));
    const emojis = Array.from({ length: r.cuantasCosas }, (_, i) => ({
      clave: `c${i}`,
      izq: al(0, 100),
      demora: al(0, 2.8),
      dura: al(r.caida[0] + 0.6, r.caida[1] + 0.6),
      deriva: al(-14, 14),
      giro: al(-70, 70),
      tam: al(22, 46),
      char: r.cosas[i % r.cosas.length],
    }));
    return { papelitos, emojis };
  }, [r]);

  // Se cierra sola. Y se puede tocar para saltearla: nadie tendría que esperar
  // a que termine una animación para leer lo que le mandaron.
  //
  // El aviso va por referencia y NO en las dependencias. Quien la muestra pasa
  // un `() => setFiesta(null)` recién creado en cada render, así que con la
  // función en las dependencias el reloj se reiniciaba en cada refresco del
  // panel —que son varios por segundo— y la ceremonia no se cerraba nunca.
  const avisar = useRef(alTerminar);
  avisar.current = alTerminar;
  useEffect(() => {
    const t = setTimeout(() => avisar.current(), r.duracion);
    return () => clearTimeout(t);
  }, [r.duracion]);

  // Va colgada del <body> y no de donde la muestran.
  //
  // `position: fixed` mide contra la ventana... salvo que algún ancestro tenga
  // `transform`, `filter` o `backdrop-filter`: ahí ese ancestro pasa a ser el
  // bloque contenedor y lo "fijo" queda preso adentro. Y eso es exactamente lo
  // que pasa acá: las tarjetas de la app llevan `backdrop-filter`, y la hoja
  // de abajo se arrastra con `transform`. Medido: la ceremonia salía de
  // 404×174 px, del tamaño de la tarjeta del mensaje, en vez de tapar la
  // pantalla.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;

  const a = AVES[ave];

  return createPortal(
    <div
      className={`fiesta fiesta-${motivo}`}
      onClick={alTerminar}
      role="status"
      aria-live="polite"
      aria-label={r.titulo || `Llegó ${a.articulo} ${a.nombre.toLowerCase()}`}
    >
      {r.colores.length > 0 ? (
        <div
          className="fiesta-bano"
          aria-hidden
          style={{
            background: `conic-gradient(from 0deg, ${[...r.colores, r.colores[0]].join(", ")})`,
          }}
        />
      ) : (
        <div className="fiesta-penumbra" aria-hidden />
      )}

      <div className="fiesta-cosas" aria-hidden>
        {cae.papelitos.map((p) => (
          <span
            key={p.clave}
            className={`fiesta-papelito${p.redondo ? " fiesta-redondo" : ""}`}
            style={
              {
                left: `${p.izq}%`,
                background: p.color,
                width: `${p.ancho}px`,
                height: `${p.alto}px`,
                animationDelay: `${p.demora}s`,
                animationDuration: `${p.dura}s`,
                "--deriva": `${p.deriva}vw`,
                "--giro": `${p.giro}deg`,
              } as React.CSSProperties
            }
          />
        ))}
        {cae.emojis.map((e) => (
          <span
            key={e.clave}
            className="fiesta-cosa"
            style={
              {
                left: `${e.izq}%`,
                fontSize: `${e.tam}px`,
                animationDelay: `${e.demora}s`,
                animationDuration: `${e.dura}s`,
                "--deriva": `${e.deriva}vw`,
                "--giro": `${e.giro}deg`,
              } as React.CSSProperties
            }
          >
            {e.char}
          </span>
        ))}
      </div>

      {/* El cuervo no lleva tarjeta. Un cartel de felicitaciones arriba de una
          mala noticia es exactamente lo que no hay que hacer. */}
      {motivo !== "luto" && (
        <div className="fiesta-tarjeta">
          <div
            className="fiesta-escena"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: escena(motivo, ave) }}
          />
          <p className="fiesta-titulo">{r.titulo}</p>
          <p className="fiesta-texto">{r.texto}</p>
          <span className="fiesta-seguir">tocá para seguir</span>
        </div>
      )}
    </div>,
    document.body
  );
}
