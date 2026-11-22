-- ============================================================
-- BARBERLINK - Esquema SQL para Supabase (PostgreSQL)
-- Proyecto: hyuagzaspuylrvscgovl
-- Cómo usarlo:
--   1. Entra a Supabase > SQL Editor > New query
--   2. Pega TODO este archivo y pulsa Run
--   3. Si ya lo corriste una vez, puedes correrlo de nuevo:
--      usa IF NOT EXISTS / ON CONFLICT, no borra tus datos
-- ============================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PERFILES (usuarios) - se enlaza con Supabase Auth
--    Cuando alguien se registra con email/clave en Supabase Auth,
--    su id queda en auth.users.id y aquí guardamos su rol y datos.
--    Roles: cliente | barbero | propietario | superadmin
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  role text not null default 'cliente'
    check (role in ('cliente', 'barbero', 'propietario', 'superadmin')),
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. BARBERIAS
-- ============================================================
create table if not exists public.barbershops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null,
  slug text unique,
  description text,
  address text,
  phone text,
  whatsapp text,
  instagram text,
  cover_url text,
  logo_url text,
  home_service boolean not null default false,
  home_surcharge numeric(10,2) not null default 0,
  status text not null default 'pendiente'
    check (status in ('activa', 'pendiente', 'suspendida')),
  is_demo boolean not null default false,
  rating numeric(3,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. BARBEROS
-- ============================================================
create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  name text not null,
  specialty text,
  bio text,
  photo_url text,
  phone text,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 4. SERVICIOS
-- ============================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 5. RESERVAS (bookings / appointments)
--    La regla anti doble-reserva es una restriccion REAL de base
--    de datos, no solo del codigo: un mismo barbero no puede tener
--    dos reservas activas el mismo dia a la misma hora.
-- ============================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles (id) on delete set null,
  client_name text not null,
  client_phone text,
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  barber_id uuid references public.barbers (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  service_name text,
  booking_date date not null,
  booking_time time not null,
  duration_minutes integer not null default 30,
  is_home_service boolean not null default false,
  home_address text,
  total_price numeric(10,2) not null default 0,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio')),
  qr_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Anti doble-reserva: mismo barbero + misma fecha + misma hora,
-- solo entre reservas que no esten canceladas.
create unique index if not exists bookings_no_double_booking
  on public.bookings (barber_id, booking_date, booking_time)
  where status <> 'cancelada';

create index if not exists bookings_by_barber_date
  on public.bookings (barber_id, booking_date);
create index if not exists bookings_by_shop_date
  on public.bookings (barbershop_id, booking_date);
create index if not exists bookings_by_client
  on public.bookings (client_id, booking_date desc);

-- ============================================================
-- 6. RESENAS (solo verificadas: con reserva completada)
-- ============================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,
  client_id uuid references public.profiles (id) on delete set null,
  client_name text not null,
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  barber_id uuid references public.barbers (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists reviews_by_shop
  on public.reviews (barbershop_id, created_at desc);

-- ============================================================
-- 7. FOTOS (barberia y cortes, subidas por barbero/propietario)
--    El archivo va a Supabase Storage (bucket "barberlink-fotos");
--    aqui solo se guarda su URL publica.
-- ============================================================
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid references public.profiles (id) on delete set null,
  barbershop_id uuid references public.barbershops (id) on delete cascade,
  barber_id uuid references public.barbers (id) on delete set null,
  url text not null,
  kind text not null default 'corte'
    check (kind in ('corte', 'barberia')),
  description text,
  created_at timestamptz not null default now()
);

create index if not exists photos_by_shop
  on public.photos (barbershop_id, created_at desc);

-- ============================================================
-- 8. SUSCRIPCIONES Y PAGOS MANUALES
--    Precio mensual por defecto RD$1,000 (lo cambia el superadmin
--    en la tabla settings, no aqui en duro).
-- ============================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  plan_price numeric(10,2) not null default 1000,
  status text not null default 'pendiente'
    check (status in ('activa', 'pendiente', 'vencida', 'suspendida')),
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions (id) on delete set null,
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  amount numeric(10,2) not null,
  method text,
  reference text,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'confirmado', 'rechazado')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 9. NOTIFICACIONES dentro de la plataforma
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_by_user
  on public.notifications (user_id, created_at desc);

-- ============================================================
-- 10. CONFIGURACION GLOBAL (precio suscripcion, etc.)
-- ============================================================
create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('subscription_price', '1000'),
  ('currency', 'RD$'),
  ('timezone', 'America/Santo_Domingo')
on conflict (key) do nothing;

-- ============================================================
-- 11. SEGURIDAD (Row Level Security)
--    Con RLS activado, la clave anon NO puede leer/escribir todo:
--    solo lo que estas politicas permiten.
--    - Catalogo publico (barberias activas, barberos, servicios,
--      resenas y fotos): lectura para todos.
--    - Reservas: cualquiera puede crear una; solo el dueno, el
--      barbero, el propietario o el admin la ven completa.
--    - Perfiles: cada usuario ve/edita solo el suyo.
--    - Suscripciones/pagos/settings: solo superadmin (por ahora
--      se gestionan desde el panel con la clave anon + rol en
--      profiles; endurecer con service_role en el servidor si
--      anades un backend propio).
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.barbershops  enable row level security;
alter table public.barbers      enable row level security;
alter table public.services     enable row level security;
alter table public.bookings     enable row level security;
alter table public.reviews      enable row level security;
alter table public.photos       enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments     enable row level security;
alter table public.notifications enable row level security;
alter table public.settings     enable row level security;

-- Lectura publica del catalogo
drop policy if exists "catalogo barberias publico" on public.barbershops;
create policy "catalogo barberias publico" on public.barbershops
  for select using (true);

drop policy if exists "catalogo barberos publico" on public.barbers;
create policy "catalogo barberos publico" on public.barbers
  for select using (true);

drop policy if exists "catalogo servicios publico" on public.services;
create policy "catalogo servicios publico" on public.services
  for select using (true);

drop policy if exists "resenas publicas" on public.reviews;
create policy "resenas publicas" on public.reviews
  for select using (true);

drop policy if exists "fotos publicas" on public.photos;
create policy "fotos publicas" on public.photos
  for select using (true);

drop policy if exists "settings publico" on public.settings;
create policy "settings publico" on public.settings
  for select using (true);

-- Perfiles: cada quien el suyo
drop policy if exists "perfil propio lectura" on public.profiles;
create policy "perfil propio lectura" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "perfil propio escritura" on public.profiles;
create policy "perfil propio escritura" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "perfil propio actualizacion" on public.profiles;
create policy "perfil propio actualizacion" on public.profiles
  for update using (auth.uid() = id);

-- Reservas: crear para todos los autenticados, leer las propias
drop policy if exists "reservas crear" on public.bookings;
create policy "reservas crear" on public.bookings
  for insert with check (auth.uid() = client_id or client_id is null);

drop policy if exists "reservas leer propias" on public.bookings;
create policy "reservas leer propias" on public.bookings
  for select using (
    auth.uid() = client_id
    or exists (select 1 from public.barbershops s
               where s.id = bookings.barbershop_id and s.owner_id = auth.uid())
    or exists (select 1 from public.barbers b
               where b.id = bookings.barber_id and b.user_id = auth.uid())
  );

drop policy if exists "reservas actualizar propias" on public.bookings;
create policy "reservas actualizar propias" on public.bookings
  for update using (
    auth.uid() = client_id
    or exists (select 1 from public.barbershops s
               where s.id = bookings.barbershop_id and s.owner_id = auth.uid())
  );

-- Resenas: crear si tienes reserva completada (se verifica en la app)
drop policy if exists "resenas crear" on public.reviews;
create policy "resenas crear" on public.reviews
  for insert with check (auth.uid() = client_id);

-- Fotos: subir solo autenticado
drop policy if exists "fotos subir" on public.photos;
create policy "fotos subir" on public.photos
  for insert with check (auth.uid() = uploader_id);

drop policy if exists "fotos borrar propias" on public.photos;
create policy "fotos borrar propias" on public.photos
  for delete using (auth.uid() = uploader_id);

-- Suscripciones, pagos y notificaciones: lectura/escritura autenticada
-- (el panel de admin filtra por rol en la aplicacion)
drop policy if exists "suscripciones autenticado" on public.subscriptions;
create policy "suscripciones autenticado" on public.subscriptions
  for all using (auth.role() = 'authenticated');

drop policy if exists "pagos autenticado" on public.payments;
create policy "pagos autenticado" on public.payments
  for all using (auth.role() = 'authenticated');

drop policy if exists "notificaciones propias" on public.notifications;
create policy "notificaciones propias" on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists "notificaciones crear" on public.notifications;
create policy "notificaciones crear" on public.notifications
  for insert with check (true);

-- ============================================================
-- 12. DATOS DE EJEMPLO (marcados is_demo = true)
--    Son los mismos de la plataforma actual. Borralos o editalos
--    cuando tengas barberias reales.
-- ============================================================
insert into public.barbershops (id, name, slug, description, address, phone, home_service, home_surcharge, status, is_demo)
values
  ('11111111-1111-1111-1111-111111111111', 'Barbería El Trono', 'barberia-el-trono', 'Barbería clásica con estilo moderno.', 'Av. Winston Churchill, Santo Domingo', '809-555-0101', true, 200, 'activa', true),
  ('22222222-2222-2222-2222-222222222222', 'Fade Factory RD', 'fade-factory-rd', 'Especialistas en fade y diseño.', 'Calle El Conde, Zona Colonial', '809-555-0102', false, 0, 'activa', true),
  ('33333333-3333-3333-3333-333333333333', 'Navaja & Estilo', 'navaja-y-estilo', 'Navaja clásica y barba de precisión.', 'Av. Abraham Lincoln, Santo Domingo', '809-555-0103', true, 150, 'activa', true)
on conflict (id) do nothing;

insert into public.barbers (id, barbershop_id, name, specialty, is_demo)
values
  ('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Juan Pérez', 'Fade y diseño', true),
  ('22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Carlos Méndez', 'Clásico y barba', true),
  ('33333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'Luis Ramírez', 'Navaja clásica', true)
on conflict (id) do nothing;

insert into public.services (barbershop_id, name, description, price, duration_minutes, is_demo)
values
  ('11111111-1111-1111-1111-111111111111', 'Fade', 'Corte fade con acabado limpio.', 500, 30, true),
  ('11111111-1111-1111-1111-111111111111', 'Corte clásico', 'Corte clásico con tijera y máquina.', 400, 30, true),
  ('11111111-1111-1111-1111-111111111111', 'Barba', 'Arreglo de barba con navaja.', 300, 20, true),
  ('22222222-2222-2222-2222-222222222222', 'Fade', 'Corte fade con acabado limpio.', 500, 30, true),
  ('22222222-2222-2222-2222-222222222222', 'Diseño', 'Diseño en el corte.', 600, 40, true),
  ('33333333-3333-3333-3333-333333333333', 'Navaja clásica', 'Afeitado clásico con navaja.', 450, 30, true),
  ('33333333-3333-3333-3333-333333333333', 'Barba de precisión', 'Barba con líneas precisas.', 350, 25, true)
on conflict do nothing;

insert into public.subscriptions (barbershop_id, plan_price, status, starts_at, ends_at)
values
  ('11111111-1111-1111-1111-111111111111', 1000, 'activa', current_date, current_date + interval '30 days'),
  ('22222222-2222-2222-2222-222222222222', 1000, 'activa', current_date, current_date + interval '30 days'),
  ('33333333-3333-3333-3333-333333333333', 1000, 'pendiente', current_date, current_date + interval '30 days')
on conflict do nothing;

-- ============================================================
-- 13. STORAGE: bucket para las fotos (corre esto tambien en el
--     SQL Editor; si el bucket ya existe, no pasa nada)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('barberlink-fotos', 'barberlink-fotos', true)
on conflict (id) do nothing;

-- Politicas del bucket (lectura publica, subida autenticada)
drop policy if exists "fotos bucket lectura publica" on storage.objects;
create policy "fotos bucket lectura publica" on storage.objects
  for select using (bucket_id = 'barberlink-fotos');

drop policy if exists "fotos bucket subida autenticada" on storage.objects;
create policy "fotos bucket subida autenticada" on storage.objects
  for insert with check (bucket_id = 'barberlink-fotos' and auth.role() = 'authenticated');

-- ============================================================
-- FIN. Verificacion rapida (corre despues del Run):
--   select table_name from information_schema.tables
--   where table_schema = 'public' order by 1;
-- Deberias ver: profiles, barbershops, barbers, services,
-- bookings, reviews, photos, subscriptions, payments,
-- notifications, settings.
-- ============================================================

-- ============================================================
-- 14. ADICIONES (migración total, idempotentes)
--    Perfil automático al registrarse, avisos por disparador,
--    horas ocupadas y vincular barbero por correo.
-- ============================================================

-- Perfil automático cuando Supabase Auth crea un usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'cliente')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Aviso al cliente cuando se crea su reserva
create or replace function public.notify_booking_created()
returns trigger language plpgsql as $$
begin
  if new.client_id is not null then
    insert into public.notifications (user_id, title, message)
    values (new.client_id, 'Reserva creada',
      'Tu reserva en ' || coalesce(new.service_name, 'la barbería') ||
      ' para el ' || new.booking_date || ' a las ' || new.booking_time || ' quedó registrada.');
  end if;
  return new;
end;
$$;

drop trigger if exists booking_created_notify on public.bookings;
create trigger booking_created_notify
  after insert on public.bookings
  for each row execute function public.notify_booking_created();

-- Aviso al cliente cuando cambia el estado de su reserva
create or replace function public.notify_booking_status()
returns trigger language plpgsql as $$
begin
  if old.status is distinct from new.status and new.client_id is not null then
    insert into public.notifications (user_id, title, message)
    values (new.client_id, 'Tu reserva cambió a ' || new.status,
      'Tu reserva del ' || new.booking_date || ' a las ' || new.booking_time ||
      ' ahora está: ' || new.status || '.');
  end if;
  return new;
end;
$$;

drop trigger if exists booking_status_notify on public.bookings;
create trigger booking_status_notify
  after update on public.bookings
  for each row execute function public.notify_booking_status();

-- Horas ocupadas de un barbero en una fecha (para el selector de horas)
create or replace function public.occupied_hours(p_barber_id uuid, p_date date)
returns table (booking_time time) language sql stable as $$
  select booking_time from public.bookings
  where barber_id = p_barber_id
    and booking_date = p_date
    and status <> 'cancelada'
  order by booking_time;
$$;

-- Vincular un barbero a su usuario por correo (lo usa el propietario/admin)
create or replace function public.link_barber_by_email(p_barber_id uuid, p_email text)
returns void language plpgsql security definer as $$
declare v_user_id uuid;
begin
  select id into v_user_id from public.profiles where email = p_email limit 1;
  if v_user_id is null then
    raise exception 'No existe un perfil con el correo %', p_email;
  end if;
  update public.barbers set user_id = v_user_id where id = p_barber_id;
end;
$$;
