# La moneda de los loritos

Análisis y propuesta para sumarle a Enviaunlorito un sistema de puntos, un token
en Solana y un camino —honesto— hacia que la app sea de quien la usa.

No hay código acá. Hay decisiones, y las razones de cada una.

---

## Lo primero, porque condiciona todo lo demás

Esta app vende lentitud. El guacamayo tarda dieciocho días hasta Dublín y *ese
es el producto*. Todos los manuales de crecimiento con token pagan por acción:
más mensajes, más aperturas, más invitados, más puntos.

Pagar por acción acá no es una mejora con riesgos: es la muerte del producto.
El día que un loro paga, "le mandé un guacamayo a mi vieja porque tenía algo
que decirle" se convierte en "mandé cuarenta pericos porque pagan", el mapa de
**Del resto** —la pantalla más linda que tiene— se llena de aves que nadie
escribió, y el único activo real de la app, que es tener gracia, se pierde. La
gracia no sobrevive a convertirse en un trabajo.

Pero hay una salida, y es la que ordena todo este documento:

> **La física de la app ya es un antifarm.** Un guacamayo transatlántico son
> dieciocho días y no hay forma de acelerarlo. La mayoría de los proyectos con
> token tienen que *inventar* cooldowns artificiales para que no los vacíen;
> acá el cooldown viene de fábrica y encima es la parte divertida.

De ahí sale la regla de diseño de toda la economía:

**Lo que paga tiene que ser lo que ya era el producto** —paciencia, distancia,
reciprocidad, gente de verdad— y nunca el volumen. Si una regla nueva hace que
convenga mandar más loros, la regla está mal escrita.

---

## El problema que hay que resolver antes que cualquier otro

No hay identidad.

`lib/sesion.ts` lo dice sin vueltas: la identidad es una cookie firmada con
HMAC, y eso fue una decisión buena —evita la única pantalla que mataría a este
MVP—. Pero mirado desde una economía, dice otra cosa: **crear un nido cuesta
una ventana de incógnito y un toque en el mapa**. Ni siquiera hace falta dar
permiso de ubicación: el nido se puede marcar a mano.

Hoy eso no le cuesta nada a nadie. El día que un nido valga treinta centavos
por mes, es una canilla abierta con un cartel que dice "servite".

Y el freno actual no alcanza: es por proceso y en memoria, sube a 200 altas, y
el propio README documenta que contar por IP en celulares es contar mal
(CGNAT). Frena el abuso obvio, no a alguien con un script y diez proxies.

Las opciones, con el canje dicho derecho:

| Camino | Qué resuelve | Qué cuesta |
|---|---|---|
| **Prueba de persona** (World ID y parecidos) | Casi todo el sybil | Mata el onboarding y excluye gente; para una app que se pasa por WhatsApp es una pared |
| **SMS / teléfono** | Sube el costo del sybil ~100x | Plata por mensaje, granjas de SIM igual existen, y agrega una pantalla de registro |
| **Depósito o stake para cobrar** | Sybil caro | Excluye justo a quien más le importarían treinta centavos, y huele a instrumento financiero |
| **Red de confianza + tiempo** | Sube el costo a *tiempo* y a *gente* | Más lento de armar, cero fricción para el usuario honesto |
| **Detección y anulación** | Ataca lo que ya pasó | Necesita reglas públicas o cada anulación parece arbitraria |

**La recomendación: no cerrar la app, cerrar la caja.**

Cualquiera sigue entrando sin registrarse, armando su nido en veinte segundos y
mandando loritos. La identidad se pide **recién en el momento de cobrar**, que
es el único momento en que se justifica y el único en que la persona ya entendió
para qué. Concretamente, para retirar hace falta:

- nido con más de 30 días,
- al menos tres contrapartes distintas que a su vez pasen el mismo filtro,
- y un segundo factor atado al dispositivo (passkey).

Así la decisión fundacional del proyecto —*no hay pantalla de registro antes del
mapa*— se conserva entera. La pantalla que el README se negó a construir aparece
en la caja, no en la puerta.

Y hay un antifarm que aparece **gratis** cuando los tokens ya están en la
cadena: las granjas consolidan. Mil nidos falsos cobran a mil billeteras y
después mandan todo a una sola, y eso queda escrito en Solana para siempre. No
sirve para prevenir la temporada que pasó; sirve muchísimo para anular la
siguiente, y es información que no hay que pedirle a nadie.

---

## Dos monedas, no una

Esta es la decisión de arquitectura más importante del documento, y resuelve
cinco problemas a la vez.

| | **Semillas** | **$LORO** |
|---|---|---|
| Dónde vive | La base de la app | Solana |
| Se transfiere | **No** | Sí |
| Vence | Sí, al cerrar la temporada | No |
| Quién la emite | El servidor, por reglas | Una mint fija |
| Costo por operación | Cero | Una firma |
| Si hubo fraude | Se anula | **No se puede deshacer** |
| Quién la entiende | Cualquiera | Quien ya tenga billetera |

Las semillas son el juego. El $LORO es la liquidación. Se juntan semillas todo
el mes y una vez por mes se convierten en token.

Lo que esa separación compra:

- **El mes es una ventana antifraude.** Lo que está en la base se anula; lo que
  está en la cadena, no. Un reparto mensual da treinta días para que una granja
  se note antes de que el error sea permanente. Un reparto en tiempo real no
  perdona ni un bug.
- **Cuesta cero.** Ninguna acción de la app escribe en la cadena. El README mide
  1,3 operaciones por segundo por persona con la app abierta; la economía tiene
  que caber ahí adentro, no duplicarlo.
- **Se puede jugar sin saber qué es una billetera.** El 95% de la gente que
  entra por WhatsApp no tiene ni va a tener Phantom instalado. Las semillas se
  ven en el panel como un número y ya.
- **Las semillas casi seguro no son un instrumento financiero; el token sí
  podría serlo.** Puntos que no se transfieren y vencen son un programa de
  fidelidad. Esa distinción vale plata en abogados.
- **El precio no rompe el juego.** Si el $LORO cae 80%, la temporada sigue
  repartiendo la misma cantidad de tokens y las mismas reglas. Lo que cambia es
  cuánto valen, que es otra conversación.

El reclamo mensual, además, **no es una limitación técnica disfrazada de
feature**: es exactamente la misma promesa que el resto de la app. Acá las cosas
tardan. Una app donde un mensaje a Dublín son once días y el token se cobra al
instante estaría mintiendo sobre sí misma.

---

## La emisión: pozo fijo, reparto proporcional

El error más común y más caro sería fijar un cambio: *100 semillas = 1 $LORO*.
Eso es una canilla abierta. La cantidad de tokens emitidos pasa a ser una
función de cuánto farmean los demás, o sea que la deja de controlar quien la
diseñó, y la única defensa es retocar constantes a mano cada vez que alguien
encuentra un hueco. Esa carrera se pierde siempre.

Lo correcto:

> **Cada temporada tiene un pozo fijo de $LORO. Tu parte es tus semillas
> dividido el total de semillas de todos, por el pozo.**

Consecuencias, todas buenas:

- **La inflación se conoce a diez años vista** y no depende de nadie.
- **El farm se autolimita.** Una granja que duplica las semillas del mundo no
  duplica lo que se lleva: reduce a la mitad lo que se lleva *todo el mundo,
  ella incluida*. Deja de ser una canilla y pasa a ser un mercado con
  competencia, donde farmear tiene rendimiento decreciente por construcción.
- **El techo de un ataque está acotado.** Lo peor que puede pasar es que alguien
  se lleve una fracción de un mes. Nadie puede *emitir*.

La contra —y hay que decirla— es que nadie sabe cuánto va a cobrar hasta que
cierra el mes. Se compensa mostrando la estimación viva en el panel ("tu parte
estimada esta temporada: 1.240 $LORO"), que además es una de las mejores
pantallas para volver a mirar que puede tener la app.

La curva de emisión —cuánto pozo tiene cada temporada, y cómo decae— se publica
el día uno y no la toca el equipo por su cuenta nunca más. Para eso está el
gobierno, más abajo. Un reparto de ejemplo, para discutir y no para copiar:

| Destino | Parte | Nota |
|---|---|---|
| Emisión a la comunidad | 45% | Decaendo a lo largo de ~4 años |
| Tesorería | 25% | Bajo multifirma, con destino declarado |
| Liquidez | 10% | Ver la advertencia sobre pozos finitos, abajo |
| Equipo | 15% | Vesting de 3–4 años con acantilado de 1 |
| Reserva de emergencia | 5% | Para anulaciones, errores, y devolverle a quien se comió un bug |

---

## Qué paga semillas

El corazón del asunto. Escrito como reglas y no como fórmula, porque las razones
importan más que los números.

**1. Paga el vuelo entregado, no el mensaje enviado.** La unidad no es "un
loro": es *tiempo en el aire que terminó aterrizando*. Un perico cruzando la
cuadra vale casi nada; un guacamayo cruzando el Atlántico vale mucho. Es la
única regla que hace falta para que farmear sea, literalmente, lento.

**2. Pero cóncava y con techo, porque la distancia es falsificable gratis.** El
nido se marca tocando el mapa: nada impide poner uno en Buenos Aires y otro en
Yakarta. Lo que *no* se puede falsificar es el reloj. Entonces las semillas
crecen con la raíz del tiempo de vuelo y se cortan en un tope (del orden de un
día de vuelo). Así un guacamayo transatlántico paga bien —tres o cuatro veces un
vuelo urbano— y no cinco mil veces, que es lo que daría la cuenta cruda y lo que
convertiría a la app en un negocio de nidos truchos en las antípodas.

**3. Se paga al aterrizar. Nunca al despegar.** El ave abducida no paga nada:
para eso existe la abducción. Y el ave que se pierde en el 0,2% **sí paga a
quien la mandó**: hizo su parte, y convertir un chiste que ya está en el
producto en una pérdida de plata lo transforma en un ticket de soporte.

**4. Se paga de a dos.** La semilla es del *par*, y se reparte entre las dos
puntas. Mandar al vacío no produce nada; una conversación sí. Esto también
alinea el incentivo con lo único que sostiene una red social: que del otro lado
haya alguien.

**5. La respuesta vale más que el envío.** Un lorito contestado duplica para los
dos. Es la regla que empuja hacia lo que la app quiere que pase y en contra de
lo que un farmer quiere que pase.

**6. Diversidad antes que cantidad.** Las semillas que da una misma contraparte
en una temporada siguen una curva decreciente fuerte: el primer loro con Ana
paga entero, el décimo paga una fracción, el trigésimo paga cero. Diez amigos de
verdad valen muchísimo más que un amigo spameado cien veces. Es la misma
intuición del financiamiento cuadrático, y acá hace el 80% del trabajo
antifarm.

**7. La arista tiene que tener edad.** Una amistad nueva paga una fracción, que
sube a lo largo de treinta días. Una granja tiene que *esperar* antes de cobrar,
y esperar es exactamente lo que una granja no puede hacer a escala sin que se le
note.

**8. Racha de paciencia, no de apertura.** Nada de "entrá todos los días": esta
app no quiere que entres todos los días. Lo que se premia es **no dejar a nadie
colgado** —contestar todos los loritos que te llegaron en la temporada— y haber
mandado al menos un ave lenta. Retención sin interrupción.

**9. Doña Cotorra paga cero.** Es una vecina de práctica. Y tampoco se paga por
aparecer en **Del resto**: nunca hay que pagarle a nadie por resignar
privacidad.

Y la lista de lo que **no** paga, que vale tanto como la otra: abrir la app,
mirar el mapa, tener muchos amigos en la bandada, tener varios nidos, dejar la
pestaña abierta.

---

## Network marketing: qué se roba y qué se deja

Vale la pena mirarlo sin prejuicio, porque el multinivel es la máquina de
crecimiento más eficaz que se inventó, y también la que más gente lastimó.

**Lo que hace bien** (y es legal, y hay que copiarlo):

- Una invitación personal convierte diez a cincuenta veces mejor que un link
  genérico. Ya está descubierto en este repo, de hecho: es toda la razón de ser
  del lorito de convite frente a "compartí tu nido".
- Da identidad y pertenencia: uno es *de* la bandada de alguien.
- Hace visible el estatus.
- Tiene ritual y tiene relato.

**Lo que lo vuelve tóxico o ilegal** (y hay que dejar):

- Pagar por *reclutar* en lugar de por uso real.
- Varios niveles de comisión hacia arriba.
- Pagar para entrar.
- La matemática de saturación: la última capa siempre pierde.

Traducido a esta app:

**Un solo nivel. Punto.** El segundo nivel es donde empiezan a mirar las leyes de
esquemas piramidales, y la virulencia extra que agrega es chica comparada con el
fraude extra que habilita. Si se quiere el gesto de linaje, que sea **estatus no
monetario**: un árbol de bandada visible, una insignia de "trajiste a alguien que
trajo a alguien". Estatus sí, comisión no.

**No se paga por invitar: se paga por lo que la persona invitada hace**, y se
paga como un *goteo* durante sus primeros noventa días: quien invitó recibe un
porcentaje de las semillas de la invitada. Con tres condiciones que son las que
lo separan de un multinivel:

- **Es dinero nuevo, no descontado.** Nunca se le saca a la persona invitada.
  Eso —que la de abajo financie a la de arriba— es exactamente lo que hace que
  el multinivel se sienta una estafa, y es evitable con una línea de diseño.
- **Tope duro:** el total que cobrás por todos tus invitados no puede pasar,
  digamos, la mitad de lo que ganaste vos usando la app. Esa sola regla mata al
  reclutador profesional y obliga a que quien crece la red también la use.
- **La semilla del invitado solo cuenta para quien invitó cuando el invitado
  tiene una relación con un tercero.** Si no, estarías pagándole a alguien por
  hablar consigo mismo.

**Y va montado en algo que ya existe.** El convite ya tiene el mejor momento de
toda la app: el ave esperando en la cervecería, la mesa llenándose, y del otro
lado alguien armando su nido para destrabarla. Y ya existe el evento de
atribución: `/api/convite/reclamar` ya le manda el push a quien invitó ("Beto
armó su nido, tu perico salió de la cervecería"). **Las semillas tienen que
aparecer ahí**, en un momento que ya existe y que ya se siente bien. No hay que
inventarle a la app un lugar nuevo para el premio.

**Y de los dos lados.** La persona invitada también arranca con semillas. Es la
lección de Dropbox, que es el mejor referido que se diseñó nunca y tiene
exactamente un nivel.

Del resto de los juegos de incentivos, lo que sirve acá:

| De dónde | Qué se roba | Cómo se ve acá |
|---|---|---|
| Duolingo | La racha, y el miedo a perderla | Racha de temporadas contestando todo |
| Wordle | Un resultado compartible que no es publicidad | La miniatura de la cervecería ya hace esto |
| Pokémon GO | El premio atado a moverse de verdad | El premio atado a distancia y espera reales |
| Dropbox | Referido de un nivel, de los dos lados, con tope | El convite |
| Nike Run Club | Temporadas y tablas | Temporadas de semillas |
| Los "points" de cripto 2023-24 | **Nada. La lección es lo que sale mal.** | Ver riesgos |

---

## Los sumideros: sin esto la moneda vale cero

Una moneda que solo se emite y nunca se destruye solo puede bajar. Y un premio
cuyo precio solo baja deja de motivar en el tercer mes, que es justo cuando
tendría que estar funcionando.

Primero, **las tres cosas que no se pueden vender jamás**:

1. **La velocidad.** El día que se pueda pagar para que el ave llegue antes,
   esto es WhatsApp con pasos de más. Es la línea que no se cruza.
2. **El 0,2%.** Un seguro contra el extravío vende la única regla que le da peso
   a todo lo demás.
3. **El alcance.** Pagar para escribirle a alguien que no te dio su código es
   spam con factura.

Lo que sí se puede quemar:

- **Plumaje, colores de nido y ceremonias.** `lib/colorNido.ts` ya existe; el
  confeti de `Fiesta.tsx` ya existe. Son variantes, no motor nuevo.
- **La séptima ave**, que solo existe quemando tokens y que es **más lenta que
  el guacamayo**. Pagar por esperar más es el flex perfecto para esta app y es,
  además, gracioso, que es el estándar que todo lo que se agregue acá tendría
  que pasar.
- **El código de nido a pedido.** Elegir `guacamayoceremonioso` en vez de que te
  toque por sorteo. El generador ya numera colisiones, así que el mecanismo
  está.
- **Insignias** como NFT comprimidos: "trajo diez nidos", "cruzó el Atlántico",
  "el primer guacamayo de la temporada". En Solana cuestan fracciones de centavo
  y son estatus, o sea captura de pantalla, o sea distribución.
- **La cervecería.** Pagar una vuelta para que la mesa se llene más rápido, o
  que el ave aguante más de 48 horas en la barra. Las cuatro etapas del dibujo
  ya están hechas.
- **La propina.** Mandar $LORO pegado a un lorito. Es el sumidero que más me
  gusta porque **recircula en vez de destruir**, es la razón más humana para
  querer el token, y en Solana mandar plata pegada a un mensaje cuesta casi
  nada. Es también lo único de toda esta propuesta que un usuario común
  entendería sin explicación.

La meta a fijar: que para la temporada N la quema iguale a la emisión. Si no se
va a llegar ahí, conviene saberlo antes de acuñar nada.

---

## La billetera y el reclamo mensual

### El token

SPL Token clásico con metadata de Metaplex. **Token-2022 no**, para el $LORO:
sus extensiones son lindas pero el soporte de billeteras y DEX es desparejo, y
esto tiene que poder guardarse en cualquier lado sin sorpresas. Donde sí sirve
Token-2022 es en las **insignias**, con la extensión de no-transferible: una
insignia que se vende no es una insignia.

Sobre la mint: supply fijo, autoridad de emisión en una multifirma (Squads) y
después a gobierno; **autoridad de congelamiento en nulo, desde el primer
minuto**. Un token que el equipo puede congelar es un token que cualquiera que
entienda del tema va a mirar con desconfianza, y con razón.

Y esto no es negociable: **la mint authority no vive en una variable de entorno
de Vercel.** El mismo archivo que hoy avisa si falta `LOROS_SECRET` tendría que
gritar si alguna vez aparece una clave de firma de la cadena ahí adentro.

### El reparto: un Merkle por temporada

Cierra la temporada, se calcula la lista de (billetera, cantidad), se publica la
raíz de un árbol de Merkle en la cadena, y cada persona reclama lo suyo. Es el
patrón estándar —hay implementaciones abiertas conocidas, de Jito entre otras;
conviene auditar la que se use y no confiar en la reputación— y da tres cosas:

- **Cuesta una transacción por temporada, no una por persona.**
- **La app nunca custodia plata de nadie.** No hay una caja que robar.
- **Es auditable.** Si el registro de semillas se publica, cualquiera puede
  recalcular la raíz y verificar que el reparto salió de las reglas y no del
  humor de alguien. Esto es, concretamente, la parte "descentralizada" que sí se
  puede tener barata.

**Y el reclamo se tira, no se empuja.** Un airdrop a diez mil nidos cuesta la
renta de diez mil cuentas de token, la mayoría de las cuales no se van a abrir
nunca. Con reclamo, esas no cuestan nada. Para una app cuyo README mide el costo
por persona hasta el viaje a la base, la diferencia es del mismo orden que todo
lo que ya optimizó.

### La trampa práctica: nadie tiene SOL

Alguien que llegó por WhatsApp no tiene SOL, y sin SOL no puede firmar el
reclamo ni pagar la renta de su cuenta de token. Si esto no se resuelve, el
premio es inalcanzable para el 99% y todo el resto del documento fue en vano.

La app tiene que ser **pagadora de comisiones**: la persona firma, la tesorería
paga. Son fracciones de centavo por firma; la renta de la cuenta es unos
milisoles y es recuperable. Hay que presupuestarlo, y hay que ponerle un freno,
porque un relayer sin freno es un grifo que alguien va a vaciar por diversión.

### La billetera

Dos caminos, los dos:

- **Por defecto, billetera embebida** (Privy, Turnkey, Dynamic o similar; hay
  que verificar cuál soporta bien Solana hoy). Se crea **en el momento del
  primer reclamo, no al entrar**: la app tiene que seguir sin login hasta la
  caja.
- **Para quien ya tiene la suya**, vincular Phantom o Solflare. Con una
  advertencia que el README ya conoce en otro contexto: **adentro del navegador
  de WhatsApp las extensiones y los deep links de billetera funcionan mal o no
  funcionan**. Es el mismo agujero que hoy se lleva nidos, y con plata adentro
  se lleva otra cosa.

### El riesgo nuevo, y es grande: la llave del nido pasa a ser dinero al portador

Hoy `/entrar?llave=…` es tu nido: quien tiene el link, entra. Está asumido y
documentado, y el canje cerraba porque lo que se perdía eran mensajes de
loritos.

Con un token adentro, ese mismo link **es tu plata**, y es un link que la gente
pega en conversaciones de WhatsApp.

Esto es la peor regresión de seguridad que introduce toda la propuesta, y hay
que diseñar para ella desde el principio: **la autoridad de la billetera no
puede derivarse de la sesión del nido**. La llave mueve el nido; para cobrar
hace falta autenticarse de nuevo con un factor atado al dispositivo (passkey).
Que alguien te robe el historial de loritos es feo. Que te robe el saldo es
otra categoría.

Y el corolario aburrido pero seguro: el día que haya token, van a existir links
de phishing que digan "reclamá tus $LORO". Van a existir sí o sí. Conviene tener
escrito de antemano cuál es el único dominio, y decirlo en la app antes de que
pase y no después.

### Dónde vive todo esto en la base

Y acá viene lo lindo: **las tres tablas genéricas ya alcanzan, sin migrar nada**,
igual que pasó con los convites.

- `loros_lista`, clave `semillas:<nido>:<temporada>` — el registro de eventos,
  agregado con INSERT. Cada semilla ganada es una fila. **Nada de
  leer-modificar-escribir**, que es la forma exacta de bug que este proyecto ya
  documentó haber pagado cuatro veces.
- `loros_conjunto`, clave `pagado:<temporada>`, valor el id del evento — la
  idempotencia. "Este aterrizaje ya pagó." Insertar dos veces falla, y **esa
  falla es la respuesta**: es el mismo patrón de `reservar`. Esto no es
  decorativo: pagar dos veces el mismo aterrizaje es el bug de Doña Cotorra
  contestando cuatro veces, pero costando plata.
- `loros_doc`, clave `temporada:<n>` — el resumen, el total y la raíz publicada.
- El saldo **no se calcula sumando filas en cada sondeo**. Se consolida en el
  documento al escribir. Hoy son 1,3 operaciones por segundo por persona; un
  panel de semillas que recorre una lista cada cuatro segundos lo duplica.

`/api/salud` es el lugar natural de los números de la economía, con la misma
lógica con la que ya distingue "nadie abrió el link" de "lo abrieron y no armaron
el nido": semillas emitidas en la temporada, nidos distintos que ganaron, quema,
reclamos, y sobre todo **la parte del nido que más se llevó**. Si un solo nido
está tomando más del 2% del pozo, algo se rompió, y eso tiene que verse en la
pantalla donde ya se mira todo lo demás.

### La temporada cierra con demora

La temporada termina, y la raíz se publica **siete días después**. En el medio
corre la pasada antifraude y se anulan semillas. Una vez publicada la raíz, no
hay vuelta atrás.

Y las reglas de anulación se publican **antes** de la temporada. Si no, cada
anulación parece una decisión de humor, y ahí se pierde lo único que hace que
esto valga: que la gente crea que el reparto sale de las reglas.

---

## "Descentralizada, de los usuarios": la escalera honesta

Repartir un token no es descentralizar. Hoy el servidor guarda los mensajes —el
README lo dice: no hay cifrado de punta a punta—, guarda el grafo social, y
decide quién gana semillas. Un token no cambia nada de eso.

Hay cuatro escalones de verdad, y conviene saber en cuál se está parado:

**0 — Puntos.** Un programa de fidelidad con un token adentro. Es lo que va a
ser al principio, y decirlo así no le quita nada: le saca la parte falsa.

**1 — Reparto verificable.** El registro de semillas y las reglas son públicos, y
cualquiera puede recalcular la raíz de Merkle y verificar el reparto. Las reglas
las seguís escribiendo vos, pero ya no podés mentir sobre haberlas aplicado. Es
barato y vale muchísimo: es el primer escalón donde la palabra "descentralizado"
no es marketing.

**2 — Los parámetros los decide la comunidad.** Gobierno sobre lo que de verdad
es gobernable: la curva de emisión, los multiplicadores, si existe una séptima
ave, en qué se gasta la tesorería. Con SPL Governance / Realms, que es lo
estándar en Solana. Lo que **no** hay que someter a votación es el servidor de
mensajes: un DAO que "gobierna" algo que el equipo puede ignorar es teatro, y la
gente lo nota rápido.

**3 — El protocolo.** El único escalón donde "los dueños son los usuarios" es
literal. La app está rarísimamente cerca en una dimensión —tres tablas
genéricas, sin login, autohospedable con un `git clone` y dos variables— y lejos
en otra: **el servidor lee todos los mensajes**.

El orden correcto acá es: **primero punta a punta, después federación, y recién
ahí el token como liquidación entre instancias.** Sin cifrado, "red social
descentralizada" es una frase. Con cifrado y varias instancias, el token pasa a
tener una razón de existir que no es el premio: **paga los servidores**. Ese es
el único argumento sólido de por qué esta moneda tendría que existir a largo
plazo.

Y la nota honesta que nadie dice: el punta a punta acá **rompe dos features**. La
cotorra mezcla el texto en el servidor, y `textoEntregado` se calcula al
despegar. Los dos tendrían que mudarse al dispositivo de quien manda —lo cual es
posible— pero entonces el 0,2% y el desvío del perico dejan de estar arbitrados
por el servidor, y eso hay que rediseñarlo. No es una casilla que se tilda.

---

## Los riesgos, de frente

**Legal.** Un token que se negocia es, en muchas jurisdicciones, un instrumento
regulado. Dos disparadores concretos que **sí** están en las manos de ustedes:
prometer revalorización (nunca, en ninguna comunicación, ni en broma) y pagar
comisiones por reclutamiento en varios niveles (por eso, un nivel). Además, en
casi todos lados el reclamo es un hecho imponible **para el usuario**, y un
reclamo mensual crea doce por año a gente que no tiene idea de eso. Nada de esto
es asesoramiento legal, y este es el punto donde conviene pagar por uno de
verdad, antes de acuñar y no después.

**Los mercenarios.** Es la historia entera del meta de "points" de 2023-24:
aparecen las granjas, los números explotan, sale el token, y en dos semanas se
va el 80%. Acá es peor que en DeFi, porque una granja no se lleva solo plata:
**envenena el grafo**. El mapa se llena de aves que nadie escribió, y **Del
resto** —que es el producto— se convierte en ruido.

**La espiral.** Baja el precio, baja el premio, se va gente, baja el precio. Las
defensas son las que ya están arriba: el pozo se denomina en tokens, las
temporadas son independientes, y los sumideros son reales.

**El chiste.** Y este es el riesgo más probable de todos, más que el fraude y
más que el precio. La app puede dejar de tener gracia. El día que alguien
pregunte "cuánto me pagan por un guacamayo" en vez de "a quién le mando un
guacamayo", se perdió algo que no vuelve.

Por eso conviene fijar de antemano el **canario**: la proporción de loritos que
son contestados. Si las semillas suben y esa proporción baja, la economía está
produciendo tráfico y no conversaciones, y hay que apagarla. Y hay que
comprometerse con eso *antes*, porque después va a haber un token cotizando y
nadie apaga nada con un token cotizando.

**La custodia.** Multifirma para todo. Ninguna clave con poder sobre la mint en
un servidor que responde a internet.

**El 0,2% ahora pierde plata.** Resuelto arriba —le paga igual a quien lo
mandó— pero hay que resolverlo explícitamente o se convierte en el reclamo más
común del soporte.

---

## Cómo lo haría, por etapas

**Fase 0 — Temporada cero, sin moneda.** Cuatro a ocho semanas. Se construyen
las semillas, el registro, el panel y los números en `/api/salud`. **Sin token,
sin billetera y sin prometer nada.** Se anuncia como temporadas con premios no
monetarios: insignias, un color de nido, un lugar en una tabla.

*La puerta para pasar de fase:* ¿subió la proporción de loritos contestados?
¿subió la cantidad de pares distintos? Si las semillas solo produjeron más
mensajes a la misma persona, el diseño está mal y se acaba de ahorrar un token.

**Fase 1 — Identidad en la caja.** Passkey, edad de nido, edad de arista,
detección de granjas y alarmas en salud. Todo esto tiene que estar andando
*antes* de que exista algo que valga plata, no después.

**Fase 2 — La moneda.** Mint, reparto, multifirma, liquidez —poca y con
cuidado: un pozo finito es manipulable, y un precio manipulado hace que el
premio se vea absurdo—, el distribuidor de Merkle, la billetera embebida y el
primer reclamo.

**Fase 3 — Los sumideros.** Skins, códigos a pedido, insignias, propinas, la
séptima ave.

**Fase 4 — El gobierno.** Realms, los parámetros en la cadena, la tesorería.

**Fase 5 — El protocolo.** Punta a punta y federación. Es un horizonte largo y
conviene decirlo así desde el principio.

---

## Las cinco preguntas antes de escribir una línea de código

1. **¿Para qué sirve el $LORO además de venderlo?** Si la única respuesta
   honesta es "para venderlo", no hay que acuñarlo. Los sumideros y el pago de
   instancias son las dos respuestas buenas.
2. **¿Están dispuestos a que la app tenga una caja con identidad?** Si la
   respuesta es no —y es una respuesta legítima, muy en línea con el resto del
   proyecto— entonces no hay token, porque no se le puede pagar a una cookie.
3. **¿Quién tiene la mint authority el día 1, y quién el día 400?** Si no hay
   respuesta para el día 400, la promesa de "los dueños son los usuarios" ya
   nació falsa.
4. **¿Cuál es el número que dice que esto salió mal, y qué se hace ese día?**
   Comprometerse con el apagado antes de tener algo que apagar.
5. **¿Aguanta el chiste?** ¿Seguiría siendo divertida esta app para alguien que
   no sabe qué es una billetera y no le interesa averiguarlo? Si la respuesta es
   no, la función está mal diseñada, sin importar cuánto crezca el número.

---

## Y una alternativa que no hay que descartar

Todo esto se puede hacer **sin token**: temporadas, semillas, insignias, tablas,
el árbol de la bandada, la séptima ave desbloqueable, los códigos a pedido.

Se lleva puesta, calculando por lo bajo, dos tercios de la virulencia de la
propuesta completa, con el 5% del riesgo, el 0% de superficie legal y ningún
mercenario. Y deja la puerta abierta: si la temporada cero funciona, acuñar
después es fácil; si no funciona, no hay nada que desarmar.

La recomendación, entonces, es la más aburrida de todas y probablemente la
correcta: **correr la Fase 0 completa, y decidir la moneda con los datos de dos
temporadas en la mano en vez de con este documento.**
