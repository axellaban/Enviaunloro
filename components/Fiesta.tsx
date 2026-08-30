"use client";

// Lo que pasa en la pantalla cuando se abre un ave que trae algo más que texto.
//
// Dos ceremonias sobre el mismo motor de partículas, porque son la misma idea
// al revés: la paloma explota la pantalla en confeti, flores y chocolate; el
// cuervo la apaga y le tira plumas negras encima, despacio. Que las dos duren
// distinto no es un detalle — la alegría es un golpe y la mala noticia se
// asienta.
//
// Es un canvas y no cien divs animados por CSS: doscientas partículas en un
// celular de gama media se ven mal de la segunda forma, y esto tiene que salir
// bien justo en el momento en el que la persona está mirando.

import { useEffect, useRef } from "react";

type Tipo = "confeti" | "luto";

type Particula = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  giro: number;
  vGiro: number;
  tam: number;
  color: string;
  texto: string;
  /** Cuánto se hamaca de costado y en qué momento de su vaivén va. */
  vaiven: number;
  fase: number;
};

const COLORES = ["#f472b6", "#fbbf24", "#22d3ee", "#a3e635", "#f43f5e", "#ffffff"];
const REGALOS = ["🌹", "🍫", "💗", "🌷", "💐"];
const PLUMAS = ["🖤", "🪶"];

/** Cuánto dura cada ceremonia, en ms. */
const DURACION: Record<Tipo, number> = { confeti: 3400, luto: 4200 };

/**
 * Cuánto tira para abajo, por cuadro.
 *
 * El confeti estaba en 0,26 y eso no es una fiesta, es una piedra: medido con
 * el canvas, la pantalla llegaba al máximo a los 880 ms, a los 1600 ya no
 * quedaba nada y el ÚLTIMO SEGUNDO Y MEDIO de la ceremonia era un lienzo
 * vacío esperando que se cumpliera el reloj. Con 0,085 el papelito tarda unos
 * 2,8 s en cruzar la pantalla, que es lo que dura la ceremonia descontando el
 * desvanecido.
 *
 * El cuervo no se toca: sus plumas ya bajan lento, que es todo el punto.
 */
const GRAVEDAD: Record<Tipo, number> = { confeti: 0.085, luto: 0.012 };

export function Fiesta({ tipo, alTerminar }: { tipo: Tipo; alTerminar: () => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const fin = useRef(alTerminar);
  fin.current = alTerminar;

  useEffect(() => {
    const c = lienzo.current;
    if (!c) return;

    // Quien pidió menos movimiento no quiere doscientas partículas en la cara.
    // Se le respeta y se sale enseguida, sin romper el flujo: el mensaje ya
    // está abierto abajo.
    const quieto =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (quieto) {
      const t = setTimeout(() => fin.current(), 450);
      return () => clearTimeout(t);
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    c.width = ancho * dpr;
    c.height = alto * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);

    const p: Particula[] = [];
    const al = (a: number, b: number) => a + Math.random() * (b - a);

    if (tipo === "confeti") {
      // Cae desde arriba, en todo el ancho y repartido en una franja ALTA: los
      // de más arriba entran cuando los primeros ya se están yendo, y así la
      // pantalla no se vacía de golpe a la mitad.
      for (let i = 0; i < 180; i++) {
        p.push({
          x: al(0, ancho),
          y: al(-alto * 1.15, -30),
          vx: al(-0.5, 0.5),
          vy: al(1.6, 3.4),
          giro: al(0, 6.3),
          vGiro: al(-0.24, 0.24),
          tam: al(6, 13),
          color: COLORES[i % COLORES.length],
          texto: i % 7 === 0 ? REGALOS[i % REGALOS.length] : "",
          vaiven: al(0.5, 1.4),
          fase: al(0, 6.3),
        });
      }
      // …y además revienta desde el centro, que es lo que se siente como fiesta
      // y no como lluvia.
      for (let i = 0; i < 95; i++) {
        const ang = al(0, Math.PI * 2);
        const fuerza = al(4, 12);
        p.push({
          x: ancho / 2,
          y: alto * 0.46,
          vx: Math.cos(ang) * fuerza,
          vy: Math.sin(ang) * fuerza - 3,
          giro: al(0, 6.3),
          vGiro: al(-0.32, 0.32),
          tam: al(6, 14),
          color: COLORES[i % COLORES.length],
          texto: i % 6 === 0 ? REGALOS[i % REGALOS.length] : "",
          vaiven: al(0.4, 1.1),
          fase: al(0, 6.3),
        });
      }
    } else {
      // El cuervo no explota nada: deja caer plumas, pocas y lentas.
      for (let i = 0; i < 46; i++) {
        p.push({
          x: al(0, ancho),
          y: al(-alto, -10),
          vx: al(-0.35, 0.35),
          vy: al(0.7, 1.9),
          giro: al(0, 6.3),
          vGiro: al(-0.05, 0.05),
          tam: al(11, 22),
          color: "#1b1830",
          texto: PLUMAS[i % PLUMAS.length],
          vaiven: al(0.6, 1.6),
          fase: al(0, 6.3),
        });
      }
    }

    const arranque = performance.now();
    const total = DURACION[tipo];
    let cuadro = 0;
    let vivo = true;

    const paso = (t: number) => {
      if (!vivo) return;
      const transcurrido = t - arranque;
      const gravedad = GRAVEDAD[tipo];
      // Los últimos 900 ms se van desvaneciendo, para que no desaparezcan de
      // golpe a mitad de pantalla.
      const opacidad = Math.max(0, Math.min(1, (total - transcurrido) / 900));

      g.clearRect(0, 0, ancho, alto);
      g.globalAlpha = opacidad;

      for (const q of p) {
        q.vy += gravedad;
        q.vx *= 0.995;
        // El papelito no cae derecho: se hamaca. Sin esto, con la gravedad
        // baja, doscientas partículas bajando en línea recta parecen lluvia.
        q.x += q.vx + Math.sin(transcurrido / 260 + q.fase) * q.vaiven;
        q.y += q.vy;
        q.giro += q.vGiro;

        g.save();
        g.translate(q.x, q.y);
        g.rotate(q.giro);
        if (q.texto) {
          g.font = `${q.tam * 1.9}px serif`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(q.texto, 0, 0);
        } else {
          g.fillStyle = q.color;
          g.fillRect(-q.tam / 2, -q.tam / 4, q.tam, q.tam / 2);
        }
        g.restore();
      }

      if (transcurrido >= total) {
        fin.current();
        return;
      }
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);

    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
    };
  }, [tipo]);

  return (
    <>
      {/* El cuervo apaga la pantalla mientras caen las plumas. La paloma no
          tapa nada: lo que trajo se tiene que poder leer abajo del confeti. */}
      {tipo === "luto" && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1900,
            pointerEvents: "none",
            background: "radial-gradient(circle at 50% 45%, transparent 20%, rgba(3,2,10,.82) 100%)",
            animation: "aparecer .8s ease both",
          }}
        />
      )}
      <canvas
        ref={lienzo}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          pointerEvents: "none",
          width: "100%",
          height: "100%",
        }}
      />
    </>
  );
}
