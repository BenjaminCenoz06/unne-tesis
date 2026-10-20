/* ---------- Navegación principal ----------
   Destinos:  '#id'      → sección de la misma página
              'm:clave'  → ventana modal (ver js/app.js)
              'c:Nombre' → búsqueda en el catálogo, filtrada por categoría
              'q:catalog'→ búsqueda en el catálogo
*/
const NAV = [
  {
    label: 'Leer y pedir prestado', to: '#catalogo',
    feature: { title: 'Catálogo de la biblioteca', text: 'Busca libros por título, autor o categoría.', t: 'q:catalog' },
    groups: [
      { title: 'Libros', links: [['Buscar en el catálogo', 'q:catalog'], ['Reseñas y recomendaciones', '#opiniones'], ['Novela y ficción', 'c:Novela y ficción'], ['Infantil y juvenil', 'c:Infantil y juvenil']] },
      { title: 'Biblioteca digital', links: [['Explorar la biblioteca digital', '#investigacion'], ['Libros electrónicos, audiolibros y cómics', 'm:digital'], ['Búsqueda de empleo y carrera', '#servicios'], ['Aprendizaje de idiomas', '#eventos'], ['Índices y guías de investigación', 'm:guides'], ['Revistas y periódicos', 'm:digital'], ['Recursos multilingües', 'm:digital'], ['Cursos y aprendizaje en línea', '#eventos'], ['Música, películas y video en streaming', 'm:digital']] },
      { title: 'Más para pedir prestado', links: [['Computadoras y tecnología', 'm:computers'], ['Paquetes de libros para llevar', 'm:borrow'], ['Pases de parques estatales', 'm:borrow'], ['Pases a museos y centros culturales', 'm:borrow'], ['Kits de ciencia', 'c:Ciencia y tecnología'], ['Kits de juego', 'm:borrow'], ['Kits de observación de aves', 'm:borrow'], ['Pedir prestado un ukelele', 'm:borrow'], ['Biblioteca de fanzines', 'm:borrow']] },
    ],
  },
  {
    label: 'Sedes', to: '#sedes',
    feature: { title: 'Encuentra tu sede', text: 'Ingresa tu código postal y mira la más cercana.', t: '#sedes' },
    groups: [
      { title: 'Sedes y horarios', links: [['Todas las sedes', '#sedes'], ['Biblioteca Central', '#sedes']] },
      { title: 'Cierres', links: [['Calendario de cierres por feriados', 'm:closures']] },
      { title: 'Más información', links: [['Visitas guiadas a la Biblioteca Central', 'm:tours'], ['Alquiler de instalaciones', 'm:rooms']] },
    ],
  },
  {
    label: 'Eventos', to: '#eventos',
    feature: { title: 'Calendario de eventos', text: 'Fechas, talleres y celebraciones de la literatura.', t: '#eventos' },
    groups: [
      { title: 'Eventos', links: [['Calendario de eventos', '#eventos'], ['Para toda la familia', '#eventos'], ['Bebés y niños pequeños', '#eventos'], ['Niños', '#eventos'], ['Adolescentes', '#eventos'], ['Adultos', '#eventos'], ['Adultos mayores', '#eventos']] },
      { title: 'Exposiciones', links: [['Exposiciones actuales y próximas', '#comunidad'], ['Exposiciones anteriores', '#comunidad'], ['Propuestas de exposiciones', 'm:contact']] },
    ],
  },
  {
    label: 'Servicios', to: '#servicios',
    feature: { title: 'Pregunte a un bibliotecario', text: 'Respuestas a tus consultas, en línea o en persona.', t: 'm:help' },
    groups: [
      { title: 'Apoyo a la comunidad', links: [['Personas sin hogar', '#servicios'], ['Nuevos estadounidenses: ciudadanía e inmigración', '#servicios'], ['Vendedores ambulantes', '#servicios'], ['Servicios carcelarios y de reinserción', '#servicios'], ['Veteranos', '#servicios'], ['Alcance comunitario', '#servicios']] },
      { title: 'Educación', links: [['Niños y padres', 'c:Infantil y juvenil'], ['Adolescentes', 'c:Infantil y juvenil'], ['Recursos para estudiantes (K-12)', '#servicios'], ['Servicios inclusivos para jóvenes', '#servicios'], ['Obtener un diploma de secundaria', '#servicios'], ['Alfabetización y tutoría de inglés', '#eventos'], ['Prepararse para la universidad', '#servicios']] },
      { title: 'Computadoras y tecnología', links: [['Computadoras y tecnología en préstamo', 'm:computers'], ['Ayuda con la tecnología', 'm:help'], ['Usar o reservar una computadora', 'm:computers'], ['Impresión', 'm:print'], ['Laboratorio Octavia', 'm:computers'], ['Laboratorio de medios', 'm:computers'], ['Laboratorio de memoria DIY', 'm:computers']] },
      { title: 'Obtener ayuda', links: [['Pregunte a un bibliotecario', 'm:help'], ['Reserve un bibliotecario', 'm:help']] },
    ],
  },
  {
    label: 'Investigación', to: '#investigacion',
    feature: { title: 'Archivos digitales y fotos', text: 'Explora colecciones, guías y documentos históricos.', t: '#investigacion' },
    groups: [
      { title: 'Colecciones', links: [['Colecciones especiales', '#investigacion'], ['Colección de fanzines', 'm:borrow'], ['Índices de la biblioteca', 'm:guides']] },
      { title: 'Guías de investigación y temas', links: [['Ver todas las guías', 'm:guides'], ['Guía de investigación genealógica', 'm:genealogy'], ['Localizador de documentos oficiales', 'm:guides'], ['Propiedad intelectual', 'm:guides'], ['Mapas', 'm:guides']] },
      { title: 'Investigación digital', links: [['Fotos y archivos digitales', 'm:digital'], ['Explorar la biblioteca digital', '#investigacion'], ['Ver todos los recursos digitales', 'm:digital']] },
    ],
  },
  {
    label: 'Acerca de', to: '#nosotros',
    feature: { title: 'Quiénes somos', text: 'Nuestra misión, nuestro equipo y cómo sumarte.', t: '#nosotros' },
    groups: [
      { title: 'Contacto', links: [['Pregunte a un bibliotecario', 'm:help'], ['Contáctenos', 'm:contact'], ['Directorio del personal', '#equipo'], ['Suscribirse a los boletines', 'm:newsletter']] },
      { title: 'Noticias e historias', links: [['Explorar noticias e historias', '#opiniones'], ['Artículos', '#comunidad'], ['Videos', '#comunidad'], ['Podcasts', '#comunidad'], ['Sala de prensa', 'm:contact']] },
      { title: 'Políticas y liderazgo', links: [['Junta de comisionados', '#equipo'], ['Director de la biblioteca', '#equipo'], ['Reglas de conducta', 'm:policies'], ['Políticas de préstamo', 'm:policies'], ['Política de privacidad', 'm:policies'], ['Accesibilidad', 'm:policies']] },
      { title: 'Apóyenos', links: [['Tienda', 'm:support'], ['Fundación de la biblioteca', 'm:support'], ['Amigos de la biblioteca', 'm:support']] },
      { title: 'Empleo y oportunidades', links: [['Empleos y carreras', 'm:careers'], ['Voluntariado', 'm:volunteer'], ['Presentarse en la biblioteca', 'm:contact'], ['Oportunidades de negocios', 'm:contact']] },
      { title: 'Historia y misión', links: [['Nuestra misión', '#nosotros'], ['Plan estratégico', '#nosotros'], ['Historia de la biblioteca', '#nosotros']] },
    ],
  },
];
window.BiblioNav = NAV;

/* Convierte un destino en atributos HTML */
function targetAttrs(t) {
  if (t.startsWith('#')) return `href="${t}" data-go="${t}"`;
  if (t.startsWith('m:')) return `href="#contacto" data-modal="${t.slice(2)}"`;
  if (t.startsWith('c:')) return `href="#catalogo" data-open-search="catalog" data-cat="${t.slice(2).replace(/"/g, '&quot;')}"`;
  if (t.startsWith('q:')) return `href="#catalogo" data-open-search="${t.slice(2)}"`;
  return 'href="#inicio"';
}
window.targetAttrs = targetAttrs;

(() => {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const navList = document.getElementById('mainnav-list');

  /* ---------- Render del mega menú ---------- */
  navList.innerHTML = NAV.map((item, i) => `
    <li data-nav>
      <a class="mainnav__btn" href="${item.to}" data-go="${item.to}" aria-haspopup="true" aria-expanded="false" aria-controls="mega-${i}">
        ${esc(item.label)}<svg class="caret"><use href="#i-caret"/></svg>
      </a>
      <div class="mega" id="mega-${i}">
        <div class="container mega__inner">
          <div class="mega__feature">
            <small>Destacado</small>
            <a ${targetAttrs(item.feature.t)}>${esc(item.feature.title)}<svg><use href="#i-arrow"/></svg></a>
            <p>${esc(item.feature.text)}</p>
          </div>
          <div class="mega__cols">
            ${item.groups.map((g) => `
              <div class="mega__group">
                <h3>${esc(g.title)}</h3>
                ${g.links.map(([l, t]) => `<a ${targetAttrs(t)}>${esc(l)}</a>`).join('')}
              </div>`).join('')}
          </div>
        </div>
      </div>
    </li>`).join('');

  /* ---------- Abrir / cerrar menús ---------- */
  const topDropdowns = [...document.querySelectorAll('.dropdown')];
  const navItems = [...document.querySelectorAll('[data-nav]')];
  const nav = document.getElementById('mainnav');
  const toggle = document.querySelector('.nav-toggle');
  const isDesktop = () => window.matchMedia('(min-width: 961px) and (hover: hover)').matches;

  const triggerOf = (el) => el.querySelector(':scope > button, :scope > a.mainnav__btn');
  function syncHeader() {
    const open = navItems.some((li) => li.classList.contains('open')) || nav.classList.contains('open');
    if (window.__headerMenu) window.__headerMenu(open);
  }
  function setOpen(el, open) {
    el.classList.toggle('open', open);
    const t = triggerOf(el);
    if (t) t.setAttribute('aria-expanded', String(open));
    syncHeader();
  }
  function closeAll(except) {
    [...topDropdowns, ...navItems].forEach((el) => { if (el !== except) setOpen(el, false); });
  }
  window.closeAllMenus = () => {
    closeAll();
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('menu-open');
    syncHeader();
  };

  topDropdowns.forEach((d) => {
    triggerOf(d).addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !d.classList.contains('open');
      closeAll(d);
      setOpen(d, willOpen);
    });
  });

  navItems.forEach((li) => {
    const link = triggerOf(li);
    link.addEventListener('click', (e) => {
      if (isDesktop()) return;               // escritorio: va a la sección (data-go)
      e.preventDefault();
      e.stopPropagation();                   // móvil/táctil: abre el submenú
      const willOpen = !li.classList.contains('open');
      closeAll(li);
      setOpen(li, willOpen);
    });
    li.addEventListener('mouseenter', () => { if (isDesktop()) { closeAll(li); setOpen(li, true); } });
    li.addEventListener('mouseleave', () => { if (isDesktop()) setOpen(li, false); });
    li.addEventListener('focusin', () => { if (isDesktop()) { closeAll(li); setOpen(li, true); } });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mega, .dropdown__menu, .dropdown > button')) closeAll();
  });

  /* ---------- Menú móvil ---------- */
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('menu-open', open);
    syncHeader();
  });

  /* ---------- Buscador de la barra superior ---------- */
  const topSearch = document.getElementById('topsearch');
  const topSearchInput = document.getElementById('topsearch-input');
  const topSearchLabel = document.getElementById('topsearch-label');
  const searchBtns = [...document.querySelectorAll('[data-search]')];
  let activeSearch = null;

  function closeSearch() {
    topSearch.hidden = true;
    activeSearch = null;
    searchBtns.forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
  window.closeTopSearch = closeSearch;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAll(); closeSearch(); }
  });

  searchBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const kind = btn.dataset.search;
      if (activeSearch === kind) return closeSearch();
      closeAll();
      activeSearch = kind;
      topSearch.hidden = false;
      topSearchLabel.textContent = kind === 'website' ? 'Buscar en el sitio' : 'Buscar en el catálogo';
      searchBtns.forEach((b) => b.setAttribute('aria-expanded', String(b === btn)));
      topSearchInput.focus();
    });
  });
  topSearch.addEventListener('submit', (e) => {
    e.preventDefault();
    const scope = activeSearch || 'catalog';
    const q = topSearchInput.value.trim();
    closeSearch();
    topSearchInput.value = '';
    if (window.Biblio) window.Biblio.openSearch({ scope, q });
  });
})();
