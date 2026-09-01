# Enviaunlorito 🦜

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
| **Loro** 🦜 | 40 km/h | 1000 caracteres | El clásico | se convierte en pollera |
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
- **El loro** —el que se llama loro a secas— no hace nada raro con el mensaje,
  y por eso es el único que tiene un interruptor: **se convierte en pollera**.
  Lo que cruza el mapa entonces no es un ave sino una pollera, en rosa, que va
  derecha en vez de apuntar adonde vuela —un ave apunta porque tiene pico; una
  pollera apuntando al noreste es una pollera dada vuelta— y al abrirlo del
  otro lado llueven polleras en toda la pantalla. El mensaje no se toca: el
  chiste es el envoltorio, no el contenido. Es la única gracia que se elige en
  vez de sortearse, y la única que solo puede tener un ave: pedirla con otra se
  ignora en silencio y sale el ave de siempre. También se le puede pedir al
  lorito de convite, y ahí gana un tiempo propio: entra a la cervecería siendo
  un loro y sale convertido — más abajo.

### Las ceremonias

Tres momentos se llevan la **pantalla entera** unos segundos
([`components/Fiesta.tsx`](components/Fiesta.tsx)): un baño de color cónico
girando de fondo, ciento y pico de papelitos y cosas cayendo con deriva y giro,
y la escena en el medio. Se cierran solas, y se tocan para saltearlas — nadie
tendría que esperar a que termine una animación para leer lo que le mandaron.

- **La paloma entregó**: confeti, rosas, bombones y moños, con la paloma
  dibujada grande en el medio.
- **El lorito está de copetines**: cuando alguien abre el link de un convite y
  se encuentra con que su ave está tomando en una cervecería. Cerveza,
  pretzels, música y cornetas, y en el medio el lorito con dos cotorras
  brindando. Es el momento que tiene que dar ganas de armar el nido, así que
  es el que más grita. Salta una vez por pestaña, nunca para quien lo mandó.
- **La lluvia de polleras**: cuando el loro salió convertido. Llueven polleras
  de verdad —el mismo dibujo que cruzó el mapa, no un emoji— y en el medio hay
  una enorme.
- **El cuervo** es la única que no festeja: sin baño de color y sin cartel,
  apaga la pantalla y deja caer plumas negras, lentísimas. La alegría es un
  golpe y la mala noticia se asienta.

Son nodos del DOM animados por CSS y no un canvas: lo que hace falta no es
física fina sino que caigan COSAS, y un bombón en un canvas hay que dibujarlo a
mano. Todo lo que se mueve mueve `transform` y `opacity` y nada más, que es lo
que lo deja en manos del compositor. Las tres respetan
`prefers-reduced-motion`: el mensaje sí, la tormenta no.

Y van **colgadas del `<body>` por un portal**. `position: fixed` mide contra la
ventana salvo que un ancestro tenga `transform`, `filter` o `backdrop-filter`,
y ahí ese ancestro pasa a ser el bloque contenedor: las tarjetas de la app
llevan `backdrop-filter` y la hoja de abajo se arrastra con `transform`, así
que sin el portal la ceremonia salía de 404×174 px —del tamaño de la tarjeta
del mensaje— en vez de tapar la pantalla. Medido.

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
npm run typecheck        # tsc --noEmit
npm run prueba           # de punta a punta contra la API (con el server corriendo)
npm run prueba:navegador # reconocer el navegador de WhatsApp. Pura, sin servidor
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
  cierto aunque el dibujo sea aproximado. Medido: un vuelo de 654,6 km reales se
  muestra como 654,57 km con las dos puntas corridas.
- **El punto del mundo nunca cae sobre la casa de nadie.** El corrimiento
  reparte con raíz cuadrada sobre el área del círculo, así que una parte de los
  nidos caía cerquísima del centro. Con radio 25 daba igual —el 0,01% quedaba a
  menos de 300 m—, pero al bajar a 3 pasaba a ser el **1%**: uno de cada cien
  nidos se mostraba a los desconocidos **más preciso que a su propia bandada**,
  justo al revés de lo que promete esta sección. Ahora el mundo reparte sobre una
  rosca de 1 a 3 km y nunca sobre el centro. Verificado sobre 20.000 nidos: el
  más cercano cae a 1,000 km y ninguno baja de 300 m. La zona de la bandada
  sigue sin piso, que ahí 300 m es el barrio y caer a cincuenta metros está
  bien.
- Tu propio nido lo ves exacto. Es tu dato.

### El nido no sigue al teléfono

**El ave sale del nido, siempre.** No de donde estás: del punto que la persona
puso, a propósito, una vez.

Un rato esto no fue así, y vale contarlo porque el error es fácil de repetir.
Al abrir la app un efecto leía el GPS y, si te habías movido más de 300 m,
**mudaba tu nido solo**. La intención era buena —que el ave salga de donde
estás— y el resultado era exactamente lo contrario de lo que esta sección
promete: el nido pasaba a ser un rastreador. El trabajo, el bar, la casa de
alguien; cada vez que abrías la app, tu bandada veía el punto nuevo.

Y los corrimientos de arriba **no alcanzaban a tapar eso**. Correr un punto
300 m esconde en qué casa vivís; no esconde que hoy estás en otro barrio, y
menos si el punto se muda cada vez que abrís la app. Un dato de ubicación que
se toma de fondo, repetido, es de otra naturaleza que uno que se da una vez.

Hoy el nido se mueve de una sola manera: **"Mudar el nido"**, en la pestaña
Nido, tocando el mapa. Un acto deliberado, con la mano.

Lo que esto no cubre, dicho derecho: el desvío es constante, así que si te
mudás de ciudad —y mudás el nido a propósito—, quien te tenga agregado ve que
te moviste (a una zona equivocada, pero se nota el movimiento). Para un MVP
donde solo te ve gente a la que le diste tu código, es el canje razonable.

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

## Dónde vive el botón que hace crecer esto

Un detalle de ubicación que valía más que varias funciones.

La acción que trae gente nueva —mandarle un lorito a alguien que todavía no
está— vivía en la pestaña **Bandada**, abajo de una tarjeta, a tres toques del
mapa. Mientras tanto, el botón fijo del panel es **Soltar un loro**, que sólo
alcanza a quien YA está en tu bandada.

Para alguien que acaba de entrar, eso está al revés: su bandada son dos
personas —Doña Cotorra y quien lo invitó— así que el botón que ve todo el
tiempo llega a dos, y el que llega a toda su agenda está escondido.

Y hay un momento exacto en que eso duele, que es el que ahora se aprovecha:
**abrir "Soltar un loro" y buscar a alguien en la fila de "Para" que no está
ahí**. La fila termina con una pastilla punteada —«🍺 No está en la app»— que
lleva derecho al lorito de convite. Va al final y no al principio a propósito:
así no le compite a la bandada de quien ya la tiene, y aparece justo cuando se
terminó de mirar la fila sin encontrar a nadie.

## El numerito del ícono

Viene de haber querido otra cosa. La tarjeta viva que muestran apps como
Binance en la pantalla bloqueada —esa que se actualiza sola con una barra de
progreso— es una **Live Activity de iOS**: ActivityKit, nativo, y **no existe
ninguna API web para eso**. No es una limitación de cómo está hecha esta app;
no hay puerta.

Lo que sí se podía era imitarla mandando avisos de avance que se reemplazan
entre sí. Se descartó, y la razón es la misma que ordena todo lo demás acá: un
ave que tarda dieciséis días no puede permitirse notificar su progreso. Serían
cuatro interrupciones por loro a cambio de un dato que el mapa ya cuenta mucho
mejor, y en iPhone cada reemplazo vuelve a alertar, así que encima saldría peor
en la plataforma que originó la idea.

Queda entonces lo único de esa idea que la web sí puede y que además **no
interrumpe a nadie**: `navigator.setAppBadge()`, el globito en el ícono, con
**los loritos que llegaron y no abriste**. Cero no dibuja un 0 — saca el
globito, porque un 0 dice que hay algo.

Un rato contó **las aves en el aire**, y estaba mal de fondo. Un globito es una
tarea pendiente —WhatsApp, el mail, todos funcionan así— y un ave volando no es
una tarea: no hay nada que hacer con ella, ni siquiera es tuya del todo hasta
que aterriza. Encima el número **no se apagaba nunca**, porque siempre hay algo
en el aire. Lo que sí te espera es el buzón.

Anda en la app instalada, en las dos plataformas, iPhone incluido. En un
navegador común la API no existe, y eso no es un error: es la mayoría de los
casos, y por eso está todo envuelto en un `try`.

### El número lo ponen dos, y por eso cuentan igual

Al principio lo ponía **solo la página**, en un efecto sobre la lista de loros.
O sea: solo con la app abierta. Y las aves aterrizan con el teléfono guardado en
el bolsillo, que es el noventa y nueve por ciento del tiempo — así que el número
se quedaba clavado en el último que habías visto. **Un 9 para siempre en un
ícono donde ya no volaba nada**, hasta que abrieras la app.

Ahora lo pone también el **service worker**, con cada aviso que llega. Que es
exactamente cuando hace falta: el aviso de aterrizaje y el globito son la misma
noticia.

Dos decisiones ahí:

- **El servidor manda el TOTAL, no un "restale uno".** Un contador que se
  corrige solo no se puede desincronizar; uno que suma y resta se desincroniza
  con el primer aviso que se pierda — y los avisos se pierden.
- **Los dos lados cuentan lo mismo, y hay una prueba que lo verifica.** Si la
  página y el servidor contaran distinto, el número saltaría cada vez que abrís
  la app, que es peor que no tenerlo. `/api/salud` expone la cuenta del
  servidor (`insignia`) justamente para poder compararla con la de la página.

## El lorito de convite

Hasta acá había una sola forma de traer gente: compartir tu nido. Un link
genérico, el mismo para todos, que del otro lado se lee como "bajate esta app".

Esto es lo otro. Le escribís algo a una persona puntual, elegís con qué ave, y
**el ave sale**. No espera en una bandeja: despega de tu nido, cruza un pedazo
de mapa y se posa en una cervecería a **dos minutos de vuelo**. Ahí espera. El
link que compartís ya no dice "bajate una app": dice que hay un guacamayo
tomando cerveza a doce kilómetros con un mensaje tuyo adentro, y que sale en
cuanto esa persona tenga un nido adonde ir.

Del otro lado, armar el nido deja de ser un trámite y pasa a ser lo que
destraba el ave.

**Por qué una parada y no la espera en el nido.** No se sabe adónde va: el nido
de esa persona no existe todavía, así que no hay destino, ni distancia, ni hora
de llegada. Y un pájaro quieto en tu propio nido no le cuenta nada a nadie. La
parada resuelve las dos cosas: hay algo que ver desde el primer segundo, y hay
un lugar concreto del que el ave va a salir.

**Se queda un minuto más.** Cuando abren el link, el ave no sale corriendo: se
queda al menos un minuto terminando el copetín, contado desde que abrieron —no
desde que llegó a la barra, o quien abre el link tres días después no vería
nada—. Es el mejor momento de todo esto: alguien acaba de armar su nido, entra
al mapa por primera vez y lo primero que ve es un bicho sentado en un boliche
antes de salir para su casa. Y por eso la cervecería es un LUGAR en el mapa
—cartel propio, resplandor, nombre debajo, el ave bamboleándose encima— y no un
pajarito más con un vasito al lado.

**La mesa se va llenando.** La espera puede durar dos días y era un ícono
quieto. Ahora es una escena que crece: a los primeros minutos hay una cotorra
tomando al lado del cartel, más tarde son dos, y cuando el ave ya está de
jarola son tres, con música y cara de circunstancia. Son cuatro escalones
—`etapaDeLaBarra`— y no un número continuo a propósito: el dibujo cambia cuatro
veces en toda la espera y no sesenta veces por segundo. Es la única parte de la
app donde no pasa nada durante horas, así que es justo donde tiene que haber
algo para volver a mirar.

**Y la cervecería no se borra cuando el ave se va.** Se queda hasta que el
lorito aterriza. Mientras viaja, ese punto del mapa es la mitad de la historia
—de dónde viene y por qué va a llegar hablando raro— y borrarlo justo cuando
empieza lo interesante dejaba el vuelo saliendo de la nada. La fiesta sigue sin
ella: los que se quedaron tomando no se van porque se fue una.

**Los copetines.** El ave está en una cervecería, así que toma. Cuanto más
tardan en abrir el link, más tomada llega: se demora hasta un 35 % más y
entrega el mensaje con hipo (`lib/olvido.ts`). La espera —que en cualquier otra
app es tiempo muerto— es la parte divertida.

Pero **el mensaje llega entero**. Ni una palabra perdida, ni cambiada: se
estiran vocales y se le mete hipo, nada más. Es lo primero que esa persona lee
de la app y a veces lo primero que lee de quien la invitó; un chiste que se
come el mensaje de bienvenida no es un chiste, es una invitación rota. Por la
misma razón, **el lorito de convite no se pierde ni se enamora**: el 0,2 % y el
romance del perico no corren acá. El ave ya tuvo su noche.

**Y quien invitó se entera.** Cuando del otro lado arman el nido, a quien lo
mandó le llega "Beto armó su nido, tu perico salió de la cervecería" — en la
pantalla si la tiene abierta, y como aviso al teléfono si no (el push sale
desde `/api/convite/reclamar`, no desde el despertador, porque eso pasa cuando
la otra persona está usando la app). Sin ese aviso, del lado de quien invitó lo
único que pasaba era que una tarjeta desaparecía en silencio: el premio por
haber traído a alguien no se veía en ningún lado.

**Lo que el link NO cuenta.** El texto no sale del servidor hasta que hay un
nido que lo reciba. Si saliera, el link *sería* el mensaje y armar el nido no
destrabaría nada. Tampoco salen las coordenadas de la cervecería: están a pocos
kilómetros de la casa de quien lo mandó. Va el nombre del barrio, que es la
misma precisión que ya da el link de invitación. La prueba de punta a punta lo
verifica campo por campo.

**Cuántos llegaron a abrirlo.** Es el único punto de la app donde se puede
saber si alguien de afuera llegó a mirar, y sin eso el embudo tiene un agujero
en el medio: "nadie abrió el link" y "lo abrieron y no armaron el nido" se ven
exactamente igual desde `/api/salud`, y se arreglan para lados opuestos. Ahora
sale ahí, al lado de esperando y reclamados.

Cuenta **links y no visitas** —el mismo lorito abierto seis veces es uno, que es
lo que hace que el porcentaje signifique algo— y no cuenta al dueño probando el
suyo, que es la visita más común de todas y la única que no significa nada. Vive
en un conjunto aparte y **no en un campo del convite**, a propósito: escribirlo
adentro del documento sería leer-modificar-escribir contra un pedido que puede
estar reclamando ese mismo lorito, y si una apertura pisara un `reclamado` el
ave saldría dos veces. Es la forma de bug que este proyecto ya pagó una vez.

Y deja de escribirse en cuanto lo reclaman: un reclamado ya cuenta como abierto
—para reclamarlo hubo que abrirlo— así que seguir anotando sería pagar una
escritura por visita para no enterarse de nada nuevo. Ojo con lo que el número
**no** es: la vista previa de WhatsApp no llega hasta ahí, porque el robot no
ejecuta JavaScript. Son personas que abrieron de verdad, así que da más chico y
más útil de lo que uno esperaría.

**Y el lorito también puede salir en pollera.** Es la misma gracia del loro de
siempre, pero acá tiene un momento que en un envío común no existe: **entra a la
cervecería siendo un loro y sale convertido**. Lo que despega del nido es un
loro, lo que espera en la barra es un loro, y lo que cuenta el link es un loro.
Recién cuando el ave se levanta de la mesa —ese minuto de más que se queda
terminando el copetín— lo que sale para el nido de la otra persona es una
pollera, y del otro lado llueven polleras al abrirlo.

Que no se cuente antes no es un detalle de implementación, es la gracia entera:
si el link dijera de antemano que va a salir en pollera, no quedaría nada para
ver cuando pase. Así que sigue la regla que ya cumplen el 0,2 % y el romance del
perico —**el resultado está decidido desde el principio y no viaja al navegador
hasta que ocurre**— con dos lugares donde se sostiene: `/api/convite`, que es
público, no lo menciona nunca, y `lib/vista.ts` lo tapa en el loro ya reclamado
hasta que pasa la hora de salida. Sin lo segundo, la pollera aparecía sentada en
la barra durante ese último minuto, contando el final antes de tiempo.

Lo ve una sola persona antes de tiempo: quien lo mandó, en su tarjeta del panel,
y por la razón opuesta —lo eligió—. Escondérselo no sería una sorpresa, sería un
interruptor del que no se sabe si anduvo, y la espera puede durar dos días. En su
mapa, eso sí, el ave de la cervecería se dibuja loro como para cualquiera.

**El link tiene ruta propia: `/l/<lorito>`.** No es capricho de URL, es lo que
se ve antes de abrirlo. La portada de `/` es estática a propósito —es la que
puede recibir un pico de gente de golpe— así que su miniatura de WhatsApp es la
misma para todos los links y no puede cambiar según un `?c=`. Un lorito de
convite, en cambio, se le manda a UNA persona: ahí sí se puede consultar quién
lo mandó y contarlo en la vista previa. La miniatura es la fiesta en la
cervecería (`scripts/miniatura.mjs`, dibujada con las mismas aves de la app) y
el texto dice quién, en qué barrio y cuántos copetines. Los links viejos con
`?c=` siguen abriendo igual, para siempre: `llaveDeConvite()` lee las dos
formas. Lo que no entra en la miniatura es el mensaje — la ve cualquiera a
quien le reenvíen el link, así que el sobre se dibuja cerrado.

    lib/cerveceria.ts   dónde para, cuántos copetines, qué está haciendo.
    lib/convite.ts      el documento, el alta y el reclamo.
    components/Convite.tsx   escribirlo y pasar el link.
    app/l/[llave]/      la ruta del link y su miniatura.
    scripts/miniatura.mjs    cómo se dibuja esa miniatura.

**El ave no espera para siempre, y el link tampoco se muere.** A las **48 horas**
se cansa, paga y se vuelve al nido de quien la mandó — se la ve cruzar el mapa
de regreso— y ahí duerme la mona. Lo importante es lo que NO pasa: el link
sigue sirviendo. Cuando esa persona finalmente lo abra, el ave sale igual;
nomás que ahora sale **desde el nido** y no desde la barra, o sea que tarda más
y llega **sobria**. La demora es la consecuencia de haber tardado dos días, y
es una consecuencia con sentido, no un vencimiento.

**Y se puede llamar de vuelta.** Un silbido, no un botón de borrar: el ave deja
la barra, se vuelve, y el link deja de servir. Es la única forma de deshacer un
lorito soltado por error —el mensaje equivocado, el link al contacto
equivocado— y hacía falta que existiera: volverse a las 48 horas resuelve el
ave olvidada, pero arrepentirse es ahora. Pide dos toques, porque no hay cómo
volver atrás de eso, y solo mientras nadie lo haya abierto: después ya no es un
convite, es un loro en vuelo, y lo que se hace con un ave que llegó lo decide
quien la recibió.

Los seis momentos de un convite salen del reloj y no de un campo que alguien
tenga que acordarse de actualizar —`yendo`, `barra`, `volviendo`, `encasa`,
`reclamado`, `cancelado`— igual que la posición de un ave en vuelo.

No hace falta migrar nada para prenderlo: las tres tablas de Supabase son
genéricas (`clave` → valor), así que las claves nuevas entran en las que ya
están.

Para verlo entero sin esperar seis horas a que el bicho se emborrache:

    LOROS_ESCALA_TIEMPO=600 npm run start
    LOROS_ESCALA_TIEMPO=600 npm run prueba

Y las 48 horas, que a esa escala siguen siendo cinco minutos, tienen su propia
prueba con el reloj mucho más acelerado, donde pasan en tres segundos:

    LOROS_ESCALA_TIEMPO=60000 npm run start
    npm run prueba:caducidad

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

## La abducción

Un ave en el aire era irreversible del lado de quien la mandó. El mensaje
equivocado, la persona equivocada, el arrepentimiento a los treinta segundos:
lo único que quedaba era mirarla cruzar el mapa. El lorito de convite ya tenía
su silbido para llamarlo de vuelta; el loro en vuelo no tenía nada.

Ahora tiene esto: **solicitás una abducción y viene un plato volador a
llevárselo**. Baja del cielo, engancha al bicho con el rayo y se van los dos.

Es la contraparte exacta de la suerte del ave, y juntas cierran una simetría
que faltaba: **lo que se hace con un loro que ya llegó lo decide quien lo
recibió; lo que se hace con uno que todavía está en el aire lo decide quien lo
soltó.** Nadie puede abducir el ave de otro, y después de aterrizar ya no se
puede: ese mensaje ya es del otro.

### Se entra tocando el ave en el mapa, y solo ahí

El botón vivió un rato en **dos lugares**: al pie de la tarjeta, en la pestaña
"En vuelo", y tocando el bicho en el mapa. Se quedó con el segundo.

El motivo no es ahorro de código: es **dónde corresponde que esté**. La lista de
"En vuelo" se lee de arriba abajo, con el pulgar bajando, y ahí un botón
irreversible al pie de cada tarjeta es una trampa esperando — por eso había que
protegerlo con dos toques y con un `onBlur` que lo desarmara. Tocar el ave en el
mapa es lo contrario: hay que **ir a buscar** ese bicho, apuntarle y darle. El
gesto ya dice que la cosa es a propósito.

De paso, la tarjeta volvió a ser un `<button>` entero. Había dejado de serlo
porque adentro iba el de la abducción, y un botón adentro de otro es HTML
inválido: el navegador lo desarma y el de adentro deja de recibir sus toques.
Sin nada que anidar, vuelve a ser tocable de punta a punta.

Y sobre el globo del mapa, tres detalles que son bugs si se hacen distinto:

- **Se arma al abrirlo, no al crear la capa.** Leaflet acepta una función como
  contenido y la llama en cada apertura. Entre que un ave despega y que alguien
  la toca pasan horas: un "llega en 3 h" congelado en el momento del despegue
  sería mentira.
- **Las aves ajenas no lo tienen.** En la vista «Del resto» los vuelos son
  anónimos y vienen con las puntas corridas. Abrirles un globo contaría de quién es y
  adónde va, que es exactamente lo que esa vista existe para no contar. Esas
  siguen siendo dibujo.
- **Mientras mudás el nido, las aves vuelven a ser dibujo.** Un marcador
  interactivo se come el toque y el mapa nunca se entera, así que tocar justo
  donde pasaba un loro no plantaría el nido en ningún lado. Se apagan con una
  clase (`.eligiendo`) mientras dura la mudanza.

El área sensible se agranda con un pseudo-elemento (`.marcador-ave.tocable`) en
vez de agrandar el ícono: el ave mide 34×28 y un dedo no acierta eso, menos con
el bicho en movimiento. Agrandar el ícono habría movido el dibujo y el punto
donde Leaflet lo ancla.

No se llama "eliminar" ni "cancelar", y no es solo por el chiste. Eliminar
sugiere que la cosa deja de haber existido, y no es cierto: del otro lado ya se
avisó que venía un loro, y esa persona **ve pasar la nave**. Una abducción es
pública. Pide dos toques, como todo lo irrevocable acá, y el segundo dice qué
pasa en vez de preguntar "¿seguro?": lo que hay que confirmar es la
consecuencia.

Lo que no puede fallar, y por eso tiene prueba propia: **el mensaje no se
entrega, ni siquiera cuando pase su hora de llegada.** Esa hora está escrita
desde el despegue, así que sin taparlo el loro "aterrizaba" solo unas horas
después y entregaba el texto que la nave se había llevado. Habría sido un
borrado que no borra — el peor resultado posible, porque quien lo pidió se
queda creyendo que sí.

### El rayo tiene los colores de las seis aves

No es adorno. Lo que la nave se está llevando es un lorito, y el rayo es lo
único de la escena que puede decirlo sin dibujar un pájaro adentro: está pintado
con el mismo `color` que cada especie tiene en [`lib/aves.ts`](lib/aves.ts), así
que el bicho abducido queda atravesado por su propio color sea cual sea.

Tres cosas que se probaron mirando el dibujo renderizado, no imaginándolo:

- **Bandas duras, no un degradado suave.** Interpolando de lima a violeta a
  celeste, los pares que se tocan se mezclan en gris y marrón: a 46 px —el
  tamaño real en el mapa— el rayo se leía como un cono sucio y el arcoíris no
  existía. Cada color se queda con su franja.
- **El desvanecido va por máscara, no por el color.** Si la transparencia
  viviera en el mismo degradado que el arcoíris, el rayo se apagaría hacia un
  costado. Se apaga hacia el suelo, que es donde termina un rayo.
- **Las motas que suben son blancas.** Se probaron del color de un ave y
  desaparecían: manchitas de color adentro de un rayo hecho de colores. En
  blanco se leen contra cualquiera de las seis franjas, que es lo único que se
  les pide. Son las que hacen que la escena diga "se lo está llevando" en vez
  de "le apunta con una linterna".

Los ids de los degradados llevan sufijo por vuelo. Con dos abducciones a la vez
compartirían `id="rayo"` y el navegador resolvería las dos al primero que
encuentra: hoy daría igual porque son idénticos, pero es la clase de bomba que
explota el día que uno cambie.

La escena dura nueve segundos (`MS_ABDUCCION`) y son los únicos de la app que
**no** se aceleran con `LOROS_ESCALA_TIEMPO`: es una animación y no un vuelo, y
acelerarla en una demo la haría invisible, que es justo lo que se trata de
evitar. Durante esos nueve segundos el ave no avanza más —un bicho adentro de
un rayo tractor no sigue viaje— y el tramo sigue dibujándose para que la nave
llegue, se quede y se vaya. El número vive en `lib/vuelo.ts` y la animación en
`app/globals.css`: es el único lugar donde un valor de CSS tiene que coincidir
con uno de TypeScript, y está dicho en los dos lados.

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
que Leaflet dibuja en SVG, los papelitos de las ceremonias y las aves se arman en
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
| ¿Cuántos loritos **abrieron**? | Esperando y reclamados solos cuentan dos historias que se ven idénticas: 40 abiertos y 5 nidos es un problema de alta; 6 abiertos y 5 nidos es que nadie comparte. Se arreglan para lados opuestos. |
| ¿Y **conjuntos**? | Viven en otra tabla. Sin ellos la bandada queda vacía, y con solo lo de arriba el diagnóstico decía "todo bien". Pasó, y borró amistades. |
| ¿Cómo está **tu** bandada? | Cuántas guardadas, cuántas en formato viejo, cuántas personas hay en tu historial. Desde afuera, una bandada vacía y una base que no escribe se ven igual. |
| ¿Anda **Nominatim**? | Hace una consulta de verdad —las coordenadas del Obelisco— y espera "Buenos Aires, Argentina". Si falla dice por qué: un 403, un timeout, un bloqueo. Sin esto, "vivís en un descampado sin nombre" y "nos bloquearon" se ven los dos como un nido sin lugar. |
| ¿Están los avisos prendidos? | Si faltan las claves VAPID o el secreto del despertador, lo dice: sin eso nadie se entera de que aterrizó un ave. |
| ¿El secreto de sesión es largo? | Uno corto se adivina sin conexión, probando contra la cookie propia. |
| ¿Cuántas aves ves **en el aire**? | Es el número del globito del ícono, tal como lo cuenta el servidor. Está para poder compararlo con el que arma la página: si los dos contaran distinto, el número saltaría cada vez que abrís la app. La prueba lo compara. |

Ninguna de estas preguntas estaba el primer día. Cada una se agregó después de
que su ausencia costara algo.

## Las notificaciones

Andan con la app cerrada. Es la única pieza que puede hablarle a alguien que no
está mirando, y sin ella la promesa de la app —"tu guacamayo llega en 1 día
6 h"— no tiene quién la cumpla: nadie deja una pestaña abierta un día.

**Cómo se prende.** Tres pasos, una vez:

```bash
npm run vapid          # genera el par de claves
```

Cargar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACTO` y
`LOROS_CRON_SECRET` como variables de entorno, redeployar, y correr la sección
del despertador de `supabase.sql` (pide habilitar `pg_cron` y `pg_net` en
Supabase → Database → Extensions).

**Sin nada de eso la app anda igual**: los avisos salen mientras la pestaña
esté viva, como antes, y `/api/salud` avisa que están apagados. Prenderlo no
migra nada.

### Lo que dicen, y por qué en un solo archivo

Los textos vivían en **dos lugares**: el servidor los escribía en sus rutas y el
cliente los volvía a escribir en `app/nido/page.tsx`. Eran los mismos momentos
—despegó, aterrizó, se perdió— redactados dos veces, y ya se habían separado
solos: el mismo extravío se anunciaba *"Se perdió tu loro"* desde el servidor y
*"Se perdió un loro"* desde la pestaña abierta. Nadie los iba a mantener
sincronizados a mano, así que dejaron de estar a mano: hoy todos salen de
`lib/avisos.ts`, y `npm run prueba:avisos` los imprime y los revisa sin
necesidad de servidor.

**Tres reglas, y las tres salen de mirar una pantalla de bloqueo:**

**El nombre va en el título.** Es lo único que se lee de reojo con el teléfono
sobre la mesa. *"Aterrizó un lorito"* obliga a desbloquear para saber de quién;
*"Aterrizó el lorito de Ana"* ya lo dijo. Se saltan la regla las tres que hablan
de **tu** ave y de nadie más —"Volvió tu lorito", "Se perdió tu lorito"—, donde
meter un nombre diría lo contrario de lo que pasó.

**El emoji va al final.** Siempre. Estaban seis al final y dos al principio, y
apilados en la pantalla de bloqueo el desalineado se ve.

**El mensaje no viaja.** Ni un pedazo. Abrir el ave es la ceremonia de la app y
un aviso que adelanta el texto se la come. Es la misma regla que `lib/vista.ts`
ya respeta del lado del servidor, y la prueba la deja escrita: estas funciones
**no reciben** el mensaje, así que no tienen de dónde filtrarlo.

**Un aviso nombra un solo pájaro.** Esta salió de una captura de la vida real:

> **Aterrizó el lorito de Manchu 🦜**
> Esa paloma te está esperando en el nido.

Dos animales en dos renglones, para el mismo vuelo. Pasó porque el título se
quedó con la palabra de la app —"lorito"— y el cuerpo seguía presentando la
especie como si fuera otro bicho, con un demostrativo que apuntaba a algo que
nadie había mencionado.

La especie sigue apareciendo donde **explica** algo: *"Es un guacamayo: llega
en 3 h"* dice por qué tarda tres horas, e identifica al mismo lorito en vez de
presentar otro. La prueba distingue las dos formas — descuenta la especie
cuando viene justo después de "es un/una" y la cuenta en cualquier otro lado.

Vale la pena saber que el sistema **ya escribe el nombre de la app al lado de
cada aviso** ("from Enviaunlorito" en iPhone). Esa parte es del sistema
operativo y no se puede sacar; lo que sí se puede es no repetir la palabra tres
veces entre el nombre, el título y el cuerpo.

Una cuarta, más chica, que igual se nota: **el género de la especie**. Tres de
las seis aves son femeninas y la tabla ya lo sabía (`AVES[x].articulo`). Sin
usarlo salían *"Ese paloma"* y *"Va el guacamayo"* — la clase de detalle que
delata que el texto lo armó una máquina.

### Play Protect y el APK que no escribimos

En Android, "instalar" una PWA no instala tu sitio: el navegador le pide a un
servidor que **genere un APK de verdad** que lo envuelve (un *WebAPK*). Chrome
lo mintea contra el servidor de Google; Samsung Internet genera el suyo.

Eso importa porque el cartel *"Se bloqueó la app no segura — esta app se diseñó
para una versión anterior de Android"* es Play Protect mirando el
`targetSdkVersion` de **ese APK**. Y `targetSdkVersion` **no existe en un
manifest web**: no hay dónde tocarlo desde este repo. Quien lo pone es quien
minteó el APK.

Se puede instalar igual con "Instalar de todas formas" —es una advertencia, no
un bloqueo— pero para alguien que recién llega es de lo más caro que puede
pasar: Google diciéndole que la app no es segura justo al entrar.

Lo que sí es nuestro y está declarado, aunque no sea la causa:

- **`id`** fija la identidad de la app instalada. Sin declararlo se deriva de
  `start_url`, así que el día que esa dirección cambie las instalaciones
  existentes pasarían a verse como **otra** app: ícono duplicado y el nido
  viejo del otro lado. Se escribe igual a la identidad que ya tienen las
  instaladas (`/nido`) para no romper a nadie.
- **`scope: "/"`**, el sitio entero y no la carpeta de `start_url`. Importa por
  los links de convite: `/l/<llave>` vive fuera de `/nido`, y con el alcance por
  defecto abrir uno con la app instalada la sacaba a una pestaña del navegador
  en vez de abrirla adentro.

### El ícono

Se generan todos del **mismo** `app/icon.svg` con `node scripts/iconos.mjs`, así
que el dibujo vive en un solo archivo: 192 (el mínimo que Chrome pide para
ofrecer instalar), 512 (de ahí sale el ícono del lanzador en todas las
densidades), 180 (iOS, que no acepta SVG) y el enmascarable de Android.

**Tres decisiones de dibujo, las tres tomadas mirándolo a 24, 40 y 60 px** — que
es como se ve de verdad, no como se ve mientras uno lo dibuja:

- **El fondo lleva el color.** Era casi negro con el bicho encima, y en una
  pantalla de inicio llena de íconos de colores eso es un rectángulo oscuro más:
  no se encuentra. Ahora el lima —el color de la app— hace de campo. Es lo que
  hacen WhatsApp, Telegram y Spotify, y por lo mismo.
- **Solo la cabeza, centrada y entera.** El dibujo anterior metía cuerpo, cola,
  ala y líneas de velocidad, y no entraban: el bicho quedaba recortado contra la
  esquina de abajo a la izquierda con medio cuadro vacío arriba. A 40 px era una
  mancha verde con un punto naranja.
- **El amarillo no es adorno.** Contra el lima, la cabeza tiene que ser oscura
  para contrastar — y una cabeza oscura con pico naranja se lee **cuervo**, no
  loro. El arco amarillo alrededor del ojo es lo único que dice de qué especie
  es esto, y contrasta contra la cabeza, que es donde tiene que contrastar.
  Probado sin él: se pierde a los 60 px.

El **enmascarable** sale del mismo archivo con dos cambios: se le sacan las
esquinas redondeadas —las pone el teléfono, y si vinieran de acá se verían dos
veces— y se le achica **solo el bicho**, para que entre en el círculo central
del 80%, que es lo único que Android garantiza. Solo el bicho: el campo de color
tiene que seguir llegando al borde. Verificado recortándolo con las tres formas
que usan los fabricantes —círculo, gota, cuadrado redondeado— y contra el círculo
de seguridad.

**Y salían cortados.** Chrome headless le descuenta a la ventana el alto de una
barra que no existe: pidiendo `--window-size=W,W` el viewport queda 87 px más
bajo, la captura se rellena en blanco abajo y el dibujo sale partido. Medido a
192, 300, 400 y 512: **siempre faltan los mismos 87 px**. Se veía en el diálogo
"Agregar a Inicio" del iPhone, con el perico cortado a la altura del pico — y en
el enmascarable era peor, porque el fondo a sangre dejaba de serlo justo abajo.

No se le resta 87 a mano —ese número es de una versión de Chrome y de un
sistema— sino que se pide una ventana bastante más alta, se garantiza que el
dibujo entre entero, y después se recorta el cuadrado de arriba. El recorte va
en Node con `node:zlib`, que ya viene incluido: traer una librería de imágenes
para cortar un PNG sería un camión para una silla.

### El toque lleva al lorito, no al mapa

`public/sw.js` siempre supo navegar a una URL al tocar el aviso. **Ninguno la
mandaba**: todos caían en `/nido` a secas. Te avisaban que aterrizó algo de Ana
y después te tocaba encontrarlo entre las tarjetas.

Ahora cada aviso viaja con `?ver=<idLoro>`, la página lo lee y el panel abre la
pestaña donde está esa tarjeta, la trae a la vista y la resalta un segundo y
medio (`.tarjeta.señalada`). Lo que **no** hace es abrirla: abrir un ave es la
ceremonia —el confeti, el luto, el texto— y esa es de quien recibe, cuando
quiera. Un aviso te lleva hasta la puerta; no la empuja.

Dos detalles que sin ellos no funciona:

- **`notificationclick` buscaba mal.** Comparaba la URL entera con `includes`,
  así que una pestaña abierta en `/nido` no "contenía" `/nido?ver=abc` y se
  abría una ventana **nueva** en cada toque. Ahora busca por camino y usa
  `navigate`, que es lo que hace que el `?ver=` llegue a una pestaña que ya
  estaba abierta.
- **La dirección se limpia al llegar.** Con `replaceState`, apenas se leyó. Si
  quedara puesta, recargar —o volver con el botón de atrás dos días después— te
  llevaría de nuevo a un ave de la que ya te olvidaste.

### Agregarla a la pantalla te borraba el nido

El peor de los agujeros que tuvo la app, y lo abría ella misma.

En iPhone los avisos con la app cerrada **exigen** que esté agregada a la
pantalla de inicio, así que un cartel invitaba a hacerlo. Pero para el iPhone
**esa app es otro navegador**: arranca con un almacenamiento nuevo y no comparte
la cookie con Safari. Del otro lado aparecía el onboarding —"armá tu nido"— con
los loros, la bandada y el código del otro lado de una puerta cerrada.

Y la llave, que existe desde el día uno para exactamente esto, **no servía**:
solo funcionaba como link `/entrar?llave=…`, y adentro de una app agregada a la
pantalla **no hay barra de direcciones donde pegarlo**.

Se arregló por los dos lados:

- **"Ya tengo un nido"**, en el paso 1 del onboarding. Se pega la llave y se
  entra. Acepta el link entero o solo el token, porque nadie va a recortar una
  URL a mano — y menos alguien que acaba de perder su nido. Navega a `/entrar`
  en vez de resolverlo por fetch: esa ruta contesta un 303 con la cookie puesta
  y el mapa aparece dibujado de una, sin que se vea el onboarding primero.
- **La llave, ANTES de mandar a instalar.** El cartel ahora ofrece guardarla como
  primer paso, con `navigator.share` —que en iPhone es lo que deja mandársela a
  uno mismo por WhatsApp o guardarla en Notas, que es lo que de verdad sobrevive
  a cerrar Safari— y el portapapeles como red.

Verificado de punta a punta contra el servidor: nido con un loro y dos amigos en
Safari, cliente nuevo sin cookie —"sin nido"—, llave pegada, y del otro lado el
mismo id, el mismo loro y los mismos amigos.

### El permiso se pide una sola vez en la vida

Y esa es la razón de todo lo que sigue: si te dicen que no, **no hay forma de
volver a preguntar**. Ni mañana, ni el día que el push sí esté configurado. No
es un diálogo que se pueda reintentar, es una puerta que se cierra.

Con eso a la vista, la app hacía las dos cosas que no había que hacer. Pedía el
permiso **apenas terminaba el onboarding** —sin contexto, a los diez segundos de
haber llegado y antes de que existiera un solo vuelo del que avisar— y lo pedía
**sin mirar si el servidor tenía claves para mandar algo**. La segunda es la
grave: un deploy sin VAPID, que es el estado normal de una app recién instalada,
iba fundiendo la única oportunidad de cada persona que entraba, a cambio de un
permiso que nadie podía usar. `/api/push` ya lo decía con todas las letras —
"pedir un permiso que después no vas a poder usar es la peor forma de gastarlo"—
y el navegador no le hacía caso.

Ahora son **dos preguntas y no una**, que es todo el truco:

1. Una tarjeta nuestra, en el panel, **solo mientras hay un ave en el aire**.
   Decir que no ahí no cuesta nada y se puede volver a ofrecer. Y la pregunta
   se contesta sola: la app acaba de prometer que algo llega en seis horas.
2. El cartel del navegador —el que es para siempre— se abre **recién si la
   tocan**. La oportunidad se gasta únicamente sobre alguien que ya dijo que sí.

Y no se pregunta nada cuando no hay nada que ofrecer: sin claves VAPID en el
servidor, la tarjeta no aparece. Es la misma lección que la ubicación, que por
eso se pide en el paso 2 del onboarding y no al entrar.

En iPhone tampoco se pide, porque **no hay nada que pedir**: sin agregar la app
a la pantalla de inicio el Push API no existe, el cartel del permiso ni siquiera
aparece, y vale para todos los navegadores del teléfono —en iPhone Chrome y
Firefox son el mismo WebKit con otro nombre—. Lo único que sirve ahí es contar
el paso que lo desbloquea. Se decide en `necesitaInstalarseParaAvisar()`, con
prueba propia: equivocarse es ofrecerle avisos a quien no los puede recibir y
gastar el permiso en el intento.

Queda una costura que se separa sola y por eso se cose en cada carga: el permiso
vive en el navegador y la suscripción en el servidor. Quien dijo que sí **antes**
de que hubiera claves VAPID tiene el permiso puesto y ninguna suscripción
guardada, así que no recibiría un solo aviso — y desde afuera se ve igual que un
push que no anda. `sincronizarAvisos()` lo arregla sin preguntar nada.

### El despertador

Es la parte que no es de front y por la que esto no existía. El ave aterriza en
un momento futuro —a veces dentro de días— y en serverless no hay ningún
proceso esperando ese instante. La hora se sabe al despegar, pero alguien tiene
que levantarse a mirar. Eso hace `/api/despertador`, llamado cada minuto por
`pg_cron` desde el mismo Postgres de la app.

Recorre un índice de **vuelos pendientes**, que es un conjunto aparte y no el
del mapa del mundo, por dos razones concretas: aquel descarta a Doña Cotorra
—y un ave suya que aterriza igual merece aviso— y está recortado a 300, así
que un guacamayo cruzando el Atlántico se le puede caer a mitad de viaje y
nadie se enteraría de que llegó. Este se vacía solo: cada vuelo sale cuando ya
no queda nada que contar de él.

Tres momentos se avisan desde ahí, y los tres pasan cuando quien recibe **no
está mirando**: aterrizó un ave, volvió la que soltaste, o se perdió una tuya.
Lo que el otro hace con tu ave no: eso ocurre mientras esa persona usa la app,
así que el aviso sale en ese mismo momento y no espera al minuto siguiente.

**El texto nunca va en el aviso**, ni un pedazo. Abrirlo es la ceremonia de la
app y adelantarlo en la pantalla de bloqueo la arruina.

Dos detalles que no son de adorno:

- **Cada aviso pide su turno** (`reservar`, la misma operación atómica que usa
  el resto). El despertador corre cada minuto y puede solaparse consigo mismo:
  sin eso, una corrida lenta y la siguiente arrancando mandarían el mismo aviso
  dos veces.
- **Las suscripciones muertas se borran solas.** Un teléfono que desinstaló la
  app contesta 410, y sin limpiarlas la lista crece para siempre y cada aviso
  paga el intento de hablarle a alguien que ya no está.

**El despertador está cerrado sin `LOROS_CRON_SECRET`.** Es lo contrario de lo
cómodo y es lo correcto: abierto, es un botón de mandar notificaciones que
cualquiera puede apretar.

### iPhone

Hay algo que ninguna implementación arregla: **en iPhone, sin agregar la app a
la pantalla de inicio, no hay notificación posible.** El Push API de Safari
existe solo para web apps instaladas; una pestaña común no tiene acceso a
`PushManager` y ni siquiera puede pedir el permiso. La app es instalable
(`app/manifest.ts`) y eso lo desbloquea, pero el paso lo da la persona.

### Por qué una dependencia

`web-push` es la única que se sumó por algo que no es UI. Firmar el JWT de
VAPID y cifrar el cuerpo con AES128GCM sobre ECDH+HKDF es criptografía, y es
exactamente donde se esconden los errores que no se ven hasta que un navegador
rechaza el envío en silencio. El resto de los servicios se hablan con `fetch`
pelado —Upstash, Supabase, Nominatim— porque son HTTP y se pueden leer; esto
no.

## El mapa

Leaflet, con mosaicos de CARTO sobre OpenStreetMap (sin API key) o de Mapbox si
hay token.

**El mapa es claro y el panel oscuro**, y eso no es un descuido: son dos cosas
distintas. Lo que decide si el nombre de un nido lleva halo negro o blanco no
es el color del panel de al lado, es el color de lo que hay abajo del rótulo.
Así que la pintura de todo lo que va encima del mapa —rótulos, halos, anillos,
sombras— sigue al **mosaico**, no al tema (`pinturaDelMapa()`, en
`lib/tema.ts`).

Con una excepción que vale la pena entender: el anillo del nido sigue al TEMA.
No separa el punto del mapa, separa el punto de lo que tenga al lado, y el
punto sale de la paleta del tema. Cada valor sigue a aquello con lo que de
verdad tiene que contrastar.

Y sobre mapa claro **las rutas llevan un contorno oscuro abajo**. Los colores
de las seis aves están elegidos para brillar contra un fondo casi negro: el
lima del perico da 1,5:1 sobre gris claro, o sea una línea que casi no está. La
respuesta no es cambiarles el color —el color del ave es el mismo en la
tarjeta, en el mapa y en el bicho, y romper eso rompe lo único que deja seguir
un vuelo de un vistazo— sino la de cualquier mapa de verdad: un contorno. La
línea sigue siendo del ave y se ve sobre lo que sea.

Se pueden probar otros mosaicos en vivo, sin redeployar: `?mapa=calle` (el
Voyager de CARTO, el que más se parece a los mapas de un teléfono),
`?mapa=limpio` (el mismo sin nombres de lugares), `?mapa=noche` (la selva de
noche, que fue el default hasta acá) y `?mapa=claro` para volver. La elección
queda guardada en el navegador. La lista es cerrada a propósito: el nombre
termina adentro de la dirección de donde se piden los mosaicos, así que si se
aceptara cualquier cosa, un link preparado podría hacer que el mapa de otra
persona cargue imágenes de donde el que armó el link quiera.

Dos cosas más que no son de fábrica:

- **La posición de las aves no viene del servidor.** Sale de la fórmula: con la
  hora de salida, la de llegada y los dos puntos alcanza. El servidor se
  consulta cada varios segundos y el ave igual se mueve a 60 cuadros por
  segundo, porque cada cuadro se recalcula en el navegador.
- **Las rutas se dibujan con una panza al costado**, no rectas. Un ave despega,
  toma altura y baja del otro lado; en el mapa no hay altura, pero sí se puede
  insinuar con un arco, que es lo que hacen todos los mapas de vuelos y lo que
  ya dibujaba la portada con sus bezier —adentro, en cambio, todo salía recto.
  La panza mide un 6 % de la distancia y tiene techo, porque un vuelo
  transatlántico ya se curva solo por el círculo máximo. Va siempre al mismo
  lado de la marcha, y eso resuelve gratis el dibujo de la vuelta: como vuelve
  al revés, su arco cae del otro lado y las dos líneas no se pisan.

  El arco es **dibujo**: la distancia con la que se calcula cuánto tarda cada
  ave sigue siendo la real entre las dos personas. El camino que se ve es un
  1,5 % más largo que esa recta y ese 1,5 % no se le cobra a nadie. Se apaga
  entero poniendo `CURVA` en 0 (`lib/geo.ts`), sin sacar una línea de código.

- **Los nombres que no entran, se callan.** Doña Cotorra se planta a
  trescientos metros de tu nido, así que apenas el mapa se aleja los dos
  nombres quedan uno encima del otro y no se lee ninguno —"Doña hidorra"—. Dos
  nombres pisados son peores que uno solo. Se resuelve como en cualquier mapa,
  por prioridad y a los codazos: el tuyo nunca se calla, después la bandada,
  después la vecina de práctica, y al final la cervecería. Se apagan con
  opacidad y no con `display`, porque un rótulo sin caja no se puede medir y el
  pase siguiente no sabría si ya podría volver.

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
| Tu ubicación | corrida hasta **300 m** | corrida entre **1 y 3 km** |
| Tu nombre | sí | **no** |
| El id de tu nido | sí | **no** |
| El mensaje | solo al aterrizar, y solo a quien va dirigido | **nunca** |
| Nidos dibujados | sí, con su círculo | **ninguno ajeno**; el tuyo sí, para no perder de vista dónde estás parado |

Tres detalles que no son obvios:

- **Las semillas del corrimiento son distintas** (`zona:` y `mundo:` en
  [`lib/privacidad.ts`](lib/privacidad.ts)). Con la misma, alguien de tu bandada
  —que ya te ve corrido 300 m— podría cruzar las dos vistas y despejar el rumbo
  del desvío, que es la mitad del secreto.

  El efecto visible de eso es que **el mismo nido cae en dos lugares distintos**
  según la vista. Que las semillas sean distintas es justamente lo que impide
  que las dos vistas se crucen: con la misma, restar una de la otra daría el
  rumbo exacto hacia el punto real.

  El radio del mundo **era 25 km y hoy es 3**. Con 25 el mismo vuelo aparecía a
  22 km de donde de verdad salió —otro partido del conurbano— y en un mapa de
  ciudad eso se lee como un error, no como privacidad. 3 km sigue diciendo "sale
  de esta zona" sin decir de qué casa. Se mueve con `LOROS_RADIO_MUNDO_KM`, sin
  tocar código, porque es una decisión de producto y no una constante técnica.

  Como en pantalla no había nada que lo dijera, la primera vez que alguien entra
  a «Del resto» se lo explica un cartelito, una vez en la vida
  (`loros:mundo-explicado`).
- **No se dibuja ningún nido ajeno**, ni siquiera un punto tenue. El
  corrimiento es toda la protección: poner un pin sobre una coordenada corrida
  al azar aparenta una precisión que no existe.
- **Se puede apagar**, desde *Nido → Aparecer en «Del resto»*. Y apagarlo saca
  todos tus vuelos, no solo los próximos. Guardar el nombre no vuelve a
  prenderlo: el panel usa el mismo endpoint para las dos cosas, y sin esa
  distinción cambiarse el nombre te devolvía al mapa del mundo sin pedirlo.

Los vuelos de Doña Cotorra no entran: es una vecina de práctica, y hacerla pasar
por gente sería inflar el mapa con vuelos que no existen. Cuando no hay nadie
volando, lo dice.

### Y los tuyos tampoco: "del resto" quiere decir del resto

Un rato **sí entraban**, y se veía roto. La vista dibujaba tu propio arco
corrido como el de un desconocido cualquiera— justo al
lado de tu nido, que ahí mismo se dibuja **exacto**, porque tu nido es tu dato.
Resultado: tu ave saliendo de un lugar donde no estás, a veinte kilómetros de tu
propio nido. Parecía un error y era uno.

El corrimiento existe para que **no te ubiquen los demás**. Contra vos mismo no
protege de nada: ya sabés dónde vivís. Lo único que hacía era mentirte en tu
propio mapa.

Ahora se filtran, y con dos cuidados que la prueba deja escritos:

- **Las dos puntas cuentan**, no solo quien lo mandó. El arco muestra las dos,
  así que un ave que viene hacia vos también es tuya y tampoco aparece acá.
- **El filtro es por persona; la foto, compartida.** `/api/mundo` es el endpoint
  más caro y su respuesta se cachea tres segundos para todos. Si el filtro se
  hiciera al armar la foto, sacarla de tu vista la sacaría también de la de los
  demás. La foto se guarda con los ids de las dos puntas al lado —que **no**
  salen nunca— y la resta se hace al responder.

Por eso los dos contadores no coinciden, y está bien: **"8 en el aire"** son tus
aves (las que van, las que vuelven y las que esperan en la cervecería) y
**"7 cruzando el mundo"** son las de los demás.

### Las que vuelven también cruzan el mundo

Esto salió de dos capturas de dos cuentas distintas: una con dos aves en el
aire y la otra viendo una sola. Faltaba justo **la que volvía**.

`enElAire` descartaba el loro en el instante en que aterrizaba la **ida**
(`if (ahora >= l.llegada) continue`). Pero si del otro lado lo sueltan, ese
mismo bicho arranca un segundo vuelo de regreso que
[`lib/tramos.ts`](lib/tramos.ts) siempre dibujó para la bandada — y que en «Del
resto» no aparecía nunca. Un ave que vuelve a su nido es un vuelo tan real como
la ida.

Ahora `vuelosMundiales` devuelve **hasta dos** por loro, cada uno con su propio
hash: el mapa los indexa por id y con el mismo se pisarían la capa. La vuelta va
al revés y sin desvío, igual que en la vista de la bandada.

De paso apareció otro: `enElAire` **no miraba `abducido`**, así que un ave que
se llevó una nave seguía volando en «Del resto» hasta una hora de llegada que ya
no iba a pasar nunca.

**Y una lección sobre la prueba, que costó tres intentos.** La primera versión
la puse al lado del test del ave que vuelve, y falló: a esa altura de la suite
los nidos de Ana y Beto quedaron pegados por las pruebas de mudanza, así que con
la escala acelerada su vuelo de regreso dura **milisegundos**. Afirmar algo
sobre un vuelo más corto que un viaje al servidor es la misma trampa que ya nos
comimos con el desvío del perico y el olvido de la cotorra. La prueba usa nidos
propios a 300 km, que dan veinte segundos de aire a cada pata. Y de paso hubo
que arreglar a un vecino que comparaba **conteos globales** del mundo contra una
foto vieja: ese número lo mueve cualquier cosa —un ave que aterriza, una prueba
nueva al lado—, así que ahora mira si está el guacamayo de Ana, que es la
pregunta de verdad.

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

**Y no recupera a quien sacaste a mano.** En *Bandada*, cada tarjeta tiene una
cruz chiquita —chica de dibujo, de 44 px al dedo— que a dos toques saca a esa
persona de tu bandada. Corta por los **dos lados**: una baja de un solo lado
dejaría a la otra persona con tu zona, tu distancia y un botón para mandarte
loros, o sea sin sacar nada. Lo que ya está en el aire aterriza igual — el ave
salió y el mensaje está escrito; hacerla desaparecer sería mentirle a quien la
soltó.

El rescate de acá arriba es justamente lo que hacía que esto no funcionara: si
sacabas a la única persona que tenías, tu conjunto quedaba vacío, el rescate se
disparaba, encontraba los loros que se habían mandado y la volvía a poner. La
decisión se deshacía sola en la consulta siguiente. Por eso las bajas se anotan
—en las dos puntas, `echados:<id>`— y el rescate las saltea: **está para
recuperar lo que se perdió, no para deshacer lo que decidiste.** Volver a
sumarse con el código borra la marca, que es la forma explícita de arrepentirse.

Un detalle que apareció al probarlo: los loros que ya estaban en el historial
sacaban el nombre de la otra persona de la bandada, así que al sacarla pasaban
a decir "Alguien". El buzón es el recuerdo de lo que voló; llenarlo de
desconocidos porque alguien ya no está en tu lista es perder tu propia historia
y no proteger nada — el nombre ya lo tenías. `/api/estado` carga también los
nidos que aparecen en el buzón y ya no están en la bandada, y para quien no
sacó a nadie eso no cuesta ni una lectura.

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

### El nido que se pierde adentro de WhatsApp

La llave tapaba un agujero real y tenía uno propio: **había que sacarla antes de
necesitarla**, y vivía en una pestaña del panel que nadie visita el primer día.
Eso convierte un problema de "se me perdió" en uno de "no había forma de saber".

Y hay un lugar donde pasa casi siempre, no de vez en cuando. **WhatsApp no abre
los links en Chrome ni en Safari: abre un navegador propio, adentro de WhatsApp,
con su propio frasco de cookies.** El link de un lorito llega por WhatsApp, así
que el camino más común de toda la app —te llega un convite, lo abrís, armás tu
nido— termina adentro de ese navegador. Después la persona entra desde Chrome y
no tiene nido: el suyo sigue existiendo en el servidor, con su código, su bandada
y sus loros, del otro lado de una puerta sin picaporte.

Así que ahora la app se da cuenta de dónde está parada
([`lib/navegador.ts`](lib/navegador.ts)) y ofrece la llave **ahí**, que es el
único momento en que se entiende para qué sirve. No hay mecanismo nuevo: es la
misma llave de siempre, en otro momento. Y **comparte en vez de copiar** donde se
pueda — en el navegador de una app, el portapapeles es un lugar del que la llave
puede no salir nunca; el menú de compartir la manda afuera, que es lo único que
sirve.

Es la única pantalla de la app que habla de algo que todavía no pasó, así que se
porta como tal: no bloquea, no es una alarma, y se va y no vuelve.

Reconocer el navegador por su user agent es una heurística y no una verdad, y
tiene un caso que no se puede ver: el `SFSafariViewController` de iOS firma
idéntico a Safari. Por eso lo que se ofrece es siempre lo mismo que ya está en el
panel — si la detección falla, se pierde un aviso, nunca una funcionalidad. Los
dos errores posibles se prueban en `npm run prueba:navegador`, con user agents de
verdad, y el caso que más cuida es el que no es ninguno de los dos: **la app
instalada en un iPhone tiene el mismo user agent pelado que el navegador de
WhatsApp**, así que sin mirar `standalone` la app instalada —justo la que mejor
guarda el nido— sería la que más avisa.

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
lib/geo.ts        haversine, círculo máximo, el arco que se dibuja, rumbo, formatos.
lib/datos.ts      nidos, amistades, loros, la suerte del ave, Doña Cotorra.
lib/olvido.ts     lo que llega cuando no llega tal cual: la cotorra, la
                  perica y el ave que paró en la cervecería.
lib/cerveceria.ts la parada del lorito de convite y los copetines.
lib/convite.ts    el lorito para alguien que todavía no tiene nido.
lib/tramos.ts     los vuelos dibujables: la ida de cada loro y, si lo soltaron,
                  la vuelta. Solo tipos importados — lo usa el navegador.
lib/store.ts      persistencia: Upstash, Supabase o un archivo, según lo que
                  esté configurado.
lib/vista.ts      qué ve el navegador. Acá se decide qué NO viaja: ni el texto
                  de un loro en vuelo, ni las coordenadas exactas de nadie.
lib/privacidad.ts los dos desvíos fijos: 300 m para la bandada, 1 a 3 km para el
                  mapa del mundo, con semillas separadas.
lib/sesion.ts     identidad: un id firmado con HMAC en una cookie HttpOnly.
lib/navegador.ts  si estamos adentro del navegador de otra app —donde el nido
                  se pierde al salir— y si acá hay que instalar para poder
                  avisar. Pura, y con prueba propia.
lib/colorNido.ts  un color por persona, estable y sin choques en tu bandada.
lib/tema.ts       los dos temas. Lo que no es CSS: aves, mapa, papelitos.
lib/push.ts       los avisos con la app cerrada: VAPID, suscripciones, envío.
lib/codigo.ts     el código de nido en palabras, y la compatibilidad con los
                  de seis caracteres de antes.
lib/geocode.ts    coordenadas → "Palermo, Argentina" (Nominatim, best-effort).

app/page.tsx      la portada.
app/nido/         la app.
app/api/          estado, nido, amigos, loros, loros/leer, loros/suerte,
                  loros/abducir,
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
components/Fiesta.tsx      las tres ceremonias a pantalla completa.
components/GuardarNido.tsx la llave, ofrecida adentro del navegador de otra app.
components/Avisos.tsx      el permiso de avisos, pedido con un ave en el aire.
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
| `LOROS_RADIO_MUNDO_KM` | No | Cuánto se corren los puntos en «Del resto». Por defecto 3. Subirlo protege más y hace que las dos vistas se parezcan menos; bajarlo, al revés. Es un canje, no un ajuste. El piso —nunca sobre la casa— se calcula solo a un tercio del radio, con tope de 1 km. |

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
- **El push hay que prenderlo.** Ya está hecho —Web Push con VAPID y un
  despertador en `pg_cron`, todo arriba— pero un deploy recién hecho viene sin
  claves, y sin claves el aviso solo sale con la pestaña viva. Es una línea de
  configuración, no código que falte, y `/api/salud` lo dice. En iPhone además
  hace falta que la persona agregue la app a la pantalla de inicio, y eso no lo
  puede hacer el servidor.
