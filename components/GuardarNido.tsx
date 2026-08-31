"use client";

// "Este nido vive adentro de WhatsApp".
//
// El aviso que aparece cuando la app se está usando adentro del navegador de
// otra app (lib/navegador.ts explica por qué eso rompe el nido). Es la única
// pantalla de toda la app que le habla a la persona de algo que todavía no le
// pasó, así que tiene que ganarse el lugar:
//
//   NO ES UNA ALARMA. Nada está roto y no hay nada que arreglar. Lo que hay es
//   una cosa que conviene hacer una vez y no volver a pensar, y eso es lo que
//   dice. Un cartel rojo acá asusta a alguien que recién llegó, por un problema
//   que va a tener dentro de dos días.
//
//   NO BLOQUEA. Va adentro del panel, con el mapa vivo arriba: quien lo quiera
//   ignorar lo ignora y sigue usando la app. Un modal encima del mapa, a los
//   diez segundos de haber armado el nido, es el peor momento posible.
//
//   SE VA Y NO VUELVE. Con la llave guardada, o con "Ya la tengo". Un aviso que
//   reaparece deja de leerse a la tercera y pasa a ser parte del fondo.
//
// Lo que ofrece es exactamente lo mismo que está en Nido → Otro dispositivo: la
// llave. No hay un mecanismo nuevo acá, hay un momento nuevo — el único en que
// se entiende para qué sirve.
//
// Y comparte en vez de copiar, donde se pueda. En el navegador de una app, el
// portapapeles es un lugar del que la llave puede no salir nunca: la persona
// cierra WhatsApp y se la lleva puesta hasta el próximo copiado. El menú de
// compartir la manda AFUERA —al chat con uno mismo, a las notas, al mail—, que
// es el único lugar donde sirve de algo.

import { useEffect, useState } from "react";
import { pedir } from "../lib/cliente";
import { navegadorDeAhora } from "../lib/navegador";

/** Con la llave a mano, esto no se vuelve a mostrar. */
const YA_ESTA = "loros:nido-guardado";

export function GuardarNido() {
  /** null mientras no se sabe: el user agent se lee en el navegador, y
   *  dibujarlo en el servidor daría un parpadeo del aviso a todo el mundo. */
  const [app, setApp] = useState<string | null>(null);
  const [llave, setLlave] = useState("");
  const [error, setError] = useState("");
  const [pidiendo, setPidiendo] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(YA_ESTA)) return;
    } catch {
      // Modo privado o almacenamiento bloqueado. El aviso sale igual: lo único
      // que se pierde es no repetirlo, y de los dos errores posibles este es
      // el barato.
    }
    const n = navegadorDeAhora();
    if (n.deApp) setApp(n.app);
  }, []);

  function listo() {
    try {
      localStorage.setItem(YA_ESTA, "1");
    } catch {}
    setApp(null);
  }

  async function guardar() {
    setPidiendo(true);
    setError("");
    try {
      const r = await pedir<{ llave: string }>("/api/sesion");
      const url = `${window.location.origin}/entrar?llave=${encodeURIComponent(r.llave)}`;
      setLlave(url);
      // Compartir primero. Si no hay menú, el portapapeles; y si tampoco, el
      // link queda escrito abajo para copiarlo a mano — que es feo pero
      // funciona, y es mejor que un botón que no hace nada.
      if (navigator.share) {
        await navigator.share({
          title: "Mi nido de Loros",
          text: "La llave de mi nido. Abrir este link entra a mi nido: no se la pases a nadie.",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch (e: unknown) {
      // Cancelar el menú de compartir tira AbortError, y eso no es un error:
      // es alguien que se arrepintió. El link ya está en pantalla igual.
      const nombre = (e as { name?: string })?.name || "";
      if (nombre !== "AbortError" && !llave) {
        setError("No se pudo sacar la llave. Probá de nuevo.");
      }
    } finally {
      setPidiendo(false);
    }
  }

  if (app === null) return null;

  // "el navegador de WhatsApp" cuando se sabe cuál es, y algo que igual se
  // entienda cuando no: nombrarlo mal sería peor que no nombrarlo.
  const donde = app ? `el navegador de ${app}` : "el navegador de otra app";

  return (
    <div
      className="tarjeta entra"
      style={{ marginBottom: 10, borderColor: "rgba(251,191,36,.45)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 19 }}>🔑</span>
        <p style={{ flex: 1, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>
          Guardate el nido antes de salir de acá
        </p>
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--suave)", marginBottom: 12 }}>
        Estás usando {donde}, que guarda sus cosas aparte. Tu nido —con tu
        código, tu bandada y tus loros— vive <strong>solo acá adentro</strong>:
        si mañana entrás desde Chrome o Safari, no lo vas a encontrar. Con la
        llave entrás desde donde quieras.
      </p>

      {llave && (
        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--tenue)",
            wordBreak: "break-all",
            background: "rgba(0,0,0,.28)",
            border: "1px solid var(--borde)",
            borderRadius: 10,
            padding: "var(--aire-2) 10px",
            marginBottom: 10,
          }}
        >
          {llave}
        </p>
      )}

      {error && (
        <p style={{ color: "#fca5a5", fontSize: 12.5, marginBottom: 10 }}>{error}</p>
      )}

      <button
        className="boton chico"
        style={{ width: "100%" }}
        disabled={pidiendo}
        onClick={guardar}
      >
        {pidiendo ? "Sacando la llave…" : llave ? "Volver a mandarme la llave" : "Mandarme la llave"}
      </button>

      {/* 12 px de aire y no 8: las dos pastillas se dibujan de 34 y estiran su
          zona de toque a 44, o sea 5 para cada lado. Con menos, se pisan. */}
      <button
        className="boton chico fantasma"
        style={{ width: "100%", marginTop: 12 }}
        onClick={listo}
      >
        {llave ? "Listo, la guardé" : "Ya la tengo"}
      </button>

      <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--tenue)", marginTop: 10 }}>
        La llave <strong>es</strong> el nido: quien la tenga entra. Mandátela a
        vos, no la publiques. Siempre está en <em>Nido → Otro dispositivo</em>.
      </p>
    </div>
  );
}
