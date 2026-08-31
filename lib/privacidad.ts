// Nadie ve dónde vive nadie.
//
// La app necesita la ubicación exacta para calcular el vuelo, pero eso es
// distinto de mostrarla. Acá se separan las dos cosas: el servidor guarda y
// calcula con el punto real, y lo que sale hacia el navegador de OTRA persona
// es siempre un punto corrido.
//
// Cómo: a cada nido se le asigna un desvío fijo —rumbo y distancia al azar,
// hasta 300 m— derivado de su id. Fijo importa: si cambiara en cada consulta, el
// punto bailaría en el mapa y, peor, con unas cuantas muestras se podría
// promediar el centro y recuperar la posición real. Al ser siempre el mismo, lo
// único que se ve es un punto equivocado y quieto.
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
 * Radio de la vista del resto —los loros de desconocidos, sin nombre— que es
 * un problema distinto y bastante más serio.
 *
 * En la bandada, 300 m alcanzan: quien te ve ahí ya tiene tu código, se lo
 * diste vos. En la vista del resto te ve CUALQUIERA con un nido, así que el
 * punto se corre a escala de ciudad. 25 km dicen "esto sale de Buenos Aires" y
 * no dicen nada más — que es justo lo que hace interesante el mapa sin poner a
 * nadie.
 *
 * EL COSTO, dicho derecho, porque se nota y parece un error: un mismo vuelo
 * cae en dos lugares a veinte kilómetros uno del otro según desde qué cuenta
 * se lo mire. Medido: 228 m en la bandada, 22,16 km en el mundo. En un mapa de
 * ciudad eso es otro partido, y quien tenga dos cuentas propias abiertas al
 * lado lo va a ver como una incoherencia. No lo es: sin este corrimiento, uno
 * mira el mapa del mundo, reconoce un arco —"ese es el que me mandó Ana recién"—
 * y le lee las coordenadas exactas de la casa. Ese es todo el punto.
 *
 * SE PUEDE MOVER sin tocar código, con `LOROS_RADIO_MUNDO_KM`, y es un canje
 * directo: cuanto más chico, más se parecen las dos vistas y más fino puede
 * ubicarte un desconocido. Bajarlo a 5 significa "vive en esta zona del
 * conurbano"; bajarlo a 1 es casi decir el barrio. El default se queda en 25
 * porque es el único número que no dice nada más que la ciudad.
 */
export const RADIO_MUNDO_KM = (() => {
  const puesto = Number(process.env.LOROS_RADIO_MUNDO_KM);
  return Number.isFinite(puesto) && puesto > 0 ? puesto : 25;
})();

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
  return correr(punto, `mundo:${semilla}`, RADIO_MUNDO_KM);
}

function correr(punto: Punto, semilla: string, radioKm: number): Punto {
  const h = createHash("sha256").update(semilla).digest();
  const rumbo = (h.readUInt16BE(0) / 0xffff) * 360;
  // Raíz cuadrada para repartir parejo sobre el área del círculo. Sin ella los
  // puntos se apelotonan cerca del centro, que es justo donde no queremos.
  const distancia = Math.sqrt(h.readUInt16BE(2) / 0xffff) * radioKm;
  return desplazar(punto, distancia, rumbo);
}
