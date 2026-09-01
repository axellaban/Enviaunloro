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
import { HojaInferior, mirarElMapa } from "../../components/HojaInferior";
import {
  avisoAbduccion,
  avisoAterrizaje,
  avisoBandada,
  avisoDeCopetines,
  avisoDespegue,
  avisoExtravio,
  avisoSuerte,
  avisoVuelta,
  unaLinea,
  type Aviso,
} from "../../lib/avisos";
import { VistaMapa, type Vista } from "../../components/VistaMapa";
import { esCodigo, normalizarCodigo } from "../../lib/codigo";
import { Ave } from "../../components/Ave";
import { Cta } from "../../components/Cta";
import {
  avisar,
  llaveDeConvite,
  marcarSinLeer,
  pedir,
  sincronizarAvisos,
  useEstado,
  useMundo,
} from "../../lib/cliente";
import { formatearDuracion } from "../../lib/geo";
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
  if (l.abducido) return "abducido";
  if (!l.llego) return "vuelo";
  // "Volvió" es un estado propio y no un detalle de "la soltó": entre las dos
  // cosas puede haber días de vuelo, y el aterrizaje de la respuesta es el
  // momento que hay que avisar.
  const volvio = l.vuelta && ahora >= l.vuelta.llegada;
  return `llego${l.suerte ? `:${l.suerte}` : ""}${volvio ? ":volvio" : ""}`;
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
  const [mostrar, setMostrar] = useState<string | null>(null);
  // Enfocar es "mirá esto en el mapa", así que además de mover la cámara hay
  // que correr la hoja: en el celular tapa el 58% de la pantalla y la cámara
  // estaba apuntando a algo que quedaba abajo del panel.
  const enfocar = useCallback((id: string) => {
    setFoco(`${id}#${Date.now()}`);
    mirarElMapa();
  }, []);
  /**
   * De qué lorito hablaba el aviso que se tocó.
   *
   * Toda notificación viaja con `?ver=<id>` (lib/avisos.ts) y el service worker
   * la abre ahí. Antes todas caían en `/nido` a secas: te avisaban que aterrizó
   * algo de Ana y después te tocaba encontrarlo vos.
   *
   * La dirección se limpia enseguida con `replaceState`. Si quedara puesta,
   * recargar la página —o volver con el botón de atrás dos días después— te
   * llevaría de nuevo a un ave de la que ya te olvidaste, y compartir el link
   * mandaría a otro a una tarjeta que no es suya.
   */
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("ver");
    if (!id) return;
    setMostrar(`${id}#${Date.now()}`);
    enfocar(id);
    url.searchParams.delete("ver");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [enfocar]);

  /**
   * El alto real del pie, medido, para que la lista pueda pasar por debajo.
   *
   * El pie flota SOBRE la lista —es un `position:absolute` con degradado— así
   * que lo último de la lista queda tapado. Había un `padding-bottom: 74px`
   * escrito a mano y no alcanzaba: con el halo del botón, el hueco de la barra
   * de gestos y el texto en dos renglones, el pie mide bastante más. Se veía
   * al contestar un lorito: "Volver" y "Soltar con esto" quedaban abajo del
   * botón grande y había que scrollear a ciegas para encontrarlos.
   *
   * Medido y no fijo porque el número cambia por teléfono —la barra de gestos—
   * y por estado —el botón crece cuando el texto pasa a dos renglones—.
   */
  const pie = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pie.current;
    if (!el) return;
    // En la RAÍZ y no en el propio pie: la lista que tiene que dejarle lugar es
    // hermana del pie, no hija, así que ahí abajo la variable no le llegaría.
    const medir = () =>
      document.documentElement.style.setProperty(
        "--alto-pie",
        `${Math.ceil(el.getBoundingClientRect().height)}px`
      );
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

      const mio = l.direccion === "enviado";
      // Lo que apareció ya resuelto pasó con la app cerrada. Se avisa solo si
      // fue recién: nadie quiere enterarse hoy de algo de anteayer.
      const nuevo = antes === undefined;
      const reciente = ahoraServidor() - (l.abducido ?? l.extravio ?? l.llegada) < 120_000;

      // Todos los textos salen de lib/avisos.ts, los mismos que manda el
      // servidor. Acá solo se decide CUÁNDO corresponde cada uno; qué dice no
      // se decide dos veces.
      const contar = (av: Aviso) => {
        mostrarAviso(unaLinea(av));
        avisar(av);
      };

      // Se lo llevó una nave. Le corresponde a quien lo ESPERABA: quien la
      // llamó ya sabe, la pidió él. Y del otro lado hace falta de verdad, que
      // es lo incómodo del asunto: a esa persona ya se le avisó que venía un
      // lorito, así que sin esto se queda esperando algo que no llega nunca.
      if (ahora === "abducido" && !mio && (!nuevo || reciente)) {
        contar(avisoAbduccion({ idLoro: l.id, quien: l.otro.nombre, ave: l.ave }));
        continue;
      }
      if (ahora === "abducido") continue;

      if (ahora === "perdido" && (!nuevo || reciente)) {
        contar(
          avisoExtravio({
            idLoro: l.id,
            quien: l.otro.nombre,
            ave: l.ave,
            motivo: l.motivo,
            mio,
          })
        );
        continue;
      }

      // El ave volvió y trae algo. Es su propio momento: entre soltarla y que
      // aterrice pueden pasar días, y sin este aviso la respuesta se queda ahí
      // sin que nadie sepa que llegó.
      if (mio && ahora.endsWith(":volvio") && antes && !antes.endsWith(":volvio")) {
        contar(
          avisoVuelta({
            idLoro: l.id,
            quien: l.otro.nombre,
            ave: l.ave,
            conRespuesta: Boolean(l.respuesta),
          })
        );
        continue;
      }

      // Qué hicieron con tu ave del otro lado. Es el único aviso que le
      // corresponde a quien MANDÓ: la decisión la tomó el otro, y sin esto no
      // se enteraba salvo que se le ocurriera volver a mirar la tarjeta.
      if (mio && l.suerte && antes && !antes.includes(":")) {
        contar(
          avisoSuerte({
            idLoro: l.id,
            quien: l.otro.nombre,
            ave: l.ave,
            suerte: l.suerte,
            conRespuesta: Boolean(l.respuesta),
            vuelve: l.vuelta ? Math.max(0, l.vuelta.llegada - ahoraServidor()) : 0,
          })
        );
        continue;
      }

      // Un convite que se destrabó. Este SÍ le corresponde a quien lo mandó, y
      // es el momento más importante de toda la mecánica: la persona que
      // invitaste armó su nido. Sin esto, lo único que pasaba de tu lado era
      // que una tarjeta desaparecía en silencio y aparecía otra, y el premio
      // por haber invitado a alguien no se veía en ningún lado.
      if (mio && nuevo && l.parada && ahora === "vuelo") {
        contar(
          avisoBandada({
            idLoro: l.id,
            quien: l.otro.nombre,
            ave: l.ave,
            falta: Math.max(0, l.llegada - ahoraServidor()),
          })
        );
        continue;
      }

      // Los avisos de despegue y aterrizaje son solo para lo que viene hacia
      // vos: de lo que mandás ya te enteraste al mandarlo.
      if (mio) continue;

      if (nuevo && ahora === "vuelo") {
        const falta = Math.max(0, l.llegada - ahoraServidor());
        // El que sale de una cervecería no "viene en camino" y ya: estuvo
        // esperando a que armaras tu nido, y eso es lo primero que esa persona
        // lee de la app. Contarlo como un vuelo más se come toda la historia.
        contar(
          l.parada
            ? avisoDeCopetines({
                idLoro: l.id,
                quien: l.otro.nombre,
                ave: l.ave,
                falta,
                enLaBarra: ahoraServidor() < l.salida,
              })
            : avisoDespegue({
                idLoro: l.id,
                quien: l.otro.nombre,
                ave: l.ave,
                pollera: l.pollera,
                falta,
              })
        );
      } else if (ahora.startsWith("llego") && (antes === "vuelo" || reciente)) {
        contar(avisoAterrizaje({ idLoro: l.id, quien: l.otro.nombre, ave: l.ave }));
      }
    }
  }, [est.loros, mostrarAviso, ahoraServidor]);

  // El numerito del ícono: los loritos que te esperan sin abrir.
  //
  // Contaba las aves EN EL AIRE, y estaba mal: un globito es una tarea
  // pendiente —WhatsApp, el mail, todos funcionan así— y un ave volando no es
  // una tarea. No hay nada que hacer con ella, y encima el número no se apagaba
  // nunca, porque siempre hay algo en el aire. Lo que sí te espera es lo que
  // llegó y no abriste.
  //
  // La cuenta es la MISMA que la del contador de la pestaña Buzón y la misma
  // que hace el servidor en `loritosSinLeer` para mandarla con cada aviso: si
  // los tres no coincidieran, el número saltaría al abrir la app.
  useEffect(() => {
    const ahora = ahoraServidor();
    marcarSinLeer(
      est.loros.filter(
        (l) =>
          l.direccion === "recibido" &&
          !l.abducido &&
          !l.perdido &&
          ahora >= l.llegada &&
          !l.leido
      ).length
    );
  }, [est.loros, ahoraServidor]);

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
      const c = llaveDeConvite();
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
          `🍺 ${a.nombre} de ${r.de} está terminando el copetín. Llega en ${formatearDuracion(
            Math.max(0, r.loro.llegada - est.ahoraServidor())
          )}.`
        );
        enfocar(r.loro.id);
      } catch (e: any) {
        mostrarAviso(`No se pudo destrabar ese lorito: ${e?.message || "ya no está"}`);
      }
    })();
  }, [est.yo, est, mostrarAviso, enfocar]);

  // EL NIDO NO SIGUE AL TELÉFONO, y esto antes no era así.
  //
  // Acá vivía un efecto que al abrir la app leía el GPS y, si te habías movido
  // más de 300 m, MUDABA tu nido solo. La intención era buena —que el ave salga
  // de donde estás— y el resultado era el contrario de lo que esta app promete:
  // tu nido terminaba siendo un rastreador. El trabajo, el bar, la casa de
  // alguien; cada vez que abrías la app, tu bandada veía el punto nuevo.
  //
  // Los corrimientos de privacidad no alcanzaban a tapar eso. Correr un punto
  // 300 m esconde en qué casa vivís; no esconde que hoy estás en otro barrio, y
  // menos si el punto se muda cada vez que abrís la app.
  //
  // Ahora el nido es lo que la persona puso, y se queda ahí hasta que ella
  // decida mudarlo —"Mudar el nido", en la pestaña Nido, tocando el mapa—. El
  // ave sale del nido, siempre. Es un dato que se da una vez, a propósito, y no
  // uno que se toma de fondo.

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
          // Acá NO se pide el permiso de avisos. Se pedía, y era la peor forma
          // de gastarlo: sin contexto —a los diez segundos de haber llegado, y
          // antes de que exista un solo vuelo del que avisar— y sin mirar si el
          // servidor tenía claves para mandar algo. Un "no" del navegador es
          // para siempre. Ahora lo ofrece el panel cuando hay un ave en el
          // aire, que es cuando la pregunta se contesta sola (components/
          // Avisos.tsx). Esto solo deja el service worker listo.
          sincronizarAvisos();
          est.refrescar();
        }}
      />
    );
  }

  const enVuelo = est.loros.filter((l) => !l.llego && !l.perdido && !l.abducido);
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
          escala={est.escala}
          vista={vista}
          ahoraServidor={est.ahoraServidor}
          foco={foco}
          modoElegir={mudando}
          alEscribirle={(id) => setCompositor({ abierto: true, para: id })}
          // El mismo acto que el boton de la tarjeta del panel, desde el otro
          // lado: ahi se llega por la lista, aca tocando el bicho en el mapa.
          // El aviso de que se lo llevaron lo da el vigia de siempre cuando el
          // servidor devuelve el loro abducido, asi que aca no se anuncia nada.
          alAbducir={async (id) => {
            await pedir("/api/loros/abducir", { datos: { id } });
            est.refrescar();
          }}
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
        <VistaMapa
          vista={vista}
          alCambiar={(v) => {
            setVista(v);
            // La PRIMERA vez que alguien entra a «Del resto», se le dice por
            // qué los puntos no coinciden con los de su bandada.
            //
            // Sin esto parece un bug, y es exactamente lo contrario: acá los
            // vuelos vienen corridos de 1 a 3 km y en la bandada hasta 300 m,
            // con semillas distintas a propósito. Un mismo nido cae en dos
            // lugares a veinte kilómetros uno del otro y no hay nada en
            // pantalla que lo explique. Una vez en la vida y no más: es una
            // aclaración, no una advertencia.
            if (v !== "resto") return;
            try {
              if (localStorage.getItem("loros:mundo-explicado")) return;
              localStorage.setItem("loros:mundo-explicado", "1");
              mostrarAviso(
                "🌎 Acá nadie ve dónde vive nadie: los vuelos se dibujan corridos de donde salieron de verdad."
              );
            } catch {}
          }}
        />

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
          mostrar={mostrar}
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
        <div className="pie-panel" data-pie ref={pie}>
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
          // De "no está en la app" al lorito de convite, sin pasar por el
          // panel: es la misma intención —escribirle a alguien— y lo único que
          // cambia es que esa persona todavía no tiene nido.
          alConvidar={() => {
            setCompositor({ abierto: false });
            setConvidando(true);
          }}
          alEnviado={(mensaje) => {
            setCompositor({ abierto: false });
            mostrarAviso(`🪶 ${mensaje}`);
            // El momento era bueno —el ave acaba de despegar— pero el cartel
            // del navegador salía solo, sin haber preguntado antes. Ahora el
            // panel muestra la tarjeta justo acá, porque desde este segundo hay
            // un ave en el aire, y el cartel se abre recién si la tocan.
            sincronizarAvisos();
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
