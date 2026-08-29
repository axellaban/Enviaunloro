"use client";

// "Fulana te quiere mandar un loro", arriba del título de la portada.
//
// Se resuelve desde el navegador y no en el servidor, y eso es lo que permite
// que la portada entera sea estática y salga del CDN. El saludo aparece unas
// décimas después, sin mover nada de lugar: el hueco ya está reservado.
//
// Dice tres cosas distintas porque hay tres personas distintas abriendo el
// mismo link: alguien de afuera, alguien que ya es de esa bandada, y el dueño
// del link probando que ande. A los últimos dos, el saludo de bienvenida les
// contestaba algo que no era cierto.

import { useEffect, useState } from "react";
import { Ave } from "./Ave";
import type { AveId } from "../lib/aves";
import { esCodigo } from "../lib/codigo";

type Invita = { nombre: string; lugar: string; ave: AveId };
type Quien = { invita: Invita; yaEsAmigo: boolean; sosVos: boolean };

export function Invitacion({ alSaber }: { alSaber?: (nombre: string, codigo: string) => void }) {
  const [q, setQ] = useState<Quien | null>(null);

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("n") || "";
    if (!esCodigo(n)) return;
    let vivo = true;
    fetch(`/api/invitacion?n=${encodeURIComponent(n)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!vivo || !j?.invita) return;
        setQ({
          invita: j.invita,
          yaEsAmigo: Boolean(j.yaEsAmigo),
          sosVos: Boolean(j.sosVos),
        });
        alSaber?.(j.invita.nombre, n.toUpperCase());
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!q) return null;
  const { invita, yaEsAmigo, sosVos } = q;
  return (
    <div className="invitacion entra">
      <Ave especie={invita.ave} size={44} aletea />
      <p>
        {sosVos ? (
          <>
            Este es <strong>tu link</strong>. Quien lo abra entra a tu bandada.
          </>
        ) : yaEsAmigo ? (
          <>
            <strong>{invita.nombre}</strong> ya está en tu bandada.
          </>
        ) : (
          <>
            <strong>{invita.nombre}</strong> te quiere mandar un loro
            {invita.lugar ? ` desde ${invita.lugar}` : ""}.
          </>
        )}
      </p>
    </div>
  );
}
