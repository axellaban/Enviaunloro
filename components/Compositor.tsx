"use client";

// Escribir y soltar el ave.
//
// La pantalla clave del producto. Lo importante no es el campo de texto: es que
// cada ave muestre, ANTES de mandar, cuánto va a tardar hasta esa persona en
// particular. Ahí es donde elegir ave deja de ser cosmética —"mando el perico
// porque llega en 2 minutos" o "mando el guacamayo justamente porque tarda un
// día"— y el mensaje empieza a decir algo por sí solo.

import { useState } from "react";
import { AVES, AVES_LISTA, type AveId } from "../lib/aves";
import { formatearDistancia, formatearDuracion } from "../lib/geo";
import { duracionVuelo } from "../lib/vuelo";
import { pedir } from "../lib/cliente";
import type { NidoVista } from "../lib/vista";
import { Ave } from "./Ave";

export function Compositor({
  yo,
  amigos,
  escala,
  destinoInicial,
  textoInicial,
  aveInicial,
  alCerrar,
  alEnviado,
}: {
  yo: NidoVista;
  amigos: NidoVista[];
  escala: number;
  destinoInicial?: string | null;
  /** Precargados al volver a mandar un loro que se perdió. */
  textoInicial?: string;
  aveInicial?: AveId;
  alCerrar: () => void;
  alEnviado: (mensaje: string) => void;
}) {
  const [paraId, setParaId] = useState<string>(
    destinoInicial || amigos[0]?.id || ""
  );
  const [ave, setAve] = useState<AveId>(aveInicial ?? yo.ave);
  /** La gracia del loro: sale convertido en pollera. Solo él puede. */
  const [pollera, setPollera] = useState(false);
  const [texto, setTexto] = useState(textoInicial ?? "");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const para = amigos.find((a) => a.id === paraId) || null;
  // La distancia la manda el servidor: las coordenadas que llegan del otro
  // están corridas a propósito y no sirven para medir (lib/privacidad.ts).
  const km = para?.distanciaKm ?? 0;

  const a = AVES[ave];
  // El interruptor queda prendido aunque después se cambie de ave: se apaga
  // solo acá, al leerlo. Así, ir a mirar otra ave y volver al loro no pierde
  // lo que ya se había elegido.
  const enPollera = pollera && ave === "loro";
  const sobra = a.maxCaracteres - texto.length;
  const duracion = duracionVuelo(km, ave, escala);

  async function soltar() {
    if (!para || !texto.trim()) return;
    setEnviando(true);
    setError("");
    try {
      await pedir("/api/loros", {
        datos: { para: para.id, ave, texto: texto.trim(), pollera: enPollera },
      });
      alEnviado(
        enPollera
          ? `Tu pollera salió hacia ${para.nombre}. Aterriza en ${formatearDuracion(duracion)}.`
          : `Tu ${a.nombre.toLowerCase()} ${a.articulo === "la" ? "salió" : "despegó"} hacia ${
              para.nombre
            }. Aterriza en ${formatearDuracion(duracion)}${
              a.rareza === "romance" ? ", si no se distrae en el camino." : "."
            }`
      );
    } catch (e: any) {
      setError(e?.message || "No se pudo soltar el ave.");
      setEnviando(false);
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
          padding: "14px 14px calc(14px + env(safe-area-inset-bottom))",
          background: "rgba(10, 21, 20, 0.96)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 19, flex: 1 }}>Soltar un loro</h2>
          <button
            onClick={alCerrar}
            aria-label="Cerrar"
            style={{
              background: "var(--panel-alto)",
              border: "1px solid var(--borde)",
              // 44 y no 32: es el único modo de salir del compositor sin
              // mandar, y errarle significa mandar algo sin querer o quedarse
              // encerrado tocando la pantalla.
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

        {/* No hay rama de "bandada vacía": Doña Cotorra se crea junto con el
            nido y queda de amiga, así que nunca hay cero. La había, con su
            texto, y era una pantalla que ningún usuario podía ver. */}
        <>
            <p className="etiqueta">Para</p>
            <div
              className="scroll"
              style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 0 12px" }}
            >
              {amigos.map((f) => {
                const activo = f.id === paraId;
                return (
                  <button
                    key={f.id}
                    onClick={() => setParaId(f.id)}
                    style={{
                      flexShrink: 0,
                      minHeight: 44,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 12px",
                      borderRadius: 999,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 650,
                      background: activo ? "var(--esmeralda)" : "var(--panel)",
                      color: activo ? "#04120e" : "var(--texto)",
                      border: `1px solid ${activo ? "var(--esmeralda)" : "var(--borde)"}`,
                    }}
                  >
                    {f.bot ? "🪺 " : ""}
                    {f.nombre}
                  </button>
                );
              })}
            </div>

            {para && (
              <p style={{ color: "var(--suave)", fontSize: 13.5, marginBottom: 14 }}>
                {para.nombre} está a{" "}
                <strong style={{ color: "var(--texto)" }}>{formatearDistancia(km)}</strong>
                {para.lugar ? ` · ${para.lugar}` : ""}
              </p>
            )}

            <p className="etiqueta">Con qué ave</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
                margin: "8px 0 16px",
              }}
            >
              {AVES_LISTA.map((x) => {
                const activa = x.id === ave;
                // El "+" no es decoración: el perico a veces se enamora en el
                // camino y llega bastante más tarde. Prometer el número pelado
                // sería mentir, y esconder el número sería peor.
                const eta =
                  formatearDuracion(duracionVuelo(km, x.id, escala)) +
                  (x.rareza === "romance" ? "+" : "");
                return (
                  <button
                    key={x.id}
                    onClick={() => setAve(x.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 2,
                      padding: "var(--aire-2) 10px",
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      background: activa ? `${x.color}22` : "var(--panel)",
                      border: `1px solid ${activa ? x.color : "var(--borde)"}`,
                      transition: "all .14s ease",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Ave especie={x.id} size={24} aletea={activa} />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{x.nombre}</span>
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: x.color }}>{eta}</span>
                    {/* --suave y no --tenue: adentro del compositor el panel
                        es más claro y el tenue caía a 4,07:1, abajo del 4,5
                        que pide texto chico. Y esto es con lo que se elige
                        qué ave mandar. */}
                    <span style={{ fontSize: 11.5, color: "var(--suave)" }}>
                      {x.velocidadKmh} km/h · {x.maxCaracteres} car.
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Cuatro de las seis aves hacen algo raro con el mensaje o con la
                pantalla del otro lado. Avisarlo DESPUÉS de mandar sería una
                trampa: va acá, pegado a la elección, y sale de la misma tabla
                que las velocidades.

                Las otras dos también dicen su línea, pero dibujada distinto: el
                punteado avisa "ojo, este hace algo", y si las seis se vieran
                igual dejaría de avisar nada. Con rareza, punteado; sin rareza,
                una línea al costado y listo. */}
            {a.aviso && (
              <p
                style={{
                  margin: "-6px 0 14px",
                  padding: a.rareza ? "8px 10px" : "2px 0 2px 10px",
                  borderRadius: a.rareza ? 10 : 0,
                  background: a.rareza ? `${a.color}14` : "none",
                  border: a.rareza ? `1px dashed ${a.color}55` : "none",
                  borderLeft: a.rareza ? `1px dashed ${a.color}55` : `2px solid ${a.color}55`,
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: "var(--suave)",
                }}
              >
                {a.aviso}
              </p>
            )}

            {/* La gracia del loro. Va acá, pegada a su aviso —que es el que la
                anuncia— y solo con el loro elegido: en las otras cinco no
                existe, y un interruptor apagado que nunca se puede prender es
                peor que no tenerlo. */}
            {ave === "loro" && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  margin: "-6px 0 14px",
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
                    Me convierto en pollera.
                  </strong>{" "}
                  <span style={{ color: "var(--suave)" }}>
                    Para mandarle a tu amigo más pollera.
                  </span>
                </span>
              </label>
            )}

            <textarea
              className="campo"
              rows={4}
              maxLength={a.maxCaracteres}
              placeholder={`Lo que le va a repetir ${a.articulo} ${a.nombre.toLowerCase()}…`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "8px 2px 16px",
                fontSize: 12.5,
              }}
            >
              {/* El contador aparece cuando falta poco, no siempre. Con el
                  campo vacío decía "1000 caracteres para el loro", que es un
                  renglón para informar que todavía no pasa nada — y el límite
                  ya está escrito en la tarjeta del ave, arriba. */}
              {sobra <= a.maxCaracteres * 0.2 && (
                <span style={{ color: sobra < 20 ? a.color : "var(--tenue)", flex: 1 }}>
                  {sobra} caracteres
                </span>
              )}
            </div>

            {/* "2 de cada 1000 loros se pierden en el camino y no llegan
                nunca": trece palabras, en cada envío, para siempre. Dice lo
                mismo en cinco. Se queda porque avisar que un mensaje puede no
                llegar antes de mandarlo es lo honesto; se acorta porque después
                del tercer loro ya nadie la lee entera. */}
            <p
              style={{
                fontSize: 11.5,
                lineHeight: 1.55,
                color: "var(--tenue)",
                margin: "-6px 0 14px",
              }}
            >
              2 de cada 1000 se pierden en el camino.
            </p>

            {error && (
              <p style={{ color: "#fca5a5", fontSize: 13.5, marginBottom: 12 }}>{error}</p>
            )}

            {/* El verde de acción de la app, y no el color del ave. Lo pintaba
                del color del ave, que suena lindo y en la práctica hacía que el
                botón más importante de la pantalla apareciera de un verde que
                ya no existe en ningún otro lado —el del loro, #10b981, que es
                el viejo verde de los CTA— o de un violeta con el cuervo. El
                ave ya se ve: está elegida arriba, dibujada al lado y va a
                pintar su propia línea en el mapa. El botón es la acción, y la
                acción tiene un solo color en toda la app. */}
            <button
              className="boton"
              style={{ width: "100%" }}
              disabled={!texto.trim() || !para || enviando}
              onClick={soltar}
            >
              {enviando
                ? "Despegando…"
                : enPollera
                  ? `Soltar la pollera · llega en ${formatearDuracion(duracion)}`
                  : `Soltar ${a.articulo} ${a.nombre.toLowerCase()} · llega en ${formatearDuracion(
                      duracion
                    )}${a.rareza === "romance" ? "+" : ""}`}
            </button>
        </>
      </div>
    </div>
  );
}
