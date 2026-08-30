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
// cruza un océano". Las seis rutas caen sobre tierra en la grilla de MUNDO, una
// por especie, y la más larga —Buenos Aires a Dublín— es la que en la tabla
// tarda días.
//
// Adentro del teléfono no hay ningún botón. Había uno, "Soltar un loro", y era
// un error: en una portada donde todo lo demás sí se puede tocar, un botón
// dibujado se toca y no pasa nada.

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

/** Una tarjeta de la pestaña "En vuelo", dibujada. */
function TarjetaVuelo({
  y,
  color,
  titulo,
  detalle,
  reloj,
  avance,
}: {
  y: number;
  color: string;
  titulo: string;
  detalle: string;
  reloj: string;
  /** Ancho de la barra llena, en unidades del viewBox (de 0 a 216). */
  avance: number;
}) {
  return (
    <g>
      <rect x="26" y={y} width="248" height="60" rx="14" fill="rgba(8,20,19,.94)" stroke={`${color}66`} />
      {/* 11 y no 12,5: "Ciudad de México → Lisboa" con el reloj al lado no
          entra en 216 unidades, y se montaban uno arriba del otro. */}
      <text x="42" y={y + 22} fill="#e9f3f0" fontSize="11" fontWeight="700" fontFamily="ui-sans-serif, system-ui">
        {titulo}
      </text>
      <text x="42" y={y + 39} fill="#8ba39d" fontSize="10" fontFamily="ui-sans-serif, system-ui">
        {detalle}
      </text>
      <text x="258" y={y + 24} fill={color} fontSize="11.5" fontWeight="700" textAnchor="end" fontFamily="ui-monospace, monospace">
        {reloj}
      </text>
      <rect x="42" y={y + 47} width="216" height="4" rx="2" fill="rgba(255,255,255,.1)" />
      <rect x="42" y={y + 47} width={avance} height="4" rx="2" fill={color} />
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
          {/* Las rutas: se dibujan punteadas y además son el riel de las aves.
              Una por especie. Las puntas caen sobre tierra en la grilla de
              MUNDO, y los arcos se curvan como se curva un vuelo largo de
              verdad. */}
          <path id="ruta-larga" d="M125 275 C170 246 208 180 224 99" fill="none" />
          <path id="ruta-media" d="M114 121 C145 82 185 78 224 110" fill="none" />
          <path id="ruta-corta" d="M158 220 C172 206 188 202 202 209" fill="none" />
          <path id="ruta-norte" d="M92 143 C130 108 190 78 235 88" fill="none" />
          <path id="ruta-sur" d="M136 297 C160 292 190 280 213 264" fill="none" />
          <path id="ruta-vieja" d="M235 121 C258 160 250 210 224 253" fill="none" />

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

          {/* Rutas punteadas, del color de quien las vuela */}
          <g fill="none" strokeLinecap="round" strokeWidth="1.8" strokeOpacity=".7" strokeDasharray="2 7">
            <use href="#ruta-larga" stroke={AVES.guacamayo.color} />
            <use href="#ruta-media" stroke={AVES.perico.color} />
            <use href="#ruta-corta" stroke={AVES.cotorra.color} />
            <use href="#ruta-norte" stroke={AVES.loro.color} />
            <use href="#ruta-sur" stroke={AVES.paloma.color} />
            <use href="#ruta-vieja" stroke={AVES.cuervo.color} />
          </g>

          {/* Nidos en las puntas de cada ruta */}
          <Nido x={125} y={275} color={AVES.guacamayo.color} />
          <Nido x={224} y={99} color={AVES.guacamayo.color} />
          <Nido x={114} y={121} color={AVES.perico.color} />
          <Nido x={224} y={110} color={AVES.perico.color} />
          <Nido x={158} y={220} color={AVES.cotorra.color} />
          <Nido x={202} y={209} color={AVES.cotorra.color} />
          <Nido x={92} y={143} color={AVES.loro.color} />
          <Nido x={235} y={88} color={AVES.loro.color} />
          <Nido x={136} y={297} color={AVES.paloma.color} />
          <Nido x={213} y={264} color={AVES.paloma.color} />
          <Nido x={235} y={121} color={AVES.cuervo.color} />
          <Nido x={224} y={253} color={AVES.cuervo.color} />

          {/* Las seis aves, cada una a su velocidad: el guacamayo tarda el
              triple que el perico en un trecho parecido, igual que en la app. */}
          <AveEnRuta ruta="ruta-larga" especie="guacamayo" segundos={22} retraso={6} tamaño={28} />
          <AveEnRuta ruta="ruta-media" especie="perico" segundos={8} retraso={3} tamaño={22} />
          <AveEnRuta ruta="ruta-corta" especie="cotorra" segundos={13} retraso={5} tamaño={24} />
          <AveEnRuta ruta="ruta-norte" especie="loro" segundos={16} retraso={2} tamaño={25} />
          <AveEnRuta ruta="ruta-sur" especie="paloma" segundos={11} retraso={4} tamaño={24} />
          <AveEnRuta ruta="ruta-vieja" especie="cuervo" segundos={14} retraso={12} tamaño={24} />

          {/* Chapa de arriba */}
          <g>
            <rect x="26" y="30" width="112" height="30" rx="15" fill="rgba(8,20,19,.9)" stroke="rgba(255,255,255,.14)" />
            <circle cx="45" cy="45" r="4" fill="#10b981" />
            <text x="57" y="49" fill="#e9f3f0" fontSize="12" fontWeight="700" fontFamily="ui-sans-serif, system-ui">
              6 en el aire
            </text>
          </g>

          {/* Dos tarjetas de vuelo, con los números que salen de la tabla: a 25
              km/h, 6.800 km son once días. */}
          <TarjetaVuelo
            y={392}
            color={AVES.guacamayo.color}
            titulo="Buenos Aires → Dublín"
            detalle="11.150 km · faltan 6.800 km"
            reloj="11 d 8 h"
            avance={84}
          />
          <TarjetaVuelo
            y={462}
            color={AVES.perico.color}
            titulo="México → Lisboa"
            detalle="9.050 km · faltan 1.240 km"
            reloj="13 h 47 m"
            avance={185}
          />

          {/* Barra de abajo */}
          <g fill="#8ba39d" fontSize="9.5" textAnchor="middle" fontFamily="ui-sans-serif, system-ui">
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
