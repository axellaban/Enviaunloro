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

/** El arco: la ruta punteada con el ave a media distancia. */
function Trayectoria() {
  return (
    <div style={{ position: "relative", maxWidth: 520, margin: "44px auto 0", height: 120 }}>
      <svg viewBox="0 0 640 120" style={{ width: "100%", height: "100%" }} aria-hidden="true">
        <path
          d="M40 96 Q320 -18 600 96"
          fill="none"
          stroke="#10b981"
          strokeOpacity="0.4"
          strokeWidth="2"
          strokeDasharray="3 10"
          strokeLinecap="round"
        />
        <circle cx="40" cy="96" r="6" fill="#10b981" />
        <circle cx="600" cy="96" r="6" fill="#22d3ee" />
        <text x="40" y="118" fill="#5d7873" fontSize="12" textAnchor="middle">
          tu nido
        </text>
        <text x="600" y="118" fill="#5d7873" fontSize="12" textAnchor="middle">
          el suyo
        </text>
      </svg>
      {/* Va y viene despacio sobre el arco. Sin rotarlo: el ave mira siempre a
          la derecha, y girarla en la vuelta la dejaría volando de cola. A esta
          velocidad y con este recorrido corto, la deriva se lee como aletear en
          el lugar. */}
      <div className="hero-ave">
        <Ave especie="perico" size={54} aletea />
      </div>
    </div>
  );
}
