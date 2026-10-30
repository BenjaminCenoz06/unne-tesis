# Administrador (CMS) de BiblioHub · Etapa 1: auditoría y arquitectura

Estado: **auditoría terminada, desarrollo NO iniciado** (falta decidir lo de la sección 6 y recibir credenciales).
Fecha: 2026-10-30 · Sitio público: https://unne-tesis.vercel.app/ · Repo: `BenjaminCenoz06/unne-tesis`

## 1. Auditoría del proyecto existente

| Tema | Hallazgo real |
|---|---|
| Tecnología | HTML + CSS + JavaScript puro, **sin framework, sin build, sin dependencias** (salvo PDF.js y StPageFlip en `js/vendor/`). |
| Estructura | `index.html` (672 líneas, una sola página), `css/` (13 archivos), `js/` (9 archivos, ~2.800 líneas), `images/` (4,8 MB), `libros/` (32 PDF, **203 MB dentro de Git**). |
| Páginas públicas | Una sola (landing) con secciones ancla: inicio, catálogo, eventos, sedes, servicios, investigación, comunidad, opiniones, nosotros, equipo, contacto. No hay rutas ni páginas internas. |
| Despliegue | GitHub → Vercel (proyecto estático). Cada `git push` a `main` publica solo. Hobby gratuito. |
| Almacenamiento actual | **No hay base de datos ni backend.** Carnet, sesión, reservas, calificaciones y progreso de lectura viven en `localStorage` + una cookie del navegador de cada visitante. Nada se comparte entre dispositivos. |
| Contenido | **Escrito dentro del código** (arreglos JS y HTML). Para cambiarlo hoy hay que editar archivos y volver a desplegar. |
| Multimedia | Portadas (32 JPG), logos PNG, fotos del equipo (5 PNG), PDF de libros, y fotos/videos del collage enlazados desde Wikimedia Commons. |
| Formularios | Carnet, ayuda, contacto, boletín, voluntariado, reserva de sala, reserva de libro: todos terminan en `mailto:` o `localStorage`. **Ninguno guarda en un servidor.** |

## 2. Inventario de lo administrable y dónde vive hoy

Datos reales exportados a `content/seed.json` (generado con el código del sitio, sin inventar nada).

| Elemento | Cantidad | Dónde vive hoy | Campos | Módulo del admin |
|---|---|---|---|---|
| Categorías | 4 | `js/carousel.js` (`SHELVES`) | id, título | Categorías |
| **Libros** | 32 | `js/carousel.js` | título, autor, páginas, ejemplares, slug, PDF, portada, año, calificación base | Libros |
| Portadas / PDF | 32 + 32 | `images/covers/`, `libros/` | archivo, tamaño | Multimedia |
| Menú principal + mega menú | 6 menús, 95 enlaces | `js/header.js` (`NAV`) | etiqueta, destino (sección / ventana / búsqueda) | Navegación |
| Equipo | 5 | `index.html`, `js/app.js` (`PEOPLE`) | nombre, cargo, foto | Equipo |
| Efemérides literarias | 5 | `js/app.js` (`EVENTS`) | título, fecha, texto | Eventos |
| Sedes | 3 | `js/app.js` (`BRANCHES`) | nombre, dirección, horario, teléfono | Sedes |
| Testimonios | 10 | `js/voices.js` | rol, etiquetas, cita | Testimonios |
| Collage fotos/videos | 16 | `js/collage.js` | archivo, autor, licencia | Multimedia |
| Textos del hero, tarjetas, "Investigación", "Acerca de", cifras, footer, contacto, redes, WhatsApp | ~60 textos | `index.html` | texto, enlace, imagen | Páginas / Inicio |
| Ventanas informativas (políticas, impresión, empleos…) | 16 | `js/app.js` | título, cuerpo | Páginas |
| Paleta y tipografías | 1 sistema | `css/header.css` (`:root`) | colores, fuentes | Configuración global |
| Carnets/reservas/calificaciones de **visitantes** | — | `localStorage` | — | Hoy no existen como dato real |

## 3. Desajuste con el prompt (importante)

El prompt describe un repositorio de **tesis académicas** (tesis, directores, facultades, carreras). El sitio actual es una **biblioteca pública** (libros, categorías, sedes, equipo). **No inventaré entidades que el sitio no usa.** Propuesta de equivalencias:

- Tesis/Publicaciones → **Libros** (autor, año, categoría, PDF, portada, estado).
- Autores → **Autores** (hoy es solo texto dentro del libro; pasaría a ser entidad).
- Facultades/Carreras → **no aplica** salvo que quieras sumar "tesis" como sección nueva. *Decisión tuya (sección 6).*
- Categorías, Documentos, Multimedia, Páginas, Usuarios/roles, SEO, auditoría: se mantienen.

## 4. Arquitectura propuesta

```
 Visitantes ──► Sitio público (estático, Vercel)  ──lee──►  Supabase (Postgres + Storage)
                 unne-tesis.vercel.app             ▲  solo contenido PUBLICADO (RLS)
                                                   │
 Equipo ──────► Administrador (proyecto aparte)  ──escribe (sesión + roles + RLS)
                 admin.<tu-dominio>
```

- **Administrador independiente**: proyecto y repo propios (`unne-admin`) con **dominio propio** (el prompt lo ponía en `/admin` del mismo dominio; tú pediste dominio aparte, que además aísla seguridad y despliegues).
- **Stack del admin:** Next.js + TypeScript + Tailwind + Supabase (Auth, Postgres, Storage) + Zod, íconos Lucide. Es un proyecto nuevo y no reemplaza nada del actual.
- **Sitio público: sin framework nuevo.** Se le agrega una capa que lee el contenido publicado desde Supabase con la clave pública (solo lectura, restringida por RLS) y **conserva el contenido actual como respaldo** si la base no responde. Lo publicado en el admin aparece sin redeploy y nada se rompe si algo falla.
- **Multimedia y PDF** pasan a Supabase Storage (persistente, con URLs y versiones optimizadas); salen de Git.
- **Seguridad:** contraseñas con Supabase Auth, sesiones seguras, RLS en todas las tablas, permisos por rol y módulo verificados **en el servidor**, límite de intentos, validación con Zod, auditoría de solo inserción, claves solo en variables de entorno.

### Modelo de datos (borrador)

`profiles` (usuario admin, rol) · `role_permissions` / `user_permissions` · `categories` · `authors` · `books` (+ `book_authors`, `book_versions`) · `media_assets` (+ `media_folders`, `media_usage`) · `pages` (+ `page_blocks`, `page_versions`) · `nav_items` · `site_settings` · `team_members` · `branches` · `events` · `testimonials` · `redirects` · `audit_log` · y, **si quieres reservas reales**, `members` / `reservations` / `ratings` de visitantes.

### Roles

Superadministrador · Administrador · Editor · Colaborador · Revisor, con permisos por módulo y acción (ver, crear, editar, eliminar, publicar, aprobar, exportar, administrar) y flujo: borrador → pendiente → aprobado → publicado → archivado.

## 5. Plan por etapas (cada una se prueba antes de pasar a la siguiente)

1. ✅ Auditoría e inventario (este documento + `content/seed.json`).
2. Proyecto Supabase + migraciones + RLS + importación de `seed.json`.
3. Admin: autenticación, roles y permisos, recuperación de contraseña.
4. Dashboard con cifras reales de la base.
5. Libros, autores, categorías, equipo, sedes, eventos, testimonios (CRUD, búsqueda, filtros, paginación, acciones masivas).
6. Multimedia (subida, carpetas, optimización) y migración de portadas y PDF a Storage.
7. Navegación, páginas y constructor de bloques; configuración global.
8. Vista previa (escritorio/tablet/móvil), borradores, versiones, comparar, publicar y programar.
9. Conexión del sitio público a Supabase (con respaldo) y verificación de que lo publicado se ve sin redeploy.
10. SEO, auditoría, copias de seguridad y pruebas integrales.

Es un proyecto grande. Lo haré por etapas, con el sitio público funcionando en todo momento.

## 6. Lo que necesito de ti (no avanzo sin esto y no voy a simular una conexión)

1. **Proyecto de Supabase** (el plan gratis alcanza para empezar): `Project URL`, clave `anon` y clave `service_role`. La `service_role` va **solo** en variables de entorno del admin en Vercel, nunca en el código ni en el repo público. No me las pegues en el chat si podés evitarlo: cargalas directo en Vercel.
2. **Dominio del administrador** (por ejemplo `admin.tudominio.com`) o, para empezar, uno gratuito `*.vercel.app`.
3. **Repositorio nuevo** `unne-admin` en GitHub (recomiendo privado; ojo con el límite de Vercel Hobby con repos privados, que ya bloqueó despliegues antes).
4. **Correo del primer superadministrador.**
5. Tres decisiones: ¿sumo "tesis" como contenido nuevo? ¿carnets, reservas y calificaciones de **visitantes** pasan a ser reales en la base? ¿está bien sacar los PDF de Git y llevarlos a Storage?
