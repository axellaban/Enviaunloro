-- Esquema de Loros para Supabase.
--
-- GENERADO desde lib/esquema.ts — si tocás uno, tocá el otro (la prueba
-- verifica que sigan iguales).
--
-- Hay dos formas de aplicarlo y sirven las dos:
--   a mano       Supabase → SQL Editor → New query → pegar esto → Run
--   automático   abrir  https://tu-app.vercel.app/api/instalar?confirmar=si
--
-- Es idempotente: si lo corrés dos veces no rompe nada.

-- Documentos: clave → valor. Nidos, amistades, loros, caché de lugares.
create table if not exists public.loros_doc (
  clave       text primary key,
  valor       text not null,
  actualizado timestamptz not null default now()
);

-- Listas (los buzones). Cada elemento es una FILA y no un elemento adentro de
-- un array, y eso no es un detalle de gusto: así agregar un loro es un INSERT
-- y no un leer-modificar-escribir. Dos personas mandándote un loro en el mismo
-- instante no se pisan, sin necesidad de transacciones ni bloqueos.
create table if not exists public.loros_lista (
  id     bigserial primary key,
  clave  text not null,
  valor  text not null,
  creado timestamptz not null default now()
);

-- El buzón se lee siempre igual: los más nuevos primero, de una clave. Sin este
-- índice, cada apertura del buzón recorre la tabla entera.
create index if not exists loros_lista_clave on public.loros_lista (clave, id desc);

-- Conjuntos: pares (clave, valor) sin repetidos. La clave primaria compuesta es
-- el punto: agregar es un INSERT que la base acepta o rechaza por sí sola, y eso
-- convierte dos operaciones peligrosas en atómicas.
--
--   La bandada. Antes era un documento con un array, y agregar significaba
--   leerlo, sumarle uno y volver a escribirlo. Dos personas tocando tu link de
--   invitación al mismo tiempo leían la misma lista y la segunda pisaba a la
--   primera: la amistad se perdía en silencio. Acá cada amistad es su propia
--   fila y no hay nada que pisar.
--
--   Las reservas. "Este loro ya lo contestó Doña Cotorra", "de esta ave ya se
--   decidió el destino". Insertar la misma clave dos veces falla, y esa falla
--   ES la respuesta: el segundo en llegar sabe que perdió.
create table if not exists public.loros_conjunto (
  clave  text not null,
  valor  text not null,
  creado timestamptz not null default now(),
  primary key (clave, valor)
);

-- RLS prendido y SIN políticas, a propósito.
--
-- Todo lo que toca esta base es el servidor de la app, con la clave
-- service_role, que saltea RLS. Prendiéndolo sin políticas, la clave anon —la
-- pública, la que cualquiera puede sacar— no puede leer ni escribir NADA acá.
-- Si algún día alguien la filtra, no se lleva los mensajes de nadie.
alter table public.loros_doc      enable row level security;
alter table public.loros_lista    enable row level security;
alter table public.loros_conjunto enable row level security;
