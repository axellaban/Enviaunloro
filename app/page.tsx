// La portada. Una sola pantalla: qué es, y verlo funcionando.
//
// Lo que había antes —pasos numerados, tabla de tiempos, secciones de
// privacidad y de extravío— explicaba mucho antes de mostrar nada. Todo eso
// está en el README y, sobre todo, adentro de la app: el tiempo de cada ave se
// ve al escribir, y la zona de privacidad se ve en el mapa. Acá alcanza con el
// teléfono de la derecha, donde las aves cruzan el Atlántico de verdad.

import { TelefonoHero } from "../components/TelefonoHero";
import { Trayectoria } from "../components/Trayectoria";
import { Invitacion } from "../components/Invitacion";
import { PortadaCta } from "../components/PortadaCta";

/**
 * La portada.
 *
 * Es ESTÁTICA, y eso es una decisión de escala más que de estilo: es la página
 * que se comparte por WhatsApp, o sea la única que tiene que aguantar un pico
 * de gente entrando toda junta. Mientras resolvía el código de invitación en el
 * servidor (`searchParams` + una consulta a la base) Next la marcaba dinámica y
 * cada click terminaba pegándole al servidor. Ahora sale del CDN y el saludo
 * —"Fulana te quiere mandar un loro"— lo resuelve el navegador aparte.
 */
export default function Portada() {
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
            La aplicación de mensajería donde tu Lorito viaja en tiempo real
            según la distancia. Una experiencia de comunicación verdaderamente
            única.
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
