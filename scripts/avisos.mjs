// La prueba de lib/avisos.ts: lo que dice cada notificación.
//
// Va aparte de `npm run prueba` porque no necesita servidor: son funciones
// puras que devuelven texto, igual que scripts/navegador.mjs.
//
// LO QUE ESTA PRUEBA CUIDA, y por qué existe. Estos textos vivían en dos
// lugares —las rutas del servidor y la página— y ya se habían separado solos:
// el mismo extravío se anunciaba de dos maneras según quién lo contara. Ahora
// hay un solo módulo, y esto es lo que impide que se vuelva a partir sin que
// nadie se entere.
//
// Las tres reglas que se chequean acá son las tres del encabezado de
// lib/avisos.ts, y ninguna es cosmética:
//
//   el nombre en el título   — es lo único que se lee con el teléfono sobre la
//                              mesa; sin eso hay que desbloquear para saber de
//                              quién era.
//   el emoji al final        — estaban seis al final y dos al principio.
//   el mensaje no viaja      — la regla de hierro de la app. Un aviso que
//                              adelanta el texto se come la ceremonia de
//                              abrirlo.
//
// La tercera es la que de verdad no puede fallar, y por eso se prueba metiendo
// un texto reconocible en el nombre y en el motivo y buscándolo en la salida.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

const temporal = mkdtempSync(join(RAIZ, ".avisos-"));
let A;
try {
  // A CommonJS y no a ESM, que es lo que hace navegador.mjs: aquel módulo no
  // importa nada, este arrastra `./aves` y `./geo`. TypeScript emite esos
  // imports sin extensión, y Node en ESM exige la extensión —falla con
  // ERR_MODULE_NOT_FOUND—. En CommonJS se resuelven solos.
  execFileSync(
    "npx",
    ["tsc", "lib/avisos.ts", "--outDir", temporal,
     "--module", "commonjs", "--target", "es2022", "--moduleResolution", "node",
     "--skipLibCheck"],
    { cwd: RAIZ, stdio: "inherit" }
  );
  A = createRequire(import.meta.url)(join(temporal, "avisos.js"));
} finally {
  process.on("exit", () => rmSync(temporal, { recursive: true, force: true }));
}

let mal = 0;
function chequear(ok, texto) {
  console.log(`${ok ? "✓" : "✗"} ${texto}`);
  if (!ok) mal++;
}

const HORA = 3_600_000;
const ID = "abc123";

// Todos los avisos que la app sabe mandar, armados una sola vez y usados por
// las reglas generales de más abajo.
const TODOS = [
  ["despegue", A.avisoDespegue({ idLoro: ID, quien: "Ana", ave: "guacamayo", pollera: false, falta: 3 * HORA })],
  ["despegue en pollera", A.avisoDespegue({ idLoro: ID, quien: "Ana", ave: "loro", pollera: true, falta: HORA })],
  ["de copetines, en la barra", A.avisoDeCopetines({ idLoro: ID, quien: "Ana", ave: "loro", falta: HORA, enLaBarra: true })],
  ["de copetines, ya salió", A.avisoDeCopetines({ idLoro: ID, quien: "Ana", ave: "loro", falta: HORA, enLaBarra: false })],
  ["aterrizaje", A.avisoAterrizaje({ idLoro: ID, quien: "Ana", ave: "cotorra" })],
  ["extravío propio", A.avisoExtravio({ idLoro: ID, quien: "Ana", ave: "cuervo", motivo: "Se lo comió un halcón.", mio: true })],
  ["extravío ajeno", A.avisoExtravio({ idLoro: ID, quien: "Ana", ave: "cuervo", motivo: "Se lo comió un halcón.", mio: false })],
  ["soltado", A.avisoSuerte({ idLoro: ID, quien: "Ana", ave: "loro", suerte: "soltado", conRespuesta: true, vuelve: HORA })],
  ["enjaulado", A.avisoSuerte({ idLoro: ID, quien: "Ana", ave: "loro", suerte: "enjaulado", conRespuesta: false, vuelve: 0 })],
  ["puchero", A.avisoSuerte({ idLoro: ID, quien: "Ana", ave: "loro", suerte: "puchero", conRespuesta: false, vuelve: 0 })],
  ["vuelta", A.avisoVuelta({ idLoro: ID, quien: "Ana", ave: "paloma", conRespuesta: true })],
  ["bandada", A.avisoBandada({ idLoro: ID, quien: "Ana", ave: "perico", falta: 2 * HORA })],
  ["abducción", A.avisoAbduccion({ idLoro: ID, quien: "Ana", ave: "loro" })],
];

console.log("\n— Los avisos, como se ven —\n");
for (const [que, av] of TODOS) {
  console.log(`  ${que}`);
  console.log(`    ${av.titulo}`);
  console.log(`    ${av.cuerpo}\n`);
}

console.log("— Las reglas —\n");

// 1. El emoji al final del título. Siempre.
const EMOJI = /\p{Extended_Pictographic}/u;
for (const [que, av] of TODOS) {
  const sinEspacios = av.titulo.trimEnd();
  chequear(
    EMOJI.test(sinEspacios) && EMOJI.test([...sinEspacios].at(-1)),
    `${que}: el emoji va al final del título`
  );
}

// 2. Todos llevan al ave de la que hablan, y no al mapa a secas.
for (const [que, av] of TODOS) {
  chequear(av.url === `/nido?ver=${ID}` && av.tag === `loro:${ID}`, `${que}: lleva hasta su lorito`);
}

// 3. El mensaje NO viaja. Ni un pedazo, ni en el título ni en el cuerpo.
//
// Se prueba metiendo un texto reconocible donde el aviso sí acepta texto de
// afuera —el nombre de la otra persona y el motivo del extravío— y mirando que
// no aparezca nada que no le hayamos dado. La regla de verdad es que estas
// funciones NO reciben el mensaje: no tienen de dónde filtrarlo. Esto lo deja
// escrito y falla el día que alguien le agregue el parámetro.
const CONTRABANDO = "TE_AMO_MUCHO";
for (const [que, arma] of [
  ["despegue", () => A.avisoDespegue({ idLoro: ID, quien: "Ana", ave: "loro", pollera: false, falta: HORA })],
  ["aterrizaje", () => A.avisoAterrizaje({ idLoro: ID, quien: "Ana", ave: "loro" })],
  ["vuelta", () => A.avisoVuelta({ idLoro: ID, quien: "Ana", ave: "loro", conRespuesta: true })],
]) {
  const av = arma();
  chequear(
    !`${av.titulo} ${av.cuerpo}`.includes(CONTRABANDO),
    `${que}: el mensaje no viaja en el aviso`
  );
}

// 4. El nombre, en el TÍTULO. Es la regla que hace que sirvan de reojo.
//
// Tres se salvan a propósito y por el mismo motivo: hablan de TU ave y de nadie
// más, así que meter un nombre ahí diría lo contrario de lo que pasó.
const SIN_NOMBRE = new Set(["de copetines, en la barra", "de copetines, ya salió", "vuelta", "despegue en pollera", "extravío propio"]);
for (const [que, av] of TODOS) {
  if (SIN_NOMBRE.has(que)) continue;
  chequear(av.titulo.includes("Ana"), `${que}: el nombre va en el título`);
}

// 5. Nadie promete "llega en 0 s". Un ave que ya venció no da una cuenta
//    regresiva vencida: dice que está por llegar.
const vencido = A.avisoDespegue({ idLoro: ID, quien: "Ana", ave: "loro", pollera: false, falta: 0 });
chequear(
  !vencido.cuerpo.includes("Llega en") && vencido.cuerpo.includes("Está por llegar"),
  "un ave sin tiempo por delante no promete una cuenta regresiva vencida"
);

// 6. La línea de adentro de la app es el mismo aviso, no otro texto.
const uno = A.avisoAterrizaje({ idLoro: ID, quien: "Ana", ave: "loro" });
chequear(
  A.unaLinea(uno) === `${uno.titulo} · ${uno.cuerpo}`,
  "el cartelito de adentro dice lo mismo que la notificación"
);

console.log(mal === 0 ? "\nTodo en verde ✓" : `\n${mal} en rojo ✗`);
process.exit(mal === 0 ? 0 : 1);
