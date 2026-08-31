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
//
// PERO ESCUCHA `fetch`, y eso no es una contradicción con lo de arriba. Chrome
// no ofrece instalar una app cuyo service worker no tenga un manejador de
// `fetch`: es parte de sus criterios de instalabilidad, y sin él no dispara
// `beforeinstallprompt`, así que en Android no aparecía forma de instalarla.
// El manejador de abajo no responde nada —no llama a `respondWith`— o sea que
// cada pedido sigue yendo a la red exactamente como antes. No cachea, no
// intercepta, no cambia una sola respuesta. Existe para que el navegador
// reconozca la app como instalable, que era lo único que faltaba.

self.addEventListener("install", () => {
  // Sin esto, el service worker nuevo espera a que se cierren todas las
  // pestañas viejas para activarse. En una app que se abre y se cierra todo el
  // día, eso puede ser nunca.
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(self.clients.claim());
});

// Deliberadamente vacío. Ver arriba: está para que la app sea instalable, no
// para hacer nada con los pedidos. Sin `respondWith`, el navegador resuelve
// cada uno como si este manejador no existiera.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { cuerpo: evento.data ? evento.data.text() : "" };
  }
  const titulo = datos.titulo || "Enviaunlorito";
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
  // Los avisos ahora traen `?ver=<id>`: llevan hasta el ave de la que hablan,
  // no al mapa en general. Eso rompió la búsqueda que había acá, que comparaba
  // la URL entera con `includes`: una pestaña abierta en "/nido" no contiene
  // "/nido?ver=abc", así que no la encontraba y abría una ventana NUEVA cada
  // vez. Ahora se busca por camino —cualquier pestaña de la app sirve— y se la
  // manda al destino con `navigate`, que es lo que hace que el `?ver=` llegue
  // a una pestaña que ya estaba abierta.
  const camino = destino.split("?")[0];
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abiertas) => {
      for (const c of abiertas) {
        if (!c.url.includes(camino)) continue;
        // `navigate` no existe en todos lados y puede fallar si la pestaña no
        // está bajo control de este service worker. Que falle no puede costar
        // el toque: en el peor caso se trae al frente lo que ya había.
        if ("navigate" in c) {
          return c
            .navigate(destino)
            .then((v) => (v || c).focus())
            .catch(() => c.focus());
        }
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow(destino);
    })
  );
});
