"use client";

// Los tres pasos para tener nido: cómo te llamás, dónde estás, con qué ave
// mandás. El orden no es casual — la ubicación se pide en el paso 2, cuando la
// persona ya entendió para qué la queremos. Pedirla al entrar, sin contexto, es
// la forma más rápida de que le den "bloquear".

import { useState } from "react";
import dynamic from "next/dynamic";
import { AVES_LISTA, type AveId } from "../lib/aves";
import type { Punto } from "../lib/geo";
import { pedir, pedirUbicacion } from "../lib/cliente";
import type { NidoVista } from "../lib/vista";
import { Ave } from "./Ave";

const Mapa = dynamic(() => import("./Mapa"), { ssr: false });

export function Onboarding({
  alTerminar,
}: {
  alTerminar: (yo: NidoVista, codigo: string) => void;
}) {
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState("");
  const [punto, setPunto] = useState<Punto | null>(null);
  const [ave, setAve] = useState<AveId>("loro");
  const [aMano, setAMano] = useState(false);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  /** La otra puerta: entrar a un nido que ya existe, con su llave. */
  const [conLlave, setConLlave] = useState(false);
  const [llave, setLlave] = useState("");

  /**
   * Canjear la llave pegada.
   *
   * Se acepta el link entero o solo el token: nadie va a recortar una URL a
   * mano, y menos alguien que acaba de perder su nido y está nervioso.
   *
   * Y se navega a /entrar en vez de pedir por fetch a propósito. Esa ruta
   * responde un 303 con la cookie puesta, así que el nido aparece dibujado de
   * una; resolviéndolo con JavaScript se vería primero este onboarding y
   * después el mapa, que es exactamente el susto que la llave viene a evitar.
   */
  function entrarConLlave() {
    const crudo = llave.trim();
    if (!crudo) return;
    let token = crudo;
    // Si pegaron un link, se le saca el parámetro. Si pegaron cualquier otra
    // cosa, se manda tal cual y el servidor decide: una llave que no existe
    // devuelve al mapa sin decir por qué, que es lo correcto.
    try {
      const u = new URL(crudo);
      token = u.searchParams.get("llave") || crudo;
    } catch {
      // No era una URL. Se usa lo pegado.
    }
    setOcupado(true);
    window.location.href = `/entrar?llave=${encodeURIComponent(token)}`;
  }

  async function ubicar() {
    setOcupado(true);
    setError("");
    const r = await pedirUbicacion();
    setOcupado(false);
    if (r.ok) {
      setPunto(r.punto);
      setPaso(3);
    } else {
      setError(r.motivo);
      setAMano(true);
    }
  }

  async function crear() {
    if (!punto) return;
    setOcupado(true);
    setError("");
    try {
      const r = await pedir<{ yo: NidoVista; codigo: string }>("/api/nido", {
        datos: { nombre: nombre.trim(), ave, lat: punto.lat, lng: punto.lng },
      });
      // El nido ya vino en la respuesta: se lo pasamos entero al padre en vez
      // de salir a buscarlo de nuevo.
      alTerminar(r.yo, r.codigo || "");
    } catch (e: any) {
      setError(e?.message || "No se pudo crear el nido.");
    } finally {
      // Siempre, no solo cuando falla. Estaba solo en el catch, así que en el
      // camino de éxito el botón se quedaba en "Armando el nido…" para siempre
      // si por lo que fuera la app no llegaba a cambiar de pantalla.
      setOcupado(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "18px 14px 32px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <Ave especie={ave} size={62} aletea />
          </div>
          <h1 style={{ fontSize: 27, fontWeight: 800 }}>Armá tu nido</h1>
          <p style={{ color: "var(--suave)", marginTop: 8, fontSize: 15 }}>
            Tres pasos y tenés tu primera ave lista para despegar.
          </p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 18 }}>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                style={{
                  width: paso === n ? 26 : 8,
                  height: 8,
                  borderRadius: 99,
                  background: paso >= n ? "var(--esmeralda)" : "var(--borde-alto)",
                  transition: "all .25s ease",
                }}
              />
            ))}
          </div>
        </div>

        <div className="tarjeta entra" key={paso} style={{ padding: "var(--aire-4)" }}>
          {paso === 1 && (
            <>
              <p className="etiqueta">Paso 1 de 3</p>
              <h2 style={{ fontSize: 21, margin: "10px 0 6px" }}>¿Cómo te anuncia el ave?</h2>
              <p style={{ color: "var(--suave)", fontSize: 14.5, marginBottom: 16 }}>
                Es el nombre que ve quien recibe tus loros.
              </p>
              <input
                className="campo"
                autoFocus
                maxLength={24}
                placeholder="Tu nombre o apodo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nombre.trim()) setPaso(2);
                }}
              />
              <button
                className="boton"
                style={{ width: "100%", marginTop: 16 }}
                disabled={!nombre.trim()}
                onClick={() => setPaso(2)}
              >
                Seguir
              </button>

              {/* LA PUERTA QUE FALTABA, y faltaba justo donde más duele.
                  
                  La llave existe desde el día uno, pero SOLO funcionaba como
                  link: `/entrar?llave=…`, pegado en una barra de direcciones.
                  Y adentro de una app agregada a la pantalla de inicio NO HAY
                  barra de direcciones. O sea que la app le decía a la gente
                  "agregame a tu pantalla para que te avise", el iPhone le daba
                  a esa app un almacenamiento nuevo y vacío —no comparte cookies
                  con Safari—, y del otro lado aparecía este onboarding sin
                  ninguna forma de volver al nido de siempre.
                  
                  Acá se pega la llave y listo. Acepta el link entero o solo el
                  token, porque nadie va a recortar una URL a mano. */}
              {!conLlave ? (
                <button
                  className="boton fantasma chico"
                  style={{ width: "100%", marginTop: 10 }}
                  onClick={() => setConLlave(true)}
                >
                  Ya tengo un nido
                </button>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <p style={{ color: "var(--suave)", fontSize: 13.5, lineHeight: 1.6 }}>
                    Pegá la llave de tu nido. La copiás desde la otra app o el
                    otro navegador, en <strong>Nido → Copiar la llave</strong>.
                  </p>
                  <input
                    className="campo"
                    autoFocus
                    style={{ marginTop: 10 }}
                    placeholder="Pegá acá el link de tu llave"
                    value={llave}
                    onChange={(e) => setLlave(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") entrarConLlave();
                    }}
                  />
                  <button
                    className="boton"
                    style={{ width: "100%", marginTop: 10 }}
                    disabled={!llave.trim()}
                    onClick={entrarConLlave}
                  >
                    Entrar a mi nido
                  </button>
                  <button
                    className="boton fantasma chico"
                    style={{ width: "100%", marginTop: 8 }}
                    onClick={() => {
                      setConLlave(false);
                      setLlave("");
                    }}
                  >
                    Mejor armo uno nuevo
                  </button>
                </div>
              )}
            </>
          )}

          {paso === 2 && (
            <>
              <p className="etiqueta">Paso 2 de 3</p>
              <h2 style={{ fontSize: 21, margin: "10px 0 6px" }}>¿Desde dónde despega?</h2>
              <p style={{ color: "var(--suave)", fontSize: 14.5, marginBottom: 14 }}>
                Tu ave sale de donde estás y tarda lo que tarda hasta el otro. Sin
                ubicación no hay vuelo, solo chat.
              </p>
              {/* Una línea, no un bloque. Eran tres párrafos antes del botón, en
                  el paso donde más gente se cae: la promesa entra en un renglón
                  y el resto está en la pestaña Nido para quien quiera leerlo. */}
              <p style={{ fontSize: 13, color: "var(--suave)", marginBottom: 16 }}>
                🔒 Nadie ve dónde vivís: los demás ven una zona de 300 metros, nunca
                tu calle.
              </p>

              {!aMano ? (
                <>
                  <button
                    className="boton"
                    style={{ width: "100%" }}
                    onClick={ubicar}
                    disabled={ocupado}
                  >
                    {ocupado ? "Buscando…" : "📍 Usar mi ubicación"}
                  </button>
                  <button
                    className="boton fantasma chico"
                    style={{ width: "100%", marginTop: 10 }}
                    onClick={() => setAMano(true)}
                  >
                    Prefiero marcarlo a mano
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: "var(--suave)", marginBottom: 10 }}>
                    Tocá el mapa donde queda tu nido.
                  </p>
                  <div
                    style={{
                      position: "relative",
                      height: 260,
                      borderRadius: 12,
                      overflow: "hidden",
                      border: "1px solid var(--borde)",
                    }}
                  >
                    <Mapa
                      yo={
                        punto
                          ? {
                              id: "yo",
                              nombre: nombre || "Tu nido",
                              lugar: "",
                              lat: punto.lat,
                              lng: punto.lng,
                              bot: false,
                              ave,
                              radioKm: 0,
                            }
                          : null
                      }
                      amigos={[]}
                      vuelos={[]}
                      ahoraServidor={Date.now}
                      modoElegir
                      alElegirPunto={setPunto}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button className="boton fantasma" onClick={ubicar} disabled={ocupado}>
                      Reintentar GPS
                    </button>
                    <button
                      className="boton"
                      style={{ flex: 1 }}
                      disabled={!punto}
                      onClick={() => setPaso(3)}
                    >
                      {punto ? "Este es mi nido" : "Marcá un punto"}
                    </button>
                  </div>
                </>
              )}
              {error && (
                <p style={{ color: "#fca5a5", fontSize: 13.5, marginTop: 12, lineHeight: 1.5 }}>
                  {error}
                </p>
              )}
            </>
          )}

          {paso === 3 && (
            <>
              <p className="etiqueta">Paso 3 de 3</p>
              <h2 style={{ fontSize: 21, margin: "10px 0 6px" }}>Elegí tu ave</h2>
              <p style={{ color: "var(--suave)", fontSize: 14.5, marginBottom: 16 }}>
                Es con la que te vas a presentar, y cuanto más rápido vuela menos
                le entra en la cabeza. Podés cambiar de ave en cada mensaje: esta
                es la que va a salir por defecto.
              </p>

              <div style={{ display: "grid", gap: 10 }}>
                {AVES_LISTA.map((a) => {
                  const elegida = ave === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setAve(a.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "10px 12px",
                        borderRadius: 12,
                        cursor: "pointer",
                        textAlign: "left",
                        background: elegida ? `${a.color}2b` : "var(--panel)",
                        border: `1px solid ${elegida ? a.color : "var(--borde)"}`,
                        // Anillo además del borde: con un 1px de color sobre
                        // fondo casi negro no se distingue cuál está elegida.
                        boxShadow: elegida ? `0 0 0 1px ${a.color}, 0 0 22px -8px ${a.color}` : "none",
                        transition: "all .15s ease",
                      }}
                    >
                      <Ave especie={a.id} size={40} aletea={elegida} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 700, fontSize: 15.5 }}>
                          {a.nombre}
                        </span>
                        <span style={{ display: "block", color: "var(--suave)", fontSize: 13 }}>
                          {a.velocidadKmh} km/h · hasta {a.maxCaracteres} caracteres
                        </span>
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: a.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.lema}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                className="boton"
                style={{ width: "100%", marginTop: 18 }}
                onClick={crear}
                disabled={ocupado}
              >
                {ocupado ? "Armando el nido…" : "Entrar al mapa"}
              </button>
              {error && (
                <p style={{ color: "#fca5a5", fontSize: 13.5, marginTop: 12 }}>{error}</p>
              )}
              <p style={{ color: "var(--tenue)", fontSize: 12.5, marginTop: 14, lineHeight: 1.6 }}>
                Sin registro ni contraseña: tu nido queda guardado en este
                navegador. Después podés llevártelo a otro dispositivo con la
                llave que está en el panel.
              </p>
            </>
          )}
        </div>

        {paso > 1 && (
          <button
            className="boton fantasma chico"
            style={{ marginTop: 14 }}
            onClick={() => {
              setError("");
              setPaso(paso - 1);
            }}
          >
            ← Volver
          </button>
        )}
      </div>
    </div>
  );
}
