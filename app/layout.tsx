import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
  themeColor: "#060d0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
