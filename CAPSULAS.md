# Lo que se abre solo

Tercera parte. [MONEDA.md](MONEDA.md) diseña la economía; [CADENA.md](CADENA.md)
pregunta para qué sirve la cadena. Este documento agarra la idea que quedó
arriba de la mesa —el mensaje cifrado hacia un momento— y la lleva hasta el
final: mensajes que se dejan para el futuro, para un lugar, o para nadie.

---

## La ley que ordena todo esto

Antes de cualquier diseño hay que entender una sola cosa, y decide qué se puede
construir y qué no:

> **El candado de tiempo garantiza "no antes". No puede garantizar "solo si".**

El candado de tiempo funciona porque la llave **todavía no existe**: es una firma
que una red pública va a producir en una fecha, y no la tiene nadie porque no
está hecha. Por eso nadie la puede adelantar, ni el que escribió la app, ni un
juez, ni vos.

Pero por la misma razón, cuando llega la fecha **la llave existe para todos**.
El candado no distingue entre quien está parado en el lugar correcto y quien
está en el sillón. No sabe dónde estás, no sabe quién sos, no sabe si el hecho
que esperabas ocurrió.

De ahí sale, sin excepciones:

| Condición | ¿Se puede hacer criptográficamente? | Qué es entonces |
|---|---|---|
| **Tiempo** — "no antes del 12 de marzo de 2041" | **Sí**, de verdad y sin confiar en nadie | Una ley |
| **Lugar** — "solo si estás parado acá" | **No** | Una regla del juego |
| **Persona** — "solo esta persona" | Sí, pero con su clave, no con el tiempo | Cifrado normal |
| **Hecho** — "solo si pasa X" | No | Un oráculo, o sea alguien de confianza |
| **Ausencia** — "solo si dejo de aparecer" | **No**, y es interesante por qué | Ver más abajo |

Por qué el lugar no puede ser un candado, dicho concreto, porque es la parte que
más ilusiona y la que más rápido se rompe:

- **Si la llave sale de las coordenadas**, entonces saber dónde está el mensaje
  es poder abrirlo. Y hay que publicar dónde está, o nadie lo encuentra nunca.
  El candado y el mapa del tesoro son el mismo dato.
- **Si un servidor mira tu GPS y te da la llave**, volviste a tener un tercero
  de confianza — justo lo que la idea 1 existía para sacar. Y encima
  `navigator.geolocation` se falsifica desde las herramientas de desarrollo en
  una línea. Esta app ya lo sabe: el nido se marca **tocando el mapa**.
- **Si se publica una zona gruesa y las coordenadas finas son el secreto**, hay
  que adivinar dentro del círculo. Un círculo de 500 metros con precisión de un
  metro son unas doscientas mil posibilidades: una computadora las prueba
  mientras parpadeás. Se puede encarecer cada intento con una función de
  derivación lenta y llevarlo a días de cómputo — pero eso es un **badén**, no
  un candado. Frena al curioso, no al que quiere.

Y esto no es una derrota: **es el mapa de diseño.** Lo que hay que hacer es
componer las dos cosas y ser honesto sobre cuál es cuál:

> **El piso lo pone la criptografía —nadie lo lee antes, nunca, ni el que
> escribió la app— y el techo lo pone la regla del juego —quién puede estar ahí
> cuando se abra.**

Que es exactamente cómo funciona el resto de esta app. El 0,2% no es una medida
de seguridad: es una regla. Y funciona porque la gente quiere jugar, no porque
sea imposible hacer trampa.

---

## 1. El huevo

**Un mensaje a una fecha.** Es la versión más pura y la única cien por ciento
criptográfica.

Y tiene nombre propio, que sale solo de la mitología que la app ya tiene: **un
loro no manda una cápsula, pone un huevo**. Se empolla. Tiene una fecha de
eclosión. Está en un nido. Y el día que se rompe, sale algo.

    El huevo de Ana        empolla en 4 años, 2 meses
    para su hija, el día que cumpla 18

- La pantalla se escribe sola: un huevo en el nido con una cuenta regresiva de
  años, y una ceremonia el día que se abre. `Fiesta.tsx` ya sabe hacer eso.
- Es el ave más lenta de todas, y en esta app la lentitud **ya es prestigio**.
  Es el escalón que sigue naturalmente después del guacamayo.
- No hace falta explicar nada. "Un mensaje que se abre en 2041" se entiende sin
  una sola palabra de criptografía, y la parte criptográfica es lo que hace que
  la promesa sea verdad.

**Y acá está lo que lo hace distinto de cualquier otra app de cápsulas del
tiempo, que las hay a montones:** las otras te piden que confíes en que la
empresa va a existir en 2041 y que nadie va a espiar mientras tanto. Esta puede
prometer las dos cosas y cumplirlas. El mensaje se guarda cifrado en
almacenamiento permanente, la llave no existe todavía, y **la app puede cerrar,
el dominio puede vencer y la empresa puede quebrar: el huevo empolla igual**.

Es, hasta donde veo, el único producto de mensajería que puede prometer eso, y
lo puede prometer justamente porque no depende de sí mismo.

**Variantes que salen gratis del mismo mecanismo:**

- **El huevo compartido.** Muchas personas escriben adentro del mismo huevo y se
  abre en una fecha. Un barrio, una promoción del colegio, una banda. Una
  cápsula del tiempo colectiva, que es un objeto que la gente ya entiende.
- **El huevo heredado.** Se puede pasar antes de que empolle. Nadie lo puede
  abrir, ni siquiera quien lo tiene: solo puede pasarlo.
- **El huevo que solo empolla si lo empollan.** Necesita que N personas lo
  toquen antes de la fecha o no sale nunca. Un compromiso colectivo con forma de
  bicho.

**Y las dos advertencias que van en la misma pantalla, no en la letra chica:**

- **La red pública tiene que seguir encendida.** Para once días, no es un
  riesgo. Para veinte años, es *el* riesgo, y hay que decirlo con esas palabras
  en la pantalla donde se pone la fecha. Se mitiga cifrando contra varios faros
  a la vez, y no se elimina.
- **No hay botón de arrepentirse.** Esta app tiene diseñado el arrepentimiento
  —la abducción existe porque *"arrepentirse es ahora"*— y el huevo lo elimina.
  Después de puesto, no hay silbido que lo llame de vuelta. Es la única cosa de
  toda la app que no se puede deshacer, y eso hay que decirlo antes y no
  después.

---

## 2. El escondite del cuervo

**Un mensaje dejado en un lugar exacto, para quien pase por ahí.**

El nombre no lo inventé: **los córvidos esconden comida y se acuerdan de miles
de escondites**. Es de las cosas más impresionantes que hacen los pájaros de
verdad. Y esta app ya tiene un cuervo, que ya es el que llega de negro y trae lo
que nadie quiere. Que sea el que esconde cosas en el mundo no es un injerto: es
biología, y encaja con el personaje que ya existe.

**Cómo funciona, aceptando la ley de arriba:**

- El escondite es una **regla del juego**, no un candado. La app te deja
  levantarlo si estás ahí. Alguien que quiera falsear el GPS lo va a poder
  hacer, igual que en cualquier juego geográfico de los últimos veinticinco
  años.
- **Y eso está bien**, porque el geocaching existe desde el 2000 y funciona
  entero con honor y con las ganas de ir. Nadie hace trampa en el geocaching
  porque hacer trampa es *aburrido*: te quedás con un texto y sin la caminata,
  que era todo el punto.
- **Lo que sí se puede hacer criptográficamente es el piso**: el escondite tiene
  además una fecha a partir de la cual se puede abrir. Antes de esa fecha no lo
  lee nadie, ni el que escribió la app. Un escondite que se puede levantar desde
  hoy, o desde dentro de un año.

**Lo que le da sentido a esto acá y no en cualquier app:** esta app ya es
geográfica en serio. Distancias reales, vuelos que tardan lo que tardan,
coordenadas que importan. Un escondite es una continuación natural de eso, no
una función nueva.

**Y ahora sí, la parte que hay que resolver antes de escribir una línea, porque
es la única de todo este documento que puede lastimar a alguien de verdad:**

Un mensaje público, permanente, en una coordenada exacta, que cualquiera que
pase puede leer y que nadie puede bajar, es un canal de hostigamiento con
domicilio fijo. Y mandar gente a coordenadas exactas es un problema de seguridad
física que otros juegos geográficos ya pagaron.

Las reglas mínimas, y no son opinables:

- **El escondite se pega a un lugar público.** Plazas, esquinas, monumentos.
  Nunca una dirección exacta, nunca una casa. Que la app redondee a lo público
  más cercano y muestre el radio, como ya hace `lib/privacidad.ts` con los
  nidos.
- **Quién puede levantarlo se elige.** Tu bandada, o quien tenga el link, o
  cualquiera — pero es una decisión que se toma al esconderlo y se ve.
- **Permanente es opcional y es el último escalón**, nunca el default. Un
  escondite que caduca a los seis meses si nadie lo encuentra resuelve el 90% de
  los casos sin volverse un problema para siempre.
- **Y quien lo levanta lo puede destruir.** Es la doctrina que la app ya tiene
  escrita: lo que se hace con un loro que llegó lo decide quien lo recibió.

---

## 3. La botella

**Un mensaje sin destinatario.** Y esta es, para mí, la mejor de las tres.

Porque tiene el mismo hallazgo que hizo grande a toda la app: **el tiempo no lo
inventa el producto, lo pone el mundo**. El guacamayo tarda dieciocho días hasta
Dublín porque vuela a 25 km/h y Dublín está a 11.150 km. Nadie eligió ese
número: salió de una división.

Una botella puede hacer exactamente lo mismo, y con datos que son públicos y
gratis: **las corrientes oceánicas superficiales están medidas y modeladas**
(los productos de corrientes de la NOAA y el programa global de boyas a la
deriva, entre otros; hay que verificar cuál conviene). Una botella soltada en un
punto real deriva por la corriente real, a la velocidad real de esa agua — que
anda entre 0,1 y 1,5 metros por segundo, o sea unos pocos kilómetros por día.

Las consecuencias son hermosas y ninguna hay que inventarla:

- **Cruzar el Atlántico son años, no días.** El giro del Atlántico Norte da la
  vuelta en varios años. El récord conocido de una botella encontrada anda por
  los ciento treinta años. Si el guacamayo era lento, esto es otra cosa
  directamente.
- **El mapa se vuelve otra pantalla.** Hoy **Del resto** muestra arcos de aves
  cruzando el planeta. Con botellas, muestra además puntitos derivando en
  espiral por los giros oceánicos, moviéndose milímetros por día. Es una pantalla
  que se abre para mirar, que es exactamente lo que esta app necesita en los
  ratos donde no pasa nada.
- **La mayoría no llega nunca, y eso no es un bug.** El 0,2% del loro tiene acá
  un hermano mayor y sincero: de las botellas de verdad, la enorme mayoría no
  aparece jamás. Si el 0,2% existe para que esperar signifique algo, una botella
  que probablemente se pierda para siempre lleva esa misma idea hasta el fondo.
- **Y el candado de tiempo cierra solo.** Se cifra hacia la fecha estimada de
  llegada. Nadie —ni quien la tiró— puede leerla mientras deriva.

**Quién la encuentra.** Acá hay una decisión de producto con varias respuestas
buenas: el nido más cercano al punto donde toca costa, o quien esté más cerca
cuando pasa, o directamente **nadie con nombre: la botella toca la costa y queda
ahí de escondite del cuervo**, disponible para quien camine por esa playa. Esa
última cierra las tres ideas en un solo objeto, y es la que elegiría.

---

## 4. La que decías sin darte cuenta: el cruce

Dijiste *"loros que cruzan el mismo camino"*, y ahí adentro hay una cuarta idea
que no es ninguna de las otras tres, que no necesita criptografía **ni cadena ni
nada**, y que sale de datos que la app **ya tiene calculados**:

**Dos aves cuyos arcos se cruzan en el mismo punto y a la misma hora.**

La app ya sabe la posición de cada ave en cada instante —la calcula el navegador
con la fórmula, sesenta veces por segundo— así que dos trayectorias que se
intersecan en espacio y tiempo es una cuenta de geometría, no una feature nueva.

Y ya existe el precedente narrativo: **el perico se cruza con una perica a mitad
de camino, se enamora, y llega tarde y con el mensaje retocado por ella, firma
incluida.** El cruce ya está inventado en este producto. Nada más que hoy la
perica es imaginaria.

Que fuera de verdad significa que dos desconocidos —que nunca intercambiaron un
código de nido, que no están en la bandada del otro— tengan un momento porque
sus aves se cruzaron sobre el Atlántico un martes a las tres de la mañana. Es
serendipia entre extraños con una regla honesta, que es el problema más difícil
que tiene cualquier red social y que acá se resuelve con la física que ya está
escrita.

Es la idea más barata de todo este documento y probablemente la que más rápido
se prueba.

---

## 5. Y la que aparece sola cuando entendés la ley: el último loro

Volvamos a la tabla del principio, a la fila de la **ausencia**.

*"Este mensaje sale si dejo de abrir la app durante noventa días."*

Es una idea enorme para **esta** app específicamente, porque esta app trata
sobre la demora y sobre la ausencia. Una carta que sale cuando dejás de estar es
la versión más extrema de todo lo que ya hace.

Y es también el mejor ejemplo de por qué la ley del principio importa, así que
vale la pena seguirla hasta el final:

El mecanismo sería: la llave se cifra hacia dentro de noventa días, y cada vez
que abrís la app se vuelve a cifrar hacia noventa días más adelante, tirando el
sobre viejo. Si dejás de aparecer, el último sobre llega a su fecha y se abre.

**Pero tirar el sobre viejo requiere que alguien lo tire.** Un candado de tiempo
garantiza "no antes"; **no puede garantizar "no nunca"**. Una vez que el sobre
existe y es público, la fecha llega sí o sí. Así que la única palanca real no es
la llave: **es la disponibilidad del sobre**. Y eso significa que alguien tiene
que guardar el sobre actual y borrar el anterior, o sea que hay un tercero de
confianza, o sea que esto **no puede ser trustless**.

Lo cual es correcto y hasta obvio cuando se dice en voz alta: *que vos sigas
vivo es un hecho del mundo, y la cadena no mira el mundo.*

O sea que el último loro es posible, es potente, y **hay que venderlo como lo
que es**: "el servidor sostiene esto; si el servidor desaparece, tu carta sale
igual". Que en este caso puntual hasta suena bien.

---

## Qué haría, y en qué orden

1. **El huevo.** Es lo más puro, es 100% criptográfico, no tiene problemas de
   seguridad física, se explica en cinco palabras y es el producto que ninguna
   otra app puede prometer de verdad. Y no necesita moneda ninguna.
2. **El cruce.** Es geometría sobre datos que ya están, no necesita cadena, y
   contesta la pregunta más difícil de una red social: por qué habría de pasar
   algo entre dos desconocidos.
3. **La botella.** Es la más linda y la que más trabajo tiene, porque hay que
   traer datos de corrientes y hacer que se vean derivando en el mapa. Es la que
   convertiría a esta app en algo de lo que se escribe.
4. **El escondite.** Al final, no porque sea peor sino porque es el único que
   tiene un problema de seguridad de personas que hay que resolver antes, y ese
   problema no se resuelve con criptografía.
5. **El último loro.** Cuando exista el resto, y contando la verdad sobre en qué
   se apoya.

---

## Y una cosa que hay que decir sobre las cuatro

Esta app tiene, hoy, dos válvulas de escape diseñadas a propósito: se puede
abducir un ave en vuelo, y se puede silbarle a un convite para que vuelva. Las
dos existen porque alguien pensó en la persona que mandó algo que no tenía que
mandar.

Todo lo de este documento las cierra. Un huevo puesto no se puede llamar de
vuelta. Una botella no se puede recoger. Un escondite permanente no se baja.

Yo no cambiaría eso —lo irreversible es la mitad de por qué el huevo emociona—
pero sí haría que la app lo diga **antes**, con la misma claridad brutal con la
que ya dice que la llave del nido *es* el nido. Algo del estilo:

> *Esto no se puede deshacer. Ni por vos, ni por nosotros, ni por nadie. Si en
> 2041 no querés que se abra, ya es tarde.*

Que además, siendo honesto, es la mejor línea de marketing de todo el producto.
