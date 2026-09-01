"use client";

// "¿Te aviso cuando aterrice?"
//
// El permiso de avisos, pedido en el único momento en que la pregunta se
// contesta sola: cuando hay un ave en el aire. Antes se pedía apenas terminaba
// el onboarding —sin contexto, y encima sin mirar si el servidor tenía claves
// VAPID para poder mandar algo— y esa es la peor forma de gastarlo, porque un
// "no" del navegador no se puede volver a preguntar nunca.
//
// Es la misma lección que la ubicación, que por eso se pide en el paso 2 del
// onboarding y no al entrar. Acá la app promete "tu guacamayo llega en 1 día
// 6 h": la pregunta "¿querés que te avise?" no necesita explicación, necesita
// llegar cuando hay un guacamayo volando.
//
// DOS PREGUNTAS Y NO UNA, que es todo el truco. Primero esta tarjeta, que es
// nuestra y no cuesta nada: decir que no acá no quema nada y se puede volver a
// ofrecer. El cartel del navegador —el que es para siempre— se abre recién
// cuando alguien tocó "Avisame", o sea cuando ya dijo que sí. Se gasta la
// oportunidad únicamente sobre alguien que ya contestó que la quiere.
//
// Y en iPhone no se pide nada, porque no hay nada que pedir: sin agregar la app
// a la pantalla de inicio el Push API no existe y el cartel del permiso no
// aparece. Lo único que sirve ahí es contar el paso que lo desbloquea.

import { useEffect, useState } from "react";
import { estadoDeAvisos, pedir, pedirPermisoAvisos, type EstadoAvisos } from "../lib/cliente";

/** "Ahora no" dura lo que dura la pestaña: es una postergación, no un no. */
const AHORA_NO = "loros:avisos-ahora-no";

export function Avisos({ hayVuelo }: { hayVuelo: boolean }) {
  const [estado, setEstado] = useState<EstadoAvisos | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [copiada, setCopiada] = useState(false);
  const [pospuesto, setPospuesto] = useState(true);

  useEffect(() => {
    try {
      setPospuesto(Boolean(sessionStorage.getItem(AHORA_NO)));
    } catch {
      setPospuesto(false);
    }
    let vivo = true;
    estadoDeAvisos().then((e) => {
      if (vivo) setEstado(e);
    });
    return () => {
      vivo = false;
    };
  }, []);

  function ahoraNo() {
    try {
      sessionStorage.setItem(AHORA_NO, "1");
    } catch {}
    setPospuesto(true);
  }

  // Sin nada en el aire no hay nada que avisar, y la pregunta vuelve a ser
  // abstracta. Es justamente la condición que hace que valga la pena hacerla.
  if (!hayVuelo || pospuesto) return null;
  // "listo", "negado" e "imposible" no tienen nada que ofrecer: en el primero
  // ya está hecho y en los otros dos no hay nada que la persona pueda hacer
  // desde acá. Un cartel que no lleva a ninguna parte es ruido.
  if (estado !== "sePuedePedir" && estado !== "hayQueInstalar") return null;

  const instalar = estado === "hayQueInstalar";

  return (
    <div
      className="tarjeta entra"
      style={{ marginBottom: 10, borderColor: "rgba(52,211,153,.45)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 19 }}>{instalar ? "📲" : "🔔"}</span>
        <p style={{ flex: 1, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>
          {!instalar
            ? "¿Te aviso cuando aterrice?"
            : copiada
              ? "Listo. Ahora agregala a tu pantalla"
              : "Para que te avise, agregala a tu pantalla"}
        </p>
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--suave)", marginBottom: 12 }}>
        {/* UNA COSA POR VEZ, y antes eran tres pasos numerados más un párrafo
            explicando por qué. Todo cierto y todo ilegible: nadie lee cinco
            renglones en un cartel que le apareció sin pedirlo. Un cartel no
            explica, secuencia. Primero se guarda la llave; recién cuando está
            guardada aparece qué hacer con ella. */}
        {instalar ? (
          copiada ? (
            <>
              Tocá <strong>Compartir</strong> → <strong>Agregar a inicio</strong>
              . Al abrirla desde tu pantalla, tocá{" "}
              <strong>«Ya tengo un nido»</strong> y pegá la llave.
            </>
          ) : (
            <>
              La app agregada arranca vacía, así que primero guardá tu llave:
              es lo que te devuelve este mismo nido.
            </>
          )
        ) : (
          <>
            Hay algo en el aire y puede tardar horas. Te aviso cuando aterrice,
            aunque tengas la app cerrada — no hace falta que dejes esto abierto.
          </>
        )}
      </p>

      {/* Antes de mandar a nadie a instalar, la llave. Es el único momento en
          que se entiende para qué sirve, y el único en que todavía se puede
          sacar: después de agregarla a la pantalla, del otro lado no hay
          barra de direcciones ni cookie ni forma de volver. */}
      {instalar && !copiada && (
        <button
          className="boton chico"
          style={{ width: "100%", marginBottom: 12 }}
          disabled={copiando}
          onClick={async () => {
            setCopiando(true);
            try {
              const r = await pedir<{ llave: string }>("/api/sesion");
              const url = `${window.location.origin}/entrar?llave=${encodeURIComponent(r.llave)}`;
              // Compartir primero: en iPhone es lo que deja mandársela a uno
              // mismo por WhatsApp o guardarla en Notas, que es lo que de
              // verdad sobrevive a cerrar Safari. El portapapeles es la red.
              if (navigator.share) {
                await navigator.share({ title: "La llave de mi nido", url }).catch(() => {});
              } else {
                await navigator.clipboard.writeText(url).catch(() => {});
              }
              setCopiada(true);
            } catch {
              setCopiada(false);
            } finally {
              setCopiando(false);
            }
          }}
        >
          {copiando ? "Un segundo…" : "🔑 Guardar mi llave"}
        </button>
      )}

      {!instalar && (
        <button
          className="boton chico"
          style={{ width: "100%" }}
          disabled={pidiendo}
          onClick={async () => {
            setPidiendo(true);
            setEstado(await pedirPermisoAvisos());
            setPidiendo(false);
          }}
        >
          {pidiendo ? "Un segundo…" : "Avisame"}
        </button>
      )}

      {/* 12 px entre pastillas apiladas: cada una estira su zona de toque a 44
          y con menos aire se pisan. */}
      <button
        className="boton chico fantasma"
        style={{ width: "100%", marginTop: instalar && !copiada ? 0 : 12 }}
        onClick={ahoraNo}
      >
        {/* Guardada la llave, lo único que queda es irse: "Ahora no" ahí sería
            raro —ya hizo lo que se le pidió— y "Entendido" sin haber guardado
            nada suena a que el cartel se dio por vencido. */}
        {!instalar ? "Ahora no" : copiada ? "Listo, la agrego" : "Ahora no"}
      </button>

      {!instalar && (
        <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--tenue)", marginTop: 10 }}>
          Nunca va el texto del mensaje, ni un pedazo. Abrirlo es la gracia:
          adelantarlo en la pantalla de bloqueo la arruina.
        </p>
      )}
    </div>
  );
}
