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
// POR QUÉ RECORTA, que es la parte que costó. Chrome headless le descuenta a la
// ventana el alto de una barra que no existe: pidiendo --window-size=W,W el
// viewport queda 87 px más bajo, la captura se rellena en blanco abajo y el
// dibujo sale CORTADO. Medido a 192, 300, 400 y 512: siempre faltan los mismos
// 87 px. Se veía en el diálogo "Agregar a Inicio" del iPhone, con el perico
// partido a la altura del pico.
//
// No se le resta 87 a mano —ese número es de esta versión de Chrome y de este
// sistema— sino que se pide una ventana bien más alta, se garantiza que el
// dibujo entre entero, y después se recorta el cuadrado de arriba. El recorte
// va en Node con `node:zlib`, que ya viene incluido: meter una librería de
// imágenes para cortar un PNG sería traer un camión para una silla.
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
import { deflateSync, inflateSync } from "node:zlib";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
// El enmascarable se arma con el MISMO archivo, tocándole dos cosas:
//
//   - las esquinas redondeadas se van (`rx="0"`), porque el que las redondea
//     es el teléfono y si vinieran de acá se verían dos veces;
//   - el bicho se achica, para que entre en ese círculo del 80%. Se achica SOLO
//     el bicho y no el SVG entero: el campo de color tiene que seguir llegando
//     al borde. Antes esto se resolvía pegando el ícono achicado sobre un color
//     plano, y con el fondo en degradado eso dejaba un escalón en las esquinas.
//
// El grupo del bicho está marcado con `data-bicho` en app/icon.svg justamente
// para poder agarrarlo desde acá.
const ZONA_SEGURA = 0.78;

/** Cuánto más alta se pide la ventana. Con 87 alcanzaba en esta máquina; van
 *  240 para no volver a atarse a un número que es de una versión de Chrome. */
const AIRE = 240;

// ---- PNG a mano, con lo que ya trae Node ----

/** Deshace los filtros de un PNG de 8 bits y devuelve las filas en crudo. */
function leerPng(buf) {
  let pos = 8;
  let w = 0, h = 0, prof = 0, tipo = 0;
  const trozos = [];
  while (pos < buf.length) {
    const largo = buf.readUInt32BE(pos);
    const clase = buf.toString("latin1", pos + 4, pos + 8);
    if (clase === "IHDR") {
      w = buf.readUInt32BE(pos + 8);
      h = buf.readUInt32BE(pos + 12);
      prof = buf[pos + 16];
      tipo = buf[pos + 17];
    } else if (clase === "IDAT") {
      trozos.push(buf.subarray(pos + 8, pos + 8 + largo));
    }
    pos += 12 + largo;
  }
  if (prof !== 8 || (tipo !== 2 && tipo !== 6)) {
    throw new Error(`PNG inesperado: profundidad ${prof}, tipo ${tipo}`);
  }
  const canales = tipo === 6 ? 4 : 3;
  const crudo = inflateSync(Buffer.concat(trozos));
  const ancho = w * canales;
  const filas = [];
  let previa = Buffer.alloc(ancho);
  let i = 0;
  for (let y = 0; y < h; y++) {
    const filtro = crudo[i++];
    const linea = Buffer.from(crudo.subarray(i, i + ancho));
    i += ancho;
    for (let x = 0; x < ancho; x++) {
      const a = x >= canales ? linea[x - canales] : 0;
      const b = previa[x];
      const c = x >= canales ? previa[x - canales] : 0;
      let v = linea[x];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += (a + b) >> 1;
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      linea[x] = v & 255;
    }
    filas.push(linea);
    previa = linea;
  }
  return { w, h, canales, filas };
}

function trozo(clase, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(clase, "latin1"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo) >>> 0);
  return Buffer.concat([largo, cuerpo, crc]);
}

const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = TABLA_CRC[(c ^ b) & 255] ^ (c >>> 8);
  return c ^ -1;
}

/** Se queda con el cuadrado de arriba a la izquierda, de lado `lado`. */
function recortarCuadrado(buf, lado) {
  const { w, h, canales, filas } = leerPng(buf);
  if (w < lado || h < lado) {
    throw new Error(`La captura salió ${w}×${h} y hace falta al menos ${lado}×${lado}`);
  }
  const ancho = lado * canales;
  const partes = [];
  for (let y = 0; y < lado; y++) {
    // Filtro 0 en todas: sin filtrar comprime peor, y un ícono pesa nada.
    partes.push(Buffer.from([0]), filas[y].subarray(0, ancho));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8;
  ihdr[9] = canales === 4 ? 6 : 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo("IHDR", ihdr),
    trozo("IDAT", deflateSync(Buffer.concat(partes), { level: 9 })),
    trozo("IEND", Buffer.alloc(0)),
  ]);
}

try {
  for (const [medida, destino, para, enmascarable] of MEDIDAS) {
    // El normal: el SVG en una página del tamaño exacto, sin márgenes ni fondo
    // propio, porque el dibujo ya trae el suyo y sus esquinas redondeadas.
    // El enmascarable: fondo a sangre y el dibujo achicado y centrado.
    let dibujo = svg.replace(/width="\d+"\s+height="\d+"/, `width="${medida}" height="${medida}"`);
    if (enmascarable) {
      const antes = dibujo;
      dibujo = dibujo
        // Las esquinas las pone el teléfono.
        .replace(/rx="\d+"/, 'rx="0"')
        // Y el bicho se achica sobre el centro del cuadro.
        .replace(
          /(data-bicho transform="translate\([\d.]+ [\d.]+\) )scale\(([\d.]+)\)/,
          (_, cabeza, escala) => `${cabeza}scale(${(Number(escala) * ZONA_SEGURA).toFixed(3)})`
        );
      if (dibujo === antes) {
        throw new Error("No encontré `data-bicho` ni `rx` en app/icon.svg: el enmascarable saldría mal.");
      }
    }
    const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;width:${medida}px;height:${medida}px;overflow:hidden}
body{background:transparent}
svg{display:block;width:${medida}px;height:${medida}px}</style>
${dibujo}`;
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
        "--force-device-scale-factor=1",
        "--default-background-color=00000000",
        `--screenshot=${salida}`,
        // Bien más alta de lo necesario: ver el encabezado. El cuadrado de
        // arriba se recorta después.
        `--window-size=${medida},${medida + AIRE}`,
        `file://${pagina}`,
      ],
      { stdio: "pipe" }
    );
    const recortado = recortarCuadrado(readFileSync(salida), medida);
    writeFileSync(join(RAIZ, destino), recortado);
    console.log(`✓ ${destino} — ${medida}×${medida}: ${para}`);
  }
} finally {
  rmSync(temporal, { recursive: true, force: true });
}
