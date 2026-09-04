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

/** Cuánto dura cada una. Más lento que esto y solo se ve la primera. */
const CADA = 1200;

export function Arranque() {
  const [cual, setCual] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCual((n) => n + 1), CADA);
    return () => clearInterval(t);
  }, []);

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
            se entera sola. */}
        <span className="arranque-palabras">
          {PALABRAS.map((p) => (
            <span key={p} className="arranque-fantasma">
              {p}
            </span>
          ))}
          <span key={cual} className="arranque-palabra">
            {PALABRAS[cual % PALABRAS.length]}
          </span>
        </span>
      </p>
    </div>
  );
}
