// La portada. Una sola pantalla: qué es, y verlo funcionando.
//
// Lo que había antes —pasos numerados, tabla de tiempos, secciones de
// privacidad y de extravío— explicaba mucho antes de mostrar nada. Todo eso
// está en el README y, sobre todo, adentro de la app: el tiempo de cada ave se
// ve al escribir, y la zona de privacidad se ve en el mapa. Acá alcanza con el
// teléfono de la derecha, donde las aves cruzan el Atlántico de verdad.
//
// Es ESTÁTICA, y eso es una decisión de escala más que de estilo: es la página
// que se comparte por WhatsApp, o sea la única que tiene que aguantar un pico
// de gente entrando toda junta. Mientras resolvía el código de invitación en el
// servidor (`searchParams` + una consulta a la base) Next la marcaba dinámica y
// cada click terminaba pegándole al servidor. Ahora sale del CDN y el saludo
// —"Fulana te quiere mandar un loro"— lo resuelve el navegador aparte.
//
// El dibujo está en components/Portada.tsx porque /l/<lorito> muestra lo mismo.

import { Portada } from "../components/Portada";

export default function Pagina() {
  return <Portada />;
}
