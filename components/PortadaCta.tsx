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
import { AVES, type AveId } from "../lib/aves";
import { esCodigo, normalizarCodigo } from "../lib/codigo";

type Invitacion = {
  nombre: string;
  codigo: string;
  tenesNido: boolean;
  yaEsAmigo: boolean;
};

/** El otro link: un ave posada en una cervecería con un mensaje adentro. */
type Convite = {
  llave: string;
  ave: AveId;
  de: string;
  tenesNido: boolean;
  /** Ya salió para otro lado: el link llegó tarde. */
  yaSalio: boolean;
  /** Lo llamaron de vuelta: el link no trae nada. */
  cancelado: boolean;
  /** Lo mandaste vos, o ya lo reclamaste vos. En los dos casos no hay nada que
   *  destrabar acá. */
  tuyo: boolean;
};

export function PortadaCta() {
  const [invita, setInvita] = useState<Invitacion | null>(null);
  const [convite, setConvite] = useState<Convite | null>(null);

  useEffect(() => {
    const llave = new URLSearchParams(window.location.search).get("c") || "";
    if (!llave) return;
    let vivo = true;
    fetch(`/api/convite?c=${encodeURIComponent(llave)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!vivo || !j?.convite) return;
        setConvite({
          llave,
          ave: j.convite.ave,
          de: j.convite.de,
          tenesNido: Boolean(j.tenesNido),
          yaSalio: Boolean(j.convite.yaSalio),
          cancelado: j.convite.estado === "cancelado",
          tuyo: Boolean(j.sosVos || j.esTuyo),
        });
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

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

  // El lorito de convite manda sobre la invitación genérica: si hay un ave
  // esperando en una barra con un mensaje para vos, eso es lo que hay que
  // contar, no "sumate a la app".
  if (convite) {
    const a = AVES[convite.ave];
    const destrabable = !convite.yaSalio && !convite.cancelado && !convite.tuyo;
    const texto = !destrabable
      ? convite.tenesNido
        ? "Ir a mi nido"
        : "Soltar mi primer loro"
      : convite.tenesNido
        ? `Que ${a.articulo} ${a.nombre.toLowerCase()} salga para mi nido`
        : `Armar mi nido y que ${a.articulo} ${a.nombre.toLowerCase()} salga`;
    return (
      <Cta>
        <Link
          href={destrabable ? `/nido?c=${encodeURIComponent(convite.llave)}` : "/nido"}
          className="boton"
          style={{ padding: "15px 28px", fontSize: 16 }}
        >
          {texto}
        </Link>
      </Cta>
    );
  }

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
