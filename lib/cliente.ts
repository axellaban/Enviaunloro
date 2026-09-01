"use client";

// El estado del lado del navegador.
//
// Un solo endpoint (`/api/estado`) trae todo, y de ahí sale la pantalla entera.
// La frecuencia no es fija: con aves en el aire se consulta seguido, sin nada
// volando se afloja. Y cuando la app queda en segundo plano se corta del todo —
// en el celular eso es batería, y al volver se refresca de inmediato.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Aviso } from "./avisos";
import type { Punto } from "./geo";
import type { ConviteVista, LoroVista, NidoVista, VueloMundo } from "./vista";
import { hayQueInstalarParaAvisar } from "./navegador";

export type Estado = {
  yo: NidoVista | null;
  codigo: string;
  amigos: NidoVista[];
  loros: LoroVista[];
  /** Los loritos de convite que todavía esperan en la cervecería. */
  convites: ConviteVista[];
  /** Escala de tiempo del servidor. El navegador calcula los ETA con la misma. */
  escala: number;
  /** "upstash" | "archivo". Sirve para explicar por qué se pierde un nido. */
  almacenamiento: string;
};

const VACIO: Estado = {
  yo: null,
  codigo: "",
  amigos: [],
  loros: [],
  convites: [],
  escala: 1,
  almacenamiento: "",
};

/**
 * La llave del lorito de convite, salga de donde salga.
 *
 * Hay dos formas del mismo link y las dos tienen que abrir: /l/<lorito>, que
 * es la que se comparte hoy porque trae su propia miniatura de WhatsApp, y
 * ?c=<lorito>, que es la de antes. Los links viejos ya están dados por
 * WhatsApp y no se rompen nunca.
 *
 * Vive acá y no en cada pantalla porque lo leen tres: la portada, el botón de
 * la portada y el nido.
 */
export function llaveDeConvite(): string {
  if (typeof window === "undefined") return "";
  const enLaRuta = window.location.pathname.match(/^\/l\/([^/?#]+)/);
  if (enLaRuta) {
    try {
      return decodeURIComponent(enLaRuta[1]);
    } catch {
      return enLaRuta[1];
    }
  }
  return new URLSearchParams(window.location.search).get("c") || "";
}

export async function pedir<T = any>(
  url: string,
  opciones?: { metodo?: string; datos?: unknown }
): Promise<T> {
  const r = await fetch(url, {
    method: opciones?.metodo || (opciones?.datos ? "POST" : "GET"),
    headers: opciones?.datos ? { "Content-Type": "application/json" } : undefined,
    body: opciones?.datos ? JSON.stringify(opciones.datos) : undefined,
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || "Algo salió mal.");
  return j as T;
}

/**
 * Por qué el servidor dejó de ver un nido que existía. Desde el navegador las
 * tres causas se ven idénticas, así que la única forma de decir algo útil es
 * mirar dónde está guardando.
 */
function motivoNidoPerdido(almacenamiento: string): string {
  if (almacenamiento === "archivo") {
    return "El servidor no encuentra tu nido: no hay base configurada y cada instancia arranca vacía.";
  }
  if (almacenamiento === "supabase") {
    return "El servidor no encuentra tu nido. La base está configurada pero no guarda.";
  }
  return "El servidor no encuentra tu nido. Puede ser que se haya borrado la cookie de este navegador.";
}

export function useEstado() {
  const [estado, setEstado] = useState<Estado>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // Diferencia entre el reloj del servidor y el de este dispositivo. Sin esto,
  // un celular con la hora corrida cinco minutos ve loros que ya llegaron o que
  // nunca llegan.
  const desfase = useRef(0);
  const enVuelo = useRef(false);
  /** Alguien pidió refrescar mientras había una consulta abierta. */
  const pendiente = useRef(false);
  /** Tuvimos nido alguna vez. Si el servidor deja de verlo, es un problema. */
  const huboNido = useRef(false);

  const refrescar = useCallback(async () => {
    // Dos consultas encimadas no sirven de nada, pero DESCARTAR la segunda sí
    // hace daño: el pedido que se hace justo después de armar el nido caía
    // siempre en esta rama y la app se quedaba esperando el tic del intervalo,
    // hasta doce segundos, con el botón clavado en "Armando el nido…". Ahora
    // se anota y se corre apenas termina la que estaba.
    if (enVuelo.current) {
      pendiente.current = true;
      return;
    }
    enVuelo.current = true;
    try {
      const antes = Date.now();
      const j = await pedir<any>("/api/estado");
      // Se descuenta medio viaje de ida y vuelta: la respuesta se armó más o
      // menos a la mitad del pedido.
      desfase.current = Number(j.ahora) - (antes + Date.now()) / 2;

      if (j.yo) huboNido.current = true;

      if (!j.yo && huboNido.current) {
        // Teníamos nido y el servidor dejó de encontrarlo. En vez de mandar a
        // la persona de vuelta al onboarding —donde crearía otro nido y
        // perdería su código y su bandada— se conserva lo que hay y se dice
        // qué pasa. La causa casi siempre es la misma y la nombramos.
        setError(motivoNidoPerdido(String(j.almacenamiento || "")));
        return;
      }

      setEstado({
        yo: j.yo ?? null,
        codigo: j.codigo || "",
        amigos: j.amigos || [],
        loros: j.loros || [],
        convites: j.convites || [],
        escala: Number(j.escala) > 0 ? Number(j.escala) : 1,
        almacenamiento: String(j.almacenamiento || ""),
      });
      setError("");
    } catch (e: any) {
      setError(e?.message || "Sin conexión.");
    } finally {
      enVuelo.current = false;
      setCargando(false);
      if (pendiente.current) {
        pendiente.current = false;
        refrescarRef.current?.();
      }
    }
  }, []);

  // El propio refrescar se llama a sí mismo cuando quedó uno pendiente; el ref
  // rompe el círculo de la definición.
  const refrescarRef = useRef(refrescar);
  refrescarRef.current = refrescar;

  /**
   * Planta el nido que acaba de devolver /api/nido, sin esperar una consulta.
   *
   * Es lo que hace que armar el nido lleve al mapa en el acto: el dato ya vino
   * en la respuesta del POST, y salir a buscarlo de nuevo era la diferencia
   * entre entrar al toque y quedarse mirando un botón.
   */
  const sembrar = useCallback((yo: NidoVista, codigo: string) => {
    huboNido.current = true;
    setEstado((prev) => ({ ...prev, yo, codigo }));
    setCargando(false);
  }, []);

  const ahoraServidor = useCallback(() => Date.now() + desfase.current, []);

  // `!l.llego` a secas no alcanza: un loro extraviado nunca llega, así que
  // quedaba en `false` de por vida y el sondeo rápido no se apagaba más. El
  // buzón guarda ochenta loros, o sea que un solo extravío —2 de cada mil—
  // dejaba a esa persona consultando cada cuatro segundos para siempre.
  const hayVuelos = estado.loros.some(
    (l) => (!l.llego && !l.perdido) || (l.vuelta && ahoraServidor() < l.vuelta.llegada)
  );

  useEffect(() => {
    refrescar();
    let id: ReturnType<typeof setInterval> | null = null;

    const arrancar = () => {
      if (id) clearInterval(id);
      id = setInterval(refrescar, hayVuelos ? 4000 : 12000);
    };
    const alVolver = () => {
      if (document.visibilityState === "visible") {
        refrescar();
        arrancar();
      } else if (id) {
        clearInterval(id);
        id = null;
      }
    };

    arrancar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", refrescar);
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", refrescar);
    };
  }, [refrescar, hayVuelos]);

  return { ...estado, cargando, error, refrescar, sembrar, ahoraServidor, setEstado };
}

/** Un tic por segundo, para los contadores que bajan solos. */
export function useTic(activo = true): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [activo]);
  return t;
}

export type ResultadoUbicacion =
  | { ok: true; punto: Punto }
  | { ok: false; motivo: string; denegado: boolean };

export function pedirUbicacion(): Promise<ResultadoUbicacion> {
  return new Promise((listo) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      listo({
        ok: false,
        denegado: false,
        motivo: "Este navegador no sabe dónde está.",
      });
      return;
    }
    // El `timeout` de getCurrentPosition NO corre mientras el navegador muestra
    // el cartel de permiso: arranca recién cuando lo aceptás. Si la persona
    // duda, cambia de app, o simplemente no toca nada, la promesa no se
    // resuelve nunca y el botón queda clavado en "Buscando…" sin salida. Este
    // reloj es de pared y sí corre siempre.
    let resuelto = false;
    const terminar = (r: ResultadoUbicacion) => {
      if (resuelto) return;
      resuelto = true;
      listo(r);
    };
    setTimeout(
      () =>
        terminar({
          ok: false,
          denegado: false,
          motivo: "No llegó la ubicación. Probá de nuevo o poné tu nido a mano.",
        }),
      15_000
    );

    navigator.geolocation.getCurrentPosition(
      (p) => terminar({ ok: true, punto: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      (err) =>
        terminar({
          ok: false,
          denegado: err.code === err.PERMISSION_DENIED,
          motivo:
            err.code === err.PERMISSION_DENIED
              ? "Bloqueaste la ubicación. Podés habilitarla en el candado de la barra de direcciones, o poner tu nido a mano."
              : "No se pudo leer el GPS. Probá de nuevo o poné tu nido a mano.",
        }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 }
    );
  });
}

/**
 * El service worker, que es quien muestra los avisos.
 *
 * Se registra una sola vez y no bloquea nada: si falla, la app anda igual y
 * los avisos caen al modo viejo.
 */
let registro: Promise<ServiceWorkerRegistration | null> | null = null;
function serviceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registro) return registro;
  registro =
    typeof navigator !== "undefined" && "serviceWorker" in navigator
      ? navigator.serviceWorker.register("/sw.js").catch(() => null)
      : Promise.resolve(null);
  return registro;
}

/** Base64url → Uint8Array, que es como `subscribe` quiere la clave. */
function deBase64(s: string): Uint8Array {
  const relleno = "=".repeat((4 - (s.length % 4)) % 4);
  const crudo = atob((s + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...crudo].map((c) => c.charCodeAt(0)));
}

/**
 * Suscribe ESTE dispositivo a los avisos con la app cerrada.
 *
 * Se llama después de que den permiso, y no antes: pedirle al navegador una
 * suscripción sin permiso tira, y pedir el permiso sin tener dónde mandar los
 * avisos es gastar la única oportunidad que hay —si te lo niegan una vez,
 * volver a pedirlo es casi imposible—.
 *
 * Si el servidor no tiene claves VAPID, no hace nada y la app sigue igual:
 * los avisos andan mientras la pestaña esté viva, como antes.
 */
async function suscribirAlPush(): Promise<void> {
  try {
    const sw = await serviceWorker();
    if (!sw || !("pushManager" in sw)) return;
    const cfg = await fetch("/api/push").then((r) => r.json());
    if (!cfg?.hay || !cfg?.clave) return;

    // Si ya hay una, se reusa: cada `subscribe` nuevo invalida el anterior y
    // dejaría al servidor con una suscripción muerta por cada visita.
    const s =
      (await sw.pushManager.getSubscription()) ??
      (await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: deBase64(cfg.clave),
      }));
    await pedir("/api/push", { datos: { suscripcion: s.toJSON() } });
  } catch {
    // Un navegador sin push, un permiso revocado, un servicio caído: nada de
    // esto puede romper la app. Los avisos son un extra.
  }
}

/**
 * ¿El servidor puede mandar avisos con la app cerrada?
 *
 * Se consulta una sola vez por carga y se recuerda: la respuesta no cambia
 * mientras la página esté abierta, y la contestan varias pantallas.
 */
let hayPush: Promise<boolean> | null = null;
export function servidorAvisa(): Promise<boolean> {
  if (!hayPush) {
    hayPush = fetch("/api/push")
      .then((r) => r.json())
      .then((j) => Boolean(j?.hay))
      .catch(() => false);
  }
  return hayPush;
}

/** En qué anda el permiso de avisos, ya resuelto para quien tenga que decidir. */
export type EstadoAvisos =
  /** No hay push en este servidor, o este navegador no puede. No ofrecer nada. */
  | "imposible"
  /** iPhone sin instalar: no hay permiso que pedir, hay un paso que contar. */
  | "hayQueInstalar"
  /** Se puede pedir. Es la única oportunidad, así que se pide con contexto. */
  | "sePuedePedir"
  /** Ya dijo que sí. */
  | "listo"
  /** Ya dijo que no: no se vuelve a preguntar, no hay cómo. */
  | "negado";

export async function estadoDeAvisos(): Promise<EstadoAvisos> {
  if (typeof Notification === "undefined") {
    // En iPhone sin instalar, `Notification` directamente no existe. Eso no es
    // "imposible", es el paso que falta.
    return hayQueInstalarParaAvisar() ? "hayQueInstalar" : "imposible";
  }
  if (Notification.permission === "granted") return "listo";
  if (Notification.permission === "denied") return "negado";
  if (hayQueInstalarParaAvisar()) return "hayQueInstalar";
  // Y recién acá el servidor, que es lo único que decide si el permiso sirve
  // para algo. Va último porque es el único que cuesta un viaje.
  return (await servidorAvisa()) ? "sePuedePedir" : "imposible";
}

/**
 * Pedir el permiso. **Solo desde un toque de la persona**, nunca al entrar.
 *
 * Antes esto se llamaba solo, apenas terminaba el onboarding, y pedía el
 * permiso sin preguntar antes ni mirar si el servidor tenía con qué mandarlo.
 * Las dos cosas estaban mal, y la segunda es la peor:
 *
 *   SIN CLAVES VAPID EL PERMISO NO SIRVE PARA NADA, y pedirlo igual lo quema.
 *   Un "no" del navegador es para siempre: no hay forma de volver a preguntar,
 *   ni el día que el push sí esté configurado. O sea que un deploy sin claves
 *   —que es un estado normal, y el que trae la app recién instalada— iba
 *   fundiendo la única oportunidad de cada persona que entraba, para conseguir
 *   un permiso que nadie podía usar. /api/push ya lo decía con todas las
 *   letras; lo que faltaba era que el navegador le hiciera caso.
 *
 *   Y sin contexto se dice que no. Es la misma lección que la ubicación, que
 *   por eso se pide en el paso 2 del onboarding y no al entrar. El permiso de
 *   avisos ahora se ofrece cuando hay un ave en el aire: ahí la pregunta
 *   —"¿te aviso cuando aterrice?"— se contesta sola.
 */
export async function pedirPermisoAvisos(): Promise<EstadoAvisos> {
  try {
    const antes = await estadoDeAvisos();
    if (antes !== "sePuedePedir") return antes;
    void serviceWorker();
    await Notification.requestPermission();
    if (Notification.permission !== "granted") return "negado";
    await suscribirAlPush();
    return "listo";
  } catch {
    return "imposible";
  }
}

/**
 * El numerito en el ícono de la app: cuántas aves tuyas están en el aire.
 *
 * Es lo más cerca que se puede estar, desde la web, de la tarjeta viva que
 * tiene Binance en la pantalla bloqueada. Aquello es una Live Activity de iOS
 * —ActivityKit, nativo, sin API web— y no hay forma de hacerlo desde acá. Esto
 * es otra cosa y más chica, pero tiene lo único que de verdad importaba de
 * aquello: que se vea, sin abrir nada, que hay algo pasando.
 *
 * Y a diferencia de mandar avisos de avance, no interrumpe. Un ave que tarda
 * dieciséis días no puede permitirse notificar su progreso; un numerito que
 * está ahí cuando mirás el teléfono, sí.
 *
 * Anda en la app INSTALADA, en las dos plataformas —iPhone incluido— y en
 * ninguna otra parte. Por eso todo está envuelto: en un navegador común la API
 * no existe, y eso no es un error, es la mayoría de los casos.
 */
export function marcarSinLeer(cuantos: number): void {
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (cuantos > 0) void nav.setAppBadge?.(cuantos)?.catch(() => {});
    // Cero no es "poné un 0": es sacar el globito. Un ícono con un 0 encima
    // dice que hay algo, y no hay nada.
    else void nav.clearAppBadge?.()?.catch(() => {});
  } catch {}
}

/**
 * Al entrar: si el permiso YA está dado, asegurarse de que este dispositivo
 * esté suscripto. No pregunta nada y no muestra nada.
 *
 * Hace falta porque el permiso vive en el navegador y la suscripción en el
 * servidor, y se pueden separar: alguien que dijo que sí antes de que hubiera
 * claves VAPID tiene el permiso puesto y ninguna suscripción guardada. Sin
 * esto, esa persona no recibe un solo aviso y desde afuera se ve como que el
 * push no anda.
 *
 * Y EL SERVICE WORKER SE REGISTRA SIEMPRE, con permiso o sin él.
 *
 * Antes se registraba solamente acá adentro del `permission === "granted"`, o
 * al tocar "Avisame". O sea: quien todavía no había dado permiso —o sea todo el
 * mundo la primera vez— navegaba sin service worker. Y tener uno registrado es
 * uno de los requisitos de Chrome para considerar la app instalable: sin él no
 * dispara `beforeinstallprompt`, y sin ese evento la tarjeta de "ponela en tu
 * pantalla" no se puede mostrar. En Android no aparecía nunca, y la causa
 * estaba acá: el requisito de una cosa colgado adentro del `if` de otra.
 *
 * Registrarlo no muestra nada ni pide nada. El de esta app no cachea —su
 * manejador de `fetch` está vacío a propósito, que para un mapa en vivo es lo
 * correcto— y sin suscripción de push no tiene nada que hacer. Lo único que
 * cambia es que el navegador ahora sabe que esto es una app.
 */
export function sincronizarAvisos(): void {
  try {
    // Primero y sin condiciones: es lo que habilita la oferta de instalar.
    void serviceWorker();
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    void suscribirAlPush();
  } catch {}
}

/**
 * Muestra un aviso.
 *
 * Va por el service worker y no por `new Notification()`, por dos razones que
 * no son de estilo: aquel solo funciona con la pestaña viva, y en iPhone
 * directamente no existe —el constructor no está en Safari de iOS—. Además,
 * así tocar el aviso trae la app al frente en vez de no hacer nada.
 *
 * Con la app CERRADA no llega: eso lo cubre Web Push desde el servidor. Los dos
 * caminos existen y se pisan a propósito — el mismo aterrizaje puede salir por
 * acá (pestaña viva) y por push (el despertador), y sin ponerse de acuerdo eran
 * DOS notificaciones para el mismo hecho, apiladas, porque cada una traía su
 * propio `tag`. Por eso `tag` ahora entra por parámetro: pasándole el mismo que
 * usa el servidor —`loro:<id>`— la segunda reemplaza a la primera en vez de
 * sumarse. Un loro es una noticia, no tres.
 */
export function avisar(a: Aviso): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  serviceWorker()
    .then((sw) => {
      if (sw) {
        return sw.showNotification(a.titulo, {
          body: a.cuerpo,
          icon: "/apple-icon.png",
          tag: a.tag,
          // Lo mismo que manda el servidor, para que tocar el aviso de la
          // pestaña abierta lleve al mismo lugar que el de la app cerrada.
          // Lo lee `notificationclick` en public/sw.js.
          data: { url: a.url },
        });
      }
      // Sin service worker —navegador viejo, o el registro falló— se usa lo de
      // antes. En iOS no hay nada que hacer y esto tira, por eso el catch.
      new Notification(a.titulo, { body: a.cuerpo, icon: "/icon.svg", tag: a.tag });
    })
    .catch(() => {});
}

/**
 * Los loros del mundo, para la vista "Del resto".
 *
 * Se consulta aparte de /api/estado y solo mientras la vista está prendida: es
 * una respuesta que no le sirve de nada a quien está mirando lo suyo, y son
 * decenas de vuelos que no hacen falta traer a cada rato.
 *
 * Ocho segundos entre consultas, y no cuatro como el estado propio: acá no hay
 * nada esperando que aterrice: las aves se mueven solas entre consulta y
 * consulta, con la misma cuenta que usa el mapa para las tuyas.
 */
export function useMundo(activa: boolean) {
  const [vuelos, setVuelos] = useState<VueloMundo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activa) return;
    let vivo = true;

    const traer = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const j = await pedir<{ vuelos: VueloMundo[] }>("/api/mundo");
        if (!vivo) return;
        setVuelos(j.vuelos || []);
        setError("");
      } catch (e: any) {
        if (vivo) setError(e?.message || "No se pudo mirar el mundo.");
      } finally {
        if (vivo) setCargando(false);
      }
    };

    setCargando(true);
    traer();
    const id = setInterval(traer, 8000);
    document.addEventListener("visibilitychange", traer);
    return () => {
      vivo = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", traer);
    };
  }, [activa]);

  return { vuelos, cargando, error };
}
