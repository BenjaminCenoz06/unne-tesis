-- BiblioHub · migración 002: testimonios, multimedia (Storage) y campos nuevos
-- Ejecutar DESPUÉS de schema.sql y seed.sql, una sola vez, en Supabase → SQL Editor → Run.
-- Es seguro volver a correrlo (no duplica datos ni rompe nada).

-- ───────── campos nuevos ─────────
alter table public.team_members add column if not exists photo_url text;
alter table public.events       add column if not exists summary text;

-- seed.sql guardó el mes de las efemérides desplazado (0 = enero). Se corrige fila por fila, sin sumar a ciegas.
update public.events set month = 2, summary = 'Proclamado por la UNESCO para promover la diversidad lingüística y el multilingüismo. Cada lengua guarda una forma única de contar el mundo y una literatura por descubrir.' where title = 'Día Internacional de la Lengua Materna';
update public.events set month = 3, summary = 'Desde 1999, la UNESCO dedica este día a la palabra poética, a las lecturas en voz alta y a quienes mantienen viva la poesía en cada idioma del planeta.' where title = 'Día Mundial de la Poesía';
update public.events set month = 4, summary = 'Se celebra desde 1967 en el natalicio de Hans Christian Andersen. Un día para despertar en los más chicos el amor por la lectura y reconocer a quienes escriben e ilustran para ellos.' where title = 'Día Internacional del Libro Infantil';
update public.events set month = 4, summary = 'La fecha elegida por la UNESCO recuerda a Cervantes, Shakespeare y el Inca Garcilaso de la Vega, fallecidos en 1616. Es la gran fiesta del libro y de quienes lo escriben.' where title = 'Día Mundial del Libro y del Derecho de Autor';
update public.events set month = 9, summary = 'Proclamado por la UNESCO para recordar que leer y escribir son derechos humanos. Una jornada para impulsar el acceso a la educación y a los libros en todo el mundo.' where title = 'Día Internacional de la Alfabetización';

-- en la página, cada integrante se muestra con este texto debajo del nombre
update public.team_members set role = 'Estudiante de 3er año de Tec. Informática'
where role in ('Dirección', 'Colecciones y archivo', 'Programas culturales', 'Biblioteca digital', 'Atención y comunidad');

-- ───────── testimonios ─────────
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  initial text not null default '?' check (char_length(initial) between 1 and 2),
  hue int not null default 150 check (hue between 0 and 360),
  title text not null,
  tags text,
  quote text not null,
  height int not null default 190 check (height between 120 and 320),
  link text default '#servicios',
  position int not null default 0,
  status text not null default 'published' check (status in ('draft','pending','approved','published','archived')),
  updated_at timestamptz not null default now()
);
alter table public.testimonials enable row level security;
drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read on public.testimonials for select using (status = 'published' or public.is_staff());
drop policy if exists testimonials_staff_write on public.testimonials;
create policy testimonials_staff_write on public.testimonials for all using (public.is_staff()) with check (public.is_staff());
revoke insert, update, delete on public.testimonials from anon;

do $$
begin
  if not exists (select 1 from public.testimonials) then
    insert into public.testimonials (initial, hue, title, tags, quote, height, link, position) values
      ('E', 190, 'Estudiantes', 'Estudio · Salas silenciosas', 'Encontré todo el material de mi tesis sin salir del edificio.', 150, '#servicios', 0),
      ('F', 330, 'Familias', 'Cuentacuentos · Sección infantil', 'Mis hijos piden ir a la biblioteca todos los fines de semana.', 230, '#eventos', 1),
      ('N', 40, 'Nuevos lectores', 'Alfabetización · Idiomas', 'Aprendí a leer en español con tutoría gratuita.', 190, '#servicios', 2),
      ('D', 270, 'Docentes', 'Aulas · Préstamo en bloque', 'Armamos cajas de lectura para todo el curso, con seguimiento.', 170, '#catalogo', 3),
      ('A', 150, 'Adultos mayores', 'Clubes · Talleres', 'El club de lectura se volvió mi cita favorita de la semana.', 210, '#eventos', 4),
      ('L', 220, 'Escritores', 'Archivo · Sala de escritura', 'Un lugar para escribir sin distracciones, con todo a mano.', 200, '#investigacion', 5),
      ('J', 20, 'Jóvenes', 'Préstamo digital · Cómics', 'Leo en el celular con mi carnet, sin pagar nada.', 150, '#catalogo', 6),
      ('I', 300, 'Investigadores', 'Colecciones · Archivo', 'Acceso a colecciones especiales y ayuda real de bibliotecarios.', 230, '#investigacion', 7),
      ('C', 100, 'Comunidad', 'Eventos · Exposiciones', 'Pasamos de buscar un libro a encontrar nuestro lugar en el barrio.', 210, '#comunidad', 8),
      ('T', 0, 'Trabajadores', 'Empleo · Computadoras', 'Armé mi currículum y conseguí trabajo con la ayuda de la biblioteca.', 190, '#servicios', 9);
  end if;
end $$;

-- ───────── multimedia: bucket público "media" ─────────
-- Cualquiera puede VER un archivo si tiene su link. Solo el personal sube; solo admins borran.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
        array['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
on conflict (id) do update
  set public = true, file_size_limit = 52428800,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','application/pdf'];

drop policy if exists media_staff_read on storage.objects;
create policy media_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_staff());
drop policy if exists media_staff_insert on storage.objects;
create policy media_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff());
drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
