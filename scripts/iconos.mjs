// Los íconos PNG de la app, sacados del MISMO dibujo que app/icon.svg.
//
// POR QUÉ EXISTEN. El manifiesto tenía un SVG y un PNG de 180×180 —la medida de
// iOS— y nada más. Android no se conforma con eso: Chrome pide un PNG de al
// menos 192 para considerar la app instalable, y usa el de 512 para generar el
// ícono del lanzador en todas las densidades de pantalla. Con solo 180 el
// sistema agranda esa imagen, y el ícono queda borroso en la pantalla de
// inicio de cualquier teléfono moderno — que es justo lo primero que alguien
// ve de la app después de instalarla.
//
// NO se dibujan a mano ni se guardan copias divergentes: se rasteriza el SVG
// que ya está en el repo, así que cambiar el dibujo es cambiar un solo archivo
// y volver a correr esto.
//
// Igual que scripts/miniatura.mjs, necesita un navegador y NO es parte de
// `npm run prueba`: con las PNG ya generadas y commiteadas, esto no hace falta
// correrlo nunca más salvo que cambie el dibujo.
//
//   node scripts/iconos.mjs
//
// Busca Chromium donde lo dejan Playwright o el sistema. Si no encuentra
// ninguno lo dice y no rompe nada.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

const CANDIDATOS = [
  process.env.CHROME_BIN,
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const CHROME = CANDIDATOS.find((c) => existsSync(c));
if (!CHROME) {
  console.error("No encontré Chromium. Poné la ruta en CHROME_BIN y volvé a correr.");
  process.exit(1);
}

const svg = readFileSync(join(RAIZ, "app", "icon.svg"), "utf8");
const temporal = mkdtempSync(join(tmpdir(), "iconos-"));

// Las tres medidas y para qué es cada una.
//
// Las dos nuevas van a `public/` y no a `app/`: Next solo sirve los archivos de
// `app/` que casan con sus convenciones de metadatos —`icon.png`, `icon1.png`,
// `apple-icon.png`— y `icon-192.png` no casa con ninguna, así que ahí adentro
// no lo serviría nadie. `apple-icon.png` sí es una convención y se queda donde
// está.
const MEDIDAS = [
  [192, "public/icon-192.png", "el mínimo que Chrome pide para ofrecer instalar", false],
  [512, "public/icon-512.png", "de acá sale el ícono del lanzador en todas las densidades", false],
  [180, "app/apple-icon.png", "la de iOS, que no acepta SVG", false],
  [512, "public/icon-maskable.png", "el que Android recorta con la forma del teléfono", true],
];

// La ZONA SEGURA de un ícono enmascarable.
//
// Android no respeta las esquinas de nadie: recorta el ícono con la forma que
// tenga el teléfono —círculo, cuadrado redondeado, gota— y cada fabricante usa
// la suya. La especificación dice que solo el círculo central del 80% está
// garantizado; todo lo de afuera puede desaparecer.
//
// Con el ícono normal ahí adentro, al perico se le comía el pico. Así que el
// enmascarable se arma distinto: fondo a sangre —el mismo de la app, para que
// no se vea dónde termina— y el dibujo achicado hasta caber en ese círculo.
const ZONA_SEGURA = 0.78;
const FONDO = "#060d0c";

try {
  for (const [medida, destino, para, enmascarable] of MEDIDAS) {
    // El normal: el SVG en una página del tamaño exacto, sin márgenes ni fondo
    // propio, porque el dibujo ya trae el suyo y sus esquinas redondeadas.
    // El enmascarable: fondo a sangre y el dibujo achicado y centrado.
    const dibujo = Math.round(medida * (enmascarable ? ZONA_SEGURA : 1));
    const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;width:${medida}px;height:${medida}px;overflow:hidden}
body{background:${enmascarable ? FONDO : "transparent"};display:grid;place-items:center}
svg{display:block;width:${dibujo}px;height:${dibujo}px}</style>
${svg.replace(/width="\d+"\s+height="\d+"/, `width="${dibujo}" height="${dibujo}"`)}`;
    const pagina = join(temporal, `i${medida}.html`);
    writeFileSync(pagina, html);
    const salida = join(temporal, `i${medida}.png`);
    execFileSync(
      CHROME,
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "--default-background-color=00000000",
        `--screenshot=${salida}`,
        `--window-size=${medida},${medida}`,
        `file://${pagina}`,
      ],
      { stdio: "pipe" }
    );
    copyFileSync(salida, join(RAIZ, destino));
    console.log(`✓ ${destino} — ${medida}×${medida}: ${para}`);
  }
} finally {
  rmSync(temporal, { recursive: true, force: true });
}
