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
  title: "Loros — Envía Loritos, no mensajes",
  description:
    "La aplicación de mensajería donde tu Lorito viaja en tiempo real según la distancia. Una experiencia de comunicación verdaderamente única.",
  applicationName: "Loros",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Loros",
    title: "Envía Loritos, no mensajes 🦜",
    description:
      "La aplicación de mensajería donde tu Lorito viaja en tiempo real según la distancia. Una experiencia de comunicación verdaderamente única.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Envía Loritos, no mensajes 🦜",
    description:
      "La aplicación de mensajería donde tu Lorito viaja en tiempo real según la distancia. Una experiencia de comunicación verdaderamente única.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
