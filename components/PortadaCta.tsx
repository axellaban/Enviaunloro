"use client";

// El botón de la portada, que cambia si venís invitado.
//
// Vive en el cliente por la misma razón que el saludo: sin él, la portada
// tendría que leer el código en el servidor y dejaría de poder cachearse.
// Arranca diciendo lo genérico y se actualiza si resulta que había invitación.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cta } from "./Cta";

export function PortadaCta() {
  const [invita, setInvita] = useState<{ nombre: string; codigo: string } | null>(null);

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("n") || "";
    if (!/^[a-zA-Z0-9]{6}$/.test(n)) return;
    let vivo = true;
    fetch(`/api/invitacion?n=${encodeURIComponent(n)}`)
      .then((r) => r.json())
      .then((j) => {
        if (vivo && j?.invita) setInvita({ nombre: j.invita.nombre, codigo: n.toUpperCase() });
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <Cta>
      <Link
        href={invita ? `/nido?n=${invita.codigo}` : "/nido"}
        className="boton"
        style={{ padding: "15px 28px", fontSize: 16 }}
      >
        {invita ? `Armar mi nido y sumar a ${invita.nombre}` : "Soltar mi primer loro"}
      </Link>
    </Cta>
  );
}
