// Genera el par de claves VAPID. Se corre UNA vez, y nunca más.
//
//   npm run vapid
//
// Sale por consola y no se guarda en ningún lado a propósito: la privada firma
// todos los avisos de la app y no tiene por qué existir en un archivo del
// repo, ni pasar por un chat, ni quedar en el historial de nadie. Se copia a
// las variables de entorno y listo.
//
// Cambiarlas después NO es gratis: cada navegador guarda su suscripción atada
// a la clave pública con la que se dio de alta, así que si las rotás, todas
// las suscripciones existentes dejan de recibir y cada persona tiene que
// volver a dar permiso. Generalas una vez y guardalas donde guardes lo demás.

import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
Las claves para los avisos. Cargalas como variables de entorno y redeployá:

  VAPID_PUBLIC_KEY=${publicKey}
  VAPID_PRIVATE_KEY=${privateKey}
  VAPID_CONTACTO=mailto:TU-MAIL@ejemplo.com

La pública NO es secreta: viaja al navegador para suscribirse.
La privada SÍ: firma todos los avisos. Que no entre al repo.

Después, correr supabase.sql (crea la tabla y programa el despertador) y
comprobar en /api/salud que "push" diga ok.
`);
