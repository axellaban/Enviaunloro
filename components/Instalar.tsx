"use client";

// "Ponela en tu pantalla".
//
// En iPhone instalar es el REQUISITO para que existan los avisos, y eso lo
// cuenta components/Avisos.tsx porque ahí es una consecuencia. En Android no
// hace falta para notificar — y sin embargo cambia igual si la persona vuelve o
// no: un ícono en la pantalla de inicio, para algo que avisa cuando aterriza un
// ave a las tres de la tarde, es la diferencia entre una app y una pestaña que
// se cerró.
//
// Chrome tiene su propio menú para esto, escondido en los tres puntitos con el
// nombre "Instalar aplicación" o "Agregar a la pantalla principal" según la
// versión. Nadie lo encuentra. Lo que sí existe es `beforeinstallprompt`: el
// navegador avisa cuando considera la app instalable y deja guardar el evento
// para abrir el diálogo cuando uno quiera. Eso es esto.
//
// POR QUÉ NO APARECÍA ANTES. Chrome no dispara ese evento si el service worker
// no tiene un manejador de `fetch`, y el de esta app no lo tenía a propósito
// —no cachea nada, que para un mapa en vivo es lo correcto—. Ahora tiene uno
// vacío que no intercepta nada (public/sw.js). El evento no se puede fabricar:
// si el navegador no lo manda, acá no se muestra nada, y eso está bien. Un
// botón "Instalar" que no instala es peor que ninguno.
//
// Y no se ofrece en iPhone. Allá este evento no existe —Safari nunca lo
// implementó— y el paso es a mano; contarlo dos veces sería ruido.
//
// Y TAMPOCO APARECÍA POR LLEGAR TARDE. Chrome manda ese evento una sola vez, a
// los pocos milisegundos de cargar la página, y esta tarjeta vive adentro del
// panel: se monta recién cuando terminó de cargar el nido, después de la
// pantalla de arranque y de la consulta al servidor. Para entonces el evento ya
// había pasado y no vuelve. Ahora lo atrapa un script de app/layout.tsx que
// corre antes que cualquier React y lo deja en `window.__instalar`; acá se lee
// eso al montarse, además de seguir escuchando por si llega después.

import { useEffect, useState } from "react";

/** Una vez que dijo que no, no se vuelve a ofrecer. */
const NO_GRACIAS = "loros:instalar-no";

/** Lo que Chrome entrega en `beforeinstallprompt`. No está en lib.dom. */
type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function Instalar() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [instalando, setInstalando] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(NO_GRACIAS)) return;
    } catch {}

    const guardada = () =>
      (window as unknown as { __instalar?: EventoInstalar | null }).__instalar ?? null;

    // Lo que el script del layout ya atrapó, si atrapó algo. Este es el caso
    // normal: para cuando esta tarjeta se monta, el evento ya pasó.
    setEvento(guardada());

    // Y por si llega después: el navegador puede tardar en decidir que la app
    // es instalable. `loros:instalable` lo avisa el mismo script del layout,
    // que es el único que escucha el evento de Chrome —si lo escucháramos los
    // dos, `preventDefault` correría dos veces sobre el mismo evento—.
    const alCambiar = () => setEvento(guardada());
    window.addEventListener("loros:instalable", alCambiar);
    return () => window.removeEventListener("loros:instalable", alCambiar);
  }, []);

  /** El evento sirve una sola vez: usado, se tira también el guardado. */
  function gastar() {
    try {
      (window as unknown as { __instalar?: EventoInstalar | null }).__instalar = null;
    } catch {}
    setEvento(null);
  }

  function noGracias() {
    try {
      localStorage.setItem(NO_GRACIAS, "1");
    } catch {}
    gastar();
  }

  if (!evento) return null;

  return (
    <div className="tarjeta entra" style={{ marginBottom: 10, borderColor: "rgba(52,211,153,.4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 19 }}>📲</span>
        <p style={{ flex: 1, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>
          Ponela en tu pantalla
        </p>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--suave)", marginBottom: 12 }}>
        Un ave puede tardar horas en llegar. Con la app en la pantalla de inicio
        se abre de un toque cuando te avisa, en vez de tener que buscar la
        pestaña.
      </p>
      <button
        className="boton chico"
        style={{ width: "100%" }}
        disabled={instalando}
        onClick={async () => {
          setInstalando(true);
          try {
            await evento.prompt();
            // Se haya instalado o no, el evento ya se usó: Chrome no deja
            // volver a abrir el mismo diálogo. Si dijo que no, lo vuelve a
            // ofrecer solo cuando el navegador mande otro evento.
            await evento.userChoice;
          } catch {}
          gastar();
          setInstalando(false);
        }}
      >
        {instalando ? "Instalando…" : "Instalar"}
      </button>
      <button
        className="boton chico fantasma"
        style={{ width: "100%", marginTop: 12 }}
        onClick={noGracias}
      >
        No, gracias
      </button>
    </div>
  );
}
