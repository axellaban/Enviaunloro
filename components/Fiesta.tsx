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
};

// Sin blanco: sobre fondo claro es confeti invisible. Y saturados, no
// pasteles, que sobre blanco se lavan.
const COLORES = ["#db2777", "#d97706", "#0891b2", "#65a30d", "#e11d48", "#7c3aed"];
const REGALOS = ["🌹", "🍫", "💗", "🌷", "💐"];
const PLUMAS = ["🖤", "🪶"];

/** Cuánto dura cada ceremonia, en ms. */
const DURACION: Record<Tipo, number> = { confeti: 3400, luto: 4200 };

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
      // Cae desde arriba, en todo el ancho…
      for (let i = 0; i < 150; i++) {
        p.push({
          x: al(0, ancho),
          y: al(-alto * 0.6, -10),
          vx: al(-0.6, 0.6),
          vy: al(2.6, 6.4),
          giro: al(0, 6.3),
          vGiro: al(-0.24, 0.24),
          tam: al(6, 13),
          color: COLORES[i % COLORES.length],
          texto: i % 7 === 0 ? REGALOS[i % REGALOS.length] : "",
        });
      }
      // …y además revienta desde el centro, que es lo que se siente como fiesta
      // y no como lluvia.
      for (let i = 0; i < 70; i++) {
        const ang = al(0, Math.PI * 2);
        const fuerza = al(5, 15);
        p.push({
          x: ancho / 2,
          y: alto * 0.46,
          vx: Math.cos(ang) * fuerza,
          vy: Math.sin(ang) * fuerza - 4,
          giro: al(0, 6.3),
          vGiro: al(-0.32, 0.32),
          tam: al(6, 14),
          color: COLORES[i % COLORES.length],
          texto: i % 6 === 0 ? REGALOS[i % REGALOS.length] : "",
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
      const gravedad = tipo === "confeti" ? 0.26 : 0.012;
      // Los últimos 900 ms se van desvaneciendo, para que no desaparezcan de
      // golpe a mitad de pantalla.
      const opacidad = Math.max(0, Math.min(1, (total - transcurrido) / 900));

      g.clearRect(0, 0, ancho, alto);
      g.globalAlpha = opacidad;

      for (const q of p) {
        q.vy += gravedad;
        q.vx *= 0.995;
        q.x += q.vx;
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
