"use client";

// El interruptor de arriba del mapa: lo tuyo, o lo de todos.
//
// Dos vistas del mismo mapa. "Los tuyos" es la de siempre: tu nido, tu bandada
// y los loros que van o vienen de vos. "Del resto" muestra lo que está
// cruzando el planeta ahora mismo, de cualquiera — y ahí no hay nombres, ni
// nidos dibujados, ni una letra de ningún mensaje: solo aves anónimas con las
// puntas de su recorrido corridas 25 km (lib/privacidad.ts).
//
// Va acá arriba y chico a propósito. Es una vista, no una sección: tiene que
// poder probarse de un toque y volver de otro, sin sentir que uno se fue a
// otra parte de la app.

export type Vista = "tuyos" | "resto";

const OPCIONES: { id: Vista; texto: string }[] = [
  { id: "tuyos", texto: "Los tuyos" },
  { id: "resto", texto: "Del resto" },
];

export function VistaMapa({
  vista,
  alCambiar,
}: {
  vista: Vista;
  alCambiar: (v: Vista) => void;
}) {
  return (
    <div
      className="flotante"
      style={{ top: 12, left: 56, padding: 3, gap: 2 }}
      role="group"
      aria-label="Qué loros ves en el mapa"
    >
      {OPCIONES.map((o) => {
        const activa = o.id === vista;
        return (
          <button
            key={o.id}
            onClick={() => alCambiar(o.id)}
            aria-pressed={activa}
            style={{
              // La chapa se ve chica —es una vista, no una sección— pero se
              // toca entera: 24 px de alto era la mitad del mínimo táctil y
              // con el pulgar se le erraba al mapa de atrás.
              minHeight: 44,
              display: "grid",
              placeItems: "center",
              padding: "5px 12px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              font: "inherit",
              fontSize: 11.5,
              fontWeight: 700,
              whiteSpace: "nowrap",
              background: activa ? "var(--esmeralda)" : "transparent",
              color: activa ? "#04120e" : "var(--suave)",
              transition: "background .15s ease, color .15s ease",
            }}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}
