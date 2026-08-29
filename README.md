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
   código adentro (`/?n=XXXXXX`), así que quien lo abre ve de quién viene la
   invitación y queda conectado apenas arma su nido — sin copiar ni pegar nada.
   El código también está a la vista para quien prefiera tipearlo en
   *Bandada → Agregar por código*.
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
   puchero. Una sola vez, sin vuelta atrás.

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
([`components/HojaInferior.tsx`](components/HojaInferior.tsx)) entre tres
alturas: el mínimo que deja ver quién sos, las pestañas y el botón; el 58% de
siempre; y casi toda la pantalla. La altura mínima se **mide**, no se fija:
depende del tamaño de letra del sistema y de la barra de gestos del teléfono.

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
lib/privacidad.ts el desvío fijo que convierte un punto en una zona.
lib/sesion.ts     identidad: un id firmado con HMAC en una cookie HttpOnly.
lib/geocode.ts    coordenadas → "Palermo, Argentina" (Nominatim, best-effort).

app/page.tsx      la portada.
app/nido/         la app.
app/api/          estado, nido, amigos, loros, loros/leer, loros/suerte,
                  ubicacion, sesion.
app/entrar/       canjea la llave del nido y redirige al mapa.

components/Mapa.tsx        Leaflet: nidos, rutas y aves animadas.
components/Compositor.tsx  elegir ave y escribir. La pantalla clave.
components/Panel.tsx       en vuelo / buzón / bandada / nido.
components/HojaInferior.tsx  el panel de abajo, arrastrable a tres alturas.
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
