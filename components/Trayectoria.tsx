"use client";

// El arco de la portada: el producto entero, contado en catorce segundos.
//
// El perico sale de tu nido con un mensaje encima, cruza TODO el arco, lo
// entrega del otro lado —y recién ahí se puede leer—, y después se vuelve
// vacío.
//
// Tres decisiones que hacen que esto valga la pena y no sea un adorno:
//
//   1. El ave recorre el camino entero y llega. Antes se quedaba flotando en el
//      medio del arco, así que lo único que contaba era "hay un pájaro": ni el
//      viaje, ni la distancia, ni que hubiera algo del otro lado esperándolo.
//   2. Lo que lleva NO se lee mientras vuela. Van dos barras tapadas en vez del
//      texto, y las palabras aparecen recién al aterrizar. Es literalmente la
//      regla que sostiene la app (lib/vista.ts): el mensaje no existe del otro
//      lado hasta que el ave llega. Mostrarlo legible acá sería contar otra cosa.
//   3. Vuelve espejado y no rotado. Girarlo media vuelta lo deja volando panza
//      arriba — el mismo detalle que en el mapa de la app.
//
// Todo es SMIL sobre un solo reloj: `animateMotion` para el vuelo y `animate`
// para lo demás. Las animaciones SMIL de un documento comparten línea de
// tiempo, así que el globito se abre exactamente cuando el ave toca el nido.
// Con CSS habría que confiar en que dos relojes distintos no se corran.

import type { ReactNode } from "react";
import { svgAve } from "./Ave";

/** El camino, y el reloj que sincroniza todo lo que pasa encima. */
const CAMINO = "M44 126 Q280 26 516 126";
const CICLO = "14s";

// El viaje, en fracciones del ciclo. Los tramos quietos en las puntas no son
// relleno: sin ellos el ave rebota contra los nidos y no se llega a ver que
// llegó a algún lado.
//   0 – 0,06  esperando en tu nido
//   0,06 – 0,44  el viaje de ida
//   0,44 – 0,60  la entrega
//   0,60 – 0,94  la vuelta, ya sin nada
const TIEMPOS = "0;0.06;0.44;0.60;0.94;1";
const TRAMOS = "0;0;1;1;0;0";

const MENSAJE = "te extraño";
const AVE = 46;

export function Trayectoria() {
  return (
    <div
      style={{ position: "relative", maxWidth: 520, margin: "44px auto 0", width: "100%" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 560 165" style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <defs>
          <path id="hero-camino" d={CAMINO} fill="none" />
          {/* Lo que lleva encima es el MISMO texto que se lee al final, borroneado.
              Barras abstractas se leían como una pantalla cargando; así se ve
              que hay algo escrito ahí y que todavía no te toca leerlo. */}
          <filter id="hero-sellado" x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation="2.1" />
          </filter>
          {/* El borrón se sale de la pastilla y le ensucia el borde con un halo
              rectangular. Recortado, el mensaje queda adentro del globito. */}
          <clipPath id="hero-globo">
            <rect x="-49" y="-15" width="98" height="30" rx="15" />
          </clipPath>
        </defs>

        {/* Lo que falta: punteado y apagado. */}
        <path
          d={CAMINO}
          fill="none"
          stroke="#10b981"
          strokeOpacity="0.22"
          strokeWidth="2"
          strokeDasharray="3 10"
          strokeLinecap="round"
        />

        {/* Lo recorrido, que se dibuja detrás del ave y se retrae cuando vuelve.
            pathLength="100" para poder animar el trazo en porcentajes sin
            medir la curva. */}
        <path
          d={CAMINO}
          pathLength="100"
          fill="none"
          stroke="#10b981"
          strokeOpacity="0.9"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset="100"
        >
          <animate
            attributeName="stroke-dashoffset"
            dur={CICLO}
            repeatCount="indefinite"
            calcMode="linear"
            keyTimes={TIEMPOS}
            values="100;100;0;0;100;100"
          />
        </path>

        <Nido x={44} y={126} color="#10b981" texto="tu nido" late />
        <Nido x={516} y={126} color="#22d3ee" texto="el suyo" />

        {/* El nido de destino se enciende cuando el ave toca tierra. */}
        <circle cx="516" cy="126" r="6" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0">
          <animate
            attributeName="r"
            dur={CICLO}
            repeatCount="indefinite"
            calcMode="linear"
            keyTimes="0;0.44;0.56;1"
            values="6;6;26;26"
          />
          <animate
            attributeName="opacity"
            dur={CICLO}
            repeatCount="indefinite"
            calcMode="linear"
            keyTimes="0;0.44;0.46;0.56;1"
            values="0;0;0.8;0;0"
          />
        </circle>

        {/* --- lo que llega, y recién entonces se lee --- */}
        <g transform="translate(486 80)">
          <g opacity="0">
            <animate
              attributeName="opacity"
              dur={CICLO}
              repeatCount="indefinite"
              calcMode="linear"
              keyTimes="0;0.45;0.51;0.88;0.93;1"
              values="0;0;1;1;0;0"
            />
            {/* El grupo interno solo escala: así el globito aparece de golpe,
                como algo que se abre, y no como algo que se enciende. */}
            <g>
              <animateTransform
                attributeName="transform"
                type="scale"
                dur={CICLO}
                repeatCount="indefinite"
                calcMode="linear"
                keyTimes="0;0.45;0.50;0.54;1"
                values="0.5;0.5;1.12;1;1"
              />
              <Globo ancho={104} color="#22d3ee" colaX={26}>
                <text
                  x="0"
                  y="5"
                  textAnchor="middle"
                  fill="#e9f3f0"
                  fontSize="15"
                  fontWeight="700"
                  fontFamily="ui-sans-serif, system-ui"
                >
                  {MENSAJE}
                </text>
              </Globo>
            </g>
          </g>
        </g>

        {/* --- el ave, y lo que lleva encima --- */}
        <g>
          <animateMotion
            dur={CICLO}
            repeatCount="indefinite"
            calcMode="linear"
            keyPoints={TRAMOS}
            keyTimes={TIEMPOS}
            rotate="0"
          >
            <mpath href="#hero-camino" />
          </animateMotion>

          {/* El mensaje sellado. Se va justo al llegar: lo entregó. */}
          <g transform="translate(0 -38)">
            <animate
              attributeName="opacity"
              dur={CICLO}
              repeatCount="indefinite"
              calcMode="linear"
              keyTimes="0;0.44;0.49;0.97;1"
              values="1;1;0;0;1"
            />
            <Globo ancho={98} color="#a3e635" colaX={4}>
              <g clipPath="url(#hero-globo)">
                <text
                  x="0"
                  y="5"
                  textAnchor="middle"
                  fill="#a3e635"
                  fontSize="14"
                  fontWeight="700"
                  fontFamily="ui-sans-serif, system-ui"
                  opacity="0.8"
                  filter="url(#hero-sellado)"
                >
                  {MENSAJE}
                </text>
              </g>
            </Globo>
          </g>

          {/* Espejado, no rotado, y sobre su propio centro: por eso el dibujo va
              corrido media caja adentro de otro grupo. */}
          <g>
            <animateTransform
              attributeName="transform"
              type="scale"
              dur={CICLO}
              repeatCount="indefinite"
              calcMode="linear"
              keyTimes="0;0.55;0.60;0.96;1"
              values="1 1;1 1;-1 1;-1 1;1 1"
            />
            <g
              transform={`translate(${-AVE / 2} ${(-AVE * 0.83) / 2})`}
              dangerouslySetInnerHTML={{ __html: svgAve("perico", AVE, true) }}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Un nido con su nombre. El propio late, como en el mapa de la app. */
function Nido({
  x,
  y,
  color,
  texto,
  late = false,
}: {
  x: number;
  y: number;
  color: string;
  texto: string;
  late?: boolean;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r="13" fill={color} opacity="0.14" />
      {late && (
        <circle cx={x} cy={y} r="6" fill={color} opacity="0.5">
          <animate
            attributeName="r"
            dur="2.4s"
            repeatCount="indefinite"
            values="6;15;15"
            keyTimes="0;0.7;1"
          />
          <animate
            attributeName="opacity"
            dur="2.4s"
            repeatCount="indefinite"
            values="0.5;0;0"
            keyTimes="0;0.7;1"
          />
        </circle>
      )}
      <circle cx={x} cy={y} r="6" fill={color} />
      <text
        x={x}
        y={y + 26}
        fill="#5d7873"
        fontSize="12.5"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui"
      >
        {texto}
      </text>
    </g>
  );
}

/** El globito, centrado en (0,0) para que escalarlo lo abra desde el medio. */
function Globo({
  ancho,
  color,
  colaX,
  children,
}: {
  ancho: number;
  color: string;
  /** Dónde sale la colita. Apunta al ave, o al nido que recibe. */
  colaX: number;
  children: ReactNode;
}) {
  return (
    <g>
      <rect
        x={-ancho / 2}
        y={-15}
        width={ancho}
        height={30}
        rx={15}
        fill="rgba(6, 15, 14, 0.94)"
        stroke={color}
        strokeOpacity="0.5"
      />
      <path d={`M${colaX - 6} 13 L${colaX} 27 L${colaX + 6} 13 Z`} fill="rgba(6, 15, 14, 0.94)" />
      {children}
    </g>
  );
}
