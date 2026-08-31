// La prueba de lib/navegador.ts: reconocer el navegador de otra app.
//
// Va aparte de `npm run prueba` porque no necesita servidor: es una función
// pura y una tabla de user agents de verdad. Se compila el módulo con tsc y se
// lo importa, igual que hace scripts/miniatura.mjs con las aves.
//
// LO QUE ESTA PRUEBA CUIDA. Equivocarse acá tiene dos formas y las dos son
// caras: un falso positivo le mete un cartel de "guardate el nido" a alguien
// que está en Chrome y no lo necesita, y un falso negativo deja que alguien
// pierda su nido sin haber sido avisado nunca. La segunda es peor, pero la
// primera es la que hace que la gente deje de leer los carteles.
//
// El caso que más importa está abajo del todo y no es ninguno de los dos: la
// app INSTALADA en un iPhone tiene el mismo user agent pelado que el navegador
// de WhatsApp. Sin mirar `standalone`, la app instalada —justo la que mejor
// guarda el nido— sería la que más avisa.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

const temporal = mkdtempSync(join(RAIZ, ".aves-"));
let navegador;
try {
  execFileSync(
    "npx",
    ["tsc", "lib/navegador.ts", "--outDir", temporal,
     "--module", "esnext", "--target", "es2022", "--moduleResolution", "bundler",
     "--skipLibCheck"],
    { cwd: RAIZ, stdio: "inherit" }
  );
  ({ navegador } = await import(join(temporal, "navegador.js")));
} finally {
  process.on("exit", () => rmSync(temporal, { recursive: true, force: true }));
}

let mal = 0;
function chequear(ok, texto) {
  console.log(`${ok ? "✓" : "✗"} ${texto}`);
  if (!ok) mal++;
}

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const ANDROID = "Mozilla/5.0 (Linux; Android 13; Pixel 7)";

/** [user agent, instalada, esperado, qué es]. */
const CASOS = [
  // --- adentro del navegador de otra app: hay que avisar ---
  [`${ANDROID.replace(")", "; wv)")} AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36`,
   false, "", "el WebView de Android se declara con «; wv», aunque no diga de qué app es"],
  [`${ANDROID.replace(")", "; wv)")} AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36 WhatsApp/2.23.24.14`,
   false, "WhatsApp", "y cuando sí lo dice, se lo puede nombrar"],
  [`${IOS} Mobile/15E148`,
   false, "", "el navegador de una app en iPhone, que no dice de qué app es"],
  [`${IOS} Mobile/15E148 Instagram 302.0.0.23.113 (iPhone14,5; iOS 17_1)`,
   false, "Instagram", "Instagram se anuncia con nombre propio"],
  [`${IOS} Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone14,5;FBMD/iPhone]`,
   false, "Facebook", "y Facebook con FBAN"],

  // --- navegadores de verdad: NO hay que avisar ---
  [`${IOS} Version/17.1 Mobile/15E148 Safari/604.1`,
   false, null, "Safari de iPhone firma con Version Y Safari: es un navegador de verdad"],
  [`${IOS} CriOS/119.0.6045.109 Mobile/15E148 Safari/604.1`,
   false, null, "Chrome de iPhone no trae Version, y aun así no es el navegador de una app"],
  [`${IOS} FxiOS/119.0 Mobile/15E148 Safari/604.1`,
   false, null, "ni Firefox de iPhone"],
  [`${ANDROID} AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36`,
   false, null, "Chrome de Android tampoco"],
  ["Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0",
   false, null, "ni Firefox de Android"],
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
   false, null, "ni un Chrome de escritorio"],
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
   false, null, "ni un Safari de escritorio"],
  ["", false, null, "y sin user agent no se inventa nada"],

  // --- el que más importa ---
  [`${IOS} Mobile/15E148`,
   true, null, "la app INSTALADA en iPhone tiene el user agent pelado y NO se avisa: su nido no se pierde"],
];

console.log("\n— el navegador de otra app —\n");
for (const [ua, instalada, esperado, texto] of CASOS) {
  const r = navegador(ua, instalada);
  const bien = esperado === null ? !r.deApp : r.deApp && r.app === esperado;
  chequear(bien, `${texto}${bien ? "" : ` (dio ${JSON.stringify(r)})`}`);
}

console.log(mal === 0 ? "\nTodo en verde ✓\n" : `\n${mal} en rojo ✗\n`);
process.exit(mal === 0 ? 0 : 1);
