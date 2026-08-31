// El manifiesto que hace instalable la app.
//
// No es un adorno de PWA: en iPhone es el REQUISITO para que existan las
// notificaciones. El Push API de Safari solo está disponible para web apps
// agregadas a la pantalla de inicio — una pestaña común no tiene acceso a
// `PushManager` y ni siquiera puede pedir el permiso. Sin esto, quien use
// iPhone no puede recibir un solo aviso, nunca.
//
// En Android y escritorio no hace falta para notificar, pero instalar la app
// igual cambia el producto: un ícono en la pantalla de inicio para algo que
// avisa cuando aterriza un ave a las tres de la tarde es la diferencia entre
// que vuelvan y que no.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Enviaunlorito — Envía Loritos, no mensajes",
    short_name: "Enviaunlorito",
    description:
      "Tu lorito cruza el mapa en tiempo real. Tarda lo que tarda: la distancia vuelve a existir.",
    start_url: "/nido",
    // `standalone` y no `browser`: instalada tiene que abrirse como una app,
    // sin barra de direcciones. En iOS además es lo que habilita el push.
    display: "standalone",
    orientation: "portrait",
    background_color: "#060d0c",
    theme_color: "#060d0c",
    lang: "es-AR",
    categories: ["social", "lifestyle"],
    // Los PNG NO son opcionales en Android, y por un rato acá hubo uno solo de
    // 180×180 —la medida de iOS—. Chrome pide al menos 192 para ofrecer
    // instalar la app, y saca del de 512 el ícono del lanzador en todas las
    // densidades de pantalla. Con solo 180 el sistema lo agrandaba, y el ícono
    // quedaba borroso en la pantalla de inicio: lo primero que alguien ve de
    // la app después de instalarla.
    //
    // Se generan del MISMO app/icon.svg con `node scripts/iconos.mjs`, así que
    // el dibujo vive en un solo lugar.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // El enmascarable es OTRO dibujo, no el mismo con una etiqueta. Android
      // recorta con la forma que tenga el teléfono —círculo, cuadrado
      // redondeado, gota— y solo garantiza el círculo central del 80%: con el
      // ícono normal ahí adentro, al perico se le comía el pico. Este trae
      // fondo a sangre y el bicho achicado hasta caber (scripts/iconos.mjs).
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      // El de iOS, que no acepta SVG como ícono de pantalla de inicio.
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
