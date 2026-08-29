// El service worker de Loros.
//
// Hace UNA cosa hoy y está preparado para la que falta.
//
// LO QUE HACE. Muestra los avisos. Antes la app usaba `new Notification()`, que
// tiene dos problemas: solo funciona con la pestaña viva, y en iPhone no existe
// —el constructor no está en Safari de iOS—. `showNotification()` desde acá
// anda en las dos partes, y además hace que tocar el aviso traiga la app al
// frente en vez de no hacer nada.
//
// LO QUE FALTA. Recibir Web Push, para avisar con la app CERRADA. El `push` de
// abajo ya está escrito y funciona: lo que falta no es front, son las claves
// VAPID y un despertador del lado del servidor. El ave aterriza en un momento
// futuro y en serverless no hay nadie ejecutando código en ese instante —la
// hora se conoce al despegar, pero alguien tiene que levantarse a mirar—.
// Está explicado en el README, sección "Las notificaciones".
//
// NO cachea nada a propósito. Una app cuyo contenido es "dónde está el ave
// AHORA" no gana nada sirviendo una copia vieja, y una copia vieja de un mapa
// en vivo es peor que una pantalla vacía.

self.addEventListener("install", () => {
  // Sin esto, el service worker nuevo espera a que se cierren todas las
  // pestañas viejas para activarse. En una app que se abre y se cierra todo el
  // día, eso puede ser nunca.
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener("push", (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { cuerpo: evento.data ? evento.data.text() : "" };
  }
  const titulo = datos.titulo || "Loros";
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || "",
      icon: "/apple-icon.png",
      badge: "/apple-icon.png",
      // Mismo `tag` = reemplaza en vez de apilar. Cinco avisos del mismo loro
      // son cinco veces la misma noticia.
      tag: datos.tag || titulo,
      data: { url: datos.url || "/nido" },
    })
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = (evento.notification.data && evento.notification.data.url) || "/nido";
  evento.waitUntil(
    // Si ya hay una ventana abierta se trae al frente, en vez de abrir otra.
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abiertas) => {
      for (const c of abiertas) {
        if (c.url.includes(destino) && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(destino);
    })
  );
});
