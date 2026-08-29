// Lo que leaflet-rotate le agrega a Leaflet en tiempo de ejecución.
//
// El `import` de arriba no es decorativo: convierte este archivo en un módulo,
// y solo así `declare module "leaflet"` se lee como una AMPLIACIÓN de los tipos
// de leaflet en vez de como un reemplazo. Sin él, TypeScript da por hecho que
// leaflet exporta únicamente lo que está acá abajo y se cae todo el mapa.
import "leaflet";

declare module "leaflet" {
  interface MapOptions {
    /** Habilita el giro del mapa. Sin esto, el resto no hace nada. */
    rotate?: boolean;
    /** Rumbo inicial, en grados. 0 = norte arriba. */
    bearing?: number;
    /** Girar con dos dedos, como en Google Maps. */
    touchRotate?: boolean;
    /** En la compu: shift + arrastrar. */
    shiftKeyRotate?: boolean;
    /** La brújula que trae el plugin. La app dibuja la suya. */
    rotateControl?: boolean | { closeOnZeroBearing?: boolean; position?: string };
    /** Seguir la brújula del teléfono. */
    compassBearing?: boolean;
  }

  interface Map {
    setBearing(grados: number): this;
    getBearing(): number;
  }
}
