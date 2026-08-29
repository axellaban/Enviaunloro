// La portada. Una sola pantalla: qué es, y verlo funcionando.
//
// Lo que había antes —pasos numerados, tabla de tiempos, secciones de
// privacidad y de extravío— explicaba mucho antes de mostrar nada. Todo eso
// está en el README y, sobre todo, adentro de la app: el tiempo de cada ave se
// ve al escribir, y la zona de privacidad se ve en el mapa. Acá alcanza con el
// teléfono de la derecha, donde las aves cruzan el Atlántico de verdad.

import Link from "next/link";
import { Ave } from "../components/Ave";
import { TelefonoHero } from "../components/TelefonoHero";
import { Cta } from "../components/Cta";
import { Trayectoria } from "../components/Trayectoria";
import { nidoPorCodigo } from "../lib/datos";

/**
 * La portada, y también la pantalla de invitación.
 *
 * Cuando alguien comparte su nido, el link lleva el código adentro (`/?n=XXXXXX`)
 * en vez de pedirle a la otra persona que copie seis caracteres a mano y
 * después adivine dónde pegarlos. Acá se resuelve a quién pertenece ese código
 * y se lo saluda por su nombre: quien abre el link ve de quién es la invitación
 * antes de decidir nada.
 *
 * El nombre se expone solo a quien ya tiene el código, que es algo que se
 * comparte a propósito. Recorrer los 32^6 códigos posibles para juntar apodos
 * no lleva a ningún lado: no dan acceso a nada por sí solos, hay que aceptar
 * la amistad igual, y el envío exige que el otro esté en tu bandada.
 */
export default async function Portada({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  const codigo = String(n || "").trim().toUpperCase();
  const invita = /^[A-Z0-9]{6}$/.test(codigo) ? await nidoPorCodigo(codigo) : null;

  return (
    <main className="portada">
      <section className="hero">
        <div className="hero-texto">
          {invita && (
            <div className="invitacion">
              <Ave especie={invita.ave} size={44} aletea />
              <p>
                <strong>{invita.nombre}</strong> te quiere mandar un loro
                {invita.lugar ? ` desde ${invita.lugar}` : ""}.
              </p>
            </div>
          )}

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
            <Cta>
              <Link
                href={invita ? `/nido?n=${codigo}` : "/nido"}
                className="boton"
                style={{ padding: "15px 28px", fontSize: 16 }}
              >
                {invita ? `Armar mi nido y sumar a ${invita.nombre}` : "Soltar mi primer loro"}
              </Link>
            </Cta>
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
