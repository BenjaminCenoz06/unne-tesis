-- BiblioHub · esquema de la base (Supabase / Postgres)
-- Se ejecuta UNA vez en Supabase → SQL Editor → Run. Es seguro volver a correrlo.
-- Seguridad: RLS activa en todas las tablas. El público solo lee contenido 'published'.
-- El personal (roles superadmin, admin, editor) escribe. Nadie escribe sin sesión.

create extension if not exists pgcrypto;

-- ───────── usuarios del panel ─────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'colaborador'
    check (role in ('superadmin','admin','editor','colaborador','revisor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- al registrarse un usuario en Auth se crea su perfil con el rol más bajo
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- rol del usuario actual (security definer evita recursión de RLS)
create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() in ('superadmin','admin','editor'), false)
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() in ('superadmin','admin'), false)
$$;

-- ───────── contenido ─────────
create table if not exists public.categories (
  id text primary key,
  title text not null,
  position int not null default 0,
  status text not null default 'published' check (status in ('draft','pending','approved','published','archived')),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  author text not null,
  pages int check (pages > 0),
  copies int not null default 1 check (copies >= 0),
  year int check (year between 1000 and 2100),
  category_id text not null references public.categories(id),
  pdf_path text,
  cover_path text,
  ol_rating numeric(3,2),
  ol_votes int,
  position int not null default 0,
  status text not null default 'published' check (status in ('draft','pending','approved','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists books_category_idx on public.books(category_id);
create index if not exists books_status_idx on public.books(status);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text,
  focus text[] not null default '{}',
  img int,
  position int not null default 0,
  status text not null default 'published' check (status in ('draft','pending','approved','published','archived')),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  addr text,
  hours text,
  tel text,
  tag text,
  position int not null default 0,
  status text not null default 'published' check (status in ('draft','pending','approved','published','archived')),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  month int not null check (month between 1 and 12),
  day int not null check (day between 1 and 31),
  category text,
  body text,
  status text not null default 'published' check (status in ('draft','pending','approved','published','archived')),
  updated_at timestamptz not null default now()
);

-- ajustes globales y navegación (clave → JSON)
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- registro de auditoría: solo se inserta, nunca se edita ni se borra
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- ───────── RLS ─────────
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.books          enable row level security;
alter table public.team_members   enable row level security;
alter table public.branches       enable row level security;
alter table public.events         enable row level security;
alter table public.site_settings  enable row level security;
alter table public.audit_log      enable row level security;

-- perfiles: cada uno ve el suyo; admins ven y gestionan todos
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- contenido: el público lee lo publicado, el personal lee y escribe todo
do $$
declare t text;
begin
  foreach t in array array['categories','books','team_members','branches','events'] loop
    execute format('drop policy if exists %I on public.%I', t||'_public_read', t);
    execute format('create policy %I on public.%I for select using (status = ''published'' or public.is_staff())', t||'_public_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_staff_write', t);
    execute format('create policy %I on public.%I for all using (public.is_staff()) with check (public.is_staff())', t||'_staff_write', t);
  end loop;
end $$;

drop policy if exists settings_public_read on public.site_settings;
create policy settings_public_read on public.site_settings for select using (true);
drop policy if exists settings_staff_write on public.site_settings;
create policy settings_staff_write on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- auditoría: el personal inserta y los admins leen. Sin update ni delete.
drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log for insert with check (public.is_staff() and user_id = auth.uid());
drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select using (public.is_admin());

-- el rol anónimo (clave publishable) solo puede leer
revoke all on public.profiles, public.audit_log from anon;
revoke insert, update, delete on public.categories, public.books, public.team_members,
  public.branches, public.events, public.site_settings from anon;
