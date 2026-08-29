"use client";

// El panel de la derecha (o la hoja de abajo, en el celular): lo que está en el
// aire, lo que llegó, y quién está en tu bandada.
//
// La pestaña "En vuelo" es la que hace que la app se sienta viva: barra que
// avanza, contador que baja y kilómetros que faltan, todos calculados con el
// reloj del servidor. No hace falta que llegue nada del backend para que se
// mueva.

import { useState } from "react";
import { AVES, AVES_LISTA } from "../lib/aves";
import {
  cuentaRegresiva,
  formatearDistancia,
  formatearDuracion,
} from "../lib/geo";
import { avanceVuelo, duracionVuelo } from "../lib/vuelo";
import { pedir, pedirUbicacion, useTic } from "../lib/cliente";
import type { Suerte } from "../lib/datos";
import type { LoroVista, NidoVista } from "../lib/vista";
import { Ave } from "./Ave";
import { Fiesta } from "./Fiesta";
import { esCodigo, LARGO_MAXIMO } from "../lib/codigo";

/**
 * Compartir tu nido. El código va DENTRO del link, no suelto al lado: pedirle a
 * alguien que copie seis caracteres de un mensaje de WhatsApp y después adivine
 * dónde pegarlos era donde se caía la invitación.
 */
export async function compartirNido(codigo: string): Promise<boolean> {
  const url = typeof window !== "undefined" ? `${window.location.origin}/?n=${codigo}` : "";
  const texto = "Mandame un lorito 🦜 Tocá el link y quedamos conectados:";
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

type Props = {
  yo: NidoVista;
  codigo: string;
  amigos: NidoVista[];
  loros: LoroVista[];
  escala: number;
  ahoraServidor: () => number;
  alEnfocar: (id: string) => void;
  alEscribir: (idAmigo?: string) => void;
  alReenviar: (loro: LoroVista) => void;
  /** Prende el modo "tocá el mapa" para mover el nido. Lo maneja la página. */
  alElegirEnMapa: () => void;
  refrescar: () => void;
};

export function Panel(p: Props) {
  const [pestaña, setPestaña] = useState<"vuelo" | "buzon" | "bandada" | "nido">("vuelo");
  const ahora = p.ahoraServidor();
  const enVuelo = p.loros
    .filter((l) => !l.llego && !l.perdido)
    .sort((a, b) => a.llegada - b.llegada);
  // Las aves que ya entregaron y vuelven a casa cuentan igual: están cruzando
  // el mapa y tienen su propia cuenta regresiva.
  const volviendo = p.loros
    .filter((l) => l.vuelta && ahora < l.vuelta.llegada)
    .sort((a, b) => a.vuelta!.llegada - b.vuelta!.llegada);
  // El buzón guarda lo que terminó, haya terminado bien o mal.
  const llegados = p.loros.filter((l) => l.llego || l.perdido);
  const sinLeer = llegados.filter((l) => l.direccion === "recibido" && !l.leido).length;

  useTic(enVuelo.length + volviendo.length > 0);

  // Toda la bandada es el bot: el producto todavía no pasó nada. Es el momento
  // exacto para pedir que traiga a alguien de verdad — sobre todo mientras hay
  // un loro en el aire, que son minutos de espera sin nada que hacer.
  const soloLaVecina = p.amigos.every((a) => a.bot);

  const pestañas = [
    { id: "vuelo" as const, texto: "En vuelo", contador: enVuelo.length + volviendo.length },
    { id: "buzon" as const, texto: "Buzón", contador: sinLeer },
    { id: "bandada" as const, texto: "Bandada", contador: 0 },
    // Tu código, tu ubicación y tu llave vivían en la cabecera, ocupando un
    // tercio del panel en el celular antes de que empezara el contenido. Acá
    // están igual de a mano y no le comen espacio a lo que se lee todo el rato.
    { id: "nido" as const, texto: "Nido", contador: 0 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}>
      <Cabecera yo={p.yo} />

      {/* data-pestanas: la hoja de abajo mide hasta acá para saber cuál es su
          altura mínima — la que deja ver quién sos, las pestañas y el botón. */}
      <div data-pestanas style={{ display: "flex", gap: 6, padding: "0 14px 12px" }}>
        {pestañas.map((t) => {
          const activa = pestaña === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setPestaña(t.id)}
              style={{
                flex: 1,
                padding: "9px 4px",
                borderRadius: 10,
                cursor: "pointer",
                // Con cuatro pestañas en 390 px, "En vuelo" más su contador se
                // partía en dos renglones y descuadraba la fila entera.
                fontSize: 12.5,
                fontWeight: 700,
                whiteSpace: "nowrap",
                background: activa ? "var(--panel-alto)" : "transparent",
                border: `1px solid ${activa ? "var(--borde-alto)" : "transparent"}`,
                color: activa ? "var(--texto)" : "var(--suave)",
              }}
            >
              {t.texto}
              {t.contador > 0 && (
                <span
                  style={{
                    marginLeft: 5,
                    padding: "1px 6px",
                    borderRadius: 99,
                    fontSize: 11,
                    background: "var(--esmeralda)",
                    color: "#04120e",
                  }}
                >
                  {t.contador}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0, padding: "0 14px 90px" }}>
        {pestaña === "vuelo" && (
          <>
            {soloLaVecina && <TraeAAlguien codigo={p.codigo} hayVuelo={enVuelo.length > 0} />}
            {enVuelo.length + volviendo.length === 0 ? (
              <Vacio
                titulo="No hay nada en el aire"
                texto="Cuando sueltes un ave la vas a ver acá, cruzando el mapa en tiempo real."
              />
            ) : (
              <>
                {enVuelo.map((l) => (
                  <TarjetaVuelo
                    key={l.id}
                    loro={l}
                    ahora={ahora}
                    alTocar={() => p.alEnfocar(l.id)}
                  />
                ))}
                {volviendo.map((l) => (
                  <TarjetaVuelta
                    key={`${l.id}@vuelta`}
                    loro={l}
                    ahora={ahora}
                    alTocar={() => p.alEnfocar(l.id)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {pestaña === "buzon" && (
          <>
            {llegados.length === 0 ? (
              <Vacio
                titulo="Buzón vacío"
                texto="Acá aparecen los loros que ya aterrizaron, tuyos y de los demás."
              />
            ) : (
              llegados.map((l) => (
                <TarjetaBuzon
                  key={l.id}
                  loro={l}
                  refrescar={p.refrescar}
                  alReenviar={p.alReenviar}
                />
              ))
            )}
          </>
        )}

        {pestaña === "bandada" && (
          <Bandada
            amigos={p.amigos}
            escala={p.escala}
            alEscribir={p.alEscribir}
            alEnfocar={p.alEnfocar}
            refrescar={p.refrescar}
          />
        )}

        {pestaña === "nido" && (
          <MiNido
            yo={p.yo}
            codigo={p.codigo}
            alElegirEnMapa={p.alElegirEnMapa}
            refrescar={p.refrescar}
          />
        )}
      </div>
    </div>
  );
}

// ---------- cabecera ----------

function Cabecera({ yo }: { yo: NidoVista }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 12px" }}>
      <Ave especie={yo.ave} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 750, fontSize: 15.5 }}>{yo.nombre}</p>
        <p
          style={{
            color: "var(--tenue)",
            fontSize: 12.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {yo.lugar || `${yo.lat.toFixed(3)}, ${yo.lng.toFixed(3)}`}
        </p>
      </div>
    </div>
  );
}

/**
 * “Traé a alguien de verdad.”
 *
 * Es el arreglo del agujero más grande que tenía el producto: la app entretenía
 * bien y no invitaba nunca. Mandás tu primer loro —a un bot— y te quedabas tres
 * minutos mirando una barra de progreso, con el botón de compartir escondido a
 * dos toques en la cuarta pestaña. Esa espera es el mejor momento de invitación
 * que hay: acabás de entender la mecánica y no tenés nada que hacer.
 */
function TraeAAlguien({ codigo, hayVuelo }: { codigo: string; hayVuelo: boolean }) {
  const [listo, setListo] = useState(false);
  return (
    <div
      className="tarjeta"
      style={{
        padding: 16,
        marginBottom: 12,
        borderColor: "var(--esmeralda)",
        background: "rgba(16,185,129,.07)",
      }}
    >
      <p style={{ fontSize: 15, fontWeight: 750, marginBottom: 5 }}>
        {hayVuelo ? "Mientras tanto…" : "Doña Cotorra es de mentira"}
      </p>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--suave)" }}>
        Un loro recién significa algo cuando cruza distancia de verdad. Traé a
        alguien que esté lejos.
      </p>
      <button
        className="boton"
        style={{ width: "100%", marginTop: 12 }}
        onClick={async () => {
          if (await compartirNido(codigo)) {
            setListo(true);
            setTimeout(() => setListo(false), 2200);
          }
        }}
      >
        {listo ? "✓ Link copiado" : "Invitar a alguien"}
      </button>
    </div>
  );
}

// ---------- vuelo ----------

function TarjetaVuelo({
  loro,
  ahora,
  alTocar,
}: {
  loro: LoroVista;
  ahora: number;
  alTocar: () => void;
}) {
  const a = AVES[loro.ave];
  const { avance: t, girando } = avanceVuelo(loro, ahora);
  const falta = Math.max(0, loro.llegada - ahora);
  const enviado = loro.direccion === "enviado";
  const suyo = enviado ? "tu" : "el";

  return (
    <button
      onClick={alTocar}
      className="tarjeta"
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: 14,
        marginBottom: 10,
        cursor: "pointer",
        borderColor: `${a.color}55`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Ave especie={loro.ave} size={30} aletea />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14.5, fontWeight: 700 }}>
            {enviado ? `${a.nombre} → ${loro.otro.nombre}` : `${a.nombre} de ${loro.otro.nombre}`}
          </p>
          <p style={{ color: "var(--tenue)", fontSize: 12 }}>
            {girando ? "Detenido" : enviado ? "En camino" : "Viene hacia vos"} ·{" "}
            {formatearDistancia(loro.distanciaKm * (1 - t))} por delante
          </p>
        </div>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 17,
            fontWeight: 700,
            color: a.color,
          }}
        >
          {cuentaRegresiva(falta)}
        </span>
      </div>

      <div
        style={{
          position: "relative",
          height: 5,
          borderRadius: 99,
          background: "rgba(255,255,255,.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${t * 100}%`,
            background: a.color,
            borderRadius: 99,
            // Sin transición: la posición ya se recalcula sola cada segundo y
            // una animación encima la haría ir a destiempo del mapa.
          }}
        />
      </div>
      <p style={{ color: "var(--tenue)", fontSize: 11.5, marginTop: 7 }}>
        {Math.round(t * 100)}% del camino · {formatearDistancia(loro.distanciaKm)} en total
      </p>

      {/* El romance del perico. Mientras da vueltas se dice fuerte —es lo que
          está pasando ahora mismo en el mapa— y después queda la nota de que
          pasó, para que la demora tenga una explicación y no parezca un bug. */}
      {loro.desvio && (
        <div
          style={{
            marginTop: 10,
            padding: "9px 11px",
            borderRadius: 10,
            background: girando ? "rgba(244,114,182,.12)" : "rgba(255,255,255,.03)",
            border: `1px dashed ${girando ? "rgba(244,114,182,.5)" : "var(--borde)"}`,
          }}
        >
          <p style={{ fontSize: 12.5, fontWeight: 700, color: girando ? "#f9a8d4" : "var(--suave)" }}>
            {girando
              ? `💗 Ups, ${suyo} perico se distrajo en el camino`
              : `Se distrajo ${formatearDuracion(loro.desvio.hasta - loro.desvio.desde)} con una perica`}
          </p>
          <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--tenue)", marginTop: 3 }}>
            {girando
              ? `Se cruzó con una perica y está dando vueltas. Retoma el viaje en ${cuentaRegresiva(
                  Math.max(0, loro.desvio.hasta - ahora)
                )} — y ojo, que ella le está leyendo el mensaje.`
              : "La cuenta regresiva ya lo tiene sumado."}
          </p>
        </div>
      )}
    </button>
  );
}

/**
 * El ave que ya entregó y vuelve a casa.
 *
 * Es la mitad que le faltaba al producto: hasta ahora un loro llegaba y
 * desaparecía. Ahora, si del otro lado lo sueltan, se lo ve volver — y quien lo
 * mandó recibe algo de vuelta sin que el otro haya escrito una palabra.
 */
function TarjetaVuelta({
  loro,
  ahora,
  alTocar,
}: {
  loro: LoroVista;
  ahora: number;
  alTocar: () => void;
}) {
  const a = AVES[loro.ave];
  const v = loro.vuelta!;
  const t = Math.min(1, Math.max(0, (ahora - v.salida) / Math.max(1, v.llegada - v.salida)));
  const mio = loro.direccion === "enviado";

  return (
    <button
      onClick={alTocar}
      className="tarjeta"
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: 14,
        marginBottom: 10,
        cursor: "pointer",
        borderStyle: "dashed",
        borderColor: `${a.color}44`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {/* Espejada: vuelve, no va. */}
        <span style={{ display: "inline-flex", transform: "scaleX(-1)" }}>
          <Ave especie={loro.ave} size={30} aletea />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14.5, fontWeight: 700 }}>
            {mio
              ? `${a.nombre} volviendo a tu nido`
              : `${a.nombre} volviendo con ${loro.otro.nombre}`}
          </p>
          <p style={{ color: "var(--tenue)", fontSize: 12 }}>
            {mio
              ? `${loro.otro.nombre} lo soltó · ya entregó el mensaje`
              : "Lo soltaste · vuelve a su nido"}
          </p>
        </div>
        <span
          style={{ fontFamily: "var(--mono)", fontSize: 17, fontWeight: 700, color: a.color }}
        >
          {cuentaRegresiva(Math.max(0, v.llegada - ahora))}
        </span>
      </div>

      <div
        style={{
          position: "relative",
          height: 5,
          borderRadius: 99,
          background: "rgba(255,255,255,.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${t * 100}%`,
            background: a.color,
            opacity: 0.6,
            borderRadius: 99,
          }}
        />
      </div>
    </button>
  );
}

// ---------- buzón ----------

function TarjetaBuzon({
  loro,
  refrescar,
  alReenviar,
}: {
  loro: LoroVista;
  refrescar: () => void;
  alReenviar: (loro: LoroVista) => void;
}) {
  const [abriendo, setAbriendo] = useState(false);
  const [abierto, setAbierto] = useState(Boolean(loro.leido));
  const [fiesta, setFiesta] = useState<"confeti" | "luto" | null>(null);
  const a = AVES[loro.ave];
  const enviado = loro.direccion === "enviado";
  const sellado = !enviado && !abierto;

  if (loro.perdido) return <TarjetaPerdido loro={loro} alReenviar={alReenviar} />;

  async function abrir() {
    setAbriendo(true);
    try {
      await pedir("/api/loros/leer", { datos: { id: loro.id } });
      setAbierto(true);
      refrescar();
    } catch {
      // Aunque falle el registro de "leído", el texto ya está de este lado:
      // no tiene sentido esconderlo por un error de red.
      setAbierto(true);
    } finally {
      setAbriendo(false);
      // La ceremonia es de quien recibe, y solo la primera vez que abre. Quien
      // lo mandó ya sabe qué escribió: tirarle confeti sería tirárselo a sí
      // mismo.
      if (a.rareza === "confeti") setFiesta("confeti");
      else if (a.rareza === "luto") setFiesta("luto");
    }
  }

  return (
    <div
      className="tarjeta"
      style={{
        padding: 14,
        marginBottom: 10,
        borderColor: sellado ? a.color : "var(--borde)",
        background: sellado ? `${a.color}14` : "var(--panel)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Ave especie={loro.ave} size={26} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700 }}>
            {enviado ? `Para ${loro.otro.nombre}` : `De ${loro.otro.nombre}`}
          </p>
          <p style={{ color: "var(--tenue)", fontSize: 11.5 }}>
            {formatearDistancia(loro.distanciaKm)} ·{" "}
            {formatearDuracion(loro.llegada - loro.salida)} de vuelo · aterrizó{" "}
            {haceCuanto(loro.llegada)}
          </p>
        </div>
      </div>

      {sellado ? (
        <button
          className="boton chico"
          style={{ width: "100%", marginTop: 12, background: a.color }}
          onClick={abrir}
          disabled={abriendo}
        >
          {abriendo ? "Abriendo…" : `Aterrizó ${a.articulo} ${a.nombre.toLowerCase()} — abrir`}
        </button>
      ) : (
        <div className="entra">
          <p
            style={{
              marginTop: 10,
              fontSize: 14.5,
              lineHeight: 1.6,
              color: enviado ? "var(--suave)" : "var(--texto)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {loro.texto}
          </p>

          {/* Que el mensaje llegue cambiado tiene que leerse como el ave y no
              como un error de la app, así que se dice con todas las letras —y
              con el motivo correcto, que no es el mismo para las dos. A quien
              lo mandó se le muestra además cómo llegó: ahí está el chiste. */}
          {loro.olvido && <PorQueLlegoAsi loro={loro} />}

          {/* El ave sigue posada del otro lado. Quien la recibió decide. */}
          {!enviado && !loro.perdido && <QueHagoConElAve loro={loro} refrescar={refrescar} />}
          {loro.suerte && <FinalDelAve loro={loro} />}
        </div>
      )}

      {fiesta && <Fiesta tipo={fiesta} alTerminar={() => setFiesta(null)} />}
    </div>
  );
}

/** Por qué lo que se lee no es lo que se escribió. */
function PorQueLlegoAsi({ loro }: { loro: LoroVista }) {
  const enviado = loro.direccion === "enviado";
  // El desvío del perico y la cháchara de la cotorra dejan el mismo rastro —un
  // texto cambiado— pero son dos historias distintas, y contarlas al revés
  // arruina las dos.
  const perica = Boolean(loro.desvio);
  const color = perica ? "#f472b6" : AVES.cotorra.color;
  const titulo = enviado
    ? perica
      ? "Así llegó, después de que la perica le metiera mano"
      : "Así llegó del otro lado"
    : perica
      ? "Ups, el perico se distrajo en el camino"
      : "La cotorra lo repitió tanto que se le mezcló";
  const nota = perica
    ? "Se cruzó con una perica, se quedó dando vueltas y ella le leyó el mensaje entero antes de dejarlo seguir."
    : "De tanto ir repitiéndolo en voz alta pierde palabras, repite otras y da vuelta alguna.";

  return (
    <div
      style={{
        marginTop: 10,
        padding: "9px 11px",
        borderRadius: 10,
        background: `${color}14`,
        border: `1px dashed ${color}55`,
      }}
    >
      <p style={{ fontSize: 12, color, fontWeight: 700 }}>{titulo}</p>
      {enviado ? (
        <p
          style={{
            marginTop: 6,
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--texto)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {loro.entregado}
        </p>
      ) : (
        <p style={{ marginTop: 4, fontSize: 12, color: "var(--tenue)", lineHeight: 1.5 }}>{nota}</p>
      )}
    </div>
  );
}

/**
 * Los tres finales.
 *
 * Los textos toman el artículo del ave —"la soltaste", "lo soltaste"— porque
 * cuatro de las seis son masculinas y dos femeninas, y una app en castellano
 * que le dice "soltarlo" a una paloma se lee escrita por una máquina. El botón
 * va en infinitivo, que no tiene el problema y además entra más corto.
 */
const FINALES: Record<
  Suerte,
  {
    icono: string;
    boton: string;
    pie: string;
    mio: (lo: string) => string;
    suyo: (quien: string, lo: string) => string;
  }
> = {
  soltado: {
    icono: "🕊",
    boton: "Soltar",
    pie: "Se vuelve volando. Se la ve cruzar el mapa de nuevo.",
    mio: (lo) => `${lo === "la" ? "La" : "Lo"} soltaste. Va camino a su nido.`,
    suyo: (quien, lo) => `${quien} ${lo} soltó: viene de vuelta.`,
  },
  enjaulado: {
    icono: "🔒",
    boton: "Enjaular",
    pie: "Se queda con vos. No vuelve nunca.",
    mio: () => "Quedó en tu jaula. No vuelve.",
    suyo: (quien, lo) =>
      `${quien} se ${lo} quedó. ${lo === "la" ? "Esa" : "Ese"} no vuelve más.`,
  },
  puchero: {
    icono: "🍲",
    boton: "Al puchero",
    pie: "No preguntes.",
    mio: () => "Fue al puchero. Estuvo rico.",
    suyo: () => "No volvió. Mejor no preguntes.",
  },
};

/**
 * Qué hace con el ave quien recibió el mensaje.
 *
 * Es una decisión chica con consecuencia real: la otra persona se entera de lo
 * que elegiste sin que le hayas escrito nada. Por eso no hay confirmación —
 * elegir ya es la respuesta— pero tampoco hay vuelta atrás.
 */
function QueHagoConElAve({ loro, refrescar }: { loro: LoroVista; refrescar: () => void }) {
  const [ocupado, setOcupado] = useState<Suerte | null>(null);
  const [error, setError] = useState("");
  const a = AVES[loro.ave];

  if (loro.suerte) return null;

  async function decidir(suerte: Suerte) {
    setOcupado(suerte);
    setError("");
    try {
      await pedir("/api/loros/suerte", { datos: { id: loro.id, suerte } });
      refrescar();
    } catch (e: any) {
      setError(e?.message || "No se pudo.");
      setOcupado(null);
    }
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--borde)" }}>
      <p style={{ fontSize: 12.5, color: "var(--suave)", lineHeight: 1.5 }}>
        {a.articulo === "la" ? "La" : "El"} {a.nombre.toLowerCase()} sigue posad
        {a.articulo === "la" ? "a" : "o"} en tu ventana. ¿Qué hacés?
      </p>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {(Object.keys(FINALES) as Suerte[]).map((k) => (
          <button
            key={k}
            className="boton fantasma chico"
            style={{ flex: 1, padding: "9px 4px", fontSize: 12.5, whiteSpace: "nowrap" }}
            disabled={ocupado !== null}
            onClick={() => decidir(k)}
            title={FINALES[k].pie}
          >
            {FINALES[k].icono} {ocupado === k ? "…" : FINALES[k].boton}
          </button>
        ))}
      </div>
      {error && <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  );
}

/** Lo que pasó con el ave, contado a cada lado desde donde le tocó estar. */
function FinalDelAve({ loro }: { loro: LoroVista }) {
  const f = FINALES[loro.suerte!];
  const mio = loro.direccion === "recibido";
  const lo = AVES[loro.ave].articulo === "la" ? "la" : "lo";
  return (
    <p
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px solid var(--borde)",
        fontSize: 12.5,
        lineHeight: 1.5,
        color: "var(--suave)",
      }}
    >
      {f.icono} {mio ? f.mio(lo) : f.suyo(loro.otro.nombre, lo)}
    </p>
  );
}

/**
 * El loro que no llegó.
 *
 * Se muestra apagado y con el borde cortado: tiene que leerse distinto de un
 * mensaje entregado incluso de reojo. A quien lo mandó se le devuelve su texto
 * y un botón para volver a intentarlo —perder lo que escribiste sin siquiera
 * poder copiarlo sería ensañamiento—. A quien lo esperaba no se le muestra
 * nada del contenido: ese mensaje no llegó y no va a llegar.
 */
function TarjetaPerdido({
  loro,
  alReenviar,
}: {
  loro: LoroVista;
  alReenviar: (loro: LoroVista) => void;
}) {
  const a = AVES[loro.ave];
  const enviado = loro.direccion === "enviado";

  return (
    <div
      className="tarjeta"
      style={{
        padding: 14,
        marginBottom: 10,
        borderStyle: "dashed",
        borderColor: "rgba(255,255,255,.14)",
        background: "rgba(255,255,255,.02)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ opacity: 0.3, filter: "grayscale(1)", display: "inline-flex" }}>
          <Ave especie={loro.ave} size={26} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--suave)" }}>
            {enviado
              ? `${a.nombre} perdido camino a ${loro.otro.nombre}`
              : `Se perdió un ${a.nombre.toLowerCase()} de ${loro.otro.nombre}`}
          </p>
          <p style={{ color: "var(--tenue)", fontSize: 11.5 }}>
            🍃 No llegó · voló{" "}
            {formatearDistancia(
              loro.distanciaKm *
                Math.min(1, ((loro.extravio ?? 0) - loro.salida) / Math.max(1, loro.llegada - loro.salida))
            )}{" "}
            de {formatearDistancia(loro.distanciaKm)}
          </p>
        </div>
      </div>

      {loro.motivo && (
        <p style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.55, color: "var(--suave)" }}>
          {loro.motivo}
        </p>
      )}

      {enviado ? (
        <>
          <p
            style={{
              marginTop: 10,
              padding: "9px 11px",
              borderRadius: 9,
              background: "rgba(0,0,0,.25)",
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--tenue)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {loro.texto}
          </p>
          <button
            className="boton fantasma chico"
            style={{ width: "100%", marginTop: 10 }}
            onClick={() => alReenviar(loro)}
          >
            Volver a mandarlo
          </button>
        </>
      ) : (
        <p style={{ marginTop: 8, fontSize: 12.5, color: "var(--tenue)", fontStyle: "italic" }}>
          Nunca vas a saber qué decía.
        </p>
      )}
    </div>
  );
}

function haceCuanto(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return "recién";
  return `hace ${formatearDuracion(d)}`;
}

// ---------- bandada ----------

function Bandada({
  amigos,
  escala,
  alEscribir,
  alEnfocar,
  refrescar,
}: {
  amigos: NidoVista[];
  escala: number;
  alEscribir: (id?: string) => void;
  alEnfocar: (id: string) => void;
  refrescar: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function agregar() {
    setOcupado(true);
    setError("");
    setMensaje("");
    try {
      const r = await pedir<{ amigo: NidoVista }>("/api/amigos", {
        datos: { codigo },
      });
      setMensaje(`${r.amigo.nombre} entró a tu bandada.`);
      setCodigo("");
      refrescar();
    } catch (e: any) {
      setError(e?.message || "No se pudo agregar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="tarjeta" style={{ padding: 14, marginBottom: 14 }}>
        <p className="etiqueta">Agregar por código</p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {/* Sin mayúsculas forzadas ni letras separadas: eso se veía bien con
              seis caracteres al azar y se lee pésimo con dos palabras. El
              servidor normaliza igual, así que da lo mismo cómo se tipee. */}
          <input
            className="campo"
            style={{ fontFamily: "var(--mono)" }}
            placeholder="loroparlanchin"
            maxLength={LARGO_MAXIMO}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && esCodigo(codigo)) agregar();
            }}
          />
          <button className="boton" onClick={agregar} disabled={!esCodigo(codigo) || ocupado}>
            Sumar
          </button>
        </div>
        {mensaje && (
          <p style={{ color: "var(--esmeralda-alto)", fontSize: 13, marginTop: 10 }}>{mensaje}</p>
        )}
        {error && <p style={{ color: "#fca5a5", fontSize: 13, marginTop: 10 }}>{error}</p>}
      </div>

      <p
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          color: "var(--tenue)",
          margin: "0 2px 14px",
        }}
      >
        🔒 En el mapa nadie ve tu dirección: de cada nido ajeno se dibuja una
        zona de {formatearDistancia(amigos.find((f) => f.radioKm > 0)?.radioKm ?? 0.3)}, no
        un punto. La distancia y el tiempo de vuelo sí son exactos.
      </p>

      {amigos.map((f) => {
        const km = f.distanciaKm ?? 0;
        return (
          <div key={f.id} className="tarjeta" style={{ padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => alEnfocar(f.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  flex: 1,
                  minWidth: 0,
                  textAlign: "left",
                }}
              >
                <p style={{ fontSize: 15, fontWeight: 700 }}>
                  {f.bot ? "🪺 " : ""}
                  {f.nombre}
                </p>
                <p style={{ color: "var(--tenue)", fontSize: 12.5 }}>
                  {formatearDistancia(km)}
                  {f.lugar ? ` · ${f.lugar}` : ""}
                </p>
                {f.bot && (
                  <p style={{ color: "var(--tenue)", fontSize: 11.5, marginTop: 2 }}>
                    Vecina de práctica: te contesta sola y siempre te devuelve
                    el ave, para probar la app sin esperar a nadie.
                  </p>
                )}
              </button>
              <button className="boton chico" onClick={() => alEscribir(f.id)}>
                Escribirle
              </button>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {AVES_LISTA.map((x) => (
                <span
                  key={x.id}
                  className="pastilla"
                  style={{ color: x.color, borderColor: `${x.color}44` }}
                >
                  {x.nombre} {formatearDuracion(duracionVuelo(km, x.id, escala))}
                  {x.rareza === "romance" ? "+" : ""}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ---------- mi nido ----------

/**
 * Todo lo que es tuyo y no de los demás: tu código, dónde estás, cómo te
 * llamás, y la llave para llevarte el nido a otro dispositivo.
 */
function MiNido({
  yo,
  codigo,
  alElegirEnMapa,
  refrescar,
}: {
  yo: NidoVista;
  codigo: string;
  alElegirEnMapa: () => void;
  refrescar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [nombre, setNombre] = useState(yo.nombre);
  const [enElMundo, setEnElMundo] = useState(yo.publico !== false);
  const [guardando, setGuardando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [nota, setNota] = useState("");
  const [llave, setLlave] = useState("");

  const cambiado = nombre.trim() !== yo.nombre;

  function avisar(texto: string) {
    setNota(texto);
    setTimeout(() => setNota((n) => (n === texto ? "" : n)), 4000);
  }

  async function compartir() {
    if (await compartirNido(codigo)) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  async function usarGps() {
    setUbicando(true);
    const r = await pedirUbicacion();
    if (!r.ok) {
      setUbicando(false);
      avisar(r.motivo);
      return;
    }
    try {
      await pedir("/api/ubicacion", { datos: r.punto });
      refrescar();
      avisar("Nido mudado. Los próximos vuelos salen desde acá.");
    } catch (e: any) {
      avisar(e?.message || "No se pudo mover el nido.");
    } finally {
      setUbicando(false);
    }
  }

  async function guardar() {
    setGuardando(true);
    try {
      await pedir("/api/nido", { datos: { nombre: nombre.trim() } });
      refrescar();
      avisar("Guardado.");
    } catch (e: any) {
      avisar(e?.message || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  /** Aparecer o no en la vista del resto. Se guarda solo, sin botón: es un
   *  interruptor de privacidad, y hacer que además haya que confirmarlo es la
   *  forma más rápida de que alguien crea que se salió y siga adentro. */
  async function cambiarMundo(valor: boolean) {
    setEnElMundo(valor);
    try {
      await pedir("/api/nido", { datos: { nombre: yo.nombre, publico: valor } });
      refrescar();
      avisar(
        valor
          ? "Tus vuelos vuelven a aparecer en «Del resto», sin tu nombre."
          : "Listo: tus vuelos ya no aparecen en «Del resto»."
      );
    } catch (e: any) {
      setEnElMundo(!valor);
      avisar(e?.message || "No se pudo guardar.");
    }
  }

  async function pedirLlave() {
    try {
      const r = await pedir<{ llave: string }>("/api/sesion");
      const url = `${window.location.origin}/entrar?llave=${encodeURIComponent(r.llave)}`;
      setLlave(url);
      await navigator.clipboard.writeText(url).catch(() => {});
    } catch {
      setLlave("no-se-pudo");
    }
  }

  return (
    <>
      {/* --- código e invitación --- */}
      <div className="tarjeta" style={{ padding: 14, marginBottom: 12 }}>
        <p className="etiqueta">Tu código de nido</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 12px" }}>
          <span
            style={{
              flex: 1,
              fontFamily: "var(--mono)",
              // Los códigos de antes son seis caracteres y aguantan letras
              // separadas y grandes; los de ahora son dos palabras de hasta
              // veinte. El tamaño sale del largo para que ninguno se corte.
              fontSize: codigo.length > 14 ? 16 : codigo.length > 8 ? 18 : 20,
              fontWeight: 700,
              letterSpacing: codigo.length > 8 ? "0.02em" : "0.18em",
              color: "var(--esmeralda-alto)",
              wordBreak: "break-all",
              lineHeight: 1.25,
            }}
          >
            {codigo}
          </span>
        </div>
        <button className="boton chico" style={{ width: "100%" }} onClick={compartir}>
          {copiado ? "✓ Link copiado" : "Compartir mi nido"}
        </button>
        <p style={{ fontSize: 12, color: "var(--tenue)", marginTop: 9, lineHeight: 1.5 }}>
          El link lleva tu código adentro: quien lo abre queda conectado sin
          copiar nada.
        </p>
      </div>

      {/* --- ubicación --- */}
      <div className="tarjeta" style={{ padding: 14, marginBottom: 12 }}>
        <p className="etiqueta">Dónde está tu nido</p>
        <p style={{ fontSize: 14, margin: "9px 0 4px" }}>
          {yo.lugar || "Sin nombre de lugar"}
        </p>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--tenue)" }}>
          {yo.lat.toFixed(4)}, {yo.lng.toFixed(4)}
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            className="boton fantasma chico"
            style={{ flex: 1 }}
            onClick={usarGps}
            disabled={ubicando}
          >
            {ubicando ? "Buscando…" : "📍 Usar mi GPS"}
          </button>
          <button className="boton fantasma chico" style={{ flex: 1 }} onClick={alElegirEnMapa}>
            Elegir en el mapa
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--tenue)", marginTop: 9, lineHeight: 1.5 }}>
          Desde acá despegan tus loros. Moverlo cambia cuánto tardan, no los que
          ya están en el aire.
        </p>
      </div>

      {/* --- aparecer en la vista del resto --- */}
      <div className="tarjeta" style={{ padding: 14, marginBottom: 12 }}>
        <label
          style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={enElMundo}
            onChange={(e) => cambiarMundo(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--esmeralda)" }}
          />
          <span>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>
              Aparecer en «Del resto»
            </span>
            <span
              style={{
                display: "block",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--tenue)",
                marginTop: 4,
              }}
            >
              Tus vuelos se ven en el mapa del mundo <strong>sin tu nombre</strong>, sin
              el mensaje y con las puntas corridas 25 km — a escala de ciudad, no
              de casa. Si lo apagás, no aparece ninguno.
            </span>
          </span>
        </label>
      </div>

      {/* --- nombre ---
          El ave se elige al mandar, no acá: tener además un ave "por defecto"
          en el perfil no cambiaba nada y hacía parecer que uno era dueño de una
          sola especie. */}
      <div className="tarjeta" style={{ padding: 14, marginBottom: 12 }}>
        <p className="etiqueta">Cómo te anuncia el ave</p>
        <input
          className="campo"
          style={{ marginTop: 10 }}
          maxLength={24}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <button
          className="boton chico"
          style={{ width: "100%", marginTop: 12 }}
          disabled={!cambiado || !nombre.trim() || guardando}
          onClick={guardar}
        >
          {guardando ? "Guardando…" : cambiado ? "Guardar cambios" : "Sin cambios"}
        </button>
      </div>

      {/* --- llave --- */}
      <div className="tarjeta" style={{ padding: 14, marginBottom: 12 }}>
        <p className="etiqueta">Otro dispositivo</p>
        <button
          className="boton fantasma chico"
          style={{ width: "100%", marginTop: 10 }}
          onClick={pedirLlave}
        >
          {llave && llave !== "no-se-pudo" ? "✓ Llave copiada" : "Copiar la llave de mi nido"}
        </button>
        {llave === "no-se-pudo" ? (
          <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 8 }}>
            No se pudo generar la llave. Probá de nuevo.
          </p>
        ) : (
          <p style={{ fontSize: 12, color: "var(--tenue)", marginTop: 9, lineHeight: 1.5 }}>
            Abrí ese link en la compu y tu nido aparece ahí.{" "}
            <strong style={{ color: "#fbbf24" }}>No se lo pases a nadie: ese link ES tu nido</strong>
            , no es tu código.
          </p>
        )}
        {llave && llave !== "no-se-pudo" && (
          <p
            style={{
              marginTop: 8,
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              color: "var(--tenue)",
              wordBreak: "break-all",
            }}
          >
            {llave}
          </p>
        )}
      </div>

      {/* --- las reglas ---
          Dos, no seis. La app explica cada regla en el momento exacto en que
          ocurre —el tiempo al elegir el ave, el olvido al abrir el mensaje, la
          zona al mirar el mapa— que es la razón por la que se entiende sin
          manual. Ciento cincuenta palabras acá arriba competían con eso, en una
          pestaña que se abre para copiar un código. */}
      <details className="tarjeta" style={{ padding: 14, marginBottom: 12 }}>
        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
          Cómo funciona
        </summary>
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {[
            [
              "El mensaje vuela de verdad",
              "Hasta que el ave no cruza los kilómetros que hay entre los dos, tu mensaje no existe del otro lado. Un guacamayo a Madrid tarda dos semanas. Sí, en serio.",
            ],
            [
              "Nadie ve dónde vivís",
              "De cada nido ajeno se dibuja una zona de 300 metros, nunca un punto. Los kilómetros y los tiempos sí son exactos.",
            ],
          ].map(([titulo, texto]) => (
            <div key={titulo}>
              <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>{titulo}</p>
              <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--suave)" }}>{texto}</p>
            </div>
          ))}
        </div>
      </details>

      {nota && (
        <p style={{ fontSize: 13, color: "var(--esmeralda-alto)", padding: "0 2px 8px" }}>{nota}</p>
      )}
    </>
  );
}

// ---------- vacíos ----------

function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div style={{ textAlign: "center", padding: "38px 16px", color: "var(--suave)" }}>
      <div style={{ opacity: 0.35, display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <Ave especie="loro" size={46} />
      </div>
      <p style={{ fontWeight: 700, color: "var(--texto)", marginBottom: 6 }}>{titulo}</p>
      <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{texto}</p>
    </div>
  );
}
