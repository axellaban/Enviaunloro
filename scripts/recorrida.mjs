// El recorrido de alguien que llega por primera vez, fotografiado.
//
// PARA QUÉ. Los problemas de esta app no se ven leyendo el código: se ven
// mirando la primera pantalla de alguien que nunca la usó. Este script arma un
// nido desde cero en un iPhone simulado y saca una foto en cada paso, así una
// revisión de diseño se hace mirando y no imaginando.
//
// La primera vez que se corrió encontró cuatro cosas de una: la pantalla más
// importante de la app —la de alguien recién llegado— decía "nada" tres veces y
// pedía salir a reclutar un amigo antes de dejar ver un solo pájaro volando; el
// nombre del nido mostraba "-34.761, -58.401" cuando el geocodificador fallaba;
// "Ya tengo un nido" competía en peso con "Seguir"; y el subtítulo de la
// portada decía "una experiencia de comunicación verdaderamente única".
//
// Necesita Playwright, que NO es dependencia del proyecto —igual que
// scripts/miniatura.mjs, es de las pocas partes del repo que piden un
// navegador— y el servidor levantado:
//
//   npm i -D playwright && npx playwright install chromium
//   npm run build && npm start
//   node scripts/recorrida.mjs
//
// Las fotos quedan en .recorrida/, que está fuera del control de versiones.

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = process.env.RECORRIDA_SALIDA || join(RAIZ, ".recorrida");
const BASE = process.env.RECORRIDA_BASE || "http://localhost:3000";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "Falta Playwright, que a propósito no es dependencia del proyecto:\n" +
      "  npm i -D playwright && npx playwright install chromium"
  );
  process.exit(1);
}

mkdirSync(SALIDA, { recursive: true });

const navegador = await chromium.launch({
  // El que ya trae el entorno, si está. Si no, el que bajó Playwright.
  executablePath: process.env.CHROME_BIN || undefined,
  args: ["--no-sandbox"],
});
// Un iPhone, que es donde se usa. Mirar esto en una pantalla de escritorio es
// la forma más rápida de no encontrar ninguno de los problemas que tiene.
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "es-AR",
  geolocation: { latitude: -34.7608, longitude: -58.4009 },
  permissions: ["geolocation"],
});
const pagina = await contexto.newPage();
let paso = 0;
const foto = async (nombre) => {
  paso += 1;
  const archivo = join(SALIDA, `${String(paso).padStart(2, "0")}-${nombre}.png`);
  await pagina.screenshot({ path: archivo });
  console.log(`📸 ${archivo}`);
};

try {
  await pagina.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(600);
  await foto("portada");

  await pagina.goto(`${BASE}/nido`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(800);
  await foto("onboarding-nombre");

  await pagina.fill("input.campo", "Axel");
  await pagina.click("button:has-text('Seguir')");
  await pagina.waitForTimeout(600);
  await foto("onboarding-ubicacion");

  await pagina.locator(".tarjeta button").first().click();
  await pagina.waitForTimeout(1600);
  await foto("onboarding-ave");

  const entrar = pagina.locator("button:has-text('Entrar al mapa')").first();
  if (await entrar.count()) {
    await entrar.click();
    await pagina.waitForTimeout(3000);
  }
  await foto("primera-pantalla");

  // Lo primero que la app le ofrece hacer: probarlo con la vecina.
  const probar = pagina.locator("button:has-text('Doña Cotorra')").first();
  if (await probar.count()) {
    await probar.click();
    await pagina.waitForTimeout(1000);
    await foto("compositor");
  }
} finally {
  await navegador.close();
}
