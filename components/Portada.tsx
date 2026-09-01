// La portada, como componente.
//
// Vive acá y no en app/page.tsx porque hay DOS rutas que muestran la misma
// pantalla: la portada de siempre y /l/<lorito>, el link de un convite. La
// segunda existe solo para poder darle a ese link su propia miniatura y su
// propio texto en WhatsApp; lo que se ve al abrirlo tiene que ser idéntico.

import { TelefonoHero } from "./TelefonoHero";
import { Trayectoria } from "./Trayectoria";
import { Invitacion } from "./Invitacion";
import { PortadaCta } from "./PortadaCta";

export function Portada() {
  return (
    <main className="portada">
      <section className="hero">
        <div className="hero-texto">
          <Invitacion />

          <h1
            style={{
              fontSize: "clamp(38px, 7vw, 68px)",
              fontWeight: 850,
              lineHeight: 0.98,
              letterSpacing: "-0.035em",
            }}
          >
            {/* El degradado va en "Loritos" y no en el verbo: es la palabra
                rara de la frase, la que hace que alguien se detenga a leerla
                dos veces. Y queda sola en el segundo renglón, que es donde el
                ojo cae después del salto. */}
            Envía mensajes
            <br />
            con{" "}
            <span
              style={{
                background: "linear-gradient(100deg, #a3e635, #10b981 45%, #22d3ee)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Loritos
            </span>
          </h1>

          {/* TRES TIEMPOS Y NO UN PÁRRAFO. El texto de abajo del título son
              tres cosas distintas y cada una hace un trabajo: el chiste que te
              frena, la pregunta que te mete, y la promesa que te explica para
              qué. Corridos uno atrás de otro en un solo bloque se leen como una
              sola frase larga y se pierden los tres. Separados, cada uno tiene
              su renglón y su peso: el chiste va más fuerte y en el color del
              texto —es lo primero que se lee y tiene que sonar seguro—, la
              pregunta va del color del ave y es lo único en cursiva del bloque,
              y la promesa va abajo, suave, que es donde se lee sin urgencia. */}
          <div style={{ maxWidth: 560, marginTop: 24 }}>
            <p
              style={{
                margin: 0,
                fontSize: "clamp(17px, 2.4vw, 21px)",
                fontWeight: 750,
                lineHeight: 1.35,
                letterSpacing: "-0.015em",
                color: "var(--texto)",
              }}
            >
              Nueva red social, lenta e inútil.
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "clamp(16px, 2.2vw, 19px)",
                lineHeight: 1.5,
                fontStyle: "italic",
                color: "var(--esmeralda)",
              }}
            >
              ¿Qué pasa si los mensajes tomaran tiempo?
            </p>
            <p
              style={{
                margin: "14px 0 0",
                fontSize: "clamp(15px, 2vw, 17.5px)",
                lineHeight: 1.6,
                color: "var(--suave)",
              }}
            >
              Mensajes más lentos, conversaciones más profundas. La distancia
              vuelve a existir.
            </p>
          </div>

          <div style={{ marginTop: 34 }}>
            <PortadaCta />
          </div>

          <Trayectoria />
        </div>

        <div className="hero-tel">
          <TelefonoHero />
        </div>
      </section>
    </main>
  );
}
