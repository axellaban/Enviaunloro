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
import { Fiesta } from "./Fiesta";
import { AVES, type AveId } from "../lib/aves";
import { ciudadDe } from "../lib/cerveceria";
import { esCodigo } from "../lib/codigo";
import { llaveDeConvite } from "../lib/cliente";

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
  estado: "yendo" | "barra" | "volviendo" | "encasa" | "reclamado" | "cancelado";
  sosVos: boolean;
  esTuyo: boolean;
};

export function Invitacion({ alSaber }: { alSaber?: (nombre: string, codigo: string) => void }) {
  const [q, setQ] = useState<Quien | null>(null);
  const [c, setC] = useState<ConviteEnPortada | null>(null);
  /** La ceremonia de la barra, cuando la hay. */
  const [fiesta, setFiesta] = useState<AveId | null>(null);

  useEffect(() => {
    const llave = llaveDeConvite();
    if (!llave) return;
    let vivo = true;
    fetch(`/api/convite?c=${encodeURIComponent(llave)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!vivo || !j?.convite) return;
        setC({ ...j.convite, sosVos: Boolean(j.sosVos), esTuyo: Boolean(j.esTuyo) });
        // Abrir el link y encontrarse con que hay un lorito tomando en una
        // cervecería, esperándote, es EL momento de todo el convite: es lo que
        // tiene que dar ganas de armar el nido. Así que la pantalla se pone de
        // fiesta.
        //
        // Solo cuando de verdad está en la barra —yendo todavía no llegó, y
        // volviendo ya se cansó— y nunca para quien lo mandó, que está
        // probando que su propio link ande.
        //
        // Una vez por pestaña: se abre desde WhatsApp una sola vez, pero
        // recargando la página el festejo repetido dejaría de ser un festejo.
        const yaFue = `fiesta:${llave}`;
        if (
          j.convite.estado === "barra" &&
          !j.sosVos &&
          !j.esTuyo &&
          !sessionStorage.getItem(yaFue)
        ) {
          try {
            sessionStorage.setItem(yaFue, "1");
          } catch {
            // Modo privado, o el navegador con el almacenamiento bloqueado. La
            // fiesta sale igual: lo único que se pierde es no repetirla.
          }
          setFiesta(j.convite.ave);
        }
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

  if (c)
    return (
      <>
        <SaludoDeConvite c={c} />
        {fiesta && <Fiesta motivo="barra" ave={fiesta} alTerminar={() => setFiesta(null)} />}
      </>
    );
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
        ) : c.estado === "cancelado" ? (
          <>
            <strong>{c.de}</strong> llamó de vuelta a {a.articulo === "la" ? "esa" : "ese"}{" "}
            {a.nombre.toLowerCase()}. Ese link ya no trae nada.
          </>
        ) : (
          <>
            <strong>{c.de}</strong> te mandó {a.articulo === "la" ? "una" : "un"}{" "}
            {a.nombre.toLowerCase()}
            {c.para ? <> a vos, {c.para}</> : null}.{" "}
            {c.estado === "encasa" || c.estado === "volviendo" ? (
              <>
                Se cansó de esperarte en una cervecería
                {c.copetines > 0 ? `, con ${c.copetines} copetín${c.copetines === 1 ? "" : "es"} encima,` : ""}{" "}
                y se volvió a dormirla. Armá tu nido y sale igual.
              </>
            ) : enLaBarra ? (
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
