// La miniatura del link de un lorito: la fiesta en la cervecería.
//
// Es lo que se ve al pegar el link en WhatsApp, y se dibuja con las MISMAS
// aves de la app —el módulo de dibujo de components/Ave.tsx, compilado al
// vuelo— para que la vista previa no tenga pájaros distintos de los de
// adentro. Sale una PNG de 1200×630, la medida que esperan WhatsApp, Twitter
// e iMessage.
//
// Lo que NO entra acá es el mensaje. La miniatura la ve cualquiera a quien le
// reenvíen el link, y el texto todavía está volando: por eso el sobre se
// dibuja CERRADO, con su lacre. Es la misma regla que en /api/convite.
//
// Para rehacerla hace falta Playwright, que no es dependencia del proyecto —
// es la única parte del repo que necesita un navegador:
//
//   npx playwright install chromium
//   node scripts/miniatura.mjs
//
// Con la PNG ya generada y guardada en app/l/[llave]/opengraph-image.png,
// esto no hace falta correrlo nunca más salvo que se quiera cambiar el dibujo.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = process.argv[2] || join(RAIZ, "app", "l", "[llave]", "opengraph-image.png");

// components/Ave.tsx escribe las aves como texto SVG a partir de funciones
// puras, así que alcanza con compilarlo para poder llamarlas desde Node. Se
// compila DENTRO del repo para que resuelva react/jsx-runtime.
const temporal = mkdtempSync(join(RAIZ, ".aves-"));
let svgAve;
try {
  execFileSync(
    "npx",
    ["tsc", "components/Ave.tsx", "lib/aves.ts", "--outDir", temporal,
     "--module", "esnext", "--target", "es2022", "--moduleResolution", "bundler",
     "--jsx", "react-jsx", "--skipLibCheck"],
    { cwd: RAIZ, stdio: "inherit" }
  );
  ({ svgAve } = await import(join(temporal, "components", "Ave.js")));
} finally {
  process.on("exit", () => rmSync(temporal, { recursive: true, force: true }));
}

const { chromium } = await import("playwright");

/** Un ave con su jarra, parada en la barra. */
const enLaBarra = (ave, tam, x, y, giro, espejo, copa, retraso) => `
  <div style="position:absolute;left:${x}px;bottom:${y}px;transform:rotate(${giro}deg)${espejo ? " scaleX(-1)" : ""};animation:none">
    <div style="filter:drop-shadow(0 10px 18px rgba(0,0,0,.55))">${svgAve(ave, tam)}</div>
    ${copa ? `<div style="position:absolute;left:${espejo ? -18 : tam - 26}px;bottom:${Math.round(tam * 0.08)}px;font-size:${Math.round(tam * 0.34)}px;transform:${espejo ? "scaleX(-1)" : "none"}">${copa}</div>` : ""}
  </div>`;

/** El sobre. Cerrado, con lacre: el mensaje no se lee hasta que aterriza. */
const sobre = `
<svg width="150" height="112" viewBox="0 0 150 112" fill="none" style="filter:drop-shadow(0 12px 22px rgba(0,0,0,.6))">
  <rect x="3" y="16" width="144" height="93" rx="10" fill="#f6f1e6" stroke="#cdbfa6" stroke-width="2.5"/>
  <path d="M3 26 L75 72 L147 26" stroke="#cdbfa6" stroke-width="2.5" fill="none"/>
  <path d="M3 26 L75 72 L147 26 L147 20 A8 8 0 0 0 139 12 L11 12 A8 8 0 0 0 3 20 Z" fill="#efe6d5" stroke="#cdbfa6" stroke-width="2.5"/>
  <circle cx="75" cy="66" r="18" fill="#dc2626"/>
  <circle cx="75" cy="66" r="18" fill="none" stroke="#991b1b" stroke-width="2"/>
  <path d="M67 66 q8 -9 16 0 q-8 9 -16 0Z" fill="#fca5a5" opacity=".85"/>
</svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; overflow: hidden; position: relative;
    background:
      radial-gradient(1000px 420px at 50% 96%, rgba(251,191,36,.34), transparent 64%),
      radial-gradient(620px 380px at 10% 6%, rgba(16,185,129,.15), transparent 68%),
      radial-gradient(560px 380px at 94% 2%, rgba(34,211,238,.12), transparent 68%),
      #060d0c;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #e9f3f0;
  }
  /* La barra: una tabla de madera de lado a lado. Las aves se apoyan en su
     borde de arriba, que es lo que las hace estar EN un boliche y no flotando
     en el aire. */
  .barra {
    position: absolute; left: -20px; right: -20px; bottom: 0; height: 208px;
    background: linear-gradient(180deg, #8a5225 0%, #5c3517 20%, #2a1a0c 100%);
    border-top: 8px solid #b8752f;
    box-shadow: 0 -26px 70px rgba(0,0,0,.6), inset 0 10px 26px rgba(255,255,255,.1);
  }
  .barra::after {
    content: ""; position: absolute; left: 0; right: 0; top: -8px; height: 8px;
    background: linear-gradient(90deg, rgba(255,255,255,.38), rgba(255,255,255,.07) 42%, rgba(255,255,255,.34));
  }
  /* La guirnalda: cuatro luces colgadas. Es lo que dice "fiesta" antes de que
     se distinga un solo pájaro, y en una miniatura eso es todo. */
  .guirnalda { position: absolute; left: 0; right: 0; top: 0; height: 120px; }
  .guirnalda i {
    position: absolute; width: 19px; height: 19px; border-radius: 99px; display: block;
  }
  .cartel {
    position: absolute; left: 50%; top: 84px; transform: translateX(-50%);
    display: flex; align-items: center; gap: 14px;
    padding: 15px 34px; border-radius: 22px;
    background: linear-gradient(160deg, #fbbf24, #f59e0b);
    border: 4px solid #10201c;
    box-shadow: 0 18px 48px rgba(251,191,36,.45), 0 7px 0 rgba(0,0,0,.35);
    color: #2a1a05; font-size: 36px; font-weight: 850; letter-spacing: -0.02em;
  }
  .marca {
    position: absolute; left: 44px; bottom: 30px; z-index: 9;
    font-size: 26px; font-weight: 800; color: rgba(255,255,255,.95);
    text-shadow: 0 3px 12px rgba(0,0,0,.85);
  }
  .marca span { color: #a3e635; }
  .nota { position: absolute; filter: drop-shadow(0 4px 10px rgba(0,0,0,.6)); }
  .jarra { position: absolute; filter: drop-shadow(0 8px 14px rgba(0,0,0,.55)); }
</style></head><body>
  <div class="barra"></div>

  <div class="guirnalda">
    ${[130, 330, 530, 730, 930, 1110]
      .map(
        (x, i) =>
          `<span style="position:absolute;left:${x - 60}px;top:${18 + (i % 2) * 8}px;width:120px;height:34px;border-bottom:4px solid rgba(251,191,36,.35);border-radius:0 0 60px 60px"></span>
           <i style="left:${x}px;top:${48 + (i % 2) * 8}px;background:${["#fbbf24", "#a3e635", "#22d3ee", "#f472b6"][i % 4]};box-shadow:0 0 22px ${["#fbbf24", "#a3e635", "#22d3ee", "#f472b6"][i % 4]}"></i>`
      )
      .join("")}
  </div>

  <div class="cartel">🍻 La cervecería</div>

  <div class="nota" style="left:196px;top:214px;font-size:40px;transform:rotate(-16deg)">🎶</div>
  <div class="nota" style="left:986px;top:198px;font-size:34px;transform:rotate(14deg)">🎵</div>
  <div class="nota" style="left:1092px;top:296px;font-size:40px">✨</div>
  <div class="nota" style="left:112px;top:330px;font-size:32px">✨</div>

  <!-- La mesa, de izquierda a derecha. Las aves se apoyan sobre el borde de la
       barra (bottom ≈ 178) y se pisan un poco entre ellas: un boliche lleno no
       tiene a nadie prolijamente separado. -->
  ${enLaBarra("cotorra", 176, 118, 138, 6, false, "🍺")}
  ${enLaBarra("loro", 158, 296, 146, -5, false, "")}

  <!-- El perico de jarola: el más grande, el más torcido, con la cara arriba. -->
  <div style="position:absolute;left:436px;bottom:120px;z-index:5">
    <div style="position:absolute;left:236px;top:-40px;font-size:60px;filter:drop-shadow(0 5px 12px rgba(0,0,0,.7))">🥴</div>
    <div style="transform:rotate(-15deg);filter:drop-shadow(0 18px 28px rgba(0,0,0,.6))">${svgAve("perico", 300)}</div>
  </div>
  <div class="jarra" style="left:716px;bottom:116px;font-size:86px;transform:rotate(11deg);z-index:6">🍺</div>

  ${enLaBarra("cotorra", 168, 800, 140, -8, true, "🍺")}
  ${enLaBarra("guacamayo", 150, 984, 150, 5, true, "🍻")}

  <!-- El mensaje: va con ellos, y va CERRADO. Sobre la barra, a la derecha,
       lejos de la marca. -->
  <div style="position:absolute;right:58px;bottom:26px;transform:rotate(-8deg);z-index:8">${sobre}</div>

  <div class="marca">🦜 Envía mensajes con <span>Loritos</span></div>
</body></html>`;

const nav = await chromium.launch();
const p = await (await nav.newContext({ viewport: { width: 1200, height: 630 } })).newPage();
await p.setContent(html, { waitUntil: "load" });
await p.waitForTimeout(500);
await p.screenshot({ path: SALIDA, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await nav.close();
console.log("miniatura →", SALIDA);
