"use client";

// Las seis aves, dibujadas.
//
// Una sola pose —de vuelo, mirando a la DERECHA— para las seis especies,
// porque es la que tiene que funcionar arriba del mapa a 34 píxeles. Lo que
// cambia entre una y otra no es el estilo sino la silueta: la cola, la cresta,
// el tamaño del cuerpo. A esa escala el color solo no alcanza para
// distinguirlas; el contorno sí. Por eso ninguna repite silueta: el perico
// tiene rayas de velocidad, la cotorra la cola en abanico, el loro la mancha
// roja del ala, el guacamayo dos plumas larguísimas, la paloma una rosa en el
// pico y el cuervo un pico recto de daga y cero cachete rosado.
//
// Se escriben como texto SVG y no como JSX por una razón práctica: el marcador
// de Leaflet necesita HTML crudo, y tener el mismo dibujo escrito dos veces
// —una en JSX y otra en string— es la forma más rápida de que se despeguen.
// Acá hay una sola fuente. El contenido es fijo y escrito a mano, así que
// inyectarlo en el DOM no expone a nada.

import { type AveId } from "../lib/aves";

/** Ojo grande, redondo y con brillo. Es lo que hace que parezcan simpáticas. */
function ojo(cx: number, cy: number, r = 6.4): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>
<circle cx="${cx + 1.4}" cy="${cy + 0.3}" r="${r * 0.56}" fill="#10201c"/>
<circle cx="${cx + 2.6}" cy="${cy - 1.6}" r="${r * 0.22}" fill="#ffffff"/>`;
}

/** Cachete rosado. Un solo círculo y cambia toda la cara. */
function cachete(cx: number, cy: number, r = 4.6): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fb7185" opacity="0.5"/>`;
}

/**
 * Pico ganchudo, en dos piezas para que se le vea la mandíbula.
 *
 * El punto de anclaje (x, y) va METIDO en la cabeza, no pegado al borde: un
 * pico que apenas toca el contorno se lee como un objeto aparte flotando al
 * lado del pájaro. Que se monte encima es lo que lo vuelve una cara.
 */
function pico(x: number, y: number, arriba: string, abajo: string, escala = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${escala})">
<path d="M-6 -9 C10 -10 18 -1 15 8 C13 15 6 16 3 10 C0 5 -3 -1 -6 -9 Z" fill="${arriba}"/>
<path d="M1 8 C5 15 14 14 14 7 C10 11 5 11 1 8 Z" fill="${abajo}"/>
</g>`;
}

const DIBUJOS: Record<AveId, string> = {
  // Perico: chiquito y apurado. Cuerpo compacto, cola en punta, rayas de
  // velocidad atrás. Es el único que las tiene y se reconoce por eso.
  perico: `
<g class="rastro" opacity="0.5">
  <path d="M12 44 L26 46" stroke="#a3e635" stroke-width="4" stroke-linecap="round"/>
  <path d="M6 58 L22 59" stroke="#a3e635" stroke-width="3" stroke-linecap="round"/>
</g>
<path d="M40 54 L18 44 L40 46 Z" fill="#84cc16"/>
<path d="M40 60 L20 66 L40 54 Z" fill="#a3e635"/>
<path d="M40 62 C38 50 50 43 66 44 C80 45 88 51 88 58 C88 66 77 71 60 71 C45 71 41 69 40 62 Z" fill="#a3e635"/>
<path d="M46 66 C46 74 54 79 64 79 C56 80 47 76 45 70 Z" fill="#65a30d" opacity="0.85"/>
<g class="ala">
  <path d="M58 58 C50 44 58 28 76 26 C69 37 66 48 68 60 Z" fill="#bef264"/>
  <path d="M62 56 C58 46 62 36 71 32 C67 41 65 48 66 56 Z" fill="#ffffff" opacity="0.35"/>
</g>
<circle cx="82" cy="45" r="16" fill="#a3e635"/>
<path d="M74 32 C72 22 80 20 81 30 Z" fill="#facc15"/>
<path d="M81 30 C81 20 90 21 87 33 Z" fill="#84cc16"/>
<path d="M70 44 C70 34 78 30 86 32 C82 38 80 44 80 50 Z" fill="#facc15"/>
${cachete(74, 53, 4)}
${ojo(83, 40, 5.6)}
${pico(90, 46, "#fb923c", "#ea580c", 0.9)}`,

  // Cotorra: la charlatana. Pico abierto a media palabra, cara y pecho grises
  // (los de la cotorra de verdad) y cola larga en abanico.
  cotorra: `
<path d="M36 48 L2 40 L6 52 L0 64 L36 62 Z" fill="#0891b2"/>
<path d="M36 52 L10 50 L14 60 L36 60 Z" fill="#22d3ee"/>
<path d="M34 58 C36 45 52 38 70 39 C85 40 93 47 93 55 C93 64 81 70 62 70 C44 70 33 67 34 58 Z" fill="#22d3ee"/>
<path d="M42 62 C42 72 54 78 68 77 C56 80 43 76 40 68 Z" fill="#e2e8f0" opacity="0.9"/>
<g class="ala">
  <path d="M54 54 C44 36 54 16 76 13 C67 27 63 41 64 56 Z" fill="#67e8f9"/>
  <path d="M58 52 C54 39 59 27 70 21 C64 32 61 42 62 52 Z" fill="#ffffff" opacity="0.35"/>
</g>
<circle cx="84" cy="41" r="17" fill="#22d3ee"/>
<path d="M70 44 C70 31 80 25 90 27 C84 34 82 42 83 50 Z" fill="#e2e8f0"/>
${cachete(75, 52, 4.2)}
${ojo(85, 36, 6)}
<g transform="rotate(-9 92 43)">${pico(92, 43, "#fbbf24", "#d97706", 0.98)}</g>
<g class="charla" opacity="0.8">
  <circle cx="110" cy="26" r="2.6" fill="#67e8f9"/>
  <circle cx="116" cy="18" r="3.6" fill="#67e8f9"/>
</g>`,

  // Loro: el clásico. Cuerpo redondo, frente amarilla y una mancha roja en el
  // ala — el loro de estampita, el que dibuja cualquiera si le pedís un loro.
  loro: `
<path d="M32 46 C18 42 12 48 12 58 C12 68 20 72 32 68 Z" fill="#059669"/>
<path d="M30 52 C20 50 17 54 18 60 C19 65 24 66 30 64 Z" fill="#10b981"/>
<path d="M30 58 C32 44 50 36 70 38 C86 39 95 46 95 55 C95 65 82 71 61 71 C42 71 29 68 30 58 Z" fill="#10b981"/>
<path d="M40 64 C40 74 54 80 70 78 C56 82 41 78 38 70 Z" fill="#6ee7b7" opacity="0.9"/>
<g class="ala">
  <path d="M52 54 C40 34 52 12 76 9 C66 24 62 40 63 57 Z" fill="#34d399"/>
  <path d="M57 51 C53 37 58 24 70 18 C64 30 60 41 61 52 Z" fill="#ffffff" opacity="0.32"/>
  <path d="M56 47 C54 39 57 31 63 26 C60 34 58 41 59 48 Z" fill="#f87171"/>
</g>
<circle cx="85" cy="40" r="17.5" fill="#10b981"/>
<path d="M72 32 C76 21 92 21 97 30 C90 27 79 27 72 32 Z" fill="#fbbf24"/>
<path d="M69 46 C68 34 76 27 86 28 C80 35 78 43 79 51 Z" fill="#ecfdf5"/>
${cachete(75, 53, 4.4)}
${ojo(85, 37, 6.2)}
${pico(93, 43, "#f59e0b", "#c2410c", 1.02)}`,

  // Guacamayo: el ceremonioso. Ocupa más, tiene dos plumas de cola larguísimas
  // que se le ven aunque esté chiquito en el mapa, corona de tres plumas y las
  // puntas de las alas azules.
  guacamayo: `
<path d="M30 50 L-8 26 L30 44 Z" fill="#f43f5e"/>
<path d="M30 56 L-6 56 L30 48 Z" fill="#fb7185"/>
<path d="M30 62 L2 74 L30 56 Z" fill="#60a5fa"/>
<path d="M28 58 C30 43 50 34 72 36 C90 37 100 45 100 55 C100 66 85 73 61 73 C40 73 27 69 28 58 Z" fill="#fbbf24"/>
<path d="M38 64 C38 75 54 82 72 80 C56 85 39 80 36 71 Z" fill="#fde68a" opacity="0.9"/>
<g class="ala">
  <path d="M50 54 C36 30 50 6 78 3 C66 20 61 39 62 58 Z" fill="#fb7185"/>
  <path d="M56 48 C53 32 59 17 72 10 C65 24 61 36 61 50 Z" fill="#ffffff" opacity="0.3"/>
  <path d="M52 30 C50 20 58 9 72 4 C63 13 57 21 55 31 Z" fill="#60a5fa"/>
</g>
<circle cx="86" cy="40" r="18.5" fill="#fbbf24"/>
<path d="M74 26 C70 14 80 11 81 23 Z" fill="#f43f5e"/>
<path d="M82 22 C81 9 92 9 89 24 Z" fill="#60a5fa"/>
<path d="M90 24 C94 12 104 18 97 31 Z" fill="#fde047"/>
<path d="M70 46 C69 34 78 27 88 28 C82 35 80 43 81 52 Z" fill="#fef3c7"/>
<path d="M73 51 C77 49 81 49 84 51" stroke="#f59e0b" stroke-width="1.6" fill="none" stroke-linecap="round"/>
${ojo(85, 35, 6.2)}
${pico(94, 44, "#fde68a", "#78350f", 1.02)}`,

  // Paloma: la romántica. Blanca, con el ala apenas rosada, una rosa en el pico
  // y un corazón flotando atrás. Es la única clarita de las seis: sobre el mapa
  // oscuro se ve venir de lejos, que es exactamente lo que tiene que pasar.
  paloma: `
<g class="rastro" opacity="0.6">
  <path d="M8 40 C4 33 13 29 15 36 C17 29 26 33 22 40 C20 44 16 47 15 48 C14 47 10 44 8 40 Z" fill="#f9a8d4"/>
  <circle cx="27" cy="68" r="3" fill="#fbcfe8"/>
</g>
<path d="M34 48 L4 42 L10 54 L4 66 L34 62 Z" fill="#cbd5e1"/>
<path d="M34 52 L14 50 L18 58 L34 60 Z" fill="#f1f5f9"/>
<path d="M32 58 C34 44 52 36 72 38 C88 39 97 46 97 55 C97 65 84 71 62 71 C42 71 31 68 32 58 Z" fill="#f8fafc"/>
<path d="M42 64 C42 74 56 80 72 78 C58 82 43 78 40 70 Z" fill="#fbcfe8" opacity="0.85"/>
<g class="ala">
  <path d="M53 54 C42 34 54 12 78 9 C67 24 63 40 64 57 Z" fill="#e2e8f0"/>
  <path d="M58 51 C54 37 59 24 71 18 C65 30 61 41 62 52 Z" fill="#ffffff" opacity="0.75"/>
  <path d="M56 46 C54 38 57 30 63 25 C60 33 58 40 59 47 Z" fill="#f9a8d4" opacity="0.8"/>
</g>
<circle cx="86" cy="40" r="17" fill="#f8fafc"/>
<path d="M71 45 C70 33 78 27 88 28 C82 35 80 43 81 51 Z" fill="#ffffff"/>
${cachete(76, 52, 4.4)}
${ojo(86, 37, 5.8)}
${pico(93, 43, "#fb7185", "#e11d48", 0.78)}
<g transform="translate(103 50)">
  <path d="M0 1 C5 -1 9 -6 8 -12" stroke="#4ade80" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M5 -5 C1 -8 -2 -3 2 -1 Z" fill="#4ade80"/>
  <circle cx="9" cy="-14" r="5.2" fill="#e11d48"/>
  <circle cx="7.6" cy="-15.4" r="2.5" fill="#fb7185"/>
</g>`,

  // Cuervo: el de las malas noticias. Negro violáceo, pico recto de daga en vez
  // del gancho simpático de los loros, ceja caída y ningún cachete. Todo el
  // dibujo está hecho para que se lea distinto ANTES de leer una palabra.
  cuervo: `
<g class="charla" opacity="0.75">
  <path d="M18 28 C13 34 15 43 21 45 C17 39 17 33 18 28 Z" fill="#4c1d95"/>
  <path d="M9 60 C4 66 6 75 12 77 C8 71 8 65 9 60 Z" fill="#3730a3"/>
</g>
<path d="M32 46 L0 36 L4 52 L0 68 L32 64 Z" fill="#1b1830"/>
<path d="M32 52 L10 48 L14 58 L32 60 Z" fill="#4c4370"/>
<path d="M30 58 C32 44 50 36 70 38 C87 39 96 46 96 55 C96 65 82 72 60 72 C41 72 29 68 30 58 Z" fill="#242040"/>
<path d="M40 64 C40 75 54 81 70 79 C56 83 41 79 38 70 Z" fill="#17142a" opacity="0.9"/>
<g class="ala">
  <path d="M52 54 C38 32 52 8 78 5 C66 21 61 39 62 58 Z" fill="#332f52"/>
  <path d="M57 50 C53 35 59 21 71 14 C64 27 60 39 61 51 Z" fill="#a78bfa" opacity="0.62"/>
  <path d="M52 54 C38 32 52 8 78 5" stroke="#a78bfa" stroke-width="2.2" fill="none" opacity="0.55" stroke-linecap="round"/>
  <path d="M53 32 C51 21 59 10 73 5 C64 14 57 23 55 33 Z" fill="#17142a"/>
</g>
<circle cx="85" cy="40" r="17" fill="#242040"/>
<path d="M70 46 C69 34 77 28 87 29 C81 36 79 44 80 52 Z" fill="#332f52"/>
${ojo(85, 37, 5.4)}
<path d="M75 26 C83 25 91 28 96 33" stroke="#0d0b18" stroke-width="3.6" fill="none" stroke-linecap="round"/>
<path d="M92 39 L119 46 L92 52 Z" fill="#52525b"/>
<path d="M92 46 L119 46 L92 50 Z" fill="#18181b"/>`,
};

/** El SVG de una especie, como texto. Fuente única del dibujo. */
export function svgAve(especie: AveId, size = 40, aletea = false): string {
  return `<svg width="${size}" height="${size * 0.83}" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="ave${
    aletea ? " ave-viva" : ""
  }" aria-hidden="true">${DIBUJOS[especie]}</svg>`;
}

/**
 * La pollera.
 *
 * No es un ave, y viaja en lugar de una: el loro —el que se llama loro a
 * secas— se puede convertir en pollera antes de salir, y entonces lo que
 * cruza el mapa es esto. Vive acá, con las aves, porque ocupa exactamente su
 * lugar: el mismo viewBox, la misma pose mirando a la derecha, el mismo tamaño
 * en el marcador. Si viviera en otro archivo, el día que cambie el encuadre de
 * las aves esta se quedaría atrás.
 *
 * Mira a la derecha como ellas: al vuelo lo rota el mapa según el rumbo, y una
 * pollera que apunte al otro lado volaría de culo.
 */
export function svgPollera(size = 40, ondea = false): string {
  return `<svg width="${size}" height="${size * 0.83}" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="ave${
    ondea ? " ave-viva" : ""
  }" aria-hidden="true">
<!-- Las rayas de viento, atrás: es lo que la hace estar volando y no colgada
     de un perchero. Van a la izquierda porque va para la derecha. -->
<path class="rastro" d="M22 34 L4 30 M20 46 L1 46 M24 58 L7 63" stroke="#f472b6" stroke-width="3.4" stroke-linecap="round" opacity="0.5"/>
<!-- El cuerpo: angosto en la cintura y abierto en el ruedo. Es lo único que
     hace que se lea POLLERA y no campana, gorro ni paraguas. -->
<path class="ala" d="M46 26 L78 26 L102 82 C86 89 66 91 46 89 C36 90 26 88 20 84 Z" fill="#f472b6"/>
<!-- La luz de adelante, media falda, para que tenga volumen. -->
<path d="M46 26 L62 26 L58 88 C44 89 32 87 22 84 Z" fill="#fb7185"/>
<!-- Los pliegues. Tres alcanzan; con más se vuelve una reja. -->
<path d="M56 28 C52 48 48 68 42 87" stroke="#be185d" stroke-width="2.6" fill="none" opacity="0.45" stroke-linecap="round"/>
<path d="M66 28 C66 48 68 68 72 89" stroke="#be185d" stroke-width="2.6" fill="none" opacity="0.45" stroke-linecap="round"/>
<path d="M76 28 C80 48 88 66 96 84" stroke="#be185d" stroke-width="2.4" fill="none" opacity="0.4" stroke-linecap="round"/>
<!-- El ruedo, ondeado y más oscuro: el borde de abajo es lo que se mueve. -->
<path d="M20 84 C30 89 42 91 54 90 C68 89 86 87 102 82 C103 87 102 91 100 94 C84 99 66 100 52 99 C40 98 28 95 19 90 Z" fill="#be185d"/>
<!-- La cintura, arriba, con su cinto y la hebilla. -->
<path d="M44 20 L80 20 L79 30 L45 30 Z" fill="#9d174d"/>
<rect x="40" y="12" width="44" height="11" rx="5.5" fill="#4c0519"/>
<rect x="56" y="13.5" width="12" height="8" rx="2.5" fill="#fbbf24"/>
<rect x="60" y="15.5" width="4" height="4" rx="1" fill="#78350f"/>
</svg>`;
}

export function Ave({
  especie,
  size = 40,
  aletea = false,
}: {
  especie: AveId;
  size?: number;
  aletea?: boolean;
}) {
  return (
    <span
      style={{ display: "inline-flex", lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: svgAve(especie, size, aletea) }}
    />
  );
}

export function Pollera({ size = 40, ondea = false }: { size?: number; ondea?: boolean }) {
  return (
    <span
      style={{ display: "inline-flex", lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: svgPollera(size, ondea) }}
    />
  );
}

/**
 * El plato volador que se lleva un ave.
 *
 * Aparece cuando quien mandó un loro pide la abducción: la nave baja, engancha
 * al bicho en el rayo y se van los dos. Es lo único del mapa que no vuela hacia
 * ningún lado — no tiene rumbo ni destino, cae encima de un punto— así que NO
 * rota con la marcha, igual que la pollera y por el motivo contrario: la
 * pollera no rota porque no tiene pico, esta no rota porque no va a ninguna
 * parte.
 *
 * El rayo se dibuja acá abajo y no como una capa aparte para que los dos se
 * muevan juntos: una nave y su rayo separados por un cuadro de animación se ven
 * como dos cosas, y son una.
 */
export function svgPlatoVolador(size = 46): string {
  const alto = Math.round(size * 1.15);
  return `<svg width="${size}" height="${alto}" viewBox="0 0 120 138" fill="none" xmlns="http://www.w3.org/2000/svg" class="nave" aria-hidden="true">
<!-- El rayo primero, para que la nave quede encima. Se abre hacia abajo y se
     desvanece: el borde duro de un triángulo se lee como un cucurucho. -->
<defs>
  <linearGradient id="rayo" x1="60" y1="52" x2="60" y2="136" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#7dd3fc" stop-opacity=".85"/>
    <stop offset=".55" stop-color="#7dd3fc" stop-opacity=".30"/>
    <stop offset="1" stop-color="#7dd3fc" stop-opacity="0"/>
  </linearGradient>
</defs>
<path d="M44 54 L76 54 L104 134 L16 134 Z" fill="url(#rayo)"/>
<!-- El casco: una elipse achatada. Lo que lo hace nave y no sombrero son las
     luces de abajo y la cúpula. -->
<ellipse cx="60" cy="48" rx="54" ry="17" fill="#94a3b8"/>
<ellipse cx="60" cy="44" rx="54" ry="15" fill="#cbd5e1"/>
<!-- La cúpula, con su brillo. -->
<path d="M32 38 A28 26 0 0 1 88 38 Z" fill="#67e8f9" opacity=".9"/>
<path d="M40 36 A20 18 0 0 1 60 20" stroke="#ecfeff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".85"/>
<!-- Las tres luces. -->
<circle cx="30" cy="52" r="5.5" fill="#fde047"/>
<circle cx="60" cy="55" r="5.5" fill="#f472b6"/>
<circle cx="90" cy="52" r="5.5" fill="#7dd3fc"/>
</svg>`;
}

export function PlatoVolador({ size = 46 }: { size?: number }) {
  return (
    <span
      style={{ display: "inline-flex", lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: svgPlatoVolador(size) }}
    />
  );
}

/** Alias histórico: el marcador de Leaflet arma su HTML con esto. */
export const aveHtml = (especie: AveId, size = 34) => svgAve(especie, size, true);

/** Lo mismo, para lo que vuela en lugar de un ave. */
export const polleraHtml = (size = 34) => svgPollera(size, true);
