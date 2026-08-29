"use client";

// "Fulana te quiere mandar un loro", arriba del título de la portada.
//
// Se resuelve desde el navegador y no en el servidor, y eso es lo que permite
// que la portada entera sea estática y salga del CDN. El saludo aparece unas
// décimas después, sin mover nada de lugar: el hueco ya está reservado.

import { useEffect, useState } from "react";
import { Ave } from "./Ave";
import type { AveId } from "../lib/aves";
import { esCodigo } from "../lib/codigo";

type Invita = { nombre: string; lugar: string; ave: AveId };

export function Invitacion({ alSaber }: { alSaber?: (nombre: string, codigo: string) => void }) {
  const [invita, setInvita] = useState<Invita | null>(null);

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("n") || "";
    if (!esCodigo(n)) return;
    let vivo = true;
    fetch(`/api/invitacion?n=${encodeURIComponent(n)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!vivo || !j?.invita) return;
        setInvita(j.invita);
        alSaber?.(j.invita.nombre, n.toUpperCase());
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!invita) return null;
  return (
    <div className="invitacion entra">
      <Ave especie={invita.ave} size={44} aletea />
      <p>
        <strong>{invita.nombre}</strong> te quiere mandar un loro
        {invita.lugar ? ` desde ${invita.lugar}` : ""}.
      </p>
    </div>
  );
}
