// Nadie ve dónde vive nadie.
//
// La app necesita la ubicación exacta para calcular el vuelo, pero eso es
// distinto de mostrarla. Acá se separan las dos cosas: el servidor guarda y
// calcula con el punto real, y lo que sale hacia el navegador de OTRA persona
// pasa antes por acá.
//
// Cómo: a cada nido se le asigna un desvío fijo —rumbo y distancia al azar,
// hasta 300 m— derivado de su id. Fijo importa: si cambiara en cada consulta, el
// punto bailaría en el mapa y, peor, con unas cuantas muestras se podría
// promediar el centro y recuperar la posición real. Al ser siempre el mismo, lo
// único que se ve es un punto equivocado y quieto.
//
// Eso vale para la BANDADA, que es donde sigue valiendo. La vista del resto
// —los loros de desconocidos— hoy va sin corrimiento: muestra el punto real.
// Está explicado y asumido en RADIO_MUNDO_KM, acá abajo.
//
// La distancia y el tiempo de vuelo NUNCA se calculan con esto: se calculan con
// el punto real, del lado del servidor, y viajan ya resueltos. Así el "2,2 km"
// que se lee es cierto aunque el punto del mapa no lo sea.

import { createHash } from "node:crypto";
import { desplazar, type Punto } from "./geo";

/** Radio del desvío, y también el del círculo que dibuja el mapa. Los dos son
 *  el mismo número a propósito: el círculo tiene que decir la verdad sobre
 *  cuánta imprecisión hay.
 *
 *  300 m: una manzana y media. Alcanza para no dar una dirección y es lo
 *  bastante chico para que la zona de alguien que vive cerca no se te coma
 *  media pantalla del mapa. */
export const RADIO_ZONA_KM = 0.3;

/**
 * Radio de la vista del resto —los loros de desconocidos, sin nombre—.
 *
 * EN CERO: la vista del mundo muestra el punto REAL, sin corrimiento.
 *
 * Es una decisión de producto de Axel, tomada mirando el mapa con dos cuentas
 * suyas al lado. El corrimiento existía para que un desconocido no pudiera
 * leerle a nadie las coordenadas de la casa, y el precio era que un mismo vuelo
 * cayera en dos lugares distintos según desde qué cuenta se lo mirara. Ese
 * precio se veía como un error —porque parece un error— y el mapa del mundo
 * estaba mintiendo sobre dónde pasan las cosas. Ahora las dos vistas coinciden:
 * el arco del mundo sale de donde de verdad salió.
 *
 * LO QUE SE ENTREGA A CAMBIO, dicho derecho porque es lo que esta sección
 * existía para evitar: cualquiera con un nido ve la vista del resto, y ahí ahora
 * están las puntas exactas de cada vuelo. Quien reconozca un arco —"ese es el
 * que me mandó Ana recién", por la especie y la hora, que sí viajan— le lee las
 * coordenadas de la casa de Ana con la precisión que Ana le dio al navegador.
 * No hace falta ser nadie en particular para mirar: alcanza con tener la app.
 *
 * SE VUELVE ATRÁS SIN TOCAR CÓDIGO, con `LOROS_RADIO_MUNDO_KM`, y el canje es
 * directo: cuanto más grande, menos se parecen las dos vistas y menos fino
 * puede ubicarte un desconocido. 25 km decían "sale de Buenos Aires"; 3 km,
 * "sale de esta zona"; 1 km, el barrio; 0 es la casa.
 *
 * `>= 0` y no `> 0` en la lectura: el cero es un valor válido ahora, no la
 * ausencia de valor. Un `LOROS_RADIO_MUNDO_KM` mal escrito —vacío, o texto—
 * sigue cayendo en el default.
 */
export const RADIO_MUNDO_KM = (() => {
  const puesto = Number(process.env.LOROS_RADIO_MUNDO_KM);
  return Number.isFinite(puesto) && puesto >= 0 ? puesto : 0;
})();

/**
 * Y un PISO, para cuando el radio vuelva a no ser cero.
 *
 * El corrimiento reparte con raíz cuadrada sobre el área del círculo, así que
 * algunos nidos caen cerquísima del centro. Con radio 25 eso era irrelevante
 * —el 0,01% quedaba a menos de 300 m—, pero con radio 3 es el 1%: uno de cada
 * cien nidos terminaba mostrándose a los DESCONOCIDOS más preciso que a su
 * propia bandada, que lo ve corrido 300 m. Justo al revés de lo que promete
 * esta sección.
 *
 * Es un tercio del radio con tope de 1 km, así que a radio 1 el reparto va de
 * 333 m a 1 km: nunca sobre el punto real, y siempre más lejos que el
 * corrimiento de la bandada, que es de hasta 300 m. A radio 0 el piso también
 * es 0 y no hay nada que repartir: el punto es el punto.
 */
const PISO_MUNDO_KM = Math.min(1, RADIO_MUNDO_KM / 3);

/**
 * El punto que se le muestra a los demás. Determinista: el mismo nido siempre
 * cae en el mismo lugar equivocado.
 */
export function zonaDe(punto: Punto, semilla: string): Punto {
  return correr(punto, `zona:${semilla}`, RADIO_ZONA_KM);
}

/**
 * El punto que se le muestra al mundo entero.
 *
 * Semilla distinta a propósito, y no es un detalle: con la misma, alguien de tu
 * bandada —que ya te ve corrido 300 m— podría cruzar las dos vistas y sacar el
 * rumbo del desvío, que es la mitad del secreto. Con semillas separadas, los
 * dos puntos falsos no tienen nada que ver entre sí.
 */
export function zonaMundial(punto: Punto, semilla: string): Punto {
  return correr(punto, `mundo:${semilla}`, RADIO_MUNDO_KM, PISO_MUNDO_KM);
}

function correr(punto: Punto, semilla: string, radioKm: number, pisoKm = 0): Punto {
  // Radio cero es "sin corrimiento", y se sale acá en vez de dejar que la
  // cuenta dé cero sola. `desplazar` 0 km hace un viaje de ida y vuelta por
  // asin/atan2 y por el ajuste de meridiano que puede devolver el punto movido
  // en el último decimal. Pedido exacto, exacto: el mismo objeto de entrada.
  if (radioKm <= 0) return punto;

  const h = createHash("sha256").update(semilla).digest();
  const rumbo = (h.readUInt16BE(0) / 0xffff) * 360;
  // Raíz cuadrada para repartir parejo sobre el área del círculo. Sin ella los
  // puntos se apelotonan cerca del centro, que es justo donde no queremos.
  //
  // Con piso el reparto es sobre una rosca en vez de un disco: nunca sobre el
  // centro. La zona de la bandada NO lo usa —ahí 300 m es el barrio y caer a
  // cincuenta metros está bien— y la del mundo sí. Ver PISO_MUNDO_KM.
  const distancia = pisoKm + Math.sqrt(h.readUInt16BE(2) / 0xffff) * (radioKm - pisoKm);
  return desplazar(punto, distancia, rumbo);
}
