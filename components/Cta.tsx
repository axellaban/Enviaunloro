"use client";

// El halo de los botones principales.
//
// Va en un envoltorio y no en un ::before del propio botón por una razón
// concreta: el botón se achica al apretarlo, y un `transform` crea un contexto
// de apilado que dejaría el halo por delante de la cara del botón justo durante
// el toque. Con el halo afuera, el botón siempre queda arriba.
//
// El efecto es el mismo del botón "Responder" de Loreado.IA: un degradado de
// colores de loro —esmeralda, lima, ámbar, rosa, cian— que gira alrededor.

import type { ReactNode } from "react";

export function Cta({ children, ancho = false }: { children: ReactNode; ancho?: boolean }) {
  return (
    <span className={ancho ? "cta cta-ancho" : "cta"}>
      <span className="cta-halo" aria-hidden="true" />
      {children}
    </span>
  );
}
