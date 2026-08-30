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
//
// Y hay un segundo link, el del lorito de convite (?c=), que no invita a una
// app: avisa que hay un ave posada en una cervecería con un mensaje adentro,
// esperando a que armes tu nido para salir. El texto NO viaja hasta acá —esa
// es la regla de toda la app— pero sí todo lo demás, que es lo que da ganas de
// abrirlo: quién, qué ave, en qué barrio, y cuántos copetines lleva.

import { useEffect, useState } from "react";
import { Ave } from "./Ave";
import { AVES, type AveId } from "../lib/aves";
import { ciudadDe } from "../lib/cerveceria";
import { esCodigo } from "../lib/codigo";

type Invita = { nombre: string; lugar: string; ave: AveId };
type Quien = { invita: Invita; yaEsAmigo: boolean; sosVos: boolean };

export type ConviteEnPortada = {
  ave: AveId;
  de: string;
  para: string;
  barrio: string;
  llegadaPosada: number;
  copetines: number;
  haciendo: string;
  yaSalio: boolean;
  sosVos: boolean;
  esTuyo: boolean;
};

export function Invitacion({ alSaber }: { alSaber?: (nombre: string, codigo: string) => void }) {
  const [q, setQ] = useState<Quien | null>(null);
  const [c, setC] = useState<ConviteEnPortada | null>(null);

  useEffect(() => {
    const llave = new URLSearchParams(window.location.search).get("c") || "";
    if (!llave) return;
    let vivo = true;
    fetch(`/api/convite?c=${encodeURIComponent(llave)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!vivo || !j?.convite) return;
        setC({ ...j.convite, sosVos: Boolean(j.sosVos), esTuyo: Boolean(j.esTuyo) });
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

  if (c) return <SaludoDeConvite c={c} />;
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

/** El saludo del lorito que espera en la barra. */
function SaludoDeConvite({ c }: { c: ConviteEnPortada }) {
  const a = AVES[c.ave];
  const enLaBarra = Date.now() >= c.llegadaPosada;
  return (
    <div className="invitacion entra">
      <Ave especie={c.ave} size={44} aletea={!enLaBarra} />
      <p>
        {c.esTuyo ? (
          <>
            Tu {a.nombre.toLowerCase()} ya salió de la cervecería y va para tu nido.
          </>
        ) : c.sosVos ? (
          <>
            Este lorito lo mandaste <strong>vos</strong>. Pasá el link para que
            salga de la barra.
          </>
        ) : c.yaSalio ? (
          <>Ese lorito ya salió para otro lado.</>
        ) : (
          <>
            <strong>{c.de}</strong> te mandó {a.articulo === "la" ? "una" : "un"}{" "}
            {a.nombre.toLowerCase()}
            {c.para ? <> a vos, {c.para}</> : null}.{" "}
            {enLaBarra ? (
              <>
                Está esperando en una cervecería{c.barrio ? ` de ${ciudadDe(c.barrio)}` : ""}
                {c.copetines > 0 ? ` y ya lleva ${c.copetines} copetín${c.copetines === 1 ? "" : "es"}` : ""}.
              </>
            ) : (
              <>Va camino a una cervecería a esperarte.</>
            )}
          </>
        )}
      </p>
    </div>
  );
}
