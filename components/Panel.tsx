"use client";

// El panel de la derecha (o la hoja de abajo, en el celular): lo que está en el
// aire, lo que llegó, y quién está en tu bandada.
//
// La pestaña "En vuelo" es la que hace que la app se sienta viva: barra que
// avanza, contador que baja y kilómetros que faltan, todos calculados con el
// reloj del servidor. No hace falta que llegue nada del backend para que se
// mueva.

import { useRef, useState } from "react";
import { AVES, AVES_LISTA } from "../lib/aves";
import {
  cuentaRegresiva,
  formatearDistancia,
  formatearDuracion,
} from "../lib/geo";
import { avanceVuelo, duracionVuelo } from "../lib/vuelo";
import { pedir, pedirUbicacion, useTic } from "../lib/cliente";
import type { Suerte } from "../lib/datos";
import type { ConviteVista, LoroVista, NidoVista } from "../lib/vista";
import { borrachera, ciudadDe, loQueEstaHaciendo } from "../lib/cerveceria";
import { compartirConvite } from "./Convite";
import { GuardarNido } from "./GuardarNido";
import { Avisos } from "./Avisos";
import { Instalar } from "./Instalar";
import { Ave, Pollera } from "./Ave";
import { Fiesta, type Motivo } from "./Fiesta";
import { esCodigo, LARGO_MAXIMO } from "../lib/codigo";
import { coloresDeBandada } from "../lib/colorNido";

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
      await navigator.share({ title: "Enviaunlorito", text: texto, url });
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
  /** Los loritos que esperan en la cervecería a que alguien abra su link. */
  convites: ConviteVista[];
  escala: number;
  ahoraServidor: () => number;
  alEnfocar: (id: string) => void;
  alEscribir: (idAmigo?: string) => void;
  alReenviar: (loro: LoroVista) => void;
  /** Prende el modo "tocá el mapa" para mover el nido. Lo maneja la página. */
  alElegirEnMapa: () => void;
  /** Abrir la pantalla de mandarle un lorito a alguien que no está en la app. */
  alConvidar: () => void;
  refrescar: () => void;
};

export function Panel(p: Props) {
  const [pestaña, setPestaña] = useState<"vuelo" | "buzon" | "bandada" | "nido">("vuelo");
  const ahora = p.ahoraServidor();
  // Un ave abducida no vuela más y no va a llegar nunca: sin sacarla de acá se
  // quedaba "en camino" para siempre, con su cuenta regresiva corriendo hacia
  // una llegada que ya no existe. Es el mismo caso que el extravío.
  const enVuelo = p.loros
    .filter((l) => !l.llego && !l.perdido && !l.abducido)
    .sort((a, b) => a.llegada - b.llegada);
  // Las aves que ya entregaron y vuelven a casa cuentan igual: están cruzando
  // el mapa y tienen su propia cuenta regresiva.
  const volviendo = p.loros
    .filter((l) => l.vuelta && ahora < l.vuelta.llegada)
    .sort((a, b) => a.vuelta!.llegada - b.vuelta!.llegada);
  // El buzón guarda lo que terminó, haya terminado bien o mal.
  const llegados = p.loros.filter((l) => l.llego || l.perdido || l.abducido);
  // `llego` y no solo `!leido`: un ave que se perdió no trae nada que abrir y su
  // tarjeta no tiene con qué marcarse leída, así que sin esto el contador de la
  // pestaña se quedaba en 1 para siempre. Pasa 2 de cada 1000 envíos, y cuando
  // pasa no se va nunca más.
  const sinLeer = llegados.filter(
    (l) => l.direccion === "recibido" && l.llego && !l.leido
  ).length;

  useTic(enVuelo.length + volviendo.length > 0);

  // Toda la bandada es el bot: el producto todavía no pasó nada. Es el momento
  // exacto para pedir que traiga a alguien de verdad — sobre todo mientras hay
  // un loro en el aire, que son minutos de espera sin nada que hacer.
  const soloLaVecina = p.amigos.every((a) => a.bot);

  const pestañas = [
    {
      id: "vuelo" as const,
      texto: "En vuelo",
      // Los convites cuentan: un ave posada en una barra también está afuera
      // del nido, y es la que más necesita que alguien se acuerde de ella.
      contador: enVuelo.length + volviendo.length + p.convites.length,
    },
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
      <div data-pestanas style={{ display: "flex", gap: 6, padding: "0 12px 10px" }}>
        {pestañas.map((t) => {
          const activa = pestaña === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setPestaña(t.id)}
              // Son la navegación principal de la app y se tocan más que
              // ninguna otra cosa, así que los 44 px del dedo no se negocian.
              // La pestaña se dibuja de 37 y la zona de toque los pone igual.
              className="toque-comodo"
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

      <div className="scroll" style={{ flex: 1, minHeight: 0, padding: "0 12px 74px" }}>
        {pestaña === "vuelo" && (
          <>
            {/* Primero de todo, y solo cuando la app corre adentro del
                navegador de otra app: es lo único de este panel que se puede
                volver imposible de hacer si se posterga. Se va solo y no
                vuelve. */}
            <GuardarNido />
            {/* Y el permiso de avisos, solo mientras haya algo volando: es lo
                que convierte "¿querés notificaciones?" en una pregunta que se
                contesta sola. */}
            <Avisos hayVuelo={enVuelo.length + volviendo.length + p.convites.length > 0} />
            {/* Y ponerla en la pantalla de inicio, donde el navegador lo
                permita. Va después de los avisos a propósito: primero que
                pueda avisar, después dónde vive el ícono. */}
            <Instalar />
            {soloLaVecina && <TraeAAlguien codigo={p.codigo} hayVuelo={enVuelo.length > 0} />}
            {p.convites.map((c) => (
              <TarjetaConvite
                key={c.id}
                convite={c}
                ahora={ahora}
                escala={p.escala}
                refrescar={p.refrescar}
              />
            ))}
            {enVuelo.length + volviendo.length + p.convites.length === 0 ? (
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
                    refrescar={p.refrescar}
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
          <Buzon
            llegados={llegados}
            refrescar={p.refrescar}
            alReenviar={p.alReenviar}
            escala={p.escala}
          />
        )}

        {pestaña === "bandada" && (
          <Bandada
            amigos={p.amigos}
            escala={p.escala}
            alEscribir={p.alEscribir}
            alEnfocar={p.alEnfocar}
            alConvidar={p.alConvidar}
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
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px 10px" }}>
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
        padding: "var(--aire-3)",
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

/**
 * Un lorito de convite, mientras espera.
 *
 * Es la única tarjeta de la app que no tiene cuenta regresiva, porque no
 * depende del tiempo sino de otra persona: el ave no llega, espera. Así que en
 * el lugar del reloj va lo que está haciendo en la barra —que cambia solo, con
 * el reloj y la semilla— y en el lugar de la barra de progreso va lo único que
 * de verdad se puede hacer: volver a pasar el link.
 */
function TarjetaConvite({
  convite,
  ahora,
  escala,
  refrescar,
}: {
  convite: ConviteVista;
  ahora: number;
  escala: number;
  refrescar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  /** Dos toques para llamarlo de vuelta: el segundo confirma. */
  const [porLlamar, setPorLlamar] = useState(false);
  const [llamando, setLlamando] = useState(false);
  const a = AVES[convite.ave];
  const estado = convite.estado;
  const enLaBarra = estado === "barra";
  // Los copetines se cuentan por lo que estuvo EN la barra: una vez que se
  // volvió al nido, lo que hace es dormirla.
  const b = borrachera(
    Math.max(0, Math.min(ahora, convite.abandona) - convite.llegadaPosada),
    escala
  );

  async function llamar() {
    setLlamando(true);
    try {
      await pedir("/api/convite", { metodo: "DELETE", datos: { c: convite.id } });
      refrescar();
    } catch {
      setLlamando(false);
      setPorLlamar(false);
    }
  }

  // Qué está pasando, en un renglón. Cada momento del convite tiene el suyo:
  // decir "en una cervecería" de un ave que ya se volvió a casa es mentir.
  const donde =
    estado === "yendo"
      ? `Yendo a la cervecería · ${cuentaRegresiva(convite.llegadaPosada - ahora)}`
      : estado === "barra"
        ? `En una cervecería${convite.lugar ? ` de ${ciudadDe(convite.lugar)}` : ""}`
        : estado === "volviendo"
          ? `Se cansó de esperar · vuelve en ${cuentaRegresiva(convite.enCasa - ahora)}`
          : estado === "cancelado"
            ? convite.vuelveA && ahora < convite.vuelveA
              ? `Lo llamaste · vuelve en ${cuentaRegresiva(convite.vuelveA - ahora)}`
              : "Volvió a tu nido"
            : "Durmiendo la mona en tu nido";

  return (
    <div
      className="tarjeta"
      style={{ marginBottom: 10, borderColor: `${a.color}55` }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Ave especie={convite.ave} size={30} aletea={estado === "yendo" || estado === "volviendo" || estado === "cancelado"} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14.5, fontWeight: 700 }}>
            {a.nombre} {convite.para ? `→ ${convite.para}` : "→ sin abrir"}
          </p>
          <p style={{ color: "var(--tenue)", fontSize: 12 }}>{donde}</p>
        </div>
        {enLaBarra && (
          <span style={{ fontSize: 19 }} title={`${b.copetines} copetines`}>
            {b.copetines === 0 ? "🪑" : b.nivel >= 0.75 ? "🥴" : "🍺"}
          </span>
        )}
        {estado === "encasa" && <span style={{ fontSize: 19 }}>😴</span>}
      </div>

      {enLaBarra && (
        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--suave)",
            borderLeft: `2px solid ${a.color}`,
            paddingLeft: 10,
            marginBottom: 12,
          }}
        >
          {a.nombre} {loQueEstaHaciendo(b, convite.id, ahora)}
          {b.copetines > 0 && ` · ${b.copetines} copetín${b.copetines === 1 ? "" : "es"}`}.
          Sale en cuanto abran el link.
        </p>
      )}

      {/* Lo único que esta tarjeta cuenta y el mapa no. El ave que espera en la
          cervecería se dibuja loro para cualquiera que la mire, así que sin
          este renglón, haber marcado la casilla y no haberla marcado se ven
          igual hasta que el bicho despega, dos días después. */}
      {convite.pollera && estado !== "cancelado" && (
        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--suave)",
            borderLeft: "2px solid #f472b6",
            paddingLeft: 10,
            marginBottom: 12,
          }}
        >
          <strong style={{ color: "#f9a8d4" }}>Sale en pollera.</strong> Ahí
          todavía es un loro: se convierte al despegar de la barra.
        </p>
      )}

      {/* Se volvió, pero el link NO se murió: sale igual, desde el nido. Es la
          diferencia entre "se te venció" y "tarda más porque tardaste". */}
      {estado === "encasa" && (
        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--suave)",
            borderLeft: `2px solid ${a.color}`,
            paddingLeft: 10,
            marginBottom: 12,
          }}
        >
          Se cansó de esperar y se volvió. <strong>El link sigue sirviendo</strong>
          : cuando lo abran, sale de tu nido y llega sobrio — pero tarda más,
          porque ahora el camino es entero.
        </p>
      )}

      {estado === "cancelado" ? (
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--tenue)" }}>
          Ese link ya no sirve. El mensaje vuelve con el ave.
        </p>
      ) : (
        <>
          <button
            className="boton chico"
            style={{ width: "100%" }}
            onClick={async () => {
              if (await compartirConvite(convite)) {
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2200);
              }
            }}
          >
            {copiado ? "✓ Link copiado" : "Pasarle el link otra vez"}
          </button>

          {/* Llamarlo de vuelta. Es la única forma de deshacer un lorito
              soltado por error, y por eso pide dos toques: el ave vuelve, el
              link deja de servir y no hay cómo volver atrás de eso. */}
          <button
            className="boton chico fantasma"
            // 12 y no 8: los dos botones se dibujan de 34 px y estiran la
            // zona del dedo a 44, o sea 5 px para cada lado. Con 8 de aire las
            // dos zonas se pisaban 2 px y el de abajo —que CANCELA el lorito—
            // se quedaba con el borde del de arriba. Cualquier par de
            // pastillas apiladas necesita 10 px o más entre ellas.
            style={{ width: "100%", marginTop: 12 }}
            disabled={llamando}
            onClick={() => (porLlamar ? llamar() : setPorLlamar(true))}
            onBlur={() => setPorLlamar(false)}
          >
            {llamando
              ? "Silbando…"
              : porLlamar
                ? "¿Seguro? El link deja de servir"
                : "Llamarlo de vuelta"}
          </button>
        </>
      )}
    </div>
  );
}

function TarjetaVuelo({
  loro,
  ahora,
  alTocar,
  refrescar,
}: {
  loro: LoroVista;
  ahora: number;
  alTocar: () => void;
  refrescar: () => void;
}) {
  const a = AVES[loro.ave];
  const { avance: t, girando } = avanceVuelo(loro, ahora);
  const falta = Math.max(0, loro.llegada - ahora);
  const enviado = loro.direccion === "enviado";
  const suyo = enviado ? "tu" : "el";
  // Un lorito de convite recién destrabado todavía no despegó: se queda un
  // minuto más en la barra. Decir "en camino" con el bicho sentado en una
  // cervecería es la clase de mentira chica que después nadie entiende.
  const enLaBarra = Boolean(loro.parada) && ahora < loro.salida;

  // La tarjeta era un <button> entero. Dejó de serlo porque adentro va otro
  // botón —el de la abducción— y un botón adentro de otro es HTML inválido: el
  // navegador lo desarma y el de adentro deja de recibir sus toques. Ahora el
  // contenedor es un div y lo tocable es todo menos la fila de abajo, que es
  // exactamente lo que se quiere: tocar la tarjeta enfoca el vuelo en el mapa,
  // y llamar a la nave es un acto aparte que no se dispara sin querer.
  return (
    <div
      className="tarjeta"
      style={{ marginBottom: 10, borderColor: `${a.color}55` }}
    >
      <button
        onClick={alTocar}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          background: "none",
          border: 0,
          padding: 0,
          color: "inherit",
          font: "inherit",
        }}
      >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <DibujoDelVuelo loro={loro} size={30} aletea />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14.5, fontWeight: 700 }}>
            {enviado ? `${a.nombre} → ${loro.otro.nombre}` : `${a.nombre} de ${loro.otro.nombre}`}
          </p>
          <p style={{ color: "var(--tenue)", fontSize: 12 }}>
            {enLaBarra ? (
              <>
                🍺 Terminando el copetín · sale en{" "}
                {cuentaRegresiva(loro.salida - ahora)}
              </>
            ) : (
              <>
                {girando ? "Detenido" : enviado ? "En camino" : "Viene hacia vos"} ·{" "}
                {formatearDistancia(loro.distanciaKm * (1 - t))} por delante
              </>
            )}
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
            padding: "8px 10px",
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

      {/* Solo sobre lo tuyo y solo mientras esté en el aire: lo que se hace con
          un ave que ya llegó lo decide quien la recibió. */}
      {enviado && <LlamarLaNave loro={loro} refrescar={refrescar} />}
    </div>
  );
}

/**
 * "Solicitar abducción."
 *
 * Lo único que puede hacer quien mandó un loro después de soltarlo. Pide dos
 * toques, como todo lo que no tiene vuelta atrás en esta app —la suerte del
 * ave, llamar de vuelta un lorito de convite— y el segundo toque dice qué pasa,
 * no "¿seguro?": lo que hay que confirmar es la consecuencia.
 *
 * No se llama "eliminar" ni "cancelar" en ninguna parte, y eso no es sólo
 * chiste. Eliminar sugiere que la cosa deja de haber existido, y no es cierto:
 * del otro lado ya se avisó que venía un loro, y esa persona va a ver la nave
 * llevárselo. Una abducción es pública, y esto también.
 */
function LlamarLaNave({
  loro,
  refrescar,
}: {
  loro: LoroVista;
  refrescar: () => void;
}) {
  const [porLlamar, setPorLlamar] = useState(false);
  const [llamando, setLlamando] = useState(false);
  const [error, setError] = useState("");

  return (
    <>
      <button
        className="boton chico fantasma"
        style={{
          width: "100%",
          marginTop: 12,
          ...(porLlamar
            ? { borderColor: "rgba(103,232,249,.55)", color: "#a5f3fc" }
            : null),
        }}
        disabled={llamando}
        onClick={async () => {
          if (!porLlamar) {
            setPorLlamar(true);
            return;
          }
          setLlamando(true);
          setError("");
          try {
            await pedir("/api/loros/abducir", { datos: { id: loro.id } });
            refrescar();
          } catch (e: any) {
            setError(e?.message || "La nave no vino.");
            setLlamando(false);
            setPorLlamar(false);
          }
        }}
        // Perder el foco cancela la confirmación, igual que en las otras dos:
        // un botón que se quedó armado es una trampa para el toque siguiente.
        onBlur={() => setPorLlamar(false)}
      >
        {llamando
          ? "Llamando a la nave…"
          : porLlamar
            ? "🛸 Confirmar: el mensaje se pierde para siempre"
            : "🛸 Solicitar abducción"}
      </button>
      {error && (
        <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 8 }}>{error}</p>
      )}
    </>
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
        marginBottom: 10,
        cursor: "pointer",
        borderStyle: "dashed",
        borderColor: `${a.color}44`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {/* Espejada: vuelve, no va. */}
        <span style={{ display: "inline-flex", transform: "scaleX(-1)" }}>
          <DibujoDelVuelo loro={loro} size={30} aletea />
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

/**
 * Cuántos loros ya vistos alcanzan para tapar uno sin abrir.
 *
 * Estaba en 5 y era demasiado: pedía SEIS vistos más uno sin abrir, a la vez,
 * para que el buzón se partiera. En uso normal eso casi nunca pasa, así que la
 * separación existía en el código y no se veía nunca. Con 2 aparece cuando
 * empieza a hacer falta de verdad.
 */
const HISTORIAL_LARGO = 2;

/**
 * El buzón, y por qué a veces se parte en dos.
 *
 * Acá vive todo lo que terminó: lo que recibiste, lo que mandaste y lo que se
 * perdió, ordenado por fecha. Con pocos loros eso está perfecto. Pero en cuanto
 * hay historial, un loro sin abrir de ayer queda enterrado debajo de tres que
 * mandaste hoy — y era lo único que había para hacer.
 *
 * Se parte solo cuando hace falta, y no siempre: hace falta que haya algo sin
 * abrir Y que el historial ya sea suficiente para taparlo. Un buzón con tres
 * cosas se queda como estaba.
 *
 * Nada se esconde. Un plegado dejaría la lista más corta, pero el buzón es el
 * recuerdo de lo que voló: esconderlo detrás de un toque es cobrarle peaje a lo
 * único que la app guarda.
 */
/**
 * Lo que se dibuja de un vuelo: su ave, o una pollera si el loro salió
 * convertido. Está acá y no en cada tarjeta porque son cuatro: la de vuelo, la
 * de la vuelta, la del buzón y la del ave perdida. Si el mapa muestra una
 * pollera rosa cruzando y la tarjeta de al lado muestra un loro verde, el
 * chiste se cae en la mitad.
 */
function DibujoDelVuelo({
  loro,
  size,
  aletea = false,
}: {
  loro: LoroVista;
  size: number;
  aletea?: boolean;
}) {
  return loro.pollera ? (
    <Pollera size={size} ondea={aletea} />
  ) : (
    <Ave especie={loro.ave} size={size} aletea={aletea} />
  );
}

function Buzon({
  llegados,
  refrescar,
  alReenviar,
  escala,
}: {
  llegados: LoroVista[];
  refrescar: () => void;
  alReenviar: (loro: LoroVista) => void;
  escala: number;
}) {
  // Mismo criterio que el contador de la pestaña, y por el mismo motivo: un ave
  // perdida no se puede abrir, así que no puede estar "sin abrir".
  const esSinAbrir = (l: LoroVista) => l.direccion === "recibido" && l.llego && !l.leido;

  // Lo que encontraste sin abrir se queda ARRIBA aunque lo abras, hasta que te
  // vayas de la pestaña.
  //
  // Antes no: abrir un loro lo mandaba abajo de todos los que todavía no
  // habías abierto, o sea que la app te sacaba de las manos justo lo que
  // acababas de destapar. Con las otras aves se disimula —lo ves moverse y lo
  // seguís con el ojo— pero con la paloma no: te tira confeti tres segundos y
  // medio encima, y cuando la ceremonia termina el mensaje ya no está donde lo
  // dejaste. Medido: la tarjeta terminaba cuarta de cuatro, media pantalla
  // más abajo.
  //
  // Un `ref` y no un estado porque no se dibuja nada distinto por esto: es
  // memoria de en qué orden entró la lista. Acumular ids es idempotente, así
  // que repetir el render no cambia nada. Y se olvida solo: la pestaña se
  // desmonta al cambiar de solapa, y ahí sí se reordena, que es cuando no
  // estás mirando.
  const arriba = useRef(new Set<string>());
  for (const l of llegados) if (esSinAbrir(l)) arriba.current.add(l.id);

  if (llegados.length === 0) {
    return (
      <Vacio
        titulo="Buzón vacío"
        texto="Acá aparecen los loros que ya aterrizaron, tuyos y de los demás."
      />
    );
  }

  const sinAbrir = llegados.filter((l) => arriba.current.has(l.id));
  const vistos = llegados.filter((l) => !arriba.current.has(l.id));
  const tarjeta = (l: LoroVista) => (
    <TarjetaBuzon key={l.id} loro={l} refrescar={refrescar} alReenviar={alReenviar} escala={escala} />
  );

  // Debajo del umbral no se ponen títulos —dos renglones para separar tres
  // cosas es ruido— pero lo sin abrir SÍ se sube arriba igual. Eso no cuesta
  // nada y es la mitad del problema: que lo nuevo no quede enterrado.
  if (sinAbrir.length === 0 || vistos.length <= HISTORIAL_LARGO) {
    return <>{[...sinAbrir, ...vistos].map(tarjeta)}</>;
  }

  return (
    <>
      {/* "Recién llegados" y no "Sin abrir": el grupo se queda quieto mientras
          estás en la pestaña, así que abrir uno no lo saca de acá — y un
          título que dijera "sin abrir" empezaría a mentir apenas abrís el
          primero. */}
      <p className="etiqueta" style={{ margin: "2px 0 8px" }}>
        Recién llegados · {sinAbrir.length}
      </p>
      {sinAbrir.map(tarjeta)}
      <p className="etiqueta" style={{ margin: "18px 0 8px" }}>
        Ya los viste · {vistos.length}
      </p>
      {vistos.map(tarjeta)}
    </>
  );
}

function TarjetaBuzon({
  loro,
  refrescar,
  alReenviar,
  escala,
}: {
  loro: LoroVista;
  refrescar: () => void;
  alReenviar: (loro: LoroVista) => void;
  escala: number;
}) {
  const [abriendo, setAbriendo] = useState(false);
  const [abierto, setAbierto] = useState(Boolean(loro.leido));
  const [fiesta, setFiesta] = useState<Motivo | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const a = AVES[loro.ave];
  const enviado = loro.direccion === "enviado";
  const sellado = !enviado && !abierto;

  if (loro.perdido) return <TarjetaPerdido loro={loro} alReenviar={alReenviar} />;
  if (loro.abducido) return <TarjetaAbducido loro={loro} />;

  // Al abrirse, la tarjeta crece: aparecen el texto y la fila de tres botones.
  // Si estaba cerca del borde de abajo, lo que acabás de destapar queda atrás
  // del pie. Medido: 58 px, justo la fila de botones.
  //
  // No sirve scrollIntoView. El pie FLOTA encima de la caja que hace scroll —
  // es un `position: absolute` con degradado— así que para el navegador la
  // tarjeta entra perfecta y no mueve nada. Hay que medir contra dónde
  // arranca el pie y correr la lista a mano.
  //
  // Se corre lo mínimo, y nunca tanto como para que el encabezado se vaya por
  // arriba: primero se tiene que seguir viendo de quién es.
  function acomodar() {
    const el = caja.current;
    if (!el) return;
    const quieto =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Dos cuadros: uno para que React pinte la tarjeta ya abierta, otro para
    // medirla con su alto nuevo.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const lista = el.closest<HTMLElement>(".scroll");
        if (!lista) return;
        const pie = document.querySelector(".pie-panel");
        const tarjeta = el.getBoundingClientRect();
        const marco = lista.getBoundingClientRect();
        const suelo = Math.min(marco.bottom, pie ? pie.getBoundingClientRect().top : marco.bottom);
        const sobra = tarjeta.bottom - suelo;
        if (sobra <= 0) return;
        const aireArriba = Math.max(0, tarjeta.top - marco.top);
        lista.scrollBy({
          top: Math.min(sobra + 8, aireArriba),
          behavior: quieto ? "auto" : "smooth",
        });
      })
    );
  }

  async function abrir() {
    setAbriendo(true);
    try {
      await pedir("/api/loros/leer", { datos: { id: loro.id } });
      setAbierto(true);
      acomodar();
      refrescar();
    } catch {
      // Aunque falle el registro de "leído", el texto ya está de este lado:
      // no tiene sentido esconderlo por un error de red.
      setAbierto(true);
      acomodar();
    } finally {
      setAbriendo(false);
      // La ceremonia es de quien recibe, y solo la primera vez que abre. Quien
      // lo mandó ya sabe qué escribió: tirarle confeti sería tirárselo a sí
      // mismo.
      // La pollera manda sobre la rareza del ave, pero eso hoy no colisiona
      // con nada: solo el loro se convierte, y el loro no tiene rareza.
      if (loro.pollera) setFiesta("pollera");
      else if (a.rareza === "confeti") setFiesta("paloma");
      else if (a.rareza === "luto") setFiesta("luto");
    }
  }

  return (
    <div
      ref={caja}
      className="tarjeta"
      style={{
        marginBottom: 10,
        borderColor: sellado ? a.color : "var(--borde)",
        background: sellado ? `${a.color}14` : "var(--panel)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <DibujoDelVuelo loro={loro} size={26} />
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
          {!enviado && !loro.perdido && <QueHagoConElAve loro={loro} refrescar={refrescar} escala={escala} />}
          {loro.suerte && <FinalDelAve loro={loro} />}
        </div>
      )}

      {fiesta && <Fiesta motivo={fiesta} ave={loro.ave} alTerminar={() => setFiesta(null)} />}
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
  // Tres historias distintas dejan el mismo rastro —un texto cambiado— y
  // contarlas al revés arruina las tres. La de la barra manda sobre las otras:
  // si el ave se tomó doce copetines esperando a que armaras tu nido, eso es
  // lo que explica el hipo.
  const copetines = loro.parada?.copetines ?? 0;
  const barra = Boolean(loro.parada && loro.parada.nivel > 0);
  const color = barra ? "#fbbf24" : perica ? "#f472b6" : AVES.cotorra.color;
  const titulo = enviado
    ? barra
      ? "Así llegó, con los copetines encima"
      : perica
        ? "Así llegó, después de que la perica le metiera mano"
        : "Así llegó del otro lado"
    : barra
      ? "Venía de una cervecería, y se nota"
      : perica
        ? "Ups, el perico se distrajo en el camino"
        : "La cotorra lo repitió tanto que se le mezcló";
  const nota = barra
    ? `Estuvo esperando en una cervecería${
        loro.parada?.lugar ? ` de ${ciudadDe(loro.parada.lugar)}` : ""
      } a que armaras tu nido, y se tomó ${copetines} copetín${
        copetines === 1 ? "" : "es"
      }. El mensaje está entero: lo que le sobra es el hipo.`
    : perica
      ? "Se cruzó con una perica, se quedó dando vueltas y ella le leyó el mensaje entero antes de dejarlo seguir."
      : "De tanto ir repitiéndolo en voz alta pierde palabras, repite otras y da vuelta alguna.";

  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 10px",
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
    boton: "Contestar",
    pie: "Se vuelve volando con lo que le escribas. Se la ve cruzar el mapa.",
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
function QueHagoConElAve({
  loro,
  refrescar,
  escala,
}: {
  loro: LoroVista;
  refrescar: () => void;
  escala: number;
}) {
  const [ocupado, setOcupado] = useState<Suerte | null>(null);
  const [error, setError] = useState("");
  /** Soltar abre un campo en vez de mandar de una: soltar el ave ES contestar,
   *  y hacerlo sin ofrecer dónde escribir era devolverla vacía. */
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState("");
  const a = AVES[loro.ave];

  if (loro.suerte) return null;

  async function decidir(suerte: Suerte, conTexto = "") {
    setOcupado(suerte);
    setError("");
    try {
      await pedir("/api/loros/suerte", { datos: { id: loro.id, suerte, texto: conTexto } });
      refrescar();
    } catch (e: any) {
      setError(e?.message || "No se pudo.");
      setOcupado(null);
    }
  }

  if (escribiendo) {
    const vuelve = formatearDuracion(duracionVuelo(loro.distanciaKm, loro.ave, escala));
    return (
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--borde)" }}>
        <p style={{ fontSize: 12.5, color: "var(--suave)", lineHeight: 1.5 }}>
          {a.articulo === "la" ? "La" : "Lo"} soltás con tu respuesta. Tarda lo mismo
          en volver: <strong style={{ color: a.color }}>{vuelve}</strong>.
        </p>
        <textarea
          className="campo"
          rows={3}
          autoFocus
          maxLength={a.maxCaracteres}
          placeholder={`Lo que le lleva ${a.articulo === "la" ? "la" : "el"} ${a.nombre.toLowerCase()}…`}
          style={{ marginTop: 10, width: "100%", resize: "none" }}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            className="boton fantasma chico"
            onClick={() => setEscribiendo(false)}
            disabled={ocupado !== null}
          >
            Volver
          </button>
          {/* Sin texto también se puede: a veces el gesto de devolverla es toda
              la respuesta. Pero el botón lo dice, para que nadie la mande vacía
              creyendo que mandó algo. */}
          <button
            className="boton chico"
            style={{ flex: 1 }}
            disabled={ocupado !== null}
            onClick={() => decidir("soltado", texto)}
          >
            {ocupado ? "…" : texto.trim() ? "🕊 Soltar con esto" : "🕊 Soltar sin mensaje"}
          </button>
        </div>
        {error && <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 8 }}>{error}</p>}
      </div>
    );
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
            onClick={() => (k === "soltado" ? setEscribiendo(true) : decidir(k))}
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
  const a = AVES[loro.ave];
  // Quien la soltó (recibió el loro) ve su respuesta desde el momento cero: la
  // escribió. Quien la espera no ve nada hasta que el ave aterriza — la misma
  // regla que la ida, que es la promesa entera de la app.
  const hayTexto = Boolean(loro.respuesta);

  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--borde)" }}>
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--suave)" }}>
        {f.icono} {mio ? f.mio(lo) : f.suyo(loro.otro.nombre, lo)}
      </p>

      {/* En el aire y con algo adentro: se avisa que trae, no qué trae. Es lo
          que hace que valga la pena mirarla volver. */}
      {loro.suerte === "soltado" && !hayTexto && loro.traeRespuesta && (
        <p style={{ marginTop: 8, fontSize: 12.5, color: a.color }}>
          ✉️ Vuelve con una respuesta adentro.
        </p>
      )}

      {hayTexto && (
        <div
          style={{
            marginTop: 10,
            padding: "var(--aire-2) 10px",
            borderRadius: 10,
            background: `${a.color}12`,
            borderLeft: `2px solid ${a.color}`,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: a.color }}>
            {mio ? "LO QUE MANDASTE DE VUELTA" : `LO QUE TE CONTESTÓ ${loro.otro.nombre.toUpperCase()}`}
          </p>
          <p
            style={{
              marginTop: 6,
              fontSize: 14.5,
              lineHeight: 1.55,
              color: "var(--texto)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {loro.respuesta}
          </p>
          {/* Si la cotorra también escuchó mal a la vuelta, quien escribió ve
              cómo llegó. Del otro lado no hace falta: eso ES lo que llegó. */}
          {loro.respuestaEntregada && (
            <>
              <p style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: AVES.cotorra.color }}>
                ASÍ LLEGÓ DEL OTRO LADO
              </p>
              <p
                style={{
                  marginTop: 4,
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: "var(--suave)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {loro.respuestaEntregada}
              </p>
            </>
          )}
        </div>
      )}
    </div>
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
/**
 * El ave que se llevó un plato volador.
 *
 * Se parece a la del extravío y dice lo contrario en una cosa: acá no hay
 * "volver a intentarlo". El extravío es mala suerte y reintentar es lo natural;
 * esto lo pediste vos, y ofrecer un botón para deshacer lo que elegiste
 * deshacer sería un chiste que no entiende nadie. Si querés mandar otra cosa,
 * se manda de cero.
 *
 * Del lado de quien lo esperaba dice lo mismo con otras palabras. Sin esta
 * tarjeta, ese loro desaparecía del panel sin explicación después de que la app
 * le avisara que venía en camino.
 */
function TarjetaAbducido({ loro }: { loro: LoroVista }) {
  const a = AVES[loro.ave];
  const enviado = loro.direccion === "enviado";
  return (
    <div
      className="tarjeta"
      style={{
        marginBottom: 10,
        borderStyle: "dashed",
        borderColor: "rgba(103,232,249,.35)",
        background: "rgba(103,232,249,.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>🛸</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--suave)" }}>
            {enviado
              ? `Abduciste tu ${a.nombre.toLowerCase()} camino a ${loro.otro.nombre}`
              : `Se llevaron un ${a.nombre.toLowerCase()} de ${loro.otro.nombre}`}
          </p>
          <p style={{ color: "var(--tenue)", fontSize: 11.5, lineHeight: 1.5, marginTop: 2 }}>
            {enviado
              ? "Una nave lo interceptó en el aire. El mensaje se fue con él."
              : "Una nave lo interceptó en el aire. Nunca vas a saber qué decía."}
          </p>
        </div>
      </div>
    </div>
  );
}

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
        marginBottom: 10,
        borderStyle: "dashed",
        borderColor: "rgba(255,255,255,.14)",
        background: "rgba(255,255,255,.02)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ opacity: 0.3, filter: "grayscale(1)", display: "inline-flex" }}>
          <DibujoDelVuelo loro={loro} size={26} />
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
              padding: "8px 10px",
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
  alConvidar,
  refrescar,
}: {
  amigos: NidoVista[];
  escala: number;
  alEscribir: (id?: string) => void;
  alEnfocar: (id: string) => void;
  alConvidar: () => void;
  refrescar: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  /** A quién está apuntando el botón de sacar. Uno por vez. */
  const [porSacar, setPorSacar] = useState<string | null>(null);
  // El mismo reparto que hace el mapa, con la misma entrada: así el punto de
  // acá y el punto de allá son el mismo color sin tener que coordinarse.
  const colores = coloresDeBandada(amigos.map((a) => a.id));
  // Toda la bandada es la vecina de práctica: no hay nada que listar todavía.
  const soloLaVecina = amigos.every((a) => a.bot);

  /**
   * Las dos formas de sumar gente, más la nota de privacidad.
   *
   * Es un ELEMENTO y no un componente definido acá adentro, y la diferencia no
   * es de estilo: un componente declarado dentro del render es un tipo nuevo en
   * cada pasada, así que React desmonta y vuelve a montar todo lo de adentro —
   * y el campo del código perdería el foco en cada tecla.
   */
  const sumar = (
    <>
        {/* Arriba del código a propósito. Agregar por código exige que la otra
            persona YA esté adentro, o sea que sirve para la mitad de la agenda
            de cualquiera. Esto sirve para la otra mitad, que es la que hace
            crecer esto. */}
        <div
          className="tarjeta"
          style={{
            marginBottom: 14,
            borderColor: "var(--esmeralda)",
            background: "rgba(163, 230, 53, 0.06)",
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 750, marginBottom: 5 }}>
            ¿No está en la app?
          </p>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--suave)" }}>
            Escribile igual. El lorito sale ahora, se va de copetines y espera en
            una birrería hasta que tu amigo abra el link y arme su nido… y si toma
            mucho, ¡atenti! 🥴
          </p>
          <button className="boton" style={{ width: "100%", marginTop: 12 }} onClick={alConvidar}>
            Enviarle un lorito igual
          </button>
        </div>

        <div className="tarjeta" style={{ marginBottom: 14 }}>
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

    </>
  );

  async function sacar(id: string) {
    setOcupado(true);
    setError("");
    setMensaje("");
    try {
      await pedir("/api/amigos", { datos: { id }, metodo: "DELETE" });
      setPorSacar(null);
      refrescar();
    } catch (e: any) {
      setError(e?.message || "No se pudo sacar.");
    } finally {
      setOcupado(false);
    }
  }

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
      {/* Las tarjetas de sumar gente van ARRIBA solo mientras no haya bandada:
          ahí no hay nada que listar y lo único que corresponde es traer a
          alguien. Con bandada de verdad, lo primero de una pestaña que se
          llama "Bandada" tiene que ser la bandada — antes había que pasar dos
          tarjetas y un párrafo de privacidad para ver a la primera persona. */}
      {soloLaVecina && sumar}

      {amigos.map((f) => {
        const km = f.distanciaKm ?? 0;
        const color = colores.get(f.id) ?? "var(--suave)";
        const masRapido = Math.min(
          ...AVES_LISTA.map((x) => duracionVuelo(km, x.id, escala))
        );
        return (
          <div key={f.id} className="tarjeta" style={{ marginBottom: 10 }}>
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
                <p style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
                  {/* El mismo punto que en el mapa. Sin esto el color de allá
                      no se puede contestar: ves uno violeta y no sabés de
                      quién es. */}
                  <span
                    aria-hidden
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 99,
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  {f.bot ? "🪺 " : ""}
                  {f.nombre}
                </p>
                <p style={{ color: "var(--tenue)", fontSize: 12.5 }}>
                  {formatearDistancia(km)}
                  {f.lugar ? ` · ${f.lugar}` : ""}
                </p>
                {/* Una sola línea, no las seis aves. Acá se elige A QUIÉN, no
                    con qué: el ave se elige en el compositor, que además ya
                    muestra los seis tiempos hasta esta persona. Repetirlos acá
                    hacía que cada tarjeta ocupara media pantalla y que con
                    cinco amigos la lista fuera impasable. Pero el tiempo no se
                    va del todo: es lo que hace que 11.961 km signifique algo. */}
                <p style={{ color: "var(--suave)", fontSize: 12.5, marginTop: 3 }}>
                  el más rápido llega en {formatearDuracion(masRapido)}
                </p>
                {f.bot && (
                  <p style={{ color: "var(--tenue)", fontSize: 11.5, marginTop: 2 }}>
                    Te contesta sola, para probar sin esperar a nadie.
                  </p>
                )}
              </button>

              {/* Chiquito de dibujo y de 44 px al dedo, como el resto de la
                  app: lo que se ve es una cruz gris, lo que se toca es toda
                  esta esquina.

                  Dos toques, como llamar de vuelta a un lorito: corta por los
                  DOS lados y no hay cómo deshacerlo salvo volviéndose a sumar
                  con el código. Y se desarma solo al perder el foco, para que
                  no quede una cruz roja armada esperando un dedo distraído. */}
              <button
                className="toque-comodo"
                onClick={() => (porSacar === f.id ? sacar(f.id) : setPorSacar(f.id))}
                onBlur={() => setPorSacar((q) => (q === f.id ? null : q))}
                disabled={ocupado}
                // Corto a propósito. "Sacar a Sandra de tu bandada" se lee
                // entero en cada tarjeta y además choca con el nombre de la
                // pestaña: el contexto ya dice de dónde se la saca.
                aria-label={porSacar === f.id ? `Confirmar: sacar a ${f.nombre}` : `Sacar a ${f.nombre}`}
                style={{
                  flex: "0 0 auto",
                  alignSelf: "flex-start",
                  minWidth: 44,
                  padding: "4px 6px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: porSacar === f.id ? 12.5 : 15,
                  fontWeight: porSacar === f.id ? 700 : 400,
                  lineHeight: 1.2,
                  color: porSacar === f.id ? "#fca5a5" : "var(--tenue)",
                  whiteSpace: "nowrap",
                }}
              >
                {porSacar === f.id ? "¿Seguro?" : "✕"}
              </button>
            </div>

            {porSacar === f.id && (
              <p style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
                Se dejan de ver los dos. Lo que ya está en el aire llega igual.
              </p>
            )}
            {/* A lo ancho y debajo, no al costado: al costado, un botón con
                texto de verdad le come la mitad a un nombre de lugar largo
                —"Municipio de San Francisco del Monte de Oro"— y en las
                tarjetas altas queda flotando en el medio de la nada. Acá el
                objetivo de toque es toda la fila, que en un teléfono es lo que
                importa. */}
            <button
              className="boton chico"
              onClick={() => alEscribir(f.id)}
              style={{ width: "100%", marginTop: 10 }}
            >
              Envíale un lorito
            </button>
          </div>
        );
      })}

      {/* Y con bandada, las formas de sumar más gente van al final: quien ya
          tiene doce personas entra acá para ver a las doce, no para agregar
          una decimotercera. */}
      {!soloLaVecina && (
        <div style={{ marginTop: 4 }}>{sumar}</div>
      )}
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
      <div className="tarjeta" style={{ marginBottom: 12 }}>
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
      <div className="tarjeta" style={{ marginBottom: 12 }}>
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
      <div className="tarjeta" style={{ marginBottom: 12 }}>
        {/* La etiqueta entera es el objetivo táctil, no la casilla: 18 px de
            cuadradito son menos de la mitad del mínimo, y esto decide si tus
            vuelos aparecen en el mapa de desconocidos — errarle no puede ser
            fácil. El padding negativo lo agranda sin mover el dibujo. */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            cursor: "pointer",
            minHeight: 44,
            margin: -6,
            padding: 6,
          }}
        >
          <input
            type="checkbox"
            checked={enElMundo}
            onChange={(e) => cambiarMundo(e.target.checked)}
            style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0, accentColor: "var(--esmeralda)" }}
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
      <div className="tarjeta" style={{ marginBottom: 12 }}>
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

      {/* --- llave ---
          El encabezado decía "Otro dispositivo" y nada más, así que quien no
          sabía ya lo que era la llave no tenía por qué tocar el botón. Y es la
          única cosa del panel que se vuelve imposible de hacer si se posterga:
          se saca mientras se tiene el nido, no cuando ya se perdió. Un renglón
          de por qué convierte un botón misterioso en algo que se hace. */}
      <div className="tarjeta" style={{ marginBottom: 12 }}>
        <p className="etiqueta">Llevarte el nido</p>
        <p style={{ fontSize: 12.5, color: "var(--suave)", marginTop: 9, lineHeight: 1.5 }}>
          No hay cuenta ni contraseña: este nido vive en <em>este</em> navegador.
          La llave es la forma de abrirlo en otro —la compu, un teléfono nuevo,
          Chrome si entraste desde WhatsApp—. Guardala mientras podés.
        </p>
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
      <details className="tarjeta" style={{ marginBottom: 12 }}>
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
    <div style={{ textAlign: "center", padding: "28px 14px", color: "var(--suave)" }}>
      <div style={{ opacity: 0.35, display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <Ave especie="loro" size={46} />
      </div>
      <p style={{ fontWeight: 700, color: "var(--texto)", marginBottom: 6 }}>{titulo}</p>
      <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{texto}</p>
    </div>
  );
}
