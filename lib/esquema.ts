// El esquema, una sola vez y en un solo lugar.
//
// Vive acá y no solo en supabase.sql porque lo necesitan los dos caminos: el
// manual (pegarlo en el SQL Editor) y el automático (/api/instalar). Tener el
// mismo DDL escrito dos veces es la forma más rápida de que se despeguen, así
// que supabase.sql se genera de acá y la prueba verifica que sigan iguales.

export const ESQUEMA = `
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
`.trim();
