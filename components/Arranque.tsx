"use client";

// La pantalla de arranque: lo primero que se ve después de tocar el ícono, y
// lo único que hay entre la portada y el mapa.
//
// Es el ÚNICO momento de marca que hay adentro de la app. El bicho es el mismo
// que dibuja el ícono —un perico— porque tocás un pájaro y tiene que abrirse
// ese pájaro, no otro.
//
// Y debajo, lo que la app dice que está haciendo. La forma es la que usa Claude
// mientras trabaja: un punto, una palabra terminada en -ing, y un brillo que la
// cruza. Lo que cambia es el idioma del chiste — acá los gerundios son de
// pájaro, que es de lo único que esta app sabe.

import { useEffect, useState } from "react";
import { Ave } from "./Ave";

/**
 * Lo que está haciendo mientras carga. Se turnan.
 *
 * Son dos y alcanzan: la pantalla dura un segundo largo, así que una tercera
 * no llegaría a verse nunca. Agregar más es agregar renglones acá.
 */
const PALABRAS = ["Loring", "Cotorring"];

/** Cuántos puntos suspensivos crecen atrás de la palabra: uno, dos, tres. */
const PUNTOS = 3;

/** Cuánto tarda en aparecer cada punto. */
const CADA_PUNTO = 400;

export function Arranque() {
  // Un solo reloj para los dos ritmos, y no dos corriendo en paralelo. Los
  // puntos laten cada 400 ms y la palabra cambia cada tres puntos, así que
  // cada palabra entra siempre con UN punto y se va con tres. Con dos
  // intervalos sueltos eso se desfasaría a los pocos segundos y habría
  // palabras que aparecen ya con dos puntos.
  const [pulso, setPulso] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulso((n) => n + 1), CADA_PUNTO);
    return () => clearInterval(t);
  }, []);

  const cual = Math.floor(pulso / PUNTOS);
  const palabra = PALABRAS[cual % PALABRAS.length];
  const puntos = ".".repeat((pulso % PUNTOS) + 1);

  return (
    <div className="arranque" role="status" aria-label="Cargando">
      <Ave especie="perico" size={62} aletea />
      <p className="arranque-linea" aria-hidden>
        <span className="arranque-punto">•</span>
        {/* Las dos palabras miden distinto, y con el renglón centrado eso hace
            saltar el punto de lugar cada vez que cambia. Todas se apilan en la
            misma celda de la grilla —las que no tocan, invisibles— así que el
            ancho es siempre el de la más larga y lo único que cambia es la
            palabra. Sin números mágicos: si mañana hay una más larga, la grilla
            se entera sola.

            Las invisibles llevan los tres puntos puestos, que es la forma más
            ANCHA que puede tomar cada una: sin eso la celda crecería al llegar
            al tercer punto y volvería a encogerse, y el renglón entero —punto
            incluido— haría el mismo temblor tres veces por segundo. */}
        <span className="arranque-palabras">
          {PALABRAS.map((p) => (
            <span key={p} className="arranque-fantasma">
              {p + ".".repeat(PUNTOS)}
            </span>
          ))}
          {/* La clave es la PALABRA y no el pulso: así la entrada se anima
              cuando cambia la palabra y no cada vez que aparece un punto. */}
          <span key={cual} className="arranque-palabra">
            {palabra}
            {puntos}
          </span>
        </span>
      </p>
    </div>
  );
}
