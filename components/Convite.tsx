"use client";

// Mandarle un lorito a alguien que todavía no está en la app.
//
// Es la otra mitad de invitar. Compartir el nido manda un link que dice
// "bajate esto"; esto manda un ave con un mensaje adentro, que ya despegó y
// está esperando en una cervecería a que la otra persona tenga un nido adonde
// ir (lib/cerveceria.ts).
//
// La pantalla tiene dos momentos y el segundo es el que importa: una vez que
// el ave salió, lo único que queda es compartir el link. Por eso al soltar no
// se cierra sino que se convierte en eso, con el botón grande y nada más al
// lado: el momento en que alguien está más dispuesto a mandar un WhatsApp es
// el segundo siguiente a haber escrito el mensaje.

import { useState } from "react";
import { AVES, AVES_LISTA, type AveId } from "../lib/aves";
import { formatearDistancia } from "../lib/geo";
import { kmHastaLaParada, MINUTOS_HASTA_LA_PARADA } from "../lib/cerveceria";
import { pedir } from "../lib/cliente";
import type { ConviteVista, NidoVista } from "../lib/vista";
import { Ave } from "./Ave";

/** El link, y cómo se comparte. Mismo criterio que el del nido: el código va
 *  adentro del link, nunca suelto al lado para que alguien lo copie a mano.
 *  Exportados porque la tarjeta del panel comparte el mismo link mientras el
 *  ave espera: si el WhatsApp se perdió, se vuelve a mandar desde ahí. */
export function linkDeConvite(id: string): string {
  return typeof window !== "undefined" ? `${window.location.origin}/?c=${id}` : "";
}

export async function compartirConvite(c: ConviteVista): Promise<boolean> {
  const a = AVES[c.ave];
  const url = linkDeConvite(c.id);
  const texto = `Te mandé ${a.articulo === "la" ? "una" : "un"} ${a.nombre.toLowerCase()} 🦜 Está esperando en una cervecería con un mensaje tuyo adentro. Abrí el link y sale para vos:`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Loros", text: texto, url });
    } else {
      await navigator.clipboard.writeText(`${texto} ${url}`);
    }
    return true;
  } catch {
    return false;
  }
}

export function Convite({
  yo,
  alCerrar,
  alSoltado,
}: {
  yo: NidoVista;
  alCerrar: () => void;
  alSoltado: (mensaje: string) => void;
}) {
  const [para, setPara] = useState("");
  const [ave, setAve] = useState<AveId>(yo.ave);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [soltando, setSoltando] = useState(false);
  /** Cuando existe, el ave ya despegó y la pantalla pasa a ser el link. */
  const [salido, setSalido] = useState<ConviteVista | null>(null);
  const [copiado, setCopiado] = useState(false);

  const a = AVES[ave];
  const sobra = a.maxCaracteres - texto.length;

  async function soltar() {
    if (!texto.trim()) return;
    setSoltando(true);
    setError("");
    try {
      const r = await pedir<{ convite: ConviteVista }>("/api/convite", {
        datos: { ave, texto: texto.trim(), para: para.trim() },
      });
      setSalido(r.convite);
      alSoltado(
        `🍺 Tu ${a.nombre.toLowerCase()} salió y para en una cervecería. Pasale el link para que salga de ahí.`
      );
    } catch (e: any) {
      setError(e?.message || "No se pudo soltar el lorito.");
      setSoltando(false);
    }
  }

  return (
    <div
      onClick={alCerrar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(3, 8, 7, 0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        animation: "aparecer .18s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tarjeta entra scroll"
        style={{
          width: "min(560px, 100%)",
          maxHeight: "92dvh",
          borderRadius: "20px 20px 0 0",
          padding: "18px 18px calc(18px + env(safe-area-inset-bottom))",
          background: "rgba(10, 21, 20, 0.96)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 19, flex: 1 }}>
            {salido ? "Ya está esperando" : "Un lorito a alguien que no está"}
          </h2>
          <button
            onClick={alCerrar}
            aria-label="Cerrar"
            style={{
              background: "var(--panel-alto)",
              border: "1px solid var(--borde)",
              width: 44,
              height: 44,
              display: "grid",
              placeItems: "center",
              borderRadius: 99,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            ✕
          </button>
        </div>

        {salido ? (
          <>
            <div
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                padding: 14,
                borderRadius: 12,
                background: `${AVES[salido.ave].color}14`,
                border: `1px solid ${AVES[salido.ave].color}44`,
                marginBottom: 14,
              }}
            >
              <Ave especie={salido.ave} size={44} aletea />
              <p style={{ fontSize: 14, lineHeight: 1.55 }}>
                {AVES[salido.ave].nombre} en camino a una cervecería a{" "}
                <strong>{formatearDistancia(salido.distanciaKm)}</strong>. Va a
                esperar ahí —y a tomar unos copetines— hasta que{" "}
                {salido.para ? <strong>{salido.para}</strong> : "esa persona"} abra
                el link y arme su nido.
              </p>
            </div>

            <p style={{ color: "var(--suave)", fontSize: 13.5, lineHeight: 1.55, marginBottom: 12 }}>
              Cuanto más tarde en abrirlo, más tomado va a llegar el bicho. Eso
              no lo arregla nadie.
            </p>

            <button
              className="boton"
              style={{ width: "100%" }}
              onClick={async () => {
                if (await compartirConvite(salido)) {
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2200);
                }
              }}
            >
              {copiado ? "✓ Link copiado" : "Pasarle el link"}
            </button>
            <p
              style={{
                fontFamily: "var(--mono)",
                marginTop: 12,
                fontSize: 11.5,
                color: "var(--tenue)",
                wordBreak: "break-all",
                textAlign: "center",
              }}
            >
              {linkDeConvite(salido.id)}
            </p>
          </>
        ) : (
          <>
            <p style={{ color: "var(--suave)", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              El ave despega ahora y para en una cervecería a{" "}
              {MINUTOS_HASTA_LA_PARADA} minutos de vuelo. Sale de ahí cuando la
              otra persona abra el link y arme su nido.
            </p>

            <p className="etiqueta">Para quién (opcional)</p>
            <input
              className="campo"
              value={para}
              onChange={(e) => setPara(e.target.value)}
              placeholder="Su nombre, para que el link la salude"
              maxLength={40}
              style={{ marginBottom: 16 }}
            />

            <p className="etiqueta">Con qué ave</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {AVES_LISTA.map((x) => {
                const activa = x.id === ave;
                return (
                  <button
                    key={x.id}
                    onClick={() => setAve(x.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "10px 11px",
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      background: activa ? `${x.color}22` : "var(--panel)",
                      border: `1px solid ${activa ? x.color : "var(--borde)"}`,
                      boxShadow: activa ? `0 0 0 1px ${x.color}` : "none",
                    }}
                  >
                    <Ave especie={x.id} size={26} aletea={activa} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 700, fontSize: 13.5 }}>
                        {x.nombre}
                      </span>
                      <span style={{ display: "block", color: "var(--suave)", fontSize: 11.5 }}>
                        para a {formatearDistancia(kmHastaLaParada(x.id))} · {x.maxCaracteres} car.
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {a.aviso && (
              <p
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: "var(--suave)",
                  borderLeft: `2px ${a.rareza ? "dashed" : "solid"} ${a.color}`,
                  paddingLeft: 10,
                  marginBottom: 14,
                }}
              >
                {a.aviso}
              </p>
            )}

            <textarea
              className="campo"
              rows={5}
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, a.maxCaracteres))}
              placeholder={`Lo que le va a repetir ${a.articulo} ${a.nombre.toLowerCase()}…`}
              style={{ resize: "none", marginBottom: 6 }}
            />
            <p
              style={{
                fontSize: 11.5,
                color: sobra < 20 ? "#fbbf24" : "var(--tenue)",
                textAlign: "right",
                marginBottom: 12,
              }}
            >
              {sobra} caracteres
            </p>

            {error && (
              <p style={{ color: "#fca5a5", fontSize: 13.5, marginBottom: 12 }}>{error}</p>
            )}

            <button
              className="boton"
              style={{ width: "100%" }}
              disabled={!texto.trim() || soltando}
              onClick={soltar}
            >
              {soltando
                ? "Despegando…"
                : `Soltar ${a.articulo} ${a.nombre.toLowerCase()} y copiar el link`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
