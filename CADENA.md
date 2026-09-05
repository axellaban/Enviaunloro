# Qué hace la cadena acá que no hace una base de datos

Segunda parte de [MONEDA.md](MONEDA.md). Aquel documento contesta "si hay un
token, cómo se diseña". Este contesta otra cosa, que es la pregunta que
convenía hacer primero:

**¿Para qué sirve una blockchain en esta app, si es que sirve para algo?**

Y la respuesta corta, que va a sonar rara viniendo después de treinta páginas
sobre una moneda: **los mejores usos de la cadena acá no necesitan moneda
ninguna.**

---

## El criterio

Una blockchain no es una base de datos rara y cara. Es una máquina para una
cosa sola:

> **Sacar a un tercero de confianza de una promesa.**

Entonces la pregunta no es "dónde meto blockchain". Es: **¿qué promesa hace hoy
esta app que hay que creerle?** Cada una de esas es un lugar donde la cadena se
gana el lugar. El resto es decoración cara.

Esta app hace cuatro promesas grandes, y hoy las cuatro son *confiá en mí*:

| La promesa | Quién la sostiene hoy |
|---|---|
| "Hasta que no aterriza, el mensaje **no existe** del otro lado" | El servidor lo tiene guardado y elige no mandarlo |
| "Dos de cada mil no llegan **nunca**" | El servidor tira el dado, y nadie lo ve tirarlo |
| "Lo que se hace con un loro que llegó **lo decide quien lo recibió**" | El servidor puede borrarlo igual |
| "El vuelo tarda **lo que tiene que tardar**" | El servidor tiene el reloj |

Esas cuatro frases *son* el producto. No hay nada más. Y las cuatro son
verificables solo por buena fe.

Ese es el hallazgo de todo este documento: **el mejor uso de blockchain acá no
es agregarle una moneda a una app de mensajes. Es hacer que las promesas que la
app ya hace sean ciertas sin que haya que creerle a nadie.**

---

## Y hay una pista en el código de que esto encaja

`lib/vuelo.ts` y la sección del 0,2% del README describen esto:

> *El sorteo pasa una sola vez, al soltar el ave, y el resultado queda escrito
> (…) pero no viaja al navegador hasta que ocurre.*

Eso tiene nombre, y es una primitiva criptográfica de manual:
**commit-reveal**. Comprometerse con un resultado sin revelarlo, y revelarlo
después. La app ya está escrita con esa forma —el extravío, el romance del
perico, la pollera del convite, los tres siguen la misma regla y el README lo
dice explícitamente— nada más que el compromiso vive en una fila de Postgres
que quien la escribió puede editar.

O sea: **esto no hay que rediseñarlo para que sea criptográfico. Ya lo es.
Falta el testigo.**

---

## Las ideas, ordenadas por cuánto se ganan el lugar

### 1. El vuelo como candado de tiempo criptográfico

**La idea.** El mensaje se cifra hacia el futuro. No hacia una persona: hacia un
*momento*. Se usa **timelock encryption** sobre un faro de aleatoriedad
distribuido —drand y su tlock son la implementación conocida; conviene verificar
el estado actual antes de casarse con una—: se cifra contra una ronda futura del
faro, y la clave para abrirlo es la firma que esa red va a producir en ese
instante y que **todavía no existe**. No es que nadie quiera abrirlo antes: es
que no se puede, ni con el servidor, ni con la base, ni con una orden judicial,
ni con las herramientas de desarrollo.

**Qué compra, y es enorme:**

- La frase de la portada —*hasta que no aterriza, el mensaje no existe del otro
  lado*— deja de ser una política del servidor y pasa a ser una ley. El README
  hoy dice, con honestidad, "sin cifrado de punta a punta: el servidor ve los
  mensajes". Esto lo tacha.
- **Cifrado punta a punta y mecánica del producto son la misma cosa.** No es
  una feature de privacidad que se agrega arriba: es el vuelo. En cualquier otra
  app el E2E es una casilla; acá *es* el ave.
- El reloj deja de ser del servidor. Once días a Dublín son once días porque el
  faro no emite antes, no porque alguien se aguante las ganas.
- Ancla en Solana el hash del sobre y la ronda de destino, y queda probado
  cuándo se mandó y a partir de cuándo pudo leerse. Un vuelo auditable.

**Lo que rompe, dicho sin maquillar.** La cotorra mezcla el texto en el
servidor y `textoEntregado` se calcula al despegar; con esto, todo eso se
muda al dispositivo de quien manda: la cotorra le come las palabras *antes* de
cifrar. Es posible y hasta es más lindo —el desastre lo hace el ave de quien
la soltó— pero abre la puerta a que alguien parchee el cliente y mande el texto
sin mezclar. La respuesta a eso es la idea 2.

**Si tuviera que elegir una sola cosa de todo este documento, es esta.**

---

### 2. El sorteo verificable

**La idea.** El 0,2%, el 40% del perico, cuánto mezcla la cotorra, cuántos
copetines se tomó el ave en la barra. Hoy son cuatro `Math.random()` del lado
del servidor. Con **aleatoriedad verificable** —un VRF en cadena tipo Switchboard
u ORAO, o directamente la ronda del mismo faro que usa la idea 1— el resultado
lo produce una red pública, es imposible de conocer de antemano para todos
—operador incluido— y es **verificable después** por cualquiera.

**Por qué esto vale más de lo que parece.** El 0,2% es la regla más audaz del
producto y la más difícil de creer. La primera vez que a alguien se le pierda un
mensaje importante va a pensar, con toda razón, que fue un bug. Con esto la
respuesta deja de ser "confiá":

> *Tu loro se perdió en la ronda 4.812.339 del faro. Acá está el número, acá
> está la cuenta. Cualquiera puede rehacerla.*

Un mecanismo de casino, aplicado en serio a un chiste sobre loros. Que es
exactamente el tipo de desproporción que esta app hace bien.

Y encima **cierra el agujero que abre la idea 1**: si el cliente cifra, el
cliente podría hacer trampa con el sorteo; si la semilla del sorteo viene de una
red pública y queda comprometida al despegar, la trampa se ve.

**Costo:** centavos por vuelo, o cero si se comparte una ronda del faro entre
todos los vuelos que despegan en el mismo minuto —que además es más lindo:
todos los loros de ese minuto sortearon juntos.

---

### 3. El loro que llegó es tuyo, literalmente

**La idea.** El README ya tiene esta doctrina escrita: *"lo que se hace con un
loro que ya llegó lo decide quien lo recibió; lo que se hace con uno que todavía
está en el aire lo decide quien lo soltó"*. Es una regla de propiedad, redactada
como tal, y hoy la sostiene el servidor.

Al aterrizar, el lorito se acuña como un NFT comprimido a nombre de quien lo
recibió. Con compresión de estado en Solana eso cuesta fracciones de centavo y
diez mil loritos siguen costando menos que un café.

**Lo que habilita, y es lo bueno:**

- **Quemar un loro.** Destruirlo para siempre, comprobable, y que quien lo mandó
  vea que fue quemado. Hoy "borrar" es que el servidor diga que borró. Esto es
  otra cosa: es un gesto, tiene peso, y es irreversible. Muy de esta app.
- El buzón sobrevive a la app. Si esto un día cierra, los loritos que te
  llegaron siguen siendo tuyos y los puede leer otro cliente.
- **La abducción se vuelve honesta.** Hoy quien mandó puede abducir el ave en el
  aire; después del aterrizaje no. Con propiedad real, ese "no puede" pasa a ser
  un no puede de verdad.

**La advertencia:** que se acuñe **al aterrizar y solo si quien recibe lo pide**.
Acuñar todo automáticamente es pagar renta por diez mil cuentas que nadie va a
abrir, y es la trampa que ya está señalada en MONEDA.md.

---

### 4. La cápsula: un lorito a una fecha, no a un lugar

**La idea.** Esta es la que más me entusiasma, y es un producto nuevo que **no
puede existir sin esta tecnología**.

Hoy elegís un ave y la distancia decide el tiempo. Acá elegís el tiempo
directamente: un lorito a tu hija para el día que cumpla dieciocho. A vos mismo
dentro de cinco años. A alguien para el día que se muera un perro que todavía
está vivo.

Cifrado hacia esa ronda del faro, guardado en almacenamiento permanente
(Arweave y parecidos), anclado en la cadena. **Y entonces la app puede
desaparecer, la empresa puede quebrar, el dominio puede vencer, y el mensaje
llega igual.** Ese es el único producto de mensajería del mundo que puede
prometer eso, y lo puede prometer porque no depende de sí mismo.

Encaja con todo lo que ya está:

- Usa el modelo mental que la app **ya le enseñó a la gente**: acá las cosas
  tardan. Es el mismo chiste llevado hasta el final.
- Es el ave más lenta de todas, y ya está establecido que la lentitud es
  prestigio.
- Es un sumidero natural: la permanencia se paga, y se paga una vez.
- Es viral sin pedirle nada a nadie. Una cápsula a diez años se cuenta sola.

**Los dos problemas reales, sin maquillar:**

- **El faro tiene que seguir existiendo en diez años.** Para un vuelo de once
  días eso no es un riesgo; para una cápsula de una década, sí. Se mitiga
  cifrando contra varios faros a la vez, o re-cifrando cada tanto —lo que
  reintroduce a alguien de confianza— o diciéndolo de frente en la pantalla,
  que es lo más de esta app: *"esto depende de que una red pública siga
  encendida en 2036"*.
- **Lo permanente no se puede deshacer.** Ver la advertencia grande, más abajo.

---

### 5. El encuentro: la identidad que se firma en persona

**La idea.** MONEDA.md deja un problema abierto y grande: no hay identidad, así
que un nido cuesta una ventana de incógnito. La solución convencional es pedir
teléfono o prueba de persona, y las dos rompen lo mejor que tiene la app.

La solución de acá: **dos teléfonos que están físicamente juntos se firman**.
Un intercambio de nonces por NFC o por QR, cara a cara. Eso produce una
atestación firmada de que dos nidos se encontraron en el mundo real, en una
fecha, y de ahí sale una red de confianza igual que las viejas fiestas de firmas
de PGP.

**Por qué es la respuesta correcta para *esta* app y no para cualquier otra:**

- La app **ya es geográfica en serio**. Coordenadas reales, distancias reales,
  vuelos que tardan lo que tardan. "Nos vimos" es una continuación natural, no
  un injerto.
- Una granja de mil nidos puede falsificar ubicación con un toque en el mapa,
  pero no puede falsificar mil encuentros con mil personas distintas.
- No pide dato personal ninguno: ni teléfono, ni mail, ni cara. Solo haber
  estado en el mismo lugar.
- **Y es una feature antes que un control.** "Este es un nido que conocés en
  persona" es información que la gente quiere ver, independientemente de que
  exista un token. La bandada gana un anillo interno.

Es el único camino que vi que resuelve el sybil sin traicionar la decisión
fundacional de no pedir registro.

---

### 6. La moneda que viaja a 40 km/h

Acá viene la idea fuera de la caja, y es medio delirante a propósito.

**La idea.** Un token cuyas transferencias obedecen la física de la app. Para
mandarle $LORO a alguien tenés que mandarle un loro, y la plata tarda lo que
tarda el ave. Buenos Aires a Montevideo en guacamayo: ocho horas. A Dublín:
dieciocho días.

Técnicamente sale con Token-2022 y un *transfer hook*: el programa corre en cada
transferencia y puede rechazarla. La transferencia directa de billetera a
billetera se rechaza siempre; la única ruta permitida es depositar en una cuenta
de custodia del programa, que libera recién pasada la hora de aterrizaje. Y si
el ave se pierde en el 0,2%, la propina **se quema** — deflación causada por
loros distraídos.

**Por qué no es solo un chiste:**

- **Es antiespeculativo por construcción.** MONEDA.md identifica a los
  mercenarios como el peor riesgo. Una moneda que tarda horas en moverse es
  inútil para farmear y salir corriendo. El diseño se defiende solo.
- **Es memorable.** "La única moneda del mundo que vuela a cuarenta kilómetros
  por hora" es la clase de cosa de la que se escribe. Vale más como distribución
  que cualquier campaña.
- La propina pasa de ser una feature más a ser una **razón de existir**: el
  token no es un premio que se cobra, es algo que viaja adentro de un ave.

**El canje, y es serio:** un token que no se puede mover rápido probablemente no
se puede listar ni tener precio de mercado de verdad. O sea que deja de ser un
activo y pasa a ser una ficha de juego. Yo creo que eso es una **decisión** y no
un defecto —y encaja con todo lo demás— pero hay que tomarla despierto, porque
el día que alguien pregunte "¿cuánto vale?" la respuesta va a ser incómoda. Los
*transfer hooks* además tienen soporte desparejo en billeteras y DEX, que es
otra forma de decir lo mismo.

---

### 7. El mapa del mundo como bien común

**Del resto** es la pantalla más linda de la app y hoy es una consulta a una
base privada. Si el registro de vuelos —especie, puntas aproximadas, salida,
llegada, **nunca el mensaje ni el nombre**— se publica en cadena, o se ancla con
una raíz diaria para que no cueste una fortuna:

- Cualquiera puede dibujar su propio mapa de los vuelos del mundo. Eso es
  componibilidad con un sentido real, no la palabra por la palabra.
- El registro sobrevive a la app.
- Aparecen récords públicos y verificables: el vuelo más largo jamás
  completado, el primer guacamayo que cruzó el Pacífico, cuántas aves había en
  el aire en Nochebuena. Estatus permanente, que es el sumidero más barato que
  existe.

Y hay que decir lo obvio: **publicar puntas de vuelo para siempre es publicar
geografía para siempre**. `lib/privacidad.ts` ya tiene toda la discusión —y hoy
el radio del mundo está en cero, o sea punto real—. Lo que sale a la cadena
tiene que ir corrido sí o sí, porque de la cadena no se borra nada. Es el mismo
canje de siempre, pero sin botón de deshacer.

---

### 8. El nido como identidad portátil

El código de nido (`loroparlanchin`) como nombre en un espacio de nombres en
cadena, y la bandada como atestaciones firmadas por cada punta en vez de filas
en `loros_conjunto`.

Es el escalón donde "los dueños son los usuarios" empieza a ser literal: te
llevás tu identidad y tu grafo a otra instancia, y la app pasa a ser una *vista*
de algo que es tuyo. Es también el más caro y el que menos se nota el día uno.
Va al final, y va después de que exista una segunda instancia — porque
portabilidad sin ningún lado adonde ir es una función que nadie ejecuta.

---

## Lo que no haría

- **Poner los mensajes en cadena.** Ni cifrados. Lo que se cifra hoy se descifra
  en veinte años, y alguien va a mandar algo de lo que se arrepienta a los diez
  minutos. Lo permanente es el *sobre*, nunca la carta.
- **Vender velocidad, aunque ahora se pueda programar.** Sigue siendo la línea
  que no se cruza.
- **Un token de gobierno antes de que haya algo que gobernar.** Votar los
  parámetros de una economía que todavía no existe es teatro y se nota.
- **Acuñar un NFT por cada mensaje, automáticamente.** Renta pagada por cuentas
  que nadie abre.
- **Remesas.** El ave que cruza el mundo y la plata que cruza el mundo se
  parecen demasiado, y esa puerta lleva a un producto regulado, a un
  cumplimiento normativo caro y a otra empresa. Es una idea buena para otra app.

---

## La advertencia grande: la permanencia es un arma cargada

Las ideas 3, 4 y 7 comparten un supuesto que suena a virtud y no siempre lo es:
que las cosas no se puedan borrar.

Esta app tiene, hoy, un diseño explícito sobre el arrepentimiento. La abducción
existe porque *"arrepentirse es ahora"*. El silbido del convite existe por lo
mismo. Alguien pensó en la persona que mandó algo que no tenía que mandar, y le
dejó una puerta.

La permanencia cierra esa puerta. Un mensaje que no se puede borrar nunca es un
regalo el 95% de las veces y un problema serio el otro 5%: hostigamiento,
venganza, una cápsula abierta a diez años por alguien que ya no quiere tener
nada que ver con quien la mandó.

Las reglas que me parecen mínimas:

- **La permanencia es opcional y se elige**, nunca es el default.
- **Para que algo sea permanente entre dos personas, tienen que estar las dos.**
  Una cápsula a diez años la acepta quien la va a recibir, o no sale.
- **Lo que se puede destruir, lo destruye quien lo recibió.** Es la doctrina que
  la app ya tiene escrita, y acá se vuelve la válvula de escape.

---

## Y lo que esto significa para la moneda

Repasando las ocho: **seis no necesitan token.** El candado de tiempo, el sorteo
verificable, el loro como objeto propio, la cápsula, el encuentro y el mapa
común funcionan enteros sin que exista ninguna moneda.

Eso cambia el orden de todo:

1. **Primero la cadena como testigo.** Ideas 1 y 2. Hacen ciertas las promesas
   que ya se hacen, arreglan de paso el agujero del cifrado punta a punta, y no
   tienen superficie legal ninguna.
2. **Después la cadena como propiedad.** Ideas 3 y 5. El loro que llegó es tuyo,
   y la identidad la firman dos personas que se vieron.
3. **Después la cápsula.** Idea 4. Producto nuevo, monetizable de la forma más
   limpia que hay: se paga una vez por guardar algo para siempre.
4. **Y recién ahí la moneda**, con la temporada cero de MONEDA.md ya corrida y
   con datos. Para entonces existen la identidad (5), un sumidero de verdad (4)
   y un registro auditable (1, 2) — que son justo las tres cosas cuya ausencia
   hace que la mayoría de los tokens fracasen.

Dicho de otra manera: la pregunta era *cómo sumo blockchain para que la app se
viralice*. Creo que la respuesta buena es al revés. **La cadena no está acá para
hacerla viral: está para hacerla verdadera.** Y una app de mensajes donde
literalmente nadie —ni quien la escribió— puede leer tu mensaje antes de que
aterrice el ave es más rara, más contable y más difícil de copiar que cualquier
programa de puntos.
