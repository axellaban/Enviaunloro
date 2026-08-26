"use client";

// El teléfono del hero: la app en un mapa del Atlántico, con loros cruzándolo.
//
// Es un dibujo, no una captura. Dos razones: una captura de verdad envejece mal
// (cambia la UI y queda una imagen vieja pegada en la portada) y pesa; y esto
// se puede MOVER, que es justo lo que la portada tiene que contar. Las aves
// recorren la ruta de verdad, con `animateMotion` sobre el mismo trazo que se
// dibuja punteado — sin JavaScript ni bibliotecas.
//
// La geografía es deliberadamente aproximada: alcanza con que se lea "esto
// cruza un océano". Las rutas sí son las de la portada: Buenos Aires a Madrid
// es la que en la tabla tarda días.

import { AVES } from "../lib/aves";
import { svgAve } from "./Ave";

/** Un ave recorriendo una ruta. `retraso` es cuánto lleva ya recorrido al cargar. */
function AveEnRuta({
  ruta,
  especie,
  segundos,
  retraso,
  tamaño = 26,
}: {
  ruta: string;
  especie: keyof typeof AVES;
  segundos: number;
  retraso: number;
  tamaño?: number;
}) {
  return (
    <g>
      <g
        transform={`translate(${-tamaño / 2} ${(-tamaño * 0.83) / 2})`}
        dangerouslySetInnerHTML={{ __html: svgAve(especie, tamaño, true) }}
      />
      <animateMotion
        dur={`${segundos}s`}
        // Negativo: la animación arranca ya empezada. Con un retraso positivo,
        // hasta que le toca salir el ave se dibuja sin transformar — o sea
        // clavada en la esquina del mapa, que se ve como un error.
        begin={`-${retraso}s`}
        repeatCount="indefinite"
        rotate="auto"
      >
        <mpath href={`#${ruta}`} />
      </animateMotion>
    </g>
  );
}

function Nido({ x, y, color = "#10b981" }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="9" fill={color} opacity="0.16" />
      <circle cx={x} cy={y} r="4.2" fill={color} stroke="#04100e" strokeWidth="1.5" />
    </g>
  );
}

/**
 * El mundo, en puntos.
 *
 * Dibujado como una grilla de texto y no con curvas: una costa a mano alzada en
 * bezier queda como una mancha rara, y a este tamaño nadie la reconoce igual.
 * En puntos se lee al toque que es un mapa, se edita moviendo caracteres, y de
 * paso es el estilo correcto para algo que es una ilustración y no un mapa de
 * verdad. Centrado en el Atlántico: América a la izquierda, Europa y África a
 * la derecha, que es el océano que cruzan los vuelos largos de la app.
 */
const MUNDO = [
  "...#####..........####..",
  "..########.......######.",
  "..########........####..",
  "...#######.......#####..",
  "....######.......######.",
  "....#####........######.",
  ".....####.......#######.",
  ".....###........#######.",
  "......##........#######.",
  "......##.......#######..",
  ".......####....#######..",
  "........#####..######...",
  "........######.######...",
  "........######..#####...",
  "........######..#####...",
  "........#####...####....",
  "........#####...###.....",
  "........####....##......",
  "........####............",
  "........###.............",
  ".........##.............",
  ".........#..............",
];

const X0 = 26;
const Y0 = 88;
const PASO = 11;
const celda = (col: number, fila: number) => ({ x: X0 + col * PASO, y: Y0 + fila * PASO });

function Mundo() {
  const puntos = [];
  for (let f = 0; f < MUNDO.length; f++) {
    for (let c = 0; c < MUNDO[f].length; c++) {
      if (MUNDO[f][c] !== "#") continue;
      const { x, y } = celda(c, f);
      puntos.push(<circle key={`${f}-${c}`} cx={x} cy={y} r="2.6" fill="#1d6154" />);
    }
  }
  return <g>{puntos}</g>;
}

export function TelefonoHero() {
  return (
    <div
      style={{
        position: "relative",
        width: "min(300px, 78vw)",
        aspectRatio: "300 / 610",
        margin: "0 auto",
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 300 610" style={{ width: "100%", height: "100%" }}>
        <defs>
          {/* Las rutas: se dibujan punteadas y además son el riel de las aves. */}
          {/* Buenos Aires → Madrid, Nueva York → Lisboa, São Paulo → Lagos.
              Las puntas caen sobre tierra en la grilla de MUNDO, y los arcos se
              curvan como se curva un vuelo largo de verdad. */}
          <path id="ruta-larga" d="M125 275 C170 246 208 180 224 99" fill="none" />
          <path id="ruta-media" d="M114 121 C145 82 185 78 213 110" fill="none" />
          <path id="ruta-corta" d="M158 220 C172 206 188 202 202 209" fill="none" />

          <clipPath id="pantalla">
            <rect x="12" y="12" width="276" height="586" rx="34" />
          </clipPath>

          <linearGradient id="oceano" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#08201f" />
            <stop offset="100%" stopColor="#040f10" />
          </linearGradient>
        </defs>

        {/* Cuerpo del teléfono */}
        <rect
          x="0"
          y="0"
          width="300"
          height="610"
          rx="44"
          fill="#0a1413"
          stroke="rgba(255,255,255,.14)"
          strokeWidth="2"
        />

        <g clipPath="url(#pantalla)">
          <rect x="12" y="12" width="276" height="586" fill="url(#oceano)" />

          <Mundo />

          {/* Rutas punteadas */}
          <g fill="none" strokeLinecap="round">
            <use href="#ruta-larga" stroke={AVES.guacamayo.color} strokeWidth="1.8" strokeOpacity=".7" strokeDasharray="2 7" />
            <use href="#ruta-media" stroke={AVES.perico.color} strokeWidth="1.8" strokeOpacity=".7" strokeDasharray="2 7" />
            <use href="#ruta-corta" stroke={AVES.cotorra.color} strokeWidth="1.8" strokeOpacity=".7" strokeDasharray="2 7" />
          </g>

          {/* Nidos en las puntas de cada ruta */}
          <Nido x={125} y={275} />
          <Nido x={224} y={99} color="#22d3ee" />
          <Nido x={114} y={121} color="#a3e635" />
          <Nido x={213} y={110} color="#a3e635" />
          <Nido x={158} y={220} color="#22d3ee" />
          <Nido x={202} y={209} color="#22d3ee" />

          {/* Las aves, cada una a su velocidad: el guacamayo tarda el triple */}
          <AveEnRuta ruta="ruta-larga" especie="guacamayo" segundos={22} retraso={6} tamaño={28} />
          <AveEnRuta ruta="ruta-media" especie="perico" segundos={8} retraso={3} tamaño={22} />
          <AveEnRuta ruta="ruta-corta" especie="cotorra" segundos={13} retraso={5} tamaño={24} />

          {/* Chapa de arriba */}
          <g>
            <rect x="26" y="30" width="112" height="30" rx="15" fill="rgba(8,20,19,.9)" stroke="rgba(255,255,255,.14)" />
            <circle cx="45" cy="45" r="4" fill="#10b981" />
            <text x="57" y="49" fill="#e9f3f0" fontSize="12" fontWeight="700" fontFamily="ui-sans-serif, system-ui">
              3 en el aire
            </text>
          </g>

          {/* Tarjeta de vuelo */}
          <g>
            <rect x="26" y="392" width="248" height="60" rx="14" fill="rgba(8,20,19,.94)" stroke="rgba(251,191,36,.4)" />
            <text x="42" y="414" fill="#e9f3f0" fontSize="12.5" fontWeight="700" fontFamily="ui-sans-serif, system-ui">
              Guacamayo → Marta
            </text>
            <text x="42" y="431" fill="#8ba39d" fontSize="10.5" fontFamily="ui-sans-serif, system-ui">
              10.045 km · faltan 6.120 km
            </text>
            <text x="258" y="420" fill={AVES.guacamayo.color} fontSize="13" fontWeight="700" textAnchor="end" fontFamily="ui-monospace, monospace">
              9 d 4 h
            </text>
            <rect x="42" y="439" width="216" height="4" rx="2" fill="rgba(255,255,255,.1)" />
            <rect x="42" y="439" width="85" height="4" rx="2" fill={AVES.guacamayo.color} />
          </g>

          {/* Botón principal */}
          <rect x="26" y="466" width="248" height="42" rx="21" fill="#10b981" />
          <text x="150" y="493" fill="#04120e" fontSize="14" fontWeight="800" textAnchor="middle" fontFamily="ui-sans-serif, system-ui">
            🦜 Soltar un loro
          </text>

          {/* Barra de abajo */}
          <g fill="#5d7873" fontSize="9.5" textAnchor="middle" fontFamily="ui-sans-serif, system-ui">
            <rect x="12" y="556" width="276" height="42" fill="rgba(6,13,12,.92)" />
            <text x="63" y="582" fill="#10b981">Mapa</text>
            <text x="121" y="582">Buzón</text>
            <text x="179" y="582">Bandada</text>
            <text x="237" y="582">Nido</text>
          </g>
        </g>

        {/* Muesca */}
        <rect x="112" y="12" width="76" height="20" rx="10" fill="#0a1413" />
      </svg>
    </div>
  );
}
