# Loros 🦜

**Envía Loros, no mensajes.**

Mensajería donde el mensaje vuela. Tu ave despega desde tu ubicación real y
tarda lo que tiene que tardar hasta el nido de la otra persona. Hasta que no
aterriza, el mensaje **no existe** del otro lado.

---

## Las seis aves

Cuanto más rápido vuela, menos le entra en la cabeza. Ese canje es todo el
diseño del producto: elegir el ave es parte del mensaje.

| Ave | Velocidad | Máximo | Es… | Y además |
|---|---|---|---|---|
| **Perico** ⚡ | 90 km/h | 120 caracteres | El express | se enamora en el camino |
| **Cuervo** 🖤 | 70 km/h | 250 caracteres | El de las malas noticias | llega de negro |
| **Cotorra** 💬 | 60 km/h | 400 caracteres | La charlatana | te mezcla el mensaje |
| **Paloma** 💌 | 50 km/h | 600 caracteres | La romántica | explota en confeti |
| **Loro** 🦜 | 40 km/h | 1000 caracteres | El clásico | entrega tal cual |
| **Guacamayo** 👑 | 25 km/h | 2000 caracteres | El ceremonioso | tarda, y ese es el punto |

Y el 0,2% de los loros no llega nunca. Es poco. No es cero.

La escalera velocidad ↔ caracteres no tiene excepciones a propósito: una sola
ave que la rompa convierte la elección en un trámite, porque habría una mejor
que todas. Las velocidades **no** son ornitología —un guacamayo de verdad vuela
más rápido que un perico—: son balance de juego, y viven todas en
[`lib/aves.ts`](lib/aves.ts). Cambiás un número ahí y se corrigen solos la
landing, los ETA, el contador de caracteres y el color de la ruta en el mapa.

Cuánto tarda de verdad:

| Trayecto | Perico | Cotorra | Loro | Guacamayo |
|---|---|---|---|---|
| Cruzar la ciudad (8,4 km) | 5 min | 8 min | 13 min | 21 min |
| Buenos Aires → Montevideo (205 km) | 2 h 17 | 3 h 25 | 5 h 8 | 8 h 12 |
| Buenos Aires → Dublín (11.150 km) | 5 d 4 h | 7 d 18 h | 11 d 15 h | 18 d 14 h |

Sí: cruzar el Atlántico son días. Esa es la idea.

El piso del vuelo se mide en **distancia** (400 m) y no en tiempo, y eso importa
más de lo que parece: con un piso de segundos, mandarle algo a alguien de la
misma cuadra daba el mismo número para las seis aves, y elegir dejaba de
significar nada justo con la gente que uno tiene más cerca.

### Las que no entregan lo que escribiste

Cuatro de las seis hacen algo raro, y las cuatro lo **avisan antes de mandar**
(campo `aviso` en [`lib/aves.ts`](lib/aves.ts), que la pantalla de escribir
muestra pegado a la elección). Avisarlo después sería una trampa.

- **La cotorra** repite el mensaje en voz alta todo el viaje y se le mezcla:
  pierde palabras, repite otras, da vuelta alguna. Teléfono descompuesto con
  alas ([`lib/olvido.ts`](lib/olvido.ts)). Nunca toca la primera ni la última
  palabra —un mensaje que abre y cierra bien se entiende igual aunque el medio
  sea un desastre— y rompe alrededor de un quinto: más que eso deja de ser un
  chiste y pasa a ser ruido.
- **El perico** es el más rápido, y su contra es que se enamora. Cuatro de cada
  diez se cruzan con una perica a mitad de camino, se quedan dando vueltas —se
  ven girando en el mapa— y llegan tarde y con el mensaje retocado por ella,
  firma incluida. Como el tiempo deja de ser exacto, su ETA se muestra con un
  `+`: prometer el número pelado sería mentir, esconderlo sería peor. Un perico
  que **no** se distrae entrega el mensaje intacto: es el premio.
- **La paloma** cruza el mapa dejando flores y un corazón de chocolate, y
  cuando la abren del otro lado la pantalla explota en confeti.
- **El cuervo** trae malas noticias: llega casi tan rápido como el perico, y al
  abrirlo la pantalla se apaga y le caen plumas encima.

Las dos ceremonias son el mismo motor de partículas al revés
([`components/Fiesta.tsx`](components/Fiesta.tsx)): la alegría es un golpe y la
mala noticia se asienta. Las dos respetan `prefers-reduced-motion`.

### El ave queda del otro lado

Cuando el mensaje aterriza, el vuelo terminó pero el ave sigue posada en la
ventana de quien lo recibió, y **esa persona decide**: la suelta —y se la ve
volver por el mapa hasta el nido de origen, mismo tiempo que la ida—, la
enjaula, o la manda al puchero. Se decide una sola vez y no se puede desdecir.

Es la única forma que tiene el producto de que alguien responda algo sin
escribir una palabra: quien lo mandó se entera de la decisión sola.

## Correr local

```bash
npm install
npm run dev      # http://localhost:3000
```

No hace falta configurar nada: sin variables de entorno los datos van a
`.data/loros.json` y el mapa usa mosaicos de OpenStreetMap vía CARTO, que no
piden API key. Todas las variables opcionales están en
[`.env.example`](.env.example).

```bash
npm run typecheck   # tsc --noEmit
npm run prueba      # prueba de punta a punta contra la API (con el server corriendo)
```

## El 0,2%

Dos de cada mil loros no llegan. Se pierden en algún punto del camino —entre el
15% y el 85% del trayecto, para que no sea ni un chiste al despegar ni una
crueldad rozando el destino— y ese mensaje se perdió de verdad: quien lo
esperaba nunca sabe qué decía, no hay reintento automático ni copia guardada de
su lado. Quien lo mandó recupera su texto y puede volver a intentarlo.

El sorteo pasa una sola vez, al soltar el ave, y el resultado queda escrito: si
se decidiera al mirar, dos personas mirando el mismo vuelo obtendrían
respuestas distintas. Pero **no viaja al navegador hasta que ocurre** — si se
mandara desde el principio, abrir las herramientas de desarrollo diría de
antemano que ese loro no va a llegar, y esperar algo que ya sabés que no llega
no es esperar.

Se puede pisar con `LOROS_PROB_EXTRAVIO` (0 a 1) para probar ese camino sin
mandar quinientos loros. `LOROS_PROB_ROMANCE` hace lo mismo con el desvío del
perico:

```bash
LOROS_PROB_EXTRAVIO=1 npm run start   # todos se pierden
LOROS_PROB_EXTRAVIO=1 npm run prueba  # la suite detecta el modo y lo verifica

LOROS_PROB_ROMANCE=1 npm run start    # todos los pericos se distraen
LOROS_PROB_ROMANCE=1 npm run prueba
```

El desvío del perico sigue la misma regla que el extravío: se sortea al
despegar, queda escrito, y **no viaja al navegador hasta que ocurre**. Saber de
antemano que se va a distraer arruina el momento en que se distrae.

## Ubicación y privacidad

Es el punto delicado del producto, así que está separado en dos cosas
distintas: **la app sabe dónde estás; tus contactos, no.**

- El servidor guarda las coordenadas exactas y calcula el vuelo con ellas.
- Lo que sale hacia el navegador de otra persona es un punto **corrido al azar
  hasta 300 m** ([`lib/privacidad.ts`](lib/privacidad.ts)), y el mapa dibuja ese
  círculo en lugar de un pin. El desvío es fijo por nido: si cambiara en cada
  consulta, con unas cuantas muestras se podría promediar el centro y recuperar
  la posición real.
- El nombre de lugar que se comparte es a nivel ciudad ("Palermo, Argentina"),
  nunca una dirección.
- **La distancia y el tiempo de vuelo sí son exactos**: se calculan en el
  servidor con los puntos reales y viajan ya resueltos, así que el "205 km" es
  cierto aunque el dibujo sea aproximado.
- Tu propio nido lo ves exacto. Es tu dato.

Lo que esto no cubre, dicho derecho: el desvío es constante, así que si te
mudás de ciudad, quien te tenga agregado ve que te moviste (a una zona
equivocada, pero se nota el movimiento). Para un MVP donde solo te ve gente a
la que le diste tu código, es el canje razonable.

## Cómo se usa

1. **Armá tu nido**: nombre, ubicación y ave preferida. No hay registro ni
   contraseña — un id firmado en una cookie y listo.
2. **Sumá gente**: tocá `Compartir` y mandá el link por WhatsApp. Lleva tu
   código adentro (`/?n=loroparlanchin`), así que quien lo abre ve de quién
   viene la invitación y queda conectado apenas arma su nido — sin copiar ni
   pegar nada. El código también está a la vista para quien prefiera tipearlo
   en *Bandada → Agregar por código*.
3. **Soltá un loro**: elegís destinatario y ave. Antes de mandar ya ves cuánto
   tarda cada una hasta esa persona en particular.
4. **Seguí el vuelo**: el ave cruza el mapa en vivo, con lo recorrido, lo que
   falta y el contador. Los dos ven la misma ave en el mismo lugar.
5. **Aterriza**: recién ahí se abre el mensaje. Al otro le llegan dos avisos:
   uno al despegar ("viene un loro, llega en 4 h") y otro al aterrizar. El
   primero importa tanto como el segundo — saber que algo está en camino es la
   mitad del producto.
6. **Decidí qué hacer con el ave**: quedó posada de tu lado. La soltás y vuelve
   volando —quien te escribió la ve venir en el mapa—, la enjaulás, o al
   puchero. Una sola vez, sin vuelta atrás. **A la otra persona le llega el
   aviso**: es la única respuesta que la app permite dar sin escribir nada, y
   sin notificarla se perdía.

**Doña Cotorra** es una vecina automática que aparece sola a 2,2 km de tu nido
cuando te registrás, y contesta con la misma ave que le mandaste. Existe para
que la primera persona que entra tenga a quién escribirle.

### Mostrar la app sin esperar días

Había una casilla de *vuelo de prueba* en cada envío y se sacó: era una casilla
para desactivar la promesa central del producto, y **Doña Cotorra** ya cumple
esa función mejor —vive a 2,2 km, así que sus vuelos duran minutos y contesta
sola—. Para una demo con distancias de verdad está
`LOROS_ESCALA_TIEMPO` (el divisor global del tiempo de vuelo, 1 = tiempo real),
que viaja al navegador en `/api/estado` para que el tiempo que se promete antes
de mandar sea exactamente el que después se cumple.

## El código de nido

Dos palabras del mundo de la app —`loroparlanchin`, `zorzalgentil`,
`pericocuentero`— y no seis caracteres al azar. El código se dicta por teléfono,
se copia de un mensaje y se tipea a mano en un celular: `K7M2QX` cumplía y era
imposible de recordar.

Son 28 sustantivos × 145 adjetivos = **4.060 combinaciones**, todas sin acentos
ni ñ porque el código viaja en una URL. Los adjetivos son todos amables o
graciosos a propósito: es lo primero que una persona le manda a otra, y nadie
tiene que llevarse un insulto por sorteo. Si el sorteo choca ocho veces seguidas
—con miles de nidos— se numera en vez de pisar.

**Los códigos viejos siguen andando, sin migrar nada.** La clave con la que un
código vive en la base siempre fue su forma en MAYÚSCULAS, y eso no cambió:
`ABC123` sigue en `codigo:ABC123` y `loroparlanchin` va a
`codigo:LOROPARLANCHIN`. Los dos conviven, y quien ya repartió el suyo por ahí
lo conserva. Lo único que cambió es lo que se genera de acá en adelante.
Tampoco importa cómo se tipee: `K7M2QX`, `k7m2qx`, `k7m2-qx` y ` K7M2QX ` van
todos al mismo lado.

Y que un código nuevo no pueda caer encima de uno viejo tampoco depende de la
suerte: los viejos miden seis caracteres exactos y el más corto que puede salir
del sorteo mide siete (`alafiel`). Es imposible por longitud, no improbable por
cantidad de combinaciones. La prueba lo verifica contra las listas de verdad,
así que agregar mañana un adjetivo de tres letras se descubre ahí y no el día
que alguien pierde su nido.

De paso se arreglaron dos cosas que estaban mal en el generador viejo: si los
cinco intentos chocaban usaba igual el último —**pisando el código de otra
persona**, que quedaba sin forma de que la sumaran— y era comprobar-y-después-
escribir, o sea la misma carrera que costaba amistades, en el alta. Ahora el
código se reserva con la misma operación atómica que el resto.

## El color

Oscuro: selva de noche, fondo casi negro con verde adentro, y el color fuerte
reservado para una sola cosa —el ave—. Cada especie tiene el suyo y ese color
es el mismo en la tarjeta, en la ruta del mapa y en el ave que vuela, así se
sigue un vuelo de un vistazo sin leer nada. El verde de los botones es
exactamente el del perico: no un verde parecido, el mismo valor, para que el
botón y el bicho sean la misma cosa.

### El tema claro está escrito, apagado

Por un rato la app fue clara, con los grises de Instagram. Volvió a oscura,
pero esa paleta **no se tiró**: quedó viva en el código, y prenderla es una
línea.

```js
document.documentElement.dataset.tema = "claro";
```

Con eso solo cambia todo lo que es CSS: fondos, bordes, textos, botones, la
hoja de abajo, las chapas que flotan sobre el mapa y los controles de Leaflet.
Los valores están en `app/globals.css`, en `:root[data-tema="claro"]`.

Son los de Instagram —`#ffffff`, `#fafafa`, `#efefef` para los botones
secundarios, `#dbdbdb` para las separaciones, `#737373` para el texto de
segundo orden— con una excepción deliberada: para el tercer nivel ellos usan
`#a8a8a8`, que da **2,38:1** sobre blanco y no se lee. Acá va `#767676`. Sobre
fondo claro no hay lugar para tres grises legibles, y que un valor esté
estudiado no lo hace accesible.

**Lo que no es CSS vive en `lib/tema.ts`**, y es la mitad del asunto: las rutas
que Leaflet dibuja en SVG, el confeti del canvas y las aves se arman en
JavaScript y no leen una variable de CSS sin ayuda. Ahí están, medidos, los
colores de las seis aves en los dos temas, los rótulos del mapa, las sombras y
los mosaicos. El archivo explica los cuatro pasos que faltan para el
interruptor.

Los colores de las aves no son los mismos con otro nombre. Los oscuros están
elegidos para brillar contra un fondo casi negro y sobre blanco dan entre
1,51:1 y 2,72:1 —todos ilegibles, cuando el mínimo es 4,5:1—. Los claros son la
misma familia dos o tres pasos más oscura: el perico sigue siendo verde lima y
el guacamayo sigue siendo ámbar, pero se leen. Van de 4,99:1 a 7,10:1.

### Un color para cada persona

En el mapa había tres colores: el tuyo, el de Doña Cotorra y un gris para todo
el resto. Con tres amigos alcanza; con diez, "¿cuál de estos puntos es Jez?" se
contesta leyendo etiquetas una por una.

Ahora cada persona tiene el suyo, y tiene que cumplir dos cosas que tiran para
lados opuestos. **Estable**: si Jez es violeta hoy y naranja mañana porque
entró alguien más, el color no dice nada. Por eso sale del id del nido, no de
la posición en una lista. **Distinto**: y aun así dos personas de tu bandada no
pueden compartirlo, que es justo lo que el sorteo por id no puede prometer
—con 15 colores y 5 amigos, la probabilidad de que dos caigan en el mismo es
del 50%, el problema del cumpleaños, mucho menos intuitivo de lo que parece—.

Se resuelven en ese orden: cada uno pide el color que le toca por id y, si está
tomado, agarra el siguiente libre, recorriendo la bandada ordenada por id. El
color de alguien solo cambia si entra otra persona que choca con él.

Hay una paleta por tema y **no son intercambiables**: los 15 claros dan entre
2,2:1 y 3,9:1 sobre el fondo oscuro, o sea que media bandada sería invisible.
Los oscuros van de 6,58:1 a 13,01:1; los claros, de 5,02:1 a 9,07:1. Están
ordenadas igual, así una persona conserva su tono al cambiar de tema aunque
cambie el valor.

El verde de la app queda fuera de las dos: es el de **tu** nido, y compartir
color con un amigo sería el único choque que de verdad confunde. Y el mismo
punto aparece al lado del nombre en la bandada — sin eso, el color del mapa no
se puede contestar: ves un punto violeta y no sabés de quién es.

## Lo que /api/salud contesta

Es la única pantalla de la app pensada para cuando algo no anda, y la lección
que la fue armando siempre fue la misma: **un fallo silencioso se ve idéntico a
que no haya nada**.

| Pregunta | Por qué está |
|---|---|
| ¿Escribe y lee documentos? | Lo básico. |
| ¿Y **conjuntos**? | Viven en otra tabla. Sin ellos la bandada queda vacía, y con solo lo de arriba el diagnóstico decía "todo bien". Pasó, y borró amistades. |
| ¿Cómo está **tu** bandada? | Cuántas guardadas, cuántas en formato viejo, cuántas personas hay en tu historial. Desde afuera, una bandada vacía y una base que no escribe se ven igual. |
| ¿Anda **Nominatim**? | Hace una consulta de verdad —las coordenadas del Obelisco— y espera "Buenos Aires, Argentina". Si falla dice por qué: un 403, un timeout, un bloqueo. Sin esto, "vivís en un descampado sin nombre" y "nos bloquearon" se ven los dos como un nido sin lugar. |
| ¿El secreto de sesión es largo? | Uno corto se adivina sin conexión, probando contra la cookie propia. |

Ninguna de estas preguntas estaba el primer día. Cada una se agregó después de
que su ausencia costara algo.

## Las notificaciones (lo que hay, y lo que falta)

Hoy el aviso de que un ave aterrizó es esto:

```ts
new Notification(titulo, { body: cuerpo, icon: "/icon.svg", tag: titulo });
```

Y eso tiene tres límites que chocan de frente con lo que la app promete:

1. **Necesita la pestaña viva.** Cerrás el navegador y no llega nada. La app
   dice "tu guacamayo llega en 1 día 6 h": nadie deja una pestaña abierta un
   día.
2. **En iPhone no existe.** El constructor `Notification` no está en Safari de
   iOS. Quien usa iPhone no recibe un solo aviso, nunca.
3. ~~No hay `manifest` ni service worker~~ — **ya están.** La app es
   instalable (`app/manifest.ts`) y los avisos salen por el service worker
   (`public/sw.js`) en vez de `new Notification()`. Eso arregla los puntos 1 y
   2 a medias: ahora funcionan con la pestaña en segundo plano, y en iPhone
   funcionan **si la agregaste a la pantalla de inicio**. Con la app cerrada
   del todo, todavía no.

Para que anden con la app cerrada falta Web Push. De las cinco piezas, dos ya
están: el `manifest` y el service worker —que además ya tiene escrito y
funcionando el manejador de `push`—. Faltan tres: un par de claves VAPID, una
tabla de suscripciones (una por dispositivo, no por persona) y **un
despertador**.

El despertador es el problema de verdad, y no es de front: el ave aterriza en
un momento futuro y en serverless no hay nadie ejecutando código en ese
instante. La hora exacta se conoce al despegar, pero alguien tiene que
levantarse a mirar. Estando en Supabase, lo natural es `pg_cron` + `pg_net`:
un chequeo por minuto que busca loros aterrizados sin avisar y llama a un
endpoint. Entra en el plan gratis y no agrega servicios. Las alternativas son
Vercel Cron (en Hobby es una vez por día: inservible acá) o QStash, que
programa una llamada para la hora exacta de cada vuelo.

Y hay algo que ninguna implementación arregla: **en iPhone, si la persona no
agrega la app a la pantalla de inicio, no hay notificación posible.** No es un
detalle técnico, es un cambio de producto: aparece un momento de "agregala a
tu inicio" que hoy no existe, y de él depende que la mitad de la gente reciba
o no lo único que la app tiene para avisar.

## El mapa

Leaflet, con mosaicos de CARTO sobre OpenStreetMap (sin API key) o de Mapbox si
hay token. Dos cosas que no son de fábrica:

- **La posición de las aves no viene del servidor.** Sale de la fórmula: con la
  hora de salida, la de llegada y los dos puntos alcanza. El servidor se
  consulta cada varios segundos y el ave igual se mueve a 60 cuadros por
  segundo, porque cada cuadro se recalcula en el navegador.
- **El mapa gira con dos dedos**, como Google Maps, vía
  [`leaflet-rotate`](https://github.com/Raruto/leaflet-rotate) (`shift` +
  arrastrar en la compu). Leaflet no sabe girar solo: el plugin le cambia la
  matemática de coordenadas para que un toque siga cayendo donde uno lo ve con
  el mapa torcido. Cuando hay algo que enderezar aparece una brújula arriba a
  la derecha.

  Los marcadores **no** giran con el mapa —por eso los nombres de los nidos se
  siguen leyendo derechos— pero las rutas sí, porque viven adentro del panel que
  Leaflet rota. Las aves son marcadores y tienen que seguir a su propia línea,
  así que se les suma el rumbo del mapa a mano (`orientar`, en
  `components/Mapa.tsx`). Sin esa suma, al girar el mapa el ave se quedaba
  mirando al norte de la pantalla mientras su línea se iba para otro lado.

En el celular el panel de abajo se arrastra
([`components/HojaInferior.tsx`](components/HojaInferior.tsx)) entre cuatro
alturas: **el fondo del todo** —solo el asa, y el mapa se queda con el 95 % de
la pantalla—; el mínimo que deja ver quién sos, las pestañas y el botón; el 58 %
de siempre; y casi toda la pantalla. Un toque en el asa alterna entre el default
y el fondo, que son las dos cosas que se quieren hacer; las intermedias quedan
para el arrastre, que es el control fino.

Las dos alturas de abajo se **miden**, no se fijan: dependen del tamaño de letra
del sistema y de la barra de gestos del teléfono. Y el asa nunca baja de 44 px,
porque en el fondo es lo único tocable que queda en pantalla.

## Los tuyos, y del resto

Arriba del mapa hay un interruptor con dos vistas. **Los tuyos** es la de
siempre: tu nido, tu bandada y los loros que van o vienen de vos. **Del resto**
muestra lo que está cruzando el planeta ahora mismo, de cualquiera.

Esa segunda vista es la única parte de la app donde alguien ve algo de una
persona con la que no tiene ninguna relación previa, así que las reglas de la
bandada no alcanzan y hay otras:

| | Bandada | Del resto |
|---|---|---|
| Quién te ve | quien tiene tu código, se lo diste vos | cualquiera con nido |
| Tu ubicación | corrida hasta **300 m** | corrida hasta **25 km** |
| Tu nombre | sí | **no** |
| El id de tu nido | sí | **no** |
| El mensaje | solo al aterrizar, y solo a quien va dirigido | **nunca** |
| Nidos dibujados | sí, con su círculo | **ninguno** |

Tres detalles que no son obvios:

- **Las semillas del corrimiento son distintas** (`zona:` y `mundo:` en
  [`lib/privacidad.ts`](lib/privacidad.ts)). Con la misma, alguien de tu bandada
  —que ya te ve corrido 300 m— podría cruzar las dos vistas y despejar el rumbo
  del desvío, que es la mitad del secreto.
- **No se dibuja ningún nido**, ni siquiera un punto tenue. Los 25 km son toda
  la protección: poner un pin sobre una coordenada corrida al azar aparenta una
  precisión que no existe.
- **Se puede apagar**, desde *Nido → Aparecer en «Del resto»*. Y apagarlo saca
  todos tus vuelos, no solo los próximos. Guardar el nombre no vuelve a
  prenderlo: el panel usa el mismo endpoint para las dos cosas, y sin esa
  distinción cambiarse el nombre te devolvía al mapa del mundo sin pedirlo.

Los vuelos de Doña Cotorra no entran: es una vecina de práctica, y hacerla pasar
por gente sería inflar el mapa con vuelos que no existen. Cuando no hay nadie
volando, lo dice.

## La bandada que se perdió (y cómo vuelve)

El arreglo de la fila de arriba trajo el peor bug de todo el proyecto, y queda
escrito acá entero porque es el que más caro salió.

Al pasar la bandada de documento a conjunto quedó una migración: leer el
documento viejo, escribirlo al conjunto nuevo, borrar el viejo. El problema era
el orden moral de esas tres cosas:

```ts
await Promise.all(viejos.map((o) => store().agregarAConjunto(claveAmigos(id), o)));
await store().borrar(claveAmigosViejo(id));   // ← se ejecutaba pasara lo que pasara
```

`agregarAConjunto` devolvía `void` y se tragaba cualquier falla. Si la escritura
no entraba —la tabla `loros_conjunto` sin crear en Supabase, un timeout, un 429
de Upstash— el borrado igual corría y **se borraba la única copia**. Las
amistades no quedaban a medias: desaparecían.

Tres cosas cambiaron:

1. **`agregarAConjunto` devuelve si entró**, en los tres backends. Una escritura
   que falla ya no puede pasar por exitosa.
2. **El borrado ocurre solo si todas confirmaron.** Si una falla, el documento
   viejo se queda donde está y se reintenta en la próxima consulta. Una consulta
   de más es infinitamente más barato que una bandada.
3. **`/api/salud` prueba también los conjuntos.** Antes probaba escribir y leer
   un documento y decía "todo bien" mientras las amistades se caían: la tabla de
   documentos existía y la de conjuntos no. Una prueba que no ejercita lo que la
   app usa no es una prueba.

Y para lo ya perdido, **el historial de loros es la copia de seguridad que no
sabíamos que teníamos**: al soltar un loro se indexa en el buzón de los dos, así
que ahí quedó con quién estuviste conectado aunque la bandada ya no lo diga. Un
nido que aparece sin nadie se reconstruye solo desde ahí, una vez, y se rearma
con `emparejar`, que escribe las dos puntas: con que **una** de las dos personas
abra la app, la amistad vuelve para las dos.

No recupera a alguien a quien agregaste por código y con quien nunca
intercambiaste un loro. De eso no quedó rastro.

La lección no es "probá la migración". Es más incómoda: **un borrado nunca debe
depender de una escritura que no sabe fallar.** El bug no estuvo en la
migración, estuvo en que la capa de abajo devolvía `void`.

## Lo que aprendimos rompiéndola

Una auditoría con concurrencia real encontró cuatro bugs que no fallaban nunca
de a uno y fallaban siempre de a dos, en silencio. Los cuatro eran la misma
forma —leer, modificar y escribir sin candado— y quedan documentados acá porque
cualquier cosa que se agregue después puede repetirlos.

| Se rompía | Con qué | Ahora |
|---|---|---|
| **Seis personas te agregan a la vez y queda una.** La bandada era un documento con un array. | 2 simultáneas ya perdían una | Cada amistad es una fila propia (`loros_conjunto`) y choca en la base, no en el código |
| **Doña Cotorra contesta cuatro veces el mismo loro.** | La app abierta en dos pestañas | Un turno único por loro (`reservar`) |
| **Doble toque en el destino del ave da dos respuestas distintas.** | Un doble toque | El mismo turno único |
| **Un loro perdido deja el sondeo en 4 s para siempre.** `!l.llego` nunca vuelve a ser falso en un extravío. | 2 de cada 1000 envíos | `!l.llego && !l.perdido` |

Y dos que no eran carreras pero se llevaban gente puesta:

- **El freno castigaba el éxito.** Contaba por IP, y en el celular una IP son
  miles de personas (CGNAT): un link moviéndose dentro de una misma red dejaba
  a los siguientes sin poder crear su nido, a partir del número 15. Ahora quien
  ya tiene nido se cuenta por su nido, y el tope del alta subió a 200.
- **"Buscando…" se colgaba para siempre.** El `timeout` de `getCurrentPosition`
  no corre mientras el navegador muestra el cartel de permiso: si la persona no
  contestaba, la promesa no se resolvía nunca. Ahora hay un reloj de pared.

### El costo por persona

Medido con el almacenamiento instrumentado, sobre el build de producción:

| | Antes | Ahora |
|---|---|---|
| `/api/estado` (el que más se llama) | 7 viajes | **5** |
| `/api/mundo` | 4 viajes | **1** (caché de 3 s) |
| Por persona con la app abierta | 1,8 ops/s | **1,3** |
| 100 personas a la vez | 630.000/hora | **450.000** |

Tres cosas lo explican:

- **Doña Cotorra ya no se consulta si no hay nada que contestar.** Antes salía a
  leer su nido, su lista y sus loros en cada sondeo —tres de los siete viajes—
  para descubrir en el 99 % de los casos que no había nada que hacer. Ahora eso
  se decide con el buzón que la misma consulta ya cargó.
- **El freno tiene dos velocidades.** Cuenta en memoria, que es gratis, y recién
  consulta Redis cuando alguien pasa un cuarto del límite. El usuario común no
  toca la base; el que se pasa, sí — y ahí la cuenta es de verdad, compartida
  entre instancias.
- **La vista del resto se reparte.** Todos los que miran piden lo mismo, así que
  la respuesta se guarda tres segundos. Cien personas mirando comparten el 97 %
  de las respuestas. Tres y no diez porque apagar *Aparecer en «Del resto»* no
  puede quedar en cola: además, cambiar el interruptor tira la caché.

La portada también dejó de ser dinámica. Resolvía el código de invitación en el
servidor (`searchParams` + una consulta), y eso hacía que la única página que
tiene que aguantar un pico —la que se comparte por WhatsApp— fuera la única que
el CDN no podía guardar. Ahora sale estática y el saludo lo resuelve el
navegador contra `/api/invitacion`.

## ¿Y el login con Google?

Las apps de este tipo (Roost, Carrier Pigeon) piden login con Gmail. Acá no, y
es una decisión, no una omisión.

Lo que el login realmente resuelve en estas apps son dos cosas:

1. **Que no le puedas escribir a un desconocido.** Eso ya está resuelto sin
   login: para mandarle un loro a alguien tiene que estar en tu bandada, y para
   entrar a tu bandada hace falta su código de 6. El servidor lo verifica en
   cada envío — el id de un nido ajeno no alcanza para escribirle.
2. **Que no pierdas tu cuenta al cambiar de dispositivo.** Ese sí era un
   agujero real, y se tapa con la **llave del nido**: un link firmado
   (`/entrar?llave=…`) que abrís en el otro dispositivo y te deja el nido ahí,
   con su código, su bandada y su historial. Está en el panel, bajo tu código.

El canje, dicho sin vueltas: la llave **es** el nido, así que quien la tenga
entra. La interfaz lo dice con esas palabras al copiarla. Un login con Google
evita ese riesgo y a cambio pone una pantalla de registro antes de que la
persona vea el mapa — que para algo que se pasa por WhatsApp es donde se cae la
mitad de la gente. Si mañana el producto lo pide, agregarlo es un endpoint más:
`lib/sesion.ts` ya emite y valida sesiones firmadas, y lo único que cambia es
de dónde sale el id.

## Cómo está hecho

Next.js 16 (App Router), React 19, TypeScript, Leaflet y `leaflet-rotate`. Sin
base de datos obligatoria, sin login, sin dependencias de UI. `npm audit` da
cero vulnerabilidades — vale la pena mantenerlo así, porque esto se deploya
público. Requiere Node 20.9 o más.

```
lib/aves.ts       la tabla de las seis especies. Todo sale de acá.
lib/vuelo.ts      la fórmula del vuelo. Pura, y la usan servidor Y navegador:
                  si no fueran la misma cuenta, la app prometería un tiempo
                  y cumpliría otro.
lib/geo.ts        haversine, ruta de círculo máximo, rumbo, formatos.
lib/datos.ts      nidos, amistades, loros, la suerte del ave, Doña Cotorra.
lib/olvido.ts     lo que llega cuando no llega tal cual: la cotorra y la perica.
lib/tramos.ts     los vuelos dibujables: la ida de cada loro y, si lo soltaron,
                  la vuelta. Solo tipos importados — lo usa el navegador.
lib/store.ts      persistencia: Upstash, Supabase o un archivo, según lo que
                  esté configurado.
lib/vista.ts      qué ve el navegador. Acá se decide qué NO viaja: ni el texto
                  de un loro en vuelo, ni las coordenadas exactas de nadie.
lib/privacidad.ts los dos desvíos fijos: 300 m para la bandada, 25 km para el
                  mapa del mundo, con semillas separadas.
lib/sesion.ts     identidad: un id firmado con HMAC en una cookie HttpOnly.
lib/colorNido.ts  un color por persona, estable y sin choques en tu bandada.
lib/tema.ts       los dos temas. Lo que no es CSS: aves, mapa, confeti.
lib/codigo.ts     el código de nido en palabras, y la compatibilidad con los
                  de seis caracteres de antes.
lib/geocode.ts    coordenadas → "Palermo, Argentina" (Nominatim, best-effort).

app/page.tsx      la portada.
app/nido/         la app.
app/api/          estado, nido, amigos, loros, loros/leer, loros/suerte,
                  mundo, ubicacion, sesion.
app/entrar/       canjea la llave del nido y redirige al mapa.

components/Mapa.tsx        Leaflet: nidos, rutas y aves animadas.
components/Compositor.tsx  elegir ave y escribir. La pantalla clave.
components/Panel.tsx       en vuelo / buzón / bandada / nido.
components/HojaInferior.tsx  el panel de abajo, arrastrable a tres alturas.
components/VistaMapa.tsx     el interruptor "Los tuyos / Del resto".
components/Trayectoria.tsx   el arco de la portada: sale, entrega, vuelve.
components/Onboarding.tsx  los tres pasos para tener nido.
components/Ave.tsx         las seis aves dibujadas, una pose y seis siluetas.
components/Fiesta.tsx      el confeti de la paloma y las plumas del cuervo.
```

Las seis aves son SVG escritos a mano en
[`components/Ave.tsx`](components/Ave.tsx), en una sola pose de vuelo. Se
escriben como texto y no como JSX porque el marcador de Leaflet necesita HTML
crudo, y tener el mismo dibujo en dos lugares es la forma más rápida de que se
despeguen. Lo que distingue a una especie de otra a 34 píxeles no es el color
sino la silueta: la cola del guacamayo, las rayas del perico, el abanico de la
cotorra, la rosa en el pico de la paloma, y el pico recto de daga del cuervo
—el único sin el gancho simpático de los loros, y sin cachete rosado.

### Dos decisiones que explican casi todo

**Lo que no tiene que verse, no viaja.** Un loro en el aire llega al navegador
sin su texto, y ningún nido ajeno llega con sus coordenadas reales
([`lib/vista.ts`](lib/vista.ts)). Si viajaran igual y la pantalla los tapara,
abrir las herramientas de desarrollo alcanzaría para leer antes de tiempo o
para sacar la dirección de alguien. `npm run prueba` verifica las dos cosas.

**La posición del ave no viene del servidor.** Viene de la fórmula: con la hora
de salida, la de llegada y los dos puntos, el navegador calcula dónde está en
cada cuadro. Por eso el ave se mueve a 60 fps mientras la app consulta el
estado cada 4 segundos, y por eso las dos personas ven el mismo vuelo con el
mismo avance al mismo tiempo (cada una con su punta exacta y la del otro
corrida, así que las líneas difieren por unos kilómetros que nadie nota). El
servidor manda su reloj en cada respuesta, así un celular con la hora corrida
no ve un ETA falso.

## Mapa y ubicación

- **Mosaicos**: CARTO sobre OpenStreetMap, sin API key. Si cargás
  `NEXT_PUBLIC_MAPBOX_TOKEN`, usa Mapbox. Si no cargan (sin internet, red que
  los bloquea), el mapa avisa y los vuelos se siguen viendo igual sobre el
  fondo.
- **Ubicación**: la API de geolocalización del navegador, pedida en el paso 2
  del onboarding y no al entrar — sin contexto, la gente aprieta "bloquear". Si
  la deniegan hay una alternativa: marcar el nido a mano tocando el mapa.
- **Nombre del lugar**: Nominatim (OpenStreetMap), sin key, con cola de 1
  pedido por segundo y caché. Es opcional: si falla, el nido muestra sus
  coordenadas y nada más.

## Deploy en Vercel

La app está en la raíz del repo, así que **Add New → Project → importar este
repo** y no hay nada que configurar: Vercel detecta Next.js solo.

Lo que sí hay que cargar antes del primer deploy son las variables de entorno
(Settings → Environment Variables), porque en serverless el backend de archivo
no sirve — el disco es de solo lectura y cada pedido puede caer en otra
instancia:

| Variable | ¿Hace falta? | Para qué |
|---|---|---|
| `LOROS_SECRET` | **Sí** | Firma las cookies de sesión. Sin esto se firma con un secreto que está escrito en el código, o sea público: cualquiera podría entrar a un nido ajeno. Generalo con `openssl rand -base64 32`. |
| Base de datos | **Sí** | Upstash **o** Supabase — ver abajo. |
| `NEXT_PUBLIC_SITE_URL` | Recomendada | Tu dominio, para las previews al compartir. Es `NEXT_PUBLIC_*`: cambiarla necesita redeploy. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Solo si querés mosaicos de Mapbox en vez de los de OpenStreetMap. También necesita redeploy. |
| `LOROS_PROB_EXTRAVIO` | No | Pisa el 0,2% de loros perdidos. Dejala sin cargar salvo que quieras probar. |
| `LOROS_ESCALA_TIEMPO` | No | Acelera TODOS los vuelos. No la cargues en producción. |

### La base: Upstash o Supabase

Cargá **una** de las dos. Si están las dos, gana Upstash.

**Opción A — Upstash Redis (2 clics).** En el proyecto de Vercel, pestaña
**Storage → Create Database → Upstash Redis**. Las variables
`KV_REST_API_URL` y `KV_REST_API_TOKEN` se cargan solas. No hay nada más que
hacer.

**Opción B — Supabase**, si ya lo tenés:

1. En tu proyecto de Supabase, **SQL Editor → New query**, pegá el contenido de
   [`supabase.sql`](supabase.sql) y dale Run. Crea dos tablas y les prende RLS.
   Es idempotente: correrlo dos veces no rompe nada. **Este paso no lo hace
   ninguna integración**: sin las tablas, la app no guarda nada.
2. Las variables. Si levantaste Supabase desde **Vercel → Storage**, ya están
   cargadas y no tenés que hacer nada. Si lo hiciste a mano:

   | Variable | De dónde sale |
   |---|---|
   | `SUPABASE_URL` | Project Settings → Data API (`https://xxxx.supabase.co`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → **service_role** (en proyectos nuevos figura como **secret key**) |

   Para la clave también se aceptan `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_KEY`
   y `SUPABASE_KEY`, y para la URL `NEXT_PUBLIC_SUPABASE_URL`. Son los nombres
   que usan las distintas integraciones: da igual cuál te haya tocado.

3. **Redeployá.** Las variables nuevas no entran en un deploy ya hecho.

Para saber si quedó andando, abrí `https://tu-app.vercel.app/api/estado`. El
campo `almacenamiento` dice `"supabase"`, `"upstash"` o `"archivo"`; si dice
`archivo`, no está tomando las variables.

**La `service_role` va sin `NEXT_PUBLIC_` y marcada como secreta.** Esa clave
saltea todas las reglas de la base; con el prefijo público, Next la mete adentro
del JavaScript que baja cualquier visitante y con eso te leen y te borran todo.
Los ejemplos de Supabase usan `NEXT_PUBLIC_` porque llaman desde el navegador —
esta app llama desde el servidor, así que no hace falta. Si la app detecta una
`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` cargada, la ignora y lo grita por
consola.

La clave `anon` (la pública) no sirve acá a propósito: `supabase.sql` deja RLS
prendido **sin políticas**, así que esa clave no puede tocar nada de estas
tablas. Si algún día se filtra, no se lleva los mensajes de nadie.

Se habla PostgREST por HTTP y no por conexión directa a Postgres: en serverless
no hay conexiones que mantener ni pool que se agote, y no suma dependencias.

### Si no cargás ninguna

La app igual arranca, pero cada instancia serverless arranca con la memoria
vacía: los nidos aparecen y desaparecen según qué lambda te toque. El síntoma
típico es quedarse clavado en "Armando el nido…". La app lo detecta y te lo
dice con esas palabras, en vez de colgarse.

También corre en cualquier otro lado que ejecute Next.js: ahí, sin Upstash,
el backend de archivo (`.data/loros.json`) alcanza mientras sea un solo
proceso.

## Lo que este MVP no es

- **Sin cuentas.** La identidad es una cookie. La llave del nido te la lleva a
  otro dispositivo, pero si borrás el navegador y no guardaste la llave, se
  perdió.
- **Sin cifrado de punta a punta.** El servidor ve los mensajes.
- **El rate limit es por proceso** (en memoria), así que frena el abuso obvio
  y no un ataque distribuido.
- **Con el backend de archivo, un solo proceso.** Dos instancias contra el
  mismo archivo tienen ventana de carrera; para eso está Upstash.
- **Sin push de verdad.** Los avisos de despegue y aterrizaje usan la API de
  notificaciones del navegador, que solo dispara con la app abierta. Un
  guacamayo de 16 días necesita un service worker + Web Push (VAPID) para que
  el aviso llegue con el teléfono en el bolsillo. Es el próximo paso obvio y no
  entra en un MVP.
