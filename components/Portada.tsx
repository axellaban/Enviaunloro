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
            Envía Loritos,
            <br />
            <span
              style={{
                background: "linear-gradient(100deg, #a3e635, #10b981 45%, #22d3ee)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              no mensajes.
            </span>
          </h1>

          <p
            style={{
              maxWidth: 560,
              margin: "24px 0 0",
              fontSize: "clamp(16px, 2.2vw, 19px)",
              lineHeight: 1.6,
              color: "var(--suave)",
            }}
          >
            {/* Concreto, no publicitario. Decía "una experiencia de
                comunicación verdaderamente única", que es la frase que pone
                cualquier app en el renglón más caro de su página y no dice
                nada. Lo que engancha acá es el dato: que la distancia tarda. */}
            Escribís, elegís un ave y la soltás. Cruza el mapa en tiempo real y
            tarda lo que tarda: un perico a la vuelta llega en minutos, un
            guacamayo al otro lado del Atlántico tarda dieciséis días. La
            distancia vuelve a existir.
          </p>

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
