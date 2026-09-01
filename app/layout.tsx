import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * De dónde cuelgan las URLs absolutas — y con ellas la miniatura que se ve al
 * pegar el link en WhatsApp.
 *
 * Esto NO es un detalle: og:image tiene que ser una URL absoluta y pública. Si
 * acá quedara "localhost", WhatsApp iría a buscar la imagen a la máquina de
 * quien recibe el mensaje, no la encontraría, y el link se vería como un
 * renglón de texto pelado. Por eso, sin variable propia, se caen las que pone
 * Vercel solo: primero el dominio estable de producción y recién después el de
 * cada deploy.
 */
const SITIO =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: "Enviaunlorito — Envía mensajes con Loritos",
  description:
    "¿Qué pasa si los mensajes tomaran tiempo? Mensajes más lentos, conversaciones más profundas. La distancia vuelve a existir.",
  applicationName: "Enviaunlorito",
  // EL NOMBRE QUE USA iOS, y faltaba.
  //
  // Al agregar a la pantalla de inicio, iPhone precarga el nombre desde acá; si
  // no está, usa el <title> entero —"Enviaunlorito — Envía mensajes con
  // Loritos"— y la persona lo recorta a mano. De ahí salen los íconos que
  // dicen cualquier cosa, y de ahí el "from Loritos" que aparece al lado de
  // cada notificación: iOS muestra el nombre de la app instalada, no el de la
  // web. Con esto precarga "Enviaunlorito" y no hay nada que recortar.
  //
  // OJO: no renombra lo que YA está instalado. Eso solo se arregla sacando el
  // ícono de la pantalla y volviéndolo a agregar.
  appleWebApp: { title: "Enviaunlorito", capable: true },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Enviaunlorito",
    title: "Envía mensajes con Loritos 🦜",
    description:
      "¿Qué pasa si los mensajes tomaran tiempo? Mensajes más lentos, conversaciones más profundas. La distancia vuelve a existir.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Envía mensajes con Loritos 🦜",
    description:
      "¿Qué pasa si los mensajes tomaran tiempo? Mensajes más lentos, conversaciones más profundas. La distancia vuelve a existir.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#060d0c",
};

/**
 * Atrapar la oferta de instalar ANTES de que exista un componente que la mire.
 *
 * Chrome dispara `beforeinstallprompt` una sola vez, apenas decide que la app
 * es instalable, y eso pasa a los pocos milisegundos de cargar la página. El
 * cartel que la ofrece vive adentro del panel, que se dibuja recién cuando
 * terminó de cargar el nido —después de la pantalla de arranque, de la consulta
 * al servidor y de la hidratación—. Para entonces el evento ya pasó y no vuelve:
 * quien escuchaba llegó tarde, y en Android la tarjeta de "ponela en tu
 * pantalla" no aparecía nunca. Medido en Android; en iPhone este evento no
 * existe y todo esto es un no-op.
 *
 * Por eso se escucha acá, en un script suelto que corre antes que cualquier
 * React: guarda el evento en `window` y avisa por su cuenta. El componente,
 * cuando por fin se monta, encuentra la oferta esperándolo.
 *
 * `dangerouslySetInnerHTML` es la única forma de meter un script que corra
 * antes de la hidratación. Es texto fijo escrito acá, sin nada de afuera.
 */
const ATRAPAR_INSTALAR = `
(function () {
  try {
    window.__instalar = null;
    window.addEventListener("beforeinstallprompt", function (e) {
      // Sin esto Chrome muestra ADEMÁS su propio cartelito abajo.
      e.preventDefault();
      window.__instalar = e;
      window.dispatchEvent(new Event("loros:instalable"));
    });
    window.addEventListener("appinstalled", function () {
      window.__instalar = null;
      window.dispatchEvent(new Event("loros:instalable"));
    });
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <script dangerouslySetInnerHTML={{ __html: ATRAPAR_INSTALAR }} />
        {children}
      </body>
    </html>
  );
}
