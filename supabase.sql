-- Esquema de Loros para Supabase.
--
-- Corré esto UNA vez en el SQL Editor de tu proyecto (Supabase → SQL Editor →
-- New query → pegar → Run). Después cargá SUPABASE_URL y
-- SUPABASE_SERVICE_ROLE_KEY en Vercel y listo.
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

-- RLS prendido y SIN políticas, a propósito.
--
-- Todo lo que toca esta base es el servidor de la app, con la clave
-- service_role, que saltea RLS. Prendiéndolo sin políticas, la clave anon —la
-- pública, la que cualquiera puede sacar— no puede leer ni escribir NADA acá.
-- Si algún día alguien la filtra, no se lleva los mensajes de nadie.
alter table public.loros_doc   enable row level security;
alter table public.loros_lista enable row level security;
