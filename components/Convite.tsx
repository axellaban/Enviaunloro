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
//
// LO QUE SE APRENDIÓ MIRÁNDOLA EN UN TELÉFONO DE VERDAD:
//
//   El botón quedaba abajo del todo, fuera de pantalla. Se escribía el
//   mensaje y no se veía con qué mandarlo. Ahora el botón es pegajoso: está
//   siempre, arriba del borde de abajo, pase lo que pase con el scroll. Es el
//   arreglo que más vale de esta pantalla.
//
//   Cada ave decía "para a 3,0 km · 120 car." en tres renglones. La distancia
//   a la barra es una curiosidad, no un dato para elegir: lo que se decide
//   acá es cuánto podés escribir y qué tan rápido va a llegar cuando abran el
//   link. Los seis cuadros muestran lo primero, en un renglón, y el detalle
//   completo del ave elegida va abajo.
//
//   Y el mensaje —que es de lo que se trata— estaba último. Ahora va arriba
//   del nombre, que es opcional y solo sirve para el saludo del link.

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
  // /l/<lorito> y no /?c=<lorito>: la portada es estática y su miniatura de
  // WhatsApp es la misma para todos los links. Esta ruta existe para que el
  // lorito tenga la suya —la fiesta en la cervecería— y su propio texto.
  // Los links viejos con ?c= siguen abriendo igual (ver Invitacion).
  return typeof window !== "undefined" ? `${window.location.origin}/l/${id}` : "";
}

export async function compartirConvite(c: ConviteVista): Promise<boolean> {
  const url = linkDeConvite(c.id);
  // "Un lorito" y no el nombre de la especie. Decía "te mandé una cotorra" y
  // eso, para alguien que todavía no conoce la app, es una frase sin sentido:
  // la especie recién significa algo del otro lado del link. Lorito es la
  // palabra de la app y se entiende sola.
  //
  // "Te está esperando" y no "está esperando": el ave no está haciendo tiempo,
  // te está esperando A VOS, y esa es toda la razón para abrir el link.
  const texto =
    "Te mandé un lorito 🦜 Te está esperando de jarola en una cervecería del barrio, con el mensaje. Abrí el link y sale para tu nido:";
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
  /** Que salga de la barra convertido. Solo el loro puede, igual que siempre. */
  const [pollera, setPollera] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [soltando, setSoltando] = useState(false);
  /** Cuando existe, el ave ya despegó y la pantalla pasa a ser el link. */
  const [salido, setSalido] = useState<ConviteVista | null>(null);
  const [copiado, setCopiado] = useState(false);

  const a = AVES[ave];
  const sobra = a.maxCaracteres - texto.length;
  const enPollera = pollera && ave === "loro";

  async function soltar() {
    if (!texto.trim()) return;
    setSoltando(true);
    setError("");
    try {
      const r = await pedir<{ convite: ConviteVista }>("/api/convite", {
        datos: { ave, texto: texto.trim(), para: para.trim(), pollera: enPollera },
      });
      setSalido(r.convite);
      // Sale un loro, y eso es lo que dice el aviso aunque vaya a convertirse:
      // lo que despega del nido es un loro. La pollera se cuenta cuando pasa.
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
          // Sin padding abajo: lo pone el pie pegajoso, que necesita llegar
          // hasta el borde para que su degradado tape lo que pasa por atrás.
          padding: "14px 14px 0",
          background: "rgba(10, 21, 20, 0.96)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>🍺</span>
          <h2 style={{ fontSize: 18.5, flex: 1, lineHeight: 1.25 }}>
            {salido ? "Ya está esperando" : "Un lorito a quien no está"}
          </h2>
          <button
            onClick={alCerrar}
            aria-label="Cerrar"
            style={{
              background: "var(--panel-alto)",
              border: "1px solid var(--borde)",
              width: 44,
              height: 44,
              flexShrink: 0,
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
                borderRadius: 12,
                background: `${AVES[salido.ave].color}14`,
                border: `1px solid ${AVES[salido.ave].color}44`,
                marginBottom: 14,
              }}
            >
              <Ave especie={salido.ave} size={44} aletea />
              <p style={{ fontSize: 14, lineHeight: 1.55 }}>
                {AVES[salido.ave].nombre} en camino a una cervecería a{" "}
                <strong>{formatearDistancia(salido.distanciaKm)}</strong>. Espera
                ahí —tomando— hasta que{" "}
                {salido.para ? <strong>{salido.para}</strong> : "esa persona"} abra
                el link y arme su nido.
              </p>
            </div>

            <p style={{ color: "var(--suave)", fontSize: 13.5, lineHeight: 1.55, marginBottom: 12 }}>
              Cuanto más tarde en abrirlo, más tomado va a llegar el bicho. Eso
              no lo arregla nadie.
            </p>

            {salido.pollera && (
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "var(--suave)",
                  borderLeft: "2px solid #f472b6",
                  paddingLeft: 10,
                  marginBottom: 12,
                }}
              >
                <strong style={{ color: "#f9a8d4" }}>Y sale en pollera.</strong>{" "}
                Nadie lo ve venir: el link dice loro, y en la barra hay un loro.
                Se convierte cuando despega para el nido de esa persona.
              </p>
            )}

            <p
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11.5,
                color: "var(--tenue)",
                wordBreak: "break-all",
                background: "rgba(0,0,0,.28)",
                border: "1px solid var(--borde)",
                borderRadius: 10,
                padding: "var(--aire-2) 10px",
                marginBottom: 4,
              }}
            >
              {linkDeConvite(salido.id)}
            </p>

            <Pie>
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
            </Pie>
          </>
        ) : (
          <>
            <p style={{ color: "var(--suave)", fontSize: 13.5, lineHeight: 1.55, marginBottom: 16 }}>
              Despega ahora y espera en una cervecería a{" "}
              {MINUTOS_HASTA_LA_PARADA} minutos de vuelo. Sale de ahí cuando esa
              persona abra el link y arme su nido.
            </p>

            <p className="etiqueta" style={{ marginBottom: 8 }}>
              Con qué ave
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 10,
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
                      gap: 8,
                      // 48 de alto: entra cómodo en el mínimo táctil y deja
                      // seis aves en tres renglones sin comerse la pantalla.
                      minHeight: 48,
                      padding: "7px 9px",
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      background: activa ? `${x.color}22` : "var(--panel)",
                      border: `1px solid ${activa ? x.color : "var(--borde)"}`,
                      boxShadow: activa ? `0 0 0 1px ${x.color}` : "none",
                      transition: "background .15s ease, border-color .15s ease",
                    }}
                  >
                    <Ave especie={x.id} size={24} aletea={activa} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontWeight: 700,
                        fontSize: 13.5,
                        // Un renglón y punto: con el nombre y el dato en la
                        // misma línea, seis cuadros entran donde antes entraban
                        // dos y medio.
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {x.nombre}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: activa ? x.color : "var(--tenue)",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {x.maxCaracteres} car.
                    </span>
                  </button>
                );
              })}
            </div>

            {/* El detalle del ave elegida, en un solo renglón. Los seis cuadros
                de arriba alcanzan para elegir; esto es para confirmar. */}
            <p
              style={{
                fontSize: 12.5,
                lineHeight: 1.5,
                color: "var(--suave)",
                borderLeft: `2px ${a.rareza ? "dashed" : "solid"} ${a.color}`,
                paddingLeft: 10,
                marginBottom: 16,
              }}
            >
              <strong style={{ color: a.color }}>
                {a.velocidadKmh} km/h · hasta {a.maxCaracteres} caracteres
              </strong>
              <br />
              {a.aviso || `Para a ${formatearDistancia(kmHastaLaParada(a.id))} de acá.`}
            </p>

            {/* La gracia del loro, acá con un giro que en un envío común no
                existe: el ave entra a la cervecería siendo un loro y sale
                convertida. Nada de esto se cuenta por el link —ni el ave que
                espera en la barra lo deja ver— así que del otro lado la pollera
                aparece recién cuando despega, que es cuando tiene gracia. */}
            {ave === "loro" && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  margin: "-6px 0 16px",
                  padding: "9px 11px",
                  borderRadius: 10,
                  cursor: "pointer",
                  background: enPollera ? "rgba(244,114,182,.12)" : "var(--panel)",
                  border: `1px ${enPollera ? "solid" : "dashed"} ${
                    enPollera ? "#f472b6" : "var(--borde-alto)"
                  }`,
                }}
              >
                <input
                  type="checkbox"
                  checked={enPollera}
                  onChange={(e) => setPollera(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: "#f472b6", flex: "0 0 auto" }}
                />
                <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                  <strong style={{ color: enPollera ? "#f9a8d4" : "var(--texto)" }}>
                    Sale de la barra en pollera.
                  </strong>{" "}
                  <span style={{ color: "var(--suave)" }}>
                    Entra loro. El link no lo cuenta: se convierte al despegar.
                  </span>
                </span>
              </label>
            )}

            <p className="etiqueta" style={{ marginBottom: 8 }}>
              El mensaje
            </p>
            <textarea
              className="campo"
              rows={4}
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
                marginBottom: 16,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {sobra} caracteres
            </p>

            <p className="etiqueta" style={{ marginBottom: 8 }}>
              Para quién <span style={{ fontWeight: 600, opacity: 0.75 }}>(opcional)</span>
            </p>
            <input
              className="campo"
              value={para}
              onChange={(e) => setPara(e.target.value)}
              placeholder="Su nombre, para el saludo del link"
              maxLength={40}
              style={{ marginBottom: 4 }}
            />

            <Pie>
              {error && (
                <p style={{ color: "#fca5a5", fontSize: 13.5, marginBottom: 10 }}>{error}</p>
              )}
              <button
                className="boton"
                style={{ width: "100%" }}
                disabled={!texto.trim() || soltando}
                onClick={soltar}
              >
                {soltando
                  ? "Despegando…"
                  : `Soltar ${a.articulo} ${a.nombre.toLowerCase()}`}
              </button>
            </Pie>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * El pie pegajoso.
 *
 * El botón de esta pantalla estaba abajo del todo, después de seis aves, un
 * campo de texto y un contador: en un teléfono había que scrollear a ciegas
 * para encontrarlo, y mirando la pantalla de alguien usándola directamente no
 * se veía. Ahora vive pegado al borde de abajo, con un degradado arriba para
 * que se note que hay más contenido pasando por atrás.
 */
function Pie({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        marginTop: 8,
        paddingBottom: "calc(11px + env(safe-area-inset-bottom))",
        paddingTop: 11,
        background:
          "linear-gradient(to bottom, rgba(10,21,20,0) 0%, rgba(10,21,20,.92) 22%, rgba(10,21,20,1) 45%)",
      }}
    >
      {children}
    </div>
  );
}
