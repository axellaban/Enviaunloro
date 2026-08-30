// El link de un lorito de convite: /l/<llave>.
//
// Muestra EXACTAMENTE la misma portada que "/". Existe por una sola razón, y
// es lo que se ve antes de abrirlo: la miniatura y el texto que aparecen al
// pegar el link en WhatsApp.
//
// La portada de "/" es estática a propósito —es la que puede recibir un pico
// de gente de golpe, y sale del CDN— así que no puede cambiar sus etiquetas
// según un `?c=`: el HTML es el mismo para todos. Un lorito de convite, en
// cambio, se le manda a UNA persona. Por eso tiene ruta propia: acá sí se
// puede consultar quién lo mandó y contarlo en la vista previa, sin que eso
// le cueste nada a la portada.
//
// Lo que NO sale de acá es el mensaje. Es la regla número uno de la app y en
// una vista previa pesa más que en ningún lado: la miniatura de WhatsApp la
// ve cualquiera que reciba el reenvío, y el texto todavía está volando. Sale
// quién lo mandó, en qué barrio espera y cuántos copetines lleva — lo mismo
// que ya cuenta /api/convite, que es público.

import type { Metadata } from "next";
import { Portada } from "../../../components/Portada";
import { borrachera, ciudadDe, estadoDeConvite } from "../../../lib/cerveceria";
import { convite, horariosDelConvite } from "../../../lib/convite";
import { escalaGlobal, nido } from "../../../lib/datos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ llave: string }>;
}): Promise<Metadata> {
  const { llave } = await params;
  const c = await convite(llave);
  const de = c && (await nido(c.de));
  // Sin convite —caducó, nunca existió, la base no contesta— la vista previa
  // vuelve a ser la de la app. Un link roto no tiene por qué verse roto.
  if (!c || !de) return {};

  const ahora = Date.now();
  const escala = escalaGlobal();
  const { abandona, enCasa } = horariosDelConvite(c, { lat: de.lat, lng: de.lng }, escala);
  const estado = estadoDeConvite(
    {
      llegadaPosada: c.llegadaPosada,
      abandona,
      enCasa,
      reclamado: Boolean(c.reclamado),
      cancelado: c.cancelado,
    },
    ahora
  );
  const b = borrachera(Math.max(0, Math.min(ahora, abandona) - c.llegadaPosada), escala);
  const copas =
    b.copetines > 0 ? `, con ${b.copetines} copetín${b.copetines === 1 ? "" : "es"} encima,` : "";
  const barrio = c.lugar ? ` de ${ciudadDe(c.lugar)}` : " del barrio";

  const titulo = `${de.nombre} te mandó un lorito 🦜`;
  const descripcion =
    estado === "reclamado"
      ? "Ese lorito ya salió para otro lado."
      : estado === "cancelado"
        ? `${de.nombre} lo llamó de vuelta. Ese link ya no trae nada.`
        : estado === "yendo"
          ? "Va camino a una cervecería a esperarte. Abrí el link y armá tu nido: de ahí sale para vos."
          : estado === "barra"
            ? `Está de jarola en una cervecería${barrio}${copas} esperando a que armes tu nido. Abrilo y sale para vos.`
            : `Se cansó de esperarte${copas} y se volvió a dormirla. Armá tu nido y sale igual, esta vez sobrio.`;

  return {
    title: titulo,
    description: descripcion,
    openGraph: { title: titulo, description: descripcion, type: "website", locale: "es_AR" },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion },
  };
}

export default function Pagina() {
  return <Portada />;
}
