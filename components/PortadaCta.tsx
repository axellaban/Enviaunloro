"use client";

// El botón de la portada, que cambia según quién lo esté mirando.
//
// Vive en el cliente por la misma razón que el saludo: sin él, la portada
// tendría que leer el código en el servidor y dejaría de poder cachearse.
// Arranca diciendo lo genérico y se actualiza si resulta que había invitación.
//
// Cuatro textos, y los dos últimos son nuevos porque el botón mentía. Decía
// "Armar mi nido y sumar a Fulana" también a quien YA tenía nido —le prometía
// un trámite que no corresponde; el nido no se rehace—, a quien ya era de esa
// bandada le ofrecía sumarla de nuevo, y a quien abría su propio link le
// ofrecía sumarse a sí mismo. Lo que pasaba al tocarlo siempre estuvo bien: el
// nido detecta que ya existe y solo agrega al otro. Era el texto el que
// mentía, que es la peor forma de estar roto, porque nadie la reporta.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cta } from "./Cta";
import { esCodigo, normalizarCodigo } from "../lib/codigo";

type Invitacion = {
  nombre: string;
  codigo: string;
  tenesNido: boolean;
  yaEsAmigo: boolean;
};

export function PortadaCta() {
  const [invita, setInvita] = useState<Invitacion | null>(null);

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("n") || "";
    if (!esCodigo(n)) return;
    let vivo = true;
    fetch(`/api/invitacion?n=${encodeURIComponent(n)}`)
      .then((r) => r.json())
      .then((j) => {
        // Normalizado: `n` puede venir con un guion o un espacio y de acá sale
        // armado un href.
        if (!vivo || !j?.invita) return;
        setInvita({
          nombre: j.invita.nombre,
          codigo: normalizarCodigo(n),
          tenesNido: Boolean(j.tenesNido),
          yaEsAmigo: Boolean(j.yaEsAmigo),
        });
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const texto = !invita
    ? "Soltar mi primer loro"
    : invita.yaEsAmigo
      ? "Ir a mi nido"
      : invita.tenesNido
        ? `Sumar a ${invita.nombre} a mi bandada`
        : `Armar mi nido y sumar a ${invita.nombre}`;

  // Ya siendo bandada, el código no viaja: llevarlo dispararía un pedido de
  // amistad que ya está hecho, para que el nido lo descarte de nuevo.
  const destino = invita && !invita.yaEsAmigo ? `/nido?n=${invita.codigo}` : "/nido";

  return (
    <Cta>
      <Link href={destino} className="boton" style={{ padding: "15px 28px", fontSize: 16 }}>
        {texto}
      </Link>
    </Cta>
  );
}
