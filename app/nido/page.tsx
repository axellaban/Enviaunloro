"use client";

// La app. Mapa a un lado, panel al otro, y el compositor encima cuando toca.
//
// Acá no hay lógica de vuelo: el estado viene de /api/estado y las posiciones
// las calcula el mapa. Lo que sí vive acá es lo que une todo — a quién le
// estamos escribiendo, qué está enfocado en el mapa, y avisar cuando un ave
// aterriza.

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Onboarding } from "../../components/Onboarding";
import { Panel } from "../../components/Panel";
import { Compositor } from "../../components/Compositor";
import { Convite } from "../../components/Convite";
import { HojaInferior } from "../../components/HojaInferior";
import { VistaMapa, type Vista } from "../../components/VistaMapa";
import { esCodigo, normalizarCodigo } from "../../lib/codigo";
import { Ave } from "../../components/Ave";
import { Cta } from "../../components/Cta";
import {
  avisar,
  pedir,
  pedirPermisoAvisos,
  pedirUbicacion,
  useEstado,
  useMundo,
} from "../../lib/cliente";
import { distanciaKm, formatearDuracion } from "../../lib/geo";
import { AVES, type AveId } from "../../lib/aves";
import type { LoroVista } from "../../lib/vista";

/**
 * En qué punto de su historia está un loro. Se compara contra la vuelta
 * anterior para saber QUÉ cambió y avisar solo de eso.
 *
 * El destino del ave forma parte del estado: sin él, quien mandó el loro no se
 * entera nunca de que del otro lado lo soltaron, lo enjaularon o lo mandaron al
 * puchero — que es la única respuesta que la app permite dar sin escribir una
 * palabra, y se estaba perdiendo.
 */
type EstadoLoro = string;
const estadoDe = (l: LoroVista, ahora: number): EstadoLoro => {
  if (l.perdido) return "perdido";
  if (!l.llego) return "vuelo";
  // "Volvió" es un estado propio y no un detalle de "la soltó": entre las dos
  // cosas puede haber días de vuelo, y el aterrizaje de la respuesta es el
  // momento que hay que avisar.
  const volvio = l.vuelta && ahora >= l.vuelta.llegada;
  return `llego${l.suerte ? `:${l.suerte}` : ""}${volvio ? ":volvio" : ""}`;
};

/** Cómo se le cuenta a quien lo mandó lo que hicieron con su ave. */
const NOTICIA_SUERTE: Record<string, (quien: string, ave: string, vuelve: string) => string> = {
  soltado: (quien, ave, vuelve) =>
    `${quien} soltó tu ${ave}. Vuelve a tu nido${vuelve ? `, llega en ${vuelve}` : ""}.`,
  "soltado:volvio": (quien, ave) => `Volvió tu ${ave}, con la respuesta de ${quien}.`,
  "soltado:volvio:vacio": (quien, ave) => `Volvió tu ${ave} de lo de ${quien}.`,
  enjaulado: (quien, ave) => `${quien} se quedó con tu ${ave}. Ese no vuelve más.`,
  puchero: (quien, ave) => `Tu ${ave} no volvió de lo de ${quien}. Mejor no preguntes.`,
};

const Mapa = dynamic(() => import("../../components/Mapa"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <p style={{ color: "var(--tenue)", fontSize: 13 }}>Desplegando el mapa…</p>
    </div>
  ),
});

export default function Nido() {
  const est = useEstado();
  const [compositor, setCompositor] = useState<{
    abierto: boolean;
    para?: string | null;
    texto?: string;
    ave?: AveId;
  }>({ abierto: false });
  // El foco lleva un número pegado atrás para que tocar dos veces el mismo nido
  // vuelva a mover la cámara: si fuera solo el id, React no vería un cambio.
  const [foco, setFoco] = useState<string | null>(null);
  const enfocar = useCallback((id: string) => setFoco(`${id}#${Date.now()}`), []);
  const [aviso, setAviso] = useState("");
  /** Modo "tocá el mapa para mudar tu nido". */
  const [mudando, setMudando] = useState(false);
  /** El compositor del lorito para alguien que todavía no está en la app. */
  const [convidando, setConvidando] = useState(false);
  /** Qué loros muestra el mapa: los tuyos, o los de todo el mundo. */
  const [vista, setVista] = useState<Vista>("tuyos");
  // Solo consulta mientras la vista del resto está prendida.
  const mundo = useMundo(vista === "resto");
  /** Código que venía en el link compartido, esperando a que haya nido. */
  const invitacion = useRef<string | null>(null);
  const sumado = useRef(false);
  /** Llave de un lorito de convite, esperando lo mismo. */
  const convite = useRef<string | null>(null);
  const reclamado = useRef(false);
  /** id del loro → en qué estado lo vimos la última vez. */
  const conocidos = useRef<Map<string, EstadoLoro> | null>(null);

  const mostrarAviso = useCallback((texto: string) => {
    setAviso(texto);
    setTimeout(() => setAviso((a) => (a === texto ? "" : a)), 5200);
  }, []);

  // Un aviso por cada cambio de estado, y son distintos a propósito:
  //
  //   despega   "viene en camino, llega en 4 h" — es la mitad de la gracia del
  //             producto. Saber que algo está en camino ES el producto; sin
  //             este aviso, un guacamayo de un día no se distingue de no haber
  //             recibido nada.
  //   aterriza  "ya está acá".
  //   se pierde a las dos puntas, porque las dos se quedaron esperando.
  //
  // La primera vuelta solo toma nota de lo que había: si no, al abrir la app
  // saltarían de golpe todos los avisos viejos.
  const ahoraServidor = est.ahoraServidor;
  useEffect(() => {
    if (conocidos.current === null) {
      conocidos.current = new Map(est.loros.map((l) => [l.id, estadoDe(l, ahoraServidor())]));
      return;
    }
    for (const l of est.loros) {
      const antes = conocidos.current.get(l.id);
      const ahora = estadoDe(l, ahoraServidor());
      conocidos.current.set(l.id, ahora);
      if (antes === ahora) continue;

      const a = AVES[l.ave];
      const mio = l.direccion === "enviado";
      // Lo que apareció ya resuelto pasó con la app cerrada. Se avisa solo si
      // fue recién: nadie quiere enterarse hoy de algo de anteayer.
      const nuevo = antes === undefined;
      const reciente = ahoraServidor() - (l.extravio ?? l.llegada) < 120_000;

      if (ahora === "perdido" && (!nuevo || reciente)) {
        const texto = mio
          ? `Tu ${a.nombre.toLowerCase()} se perdió camino a ${l.otro.nombre}. ${l.motivo}`
          : `Un ${a.nombre.toLowerCase()} de ${l.otro.nombre} se perdió en el camino.`;
        mostrarAviso(`🍃 ${texto}`);
        avisar("Se perdió un loro 🍃", texto);
        continue;
      }

      // Qué hicieron con tu ave del otro lado. Es el único aviso que le
      // corresponde a quien MANDÓ: la decisión la tomó el otro, y sin esto no
      // se enteraba salvo que se le ocurriera volver a mirar la tarjeta.
      // El ave volvió y trae algo. Es su propio momento: entre soltarla y que
      // aterrice pueden pasar días, y sin este aviso la respuesta se queda ahí
      // sin que nadie sepa que llegó.
      if (mio && ahora.endsWith(":volvio") && antes && !antes.endsWith(":volvio")) {
        const clave = l.respuesta ? "soltado:volvio" : "soltado:volvio:vacio";
        const texto = NOTICIA_SUERTE[clave](l.otro.nombre, a.nombre.toLowerCase(), "");
        mostrarAviso(`🕊 ${texto}`);
        avisar(`🕊 Volvió tu ${a.nombre.toLowerCase()}`, texto);
        continue;
      }

      if (mio && l.suerte && antes && !antes.includes(":")) {
        const vuelve =
          l.vuelta && l.vuelta.llegada > ahoraServidor()
            ? formatearDuracion(l.vuelta.llegada - ahoraServidor())
            : "";
        const texto = NOTICIA_SUERTE[l.suerte](l.otro.nombre, a.nombre.toLowerCase(), vuelve);
        const icono = l.suerte === "soltado" ? "🕊" : l.suerte === "enjaulado" ? "🔒" : "🍲";
        mostrarAviso(`${icono} ${texto}`);
        avisar(`${icono} Novedades de tu ${a.nombre.toLowerCase()}`, texto);
        continue;
      }

      // Los avisos de despegue y aterrizaje son solo para lo que viene hacia
      // vos: de lo que mandás ya te enteraste al mandarlo.
      if (mio) continue;

      if (nuevo && ahora === "vuelo") {
        const falta = formatearDuracion(l.llegada - ahoraServidor());
        // El que sale de una cervecería no "viene en camino" y ya: estuvo
        // esperando a que armaras tu nido, y eso es lo primero que esa persona
        // lee de la app. Contarlo como un vuelo más se come toda la historia.
        const texto = l.parada
          ? `${a.nombre} de ${l.otro.nombre} salió de la cervecería. Llega en ${falta}.`
          : `${a.nombre} de ${l.otro.nombre} viene en camino. Llega en ${falta}.`;
        mostrarAviso(`${l.parada ? "🍺" : "🪶"} ${texto}`);
        avisar(l.parada ? "Tu lorito salió de la barra 🍺" : "Viene un loro en camino 🦜", texto);
      } else if (ahora.startsWith("llego") && (antes === "vuelo" || reciente)) {
        const texto = `${a.nombre} de ${l.otro.nombre} aterrizó en tu nido.`;
        mostrarAviso(`🪶 ${texto}`);
        avisar("Aterrizó un loro 🦜", texto);
      }
    }
  }, [est.loros, mostrarAviso, ahoraServidor]);

  // Sumar a quien compartió el link.
  //
  // Corre cuando aparece el nido, no al montar, y eso resuelve los dos casos
  // con el mismo código: si ya tenías nido pasa en el acto, y si venís de
  // afuera pasa apenas terminás el onboarding. Antes, el código había que
  // copiarlo a mano de un mensaje de WhatsApp y adivinar dónde pegarlo.
  useEffect(() => {
    if (invitacion.current === null) {
      const n = new URLSearchParams(window.location.search).get("n") || "";
      invitacion.current = esCodigo(n) ? normalizarCodigo(n) : "";
      if (invitacion.current) {
        // Fuera de la URL: si no, recargar la página lo reintenta para siempre.
        window.history.replaceState({}, "", "/nido");
      }
    }
    const codigo = invitacion.current;
    if (!codigo || !est.yo || sumado.current) return;
    sumado.current = true;

    (async () => {
      try {
        const r = await pedir<{ amigo: { nombre: string; id: string } }>("/api/amigos", {
          datos: { codigo },
        });
        mostrarAviso(`🪺 ${r.amigo.nombre} entró a tu bandada. Ya se pueden mandar loros.`);
        est.refrescar();
        enfocar(r.amigo.id);
      } catch (e: any) {
        // El caso más común es haber abierto el propio link; no es un error
        // que valga la pena mostrar.
        if (!String(e?.message || "").includes("tu propio")) {
          mostrarAviso(`No se pudo sumar ese nido: ${e?.message || "código inválido"}`);
        }
      }
    })();
  }, [est.yo, est, mostrarAviso, enfocar]);

  // Destrabar el lorito que estaba esperando en la cervecería.
  //
  // Misma forma que el de arriba y por la misma razón: corre cuando aparece el
  // nido, no al montar, así sirve igual para alguien que ya tenía nido —el ave
  // sale en el acto— y para alguien que lo acaba de armar en el onboarding, que
  // es el caso para el que se inventó todo esto.
  useEffect(() => {
    if (convite.current === null) {
      const c = new URLSearchParams(window.location.search).get("c") || "";
      convite.current = c;
      // Fuera de la URL: si no, recargar la página lo reintenta para siempre.
      if (c) window.history.replaceState({}, "", "/nido");
    }
    const llave = convite.current;
    if (!llave || !est.yo || reclamado.current) return;
    reclamado.current = true;

    (async () => {
      try {
        const r = await pedir<{ de: string; loro: LoroVista }>("/api/convite/reclamar", {
          datos: { c: llave },
        });
        // Primero refrescar y después avisar, en ese orden: la misma consulta
        // dispara el aviso genérico de "viene un loro en camino", y si este
        // saliera antes quedaría pisado por aquel — que es más pobre, porque
        // no cuenta de dónde salió el bicho.
        await est.refrescar();
        const a = AVES[r.loro.ave];
        mostrarAviso(
          `🍺 ${a.nombre} de ${r.de} salió de la cervecería. Llega en ${formatearDuracion(
            Math.max(0, r.loro.llegada - est.ahoraServidor())
          )}.`
        );
        enfocar(r.loro.id);
      } catch (e: any) {
        mostrarAviso(`No se pudo destrabar ese lorito: ${e?.message || "ya no está"}`);
      }
    })();
  }, [est.yo, est, mostrarAviso, enfocar]);

  // El nido sigue al dispositivo: si te moviste más de 300 m, el próximo vuelo
  // sale desde donde estás ahora y no desde donde estabas cuando te registraste.
  const yoId = est.yo?.id;
  const yoLat = est.yo?.lat;
  const yoLng = est.yo?.lng;
  const refrescar = est.refrescar;
  useEffect(() => {
    if (!yoId || yoLat === undefined || yoLng === undefined) return;
    let cancelado = false;
    (async () => {
      const r = await pedirUbicacion();
      if (!r.ok || cancelado) return;
      if (distanciaKm({ lat: yoLat, lng: yoLng }, r.punto) < 0.3) return;
      try {
        await pedir("/api/ubicacion", { datos: r.punto });
        refrescar();
      } catch {}
    })();
    return () => {
      cancelado = true;
    };
    // Solo al entrar: pedir el GPS en cada consulta sería un abuso de batería.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yoId]);

  if (est.cargando && !est.yo) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <Ave especie="loro" size={54} aletea />
      </div>
    );
  }

  if (!est.yo) {
    return (
      <Onboarding
        alTerminar={(yo, codigo) => {
          // Primero se planta lo que ya tenemos —esto es lo que hace que se
          // entre al mapa al instante— y recién después se sale a completar
          // el resto (bandada, loros, escala).
          est.sembrar(yo, codigo);
          pedirPermisoAvisos();
          est.refrescar();
        }}
      />
    );
  }

  const enVuelo = est.loros.filter((l) => !l.llego && !l.perdido);
  // Las que vuelven a casa también cuentan como "en el aire": están cruzando
  // el mapa igual que las que van.
  const volviendo = est.loros.filter(
    (l) => l.vuelta && est.ahoraServidor() < l.vuelta.llegada
  ).length;
  // Los convites cuentan mientras VUELAN hacia la cervecería. Posados no: el
  // cartel dice qué se está moviendo en el mapa, y un ave sentada en una barra
  // no se mueve. Lo que la espera es la pestaña, que es una lista de
  // pendientes, no un contador de tráfico.
  const yendoALaBarra = est.convites.filter(
    (c) => est.ahoraServidor() < c.llegadaPosada
  ).length;
  const enElAire = enVuelo.length + volviendo + yendoALaBarra;

  return (
    <div className="app">
      <div className="app-mapa">
        {aviso && <div className="aviso entra">{aviso}</div>}

        <Mapa
          yo={est.yo}
          amigos={est.amigos}
          vuelos={est.loros}
          mundo={mundo.vuelos}
          convites={est.convites}
          vista={vista}
          ahoraServidor={est.ahoraServidor}
          foco={foco}
          modoElegir={mudando}
          alEscribirle={(id) => setCompositor({ abierto: true, para: id })}
          alElegirPunto={async (punto) => {
            if (!mudando) return;
            setMudando(false);
            try {
              await pedir("/api/ubicacion", { datos: punto });
              est.refrescar();
              mostrarAviso("🪺 Nido mudado. Los próximos vuelos salen desde acá.");
            } catch (e: any) {
              mostrarAviso(e?.message || "No se pudo mover el nido.");
            }
          }}
        />

        {mudando && (
          <div className="aviso entra pasa-clics" style={{ borderColor: "var(--borde-alto)" }}>
            Tocá el mapa donde queda tu nido.{" "}
            <button
              onClick={() => setMudando(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--suave)",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                font: "inherit",
              }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* left: 56 y no 12 — el control de zoom de Leaflet vive en la esquina. */}
        <VistaMapa vista={vista} alCambiar={setVista} />

        {/* La cuenta de lo que hay en pantalla. Abajo y no arriba: arriba ya
            están el zoom, el interruptor, la brújula y "Mi nido", y en 390 px
            no entra nada más sin que se pisen. Va adentro de `.pila-mapa`, que
            apila esta chapa y la de "sin mosaicos" en columna: antes las dos
            salían posicionadas a mano en la misma esquina y se montaban. */}
        <div className="pila-mapa">
        <div
          className="flotante"
          style={{ pointerEvents: "none", maxWidth: "100%" }}
        >
          {vista === "resto" ? (
            <>
              <Ave especie="perico" size={18} />
              <span style={{ color: mundo.vuelos.length ? "var(--esmeralda-alto)" : "var(--tenue)" }}>
                {mundo.error
                  ? mundo.error
                  : mundo.cargando && mundo.vuelos.length === 0
                    ? "Mirando el mundo…"
                    : mundo.vuelos.length === 0
                      ? "Nadie volando ahora. Soltá el primero."
                      : `${mundo.vuelos.length} cruzando el mundo`}
              </span>
            </>
          ) : (
            <>
              <Ave especie="loro" size={18} />
              <span style={{ color: enElAire ? "var(--esmeralda-alto)" : "var(--tenue)" }}>
                {enElAire > 0 ? `${enElAire} en el aire` : "Nada en el aire"}
              </span>
            </>
          )}
        </div>
        </div>

        <button
          className="flotante"
          style={{ top: 12, right: 12 }}
          onClick={() => enfocar(est.yo!.id)}
          title="Centrar el mapa en tu nido"
        >
          📍 Mi nido
        </button>

        {est.error && (
          <div className="error-flotante">
            {est.error}
            {/* El motivo exacto lo sabe el servidor. Un toque y lo ves, en vez
                de tener que ir a buscar los logs de una función serverless. */}
            <a
              href="/api/salud"
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", marginTop: 6, textDecoration: "underline" }}
            >
              Ver el diagnóstico →
            </a>
          </div>
        )}
      </div>

      <HojaInferior>
        <Panel
          yo={est.yo}
          codigo={est.codigo}
          amigos={est.amigos}
          loros={est.loros}
          escala={est.escala}
          ahoraServidor={est.ahoraServidor}
          alEnfocar={enfocar}
          convites={est.convites}
          alEscribir={(id) => setCompositor({ abierto: true, para: id })}
          alConvidar={() => setConvidando(true)}
          alElegirEnMapa={() => setMudando(true)}
          alReenviar={(l) =>
            setCompositor({
              abierto: true,
              para: l.otro.id,
              texto: l.texto || "",
              ave: l.ave,
            })
          }
          refrescar={est.refrescar}
        />
        <div className="pie-panel" data-pie>
          <Cta ancho>
            <button className="boton" onClick={() => setCompositor({ abierto: true })}>
              🦜 Soltar un loro
            </button>
          </Cta>
        </div>
      </HojaInferior>

      {compositor.abierto && (
        <Compositor
          yo={est.yo}
          amigos={est.amigos}
          escala={est.escala}
          destinoInicial={compositor.para}
          textoInicial={compositor.texto}
          aveInicial={compositor.ave}
          alCerrar={() => setCompositor({ abierto: false })}
          alEnviado={(mensaje) => {
            setCompositor({ abierto: false });
            mostrarAviso(`🪶 ${mensaje}`);
            pedirPermisoAvisos();
            est.refrescar();
          }}
        />
      )}

      {convidando && (
        <Convite
          yo={est.yo}
          alCerrar={() => setConvidando(false)}
          alSoltado={(mensaje) => {
            // No se cierra: la pantalla se convierte en el link, que es lo
            // único que falta para que el ave salga de la barra.
            mostrarAviso(mensaje);
            est.refrescar();
          }}
        />
      )}
    </div>
  );
}
