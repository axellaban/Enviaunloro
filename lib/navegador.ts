// En qué navegador está parada la app, y por qué acá eso importa más que en
// otras.
//
// La identidad de un nido es una cookie (lib/sesion.ts). No hay cuenta ni
// contraseña, así que el nido vive en el navegador que lo creó y en ninguno
// más. Esa decisión está bien y es la que evita la pantalla de registro que
// mataría el producto — pero tiene un borde filoso, y se paga entero:
//
//   WhatsApp no abre los links en Chrome ni en Safari. Abre un navegador
//   propio, adentro de WhatsApp, con su propio frasco de cookies.
//
// Y el link de un lorito llega por WhatsApp. O sea que el camino más común de
// toda la app —te llega un convite, lo abrís, armás tu nido— TERMINA ADENTRO DE
// ESE NAVEGADOR. Después la persona abre Chrome, entra a la app y no tiene
// nido: el suyo sigue existiendo en el servidor, con su código, su bandada y
// sus loros, pero no hay forma de volver a entrar. No es que se borró, es que
// quedó del otro lado de una puerta sin picaporte.
//
// La llave del nido (`/entrar?llave=…`) resuelve eso desde el día uno, pero hay
// que sacarla ANTES de perder el acceso, y vive en una pestaña del panel que
// nadie visita el primer día. Esto existe para poder ofrecerla en el único
// momento en que se entiende para qué sirve: cuando estás parado justo adentro
// del navegador que te la va a hacer perder.
//
// LO QUE ESTO NO ES. Detectar por user agent es una heurística, no una verdad:
// la lista se queda vieja sola y hay un caso que no se puede ver —el
// SFSafariViewController de iOS, que firma exactamente igual que Safari aunque
// tenga su propio almacenamiento—. Por eso lo que se ofrece es siempre lo
// mismo que ya está en el panel, nunca algo que dependa de acertar: si la
// detección falla, la persona pierde un aviso, no una funcionalidad.

export type Navegador = {
  /** Estamos adentro del navegador de otra app, no en uno de verdad. */
  deApp: boolean;
  /** Cómo se llama esa app. Vacío si no se pudo saber cuál es. */
  app: string;
};

const NINGUNO: Navegador = { deApp: false, app: "" };

/**
 * Las que se anuncian con nombre propio.
 *
 * Vale la pena distinguirlas aunque el problema sea el mismo: "el navegador de
 * WhatsApp" es una cosa que la persona puede mirar y reconocer, y "el navegador
 * de esta app" es una advertencia sobre algo que no sabe qué es.
 */
const CONOCIDOS: [RegExp, string][] = [
  [/WhatsApp/i, "WhatsApp"],
  [/Instagram/i, "Instagram"],
  [/FBAN|FBAV|FB_IAB|FB4A/i, "Facebook"],
  [/Messenger/i, "Messenger"],
  [/Telegram/i, "Telegram"],
  [/BytedanceWebview|musical_ly|TikTok/i, "TikTok"],
  [/\bLine\//i, "LINE"],
];

/**
 * @param ua el user agent.
 * @param standalone si la app está instalada en la pantalla de inicio.
 */
export function navegador(ua: string, standalone = false): Navegador {
  // Instalada no es el navegador de nadie: es la app, y su nido no se pierde
  // por salir de ningún lado. Va primero porque en iPhone una PWA instalada
  // tiene el mismo user agent pelado que un WebView, y sin esto la app
  // instalada —justo la que MEJOR guarda el nido— sería la que más avisa.
  if (standalone) return NINGUNO;
  if (!ua) return NINGUNO;

  for (const [señal, nombre] of CONOCIDOS) {
    if (señal.test(ua)) return { deApp: true, app: nombre };
  }

  // Android lo dice sin vueltas: un WebView firma con "; wv" adentro del
  // paréntesis.
  if (/;\s*wv\)/i.test(ua)) return { deApp: true, app: "" };

  // iPhone es el caso incómodo: el navegador de una app no cuenta de qué app
  // es y se hace pasar por Safari. Lo delata lo que le FALTA — Safari de
  // verdad firma con "Version/17.0 … Safari/604.1" y un WKWebView no pone
  // ninguno de los dos. Se piden los dos juntos porque hay navegadores que
  // traen uno solo.
  if (/iPhone|iPad|iPod/i.test(ua) && !(/Safari\//i.test(ua) && /Version\//i.test(ua))) {
    // Chrome, Firefox, Edge y Opera en iPhone son WebKit con otro nombre y les
    // falta el "Version/", pero son navegadores de verdad: tienen su nido y se
    // los puede volver a abrir. Sin esta salvedad, todo Chrome de iPhone se
    // llevaba el aviso.
    if (/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) return NINGUNO;
    return { deApp: true, app: "" };
  }

  return NINGUNO;
}

/**
 * Si acá no hay aviso posible hasta que la app esté en la pantalla de inicio.
 *
 * Es lo de iPhone, y no es un detalle de implementación que se pueda esconder:
 * el Push API de Safari existe SOLO para web apps instaladas. Una pestaña común
 * no tiene `PushManager` y ni siquiera puede pedir el permiso — el cartel no
 * aparece, no hay nada que aceptar. Vale para todos los navegadores del
 * teléfono, porque en iPhone Chrome y Firefox son el mismo WebKit con otro
 * nombre.
 *
 * Importa porque cambia qué se le puede ofrecer a la persona. Pedirle permiso
 * es ofrecerle algo que no existe; lo único que sirve es contarle el paso que
 * lo desbloquea, y ese paso lo da ella.
 *
 * (Un iPad con iPadOS 13 o más se hace pasar por Mac y no entra acá. Se lo
 * pierde el aviso, no la app: en la duda, callarse.)
 */
export function necesitaInstalarseParaAvisar(ua: string, standalone = false): boolean {
  if (standalone) return false;
  return /iPhone|iPad|iPod/i.test(ua);
}

/** Lo mismo, leyendo el navegador de verdad. Solo del lado del cliente. */
export function navegadorDeAhora(): Navegador {
  if (typeof navigator === "undefined") return NINGUNO;
  const instalada =
    (typeof matchMedia !== "undefined" &&
      matchMedia("(display-mode: standalone)").matches) ||
    // Lo de iOS, que nunca implementó `display-mode`.
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return navegador(navigator.userAgent || "", instalada);
}

/** Y lo mismo para lo de iPhone. */
export function hayQueInstalarParaAvisar(): boolean {
  if (typeof navigator === "undefined") return false;
  const instalada =
    (typeof matchMedia !== "undefined" &&
      matchMedia("(display-mode: standalone)").matches) ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return necesitaInstalarseParaAvisar(navigator.userAgent || "", instalada);
}
