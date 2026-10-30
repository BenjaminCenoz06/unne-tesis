/* =========================================================
   BiblioHub · lógica de la página (todo funciona del lado
   del navegador): navegación, búsqueda, reservas, formularios,
   cuenta, accesibilidad y más.
   ========================================================= */
// Espera (máx. 2,5 s) a que js/cms.js traiga el contenido publicado; si la base no responde, usa el de siempre
(window.BiblioCloud ? window.BiblioCloud.ready : Promise.resolve()).then(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const CLOUD = window.BiblioCloud;
  const CD = (CLOUD && CLOUD.data) || {};
  const cloudMail = CLOUD ? CLOUD.setting('contact_email', '') : '';
  const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(cloudMail) ? cloudMail : 'contacto@bibliohub.org';
  const html = document.documentElement;

  /* Al recargar, siempre se empieza arriba (sin #hash ni scroll recordado) */
  try { history.scrollRestoration = 'manual'; } catch { /* ignorar */ }
  if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignorar */ } }
  window.scrollTo(0, 0);
  window.addEventListener('load', () => { requestAnimationFrame(() => window.scrollTo(0, 0)); setTimeout(() => { if (window.scrollY > 0 && !window.__userScrolled) window.scrollTo(0, 0); }, 300); }, { once: true });
  window.addEventListener('wheel', () => { window.__userScrolled = true; }, { once: true, passive: true });
  window.addEventListener('touchstart', () => { window.__userScrolled = true; }, { once: true, passive: true });
  window.addEventListener('keydown', () => { window.__userScrolled = true; }, { once: true });

  /* ---------- Almacenamiento local ---------- */
  // localStorage; si el navegador lo bloquea (modo privado, navegador de WhatsApp/Instagram…)
  // el carnet y la sesión se guardan también en una cookie, y todo lo demás en memoria.
  const mem = {};
  const COOKIE_KEYS = ['bh_card', 'bh_user'];
  const cookie = {
    get(k) { const m = document.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; },
    set(k, v) { document.cookie = k + '=' + encodeURIComponent(v) + '; max-age=31536000; path=/; SameSite=Lax'; },
  };
  const store = {
    get(k, d) {
      let raw = null;
      try { raw = localStorage.getItem(k); } catch { /* bloqueado */ }
      if (raw === null && COOKIE_KEYS.includes(k)) { try { raw = cookie.get(k); } catch { /* sin cookies */ } }
      if (raw !== null) { try { const v = JSON.parse(raw); if (v !== null && v !== undefined) return v; } catch { /* dato dañado */ } }
      return k in mem && mem[k] !== null ? mem[k] : d;
    },
    set(k, v) {
      mem[k] = v;
      const s = JSON.stringify(v);
      try { localStorage.setItem(k, s); } catch { /* sin almacenamiento */ }
      if (COOKIE_KEYS.includes(k)) { try { cookie.set(k, s); } catch { /* sin cookies */ } }
    },
  };
  const state = {
    user: store.get('bh_user', null),
    card: store.get('bh_card', null),
    loans: store.get('bh_loans', []),     // { shelf, i, title, due }
    waits: store.get('bh_waits', []),     // { shelf, i, title }
    rooms: store.get('bh_rooms', []),     // { sede, date, time, people }
    reserves: store.get('bh_reserves', []), // { shelf, i, slug, title, code, sede, pick, made }
  };
  const save = () => {
    store.set('bh_user', state.user); store.set('bh_card', state.card);
    store.set('bh_loans', state.loans); store.set('bh_waits', state.waits); store.set('bh_rooms', state.rooms); store.set('bh_reserves', state.reserves);
  };

  /* ---------- Datos del catálogo ---------- */
  const B = () => window.Biblio;
  const SHELVES = () => (B() && B().SHELVES) || [];
  const bookOf = (shelf, i) => { const s = SHELVES().find((x) => x.id === shelf); return s ? { s, b: s.books[i], i } : null; };
  const allBooks = () => SHELVES().flatMap((s) => s.books.map((b, i) => ({ shelf: s.id, cat: s.title, i, title: b[0], author: b[1], pages: b[2], copies: b[3], pal: b[4], slug: b[5], pdf: b[6], year: b[8], cover: B().coverUrl(b) })));

  // Las reservas guardadas descuentan copias disponibles
  function applyReserves() {
    state.loans = []; // formato anterior (préstamos) ya no se usa
    state.reserves = state.reserves.filter((r) => bookOf(r.shelf, r.i));
    state.reserves.forEach((r) => {
      const x = bookOf(r.shelf, r.i);
      if (x && x.b[3] > 0) { x.b[3] -= 1; B().refreshBook(r.shelf, r.i); }
    });
    save();
  }

  /* ---------- Avisos (toasts) ---------- */
  function toast(msg, kind = 'ok') {
    const el = document.createElement('div');
    el.className = `toast toast--${kind}`;
    el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.500 16.200L5.300 12 3.900 13.400l5.600 5.600L21 7.500 19.600 6.100z"/></svg><span>${esc(msg)}</span>`;
    $('#toasts').appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, 4200);
  }

  /* ---------- Modal ---------- */
  const dlg = $('#modal');
  const mbody = $('#modal-body');
  if (typeof dlg.showModal !== 'function') {
    document.documentElement.classList.add('no-dialog');
    Object.defineProperty(dlg, 'open', { get() { return this.hasAttribute('open'); } });
    dlg.showModal = function () { this.setAttribute('open', ''); };
    dlg.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
  }
  function openModal(content, opts = {}) {
    mbody.innerHTML = content;
    dlg.classList.toggle('modal--wide', !!opts.wide);
    if (!dlg.open) dlg.showModal();
    html.classList.add('modal-open');
    dlg.querySelector('.modal__panel').scrollTop = 0;
    const first = mbody.querySelector('[autofocus], input:not([type=hidden]), select, textarea');
    if (first && opts.focus !== false) setTimeout(() => first.focus({ preventScroll: true }), 60);
    if (opts.onOpen) opts.onOpen(mbody);
  }
  function closeModal() { if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', () => html.classList.remove('modal-open'));
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) closeModal();
  });

  const head = (title, intro) => `<h2 class="modal__title" id="modal-title">${title}</h2>${intro ? `<p class="modal__intro">${intro}</p>` : ''}`;
  const btn = (label, attrs, cls = 'btn--dark') => `<button type="button" class="btn ${cls}" ${attrs}>${label}</button>`;
  const go = (label, id, cls = 'btn--outline') => btn(label, `data-go="${id}"`, cls);

  const mailto = (subject, body) => `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  /* ---------- Contenido informativo ---------- */
  const list = (items) => `<ul class="info-list">${items.map((t) => `<li><svg viewBox="0 0 24 24"><path d="M9.500 16.200L5.300 12 3.900 13.400l5.600 5.600L21 7.500 19.600 6.100z"/></svg><span>${t}</span></li>`).join('')}</ul>`;
  const tiles = (items) => `<ul class="info-tiles">${items.map(([t, d]) => `<li><b>${t}</b><p>${d}</p></li>`).join('')}</ul>`;

  const INFO = {
    habits: () => head('Hábitos de lectura', 'Pequeños cambios para leer más y mejor, sin presión.') +
      list([
        '<b>Diez minutos al día.</b> Asocia la lectura a un momento fijo: el café, el colectivo o antes de dormir.',
        '<b>Siempre un libro a mano.</b> Lleva uno físico o digital; los tiempos de espera se vuelven lectura.',
        '<b>Elige por placer.</b> Si un libro no te atrapa en 50 páginas, déjalo y prueba otro.',
        '<b>Súmate a un club.</b> Compartir lo leído multiplica las ganas de seguir.',
        '<b>Anota y comparte.</b> Subraya frases y cuéntalas: refuerza la memoria y la conversación.',
      ]) + `<div class="modal__actions">${btn('Ver el catálogo', 'data-open-search="catalog"')}${go('Ver eventos', '#eventos')}</div>`,

    borrow: () => head('Más para pedir prestado', 'Además de libros, tu carnet te da acceso a objetos y experiencias.') +
      tiles([
        ['Paquetes de libros', 'Selecciones temáticas para llevar, armadas por nuestros bibliotecarios.'],
        ['Pases a museos', 'Entradas gratuitas a museos y centros culturales de la ciudad.'],
        ['Kits de ciencia y de juego', 'Microscopios, juegos de mesa y materiales para explorar en casa.'],
        ['Kits de observación de aves', 'Binoculares y guías de campo para salir a mirar.'],
        ['Instrumentos', 'Ukeleles y otros instrumentos para aprender sin comprar.'],
        ['Biblioteca de fanzines', 'Publicaciones independientes de la escena local.'],
      ]) + `<p class="modal__note">Requieren carnet vigente. Consulta disponibilidad en tu sede.</p><div class="modal__actions">${btn('Obtener mi carnet', 'data-modal="card"')}${btn('Consultar disponibilidad', 'data-modal="help"', 'btn--outline')}</div>`,

    digital: () => head('Biblioteca digital', 'Recursos disponibles las 24 horas con tu carnet, desde cualquier dispositivo.') +
      tiles([
        ['Libros electrónicos', 'Miles de títulos para leer en el celular, la tablet o la computadora.'],
        ['Audiolibros', 'Escucha novelas y ensayos mientras viajas o cocinas.'],
        ['Revistas y periódicos', 'Ediciones recientes y archivo histórico de publicaciones.'],
        ['Cómics y novelas gráficas', 'Colecciones para jóvenes y adultos.'],
        ['Cursos en línea', 'Idiomas, oficios y preparación para exámenes.'],
        ['Música, cine y video', 'Streaming sin publicidad ni costo adicional.'],
      ]) + `<div class="modal__actions">${btn('Obtener mi carnet', 'data-modal="card"')}${btn('Buscar en el catálogo', 'data-open-search="catalog"', 'btn--outline')}</div>`,

    guides: () => head('Guías de investigación', 'Rutas de búsqueda preparadas por nuestro equipo de referencia.') +
      tiles([
        ['Tesis y trabajos académicos', 'Cómo buscar fuentes, citar y organizar la bibliografía.'],
        ['Propiedad intelectual', 'Derechos de autor, licencias y registro de obras.'],
        ['Mapas y cartografía', 'Planos históricos, atlas y herramientas de mapeo.'],
        ['Documentos oficiales', 'Dónde encontrar leyes, normas y registros públicos.'],
        ['Empleo y carrera', 'Currículum, entrevistas y búsqueda laboral.'],
        ['Índices de la biblioteca', 'Catálogos temáticos de prensa, folletos y archivos locales.'],
      ]) + `<div class="modal__actions">${btn('Consultar a un bibliotecario', 'data-modal="help" data-subject="Guía de investigación"')}${go('Ver colecciones', '#investigacion')}</div>`,

    genealogy: () => head('Genealogía y archivos', 'Reconstruye la historia de tu familia paso a paso.') +
      list([
        '<b>Empieza por ti.</b> Reúne nombres, fechas y lugares de familiares vivos y documentos de casa.',
        '<b>Consulta registros.</b> Actas civiles, censos y listas de pasajeros están en nuestras colecciones.',
        '<b>Explora la prensa.</b> Diarios históricos digitalizados para encontrar noticias, avisos y obituarios.',
        '<b>Pide ayuda.</b> Un bibliotecario te guía en la sala de archivos con turno previo.',
      ]) + `<div class="modal__actions">${btn('Pedir una cita', 'data-modal="help" data-subject="Cita de genealogía"')}${btn('Buscar libros de historia', 'data-open-search="catalog" data-cat="Historia y sociedad"', 'btn--outline')}</div>`,

    closures: () => {
      const y = new Date().getFullYear();
      const items = [['1 de enero', 'Año Nuevo'], ['24 de marzo', 'Día de la Memoria'], ['1 de mayo', 'Día del Trabajo'], ['9 de julio', 'Día de la Independencia'], ['8 de diciembre', 'Inmaculada Concepción'], ['25 de diciembre', 'Navidad']];
      return head(`Cierres por feriados ${y}`, 'Estas fechas todas las sedes permanecen cerradas. Los recursos digitales siguen disponibles.') +
        `<ul class="info-rows">${items.map(([d, n]) => `<li><b>${d}</b><span>${n}</span></li>`).join('')}</ul>` +
        `<p class="modal__note">Las fechas pueden variar según el calendario oficial. Confirma por teléfono o por correo.</p>` +
        `<div class="modal__actions">${go('Ver sedes y horarios', '#sedes', 'btn--dark')}</div>`;
    },

    tours: () => head('Visitas guiadas', 'Recorre la Biblioteca Central con un guía y conoce su historia, su arquitectura y sus colecciones.') +
      list(['Duración: 60 minutos', 'Grupos de hasta 15 personas', 'Sábados a las 11:00 y 16:00', 'Gratuito, con reserva previa']) +
      `<div class="modal__actions">${btn('Reservar mi visita', 'data-modal="contact" data-subject="Reserva de visita guiada"')}</div>`,

    computers: () => head('Computadoras y tecnología', 'Usa equipos en la sala o llévalos prestados con tu carnet.') +
      tiles([
        ['Computadoras en sala', 'Sesiones de 2 horas, con internet y software de oficina.'],
        ['Notebooks en préstamo', 'Para usar dentro de la biblioteca, con carnet vigente.'],
        ['Ayuda con la tecnología', 'Sesiones individuales para correo, trámites y celulares.'],
        ['Laboratorio de medios', 'Edición de audio y video, impresión 3D y digitalización.'],
      ]) + `<div class="modal__actions">${btn('Reservar un equipo', 'data-modal="rooms"')}${btn('Pedir ayuda', 'data-modal="help" data-subject="Ayuda con la tecnología"', 'btn--outline')}</div>`,

    print: () => head('Impresión y copias', 'Imprime documentos desde tu dispositivo o desde nuestras computadoras.') +
      `<ul class="info-rows"><li><b>Blanco y negro</b><span>$50 por hoja</span></li><li><b>Color</b><span>$150 por hoja</span></li><li><b>Escaneo</b><span>Gratis</span></li></ul>` +
      list(['Envía el archivo al correo de impresión de tu sede.', 'Retíralo en el mostrador con tu carnet.', 'Primeras 10 hojas por mes sin costo para socios.']) +
      `<div class="modal__actions">${btn('Obtener mi carnet', 'data-modal="card"')}${btn('Consultar', 'data-modal="help" data-subject="Impresión"', 'btn--outline')}</div>`,

    careers: () => head('Empleos y carreras', 'Súmate al equipo que acerca el conocimiento a la comunidad.') +
      `<ul class="info-rows info-rows--action">${[
        ['Bibliotecario/a de referencia', 'Sede Central · Jornada completa'],
        ['Auxiliar de atención al público', 'Sede Norte · Media jornada'],
        ['Coordinador/a de programas culturales', 'Sede Central · Jornada completa'],
      ].map(([t, d]) => `<li><div><b>${t}</b><span>${d}</span></div>${btn('Postularme', `data-modal="contact" data-subject="Postulación: ${esc(t)}"`, 'btn--sm btn--dark')}</li>`).join('')}</ul>` +
      `<p class="modal__note">¿No ves tu perfil? Envíanos tu currículum igualmente.</p>`,

    support: () => head('Apoya a la biblioteca', 'Tu aporte hace posible que los servicios sigan siendo gratuitos.') +
      tiles([
        ['Donar libros', 'Aceptamos libros en buen estado, de lunes a viernes en todas las sedes.'],
        ['Ser Amigo de la biblioteca', 'Participa de eventos exclusivos y apoya proyectos de la comunidad.'],
        ['Voluntariado', 'Colabora con talleres, clubes de lectura y actividades para chicos.'],
      ]) + `<div class="modal__actions">${btn('Quiero ser voluntario', 'data-modal="volunteer"')}${btn('Contactar a la Fundación', 'data-modal="contact" data-subject="Fundación / Amigos de la biblioteca"', 'btn--outline')}</div>`,

    policies: () => head('Políticas y reglas', 'Lo esencial para disfrutar la biblioteca entre todos.') +
      [
        ['Políticas de préstamo', 'Hasta 5 libros por 21 días, renovables dos veces por 14 días si no tienen reservas. La mora no genera multas: solo suspende nuevos préstamos hasta la devolución.'],
        ['Reglas de conducta', 'Respeto entre usuarios y personal, silencio en salas de lectura, cuidado del material y de las instalaciones. Se admiten animales de asistencia.'],
        ['Política de privacidad', 'Guardamos solo los datos necesarios para prestarte el servicio y nunca los compartimos con terceros sin tu consentimiento. Puedes pedir su eliminación en cualquier momento.'],
        ['Accesibilidad', 'Nuestras sedes cuentan con acceso para sillas de ruedas, material en braille y letra grande. Este sitio incluye opciones de contraste, tipografía legible y reducción de animaciones.'],
      ].map(([t, d], i) => `<details class="acc"${i === 0 ? ' open' : ''}><summary>${t}</summary><p>${d}</p></details>`).join('') +
      `<div class="modal__actions">${btn('Tengo una consulta', 'data-modal="contact" data-subject="Consulta sobre políticas"')}</div>`,
  };

  /* ---------- Sedes ---------- */
  const BRANCHES = [
    { name: 'Sede Central', addr: 'Av. de la Libertad 1234', hours: 'Lun–Vie 9–20 · Sáb 10–18', tel: '(+54-11) 4000-0000', tag: 'Colección completa · Archivo · Salas' },
    { name: 'Sede Norte', addr: 'Calle Los Olivos 450', hours: 'Lun–Vie 10–19 · Sáb 10–15', tel: '(+54-11) 4000-0002', tag: 'Sección infantil · Computadoras' },
    { name: 'Sede Sur', addr: 'Av. del Parque 980', hours: 'Lun–Vie 10–19 · Sáb 10–14', tel: '(+54-11) 4000-0003', tag: 'Talleres · Sala de estudio' },
  ];
  // Sedes publicadas desde el panel (también en la lista del pie de página)
  if (Array.isArray(CD.branches) && CD.branches.length) {
    BRANCHES.splice(0, BRANCHES.length, ...CD.branches.map((b) => ({ name: b.name, addr: b.addr || '', hours: b.hours || '', tel: b.tel || '', tag: b.tag || '' })));
    const sfp = $('#sf-p3 ul');
    if (sfp) {
      sfp.innerHTML = BRANCHES.map((b) => `<li><a href="#contacto" data-modal="branches"><b>${esc(b.name)}</b><span>${esc(b.addr)}</span></a></li>`).join('')
        + '<li><a class="sf__how" href="#sedes" data-go="#sedes">Cómo llegar →</a></li>';
    }
  }
  const mapUrl = (b) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name + ' ' + b.addr)}`;
  const branchCard = (b, extra = '') => `
    <li class="branch-card">
      <div><h3>${esc(b.name)}</h3><p>${esc(b.addr)}</p><p class="muted">${esc(b.hours)}</p><p class="muted">${esc(b.tag)}</p></div>
      <div class="branch-card__side">${extra}<a class="btn btn--sm btn--dark" href="${mapUrl(b)}" target="_blank" rel="noopener">Cómo llegar</a><a class="btn btn--sm btn--outline" href="tel:${b.tel.replace(/[^+\d]/g, '')}">Llamar</a></div>
    </li>`;

  function openBranches(zip) {
    let rows = BRANCHES.map((b, i) => ({ b, d: null, i }));
    let intro = 'Elige la sede que mejor te quede. Todas atienden con tu mismo carnet.';
    let title = 'Sedes y horarios';
    if (zip) {
      // Distancia aproximada (demostrativa) calculada a partir del código postal
      const seed = [...zip].reduce((a, c) => a + c.charCodeAt(0) * 7, 13);
      rows = rows.map((r) => ({ ...r, d: (((seed * (r.i + 3)) % 90) / 10 + 0.8) })).sort((a, b) => a.d - b.d);
      title = `Sedes cerca de ${esc(zip)}`;
      intro = 'Estas son las sedes más cercanas a tu código postal (distancias aproximadas).';
    }
    openModal(head(title, intro) +
      `<ul class="branch-list">${rows.map((r, k) => branchCard(r.b, r.d ? `<span class="chip-d">${k === 0 ? 'Más cercana · ' : ''}${r.d.toFixed(1)} km</span>` : '')).join('')}</ul>`, { wide: true, focus: false });
  }

  /* ---------- Eventos ---------- */
  const EVENTS = [
    { title: 'Día Internacional de la Lengua Materna', m: 1, d: 21, cat: 'Novela y ficción', text: 'Proclamado por la UNESCO para promover la diversidad lingüística y el multilingüismo. En la biblioteca: lecturas en distintos idiomas y mesa de literatura en lenguas originarias.' },
    { title: 'Día Mundial de la Poesía', m: 2, d: 21, cat: 'Novela y ficción', text: 'Desde 1999, la UNESCO dedica este día a la palabra poética. En la biblioteca: micrófono abierto, lecturas en voz alta y recitales para todas las edades.' },
    { title: 'Día Internacional del Libro Infantil', m: 3, d: 2, cat: 'Infantil y juvenil', text: 'Se celebra desde 1967 en el natalicio de Hans Christian Andersen. En la biblioteca: cuentacuentos, talleres de ilustración y préstamos especiales para los más chicos.' },
    { title: 'Día Mundial del Libro y del Derecho de Autor', m: 3, d: 23, cat: 'Novela y ficción', text: 'La UNESCO eligió esta fecha por Cervantes, Shakespeare y el Inca Garcilaso de la Vega, fallecidos en 1616. En la biblioteca: feria de intercambio de libros y charlas con autores.' },
    { title: 'Día Internacional de la Alfabetización', m: 8, d: 8, cat: 'Historia y sociedad', text: 'Proclamado por la UNESCO para recordar que leer y escribir son derechos humanos. En la biblioteca: tutorías gratuitas y jornadas de lectura compartida.' },
  ];
  // Efemérides publicadas desde el panel: se actualizan los datos y las tarjetas de la sección
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const FEATURE_ART = [
    ['art--dots', '--c1:#f0dfae;--c2:#26a047;--c3:#00482a', 'grad--pink', 'plus'],
    ['art--rays', '--c1:#0a6b34;--c2:#168a3e;--c3:#f0dfae', 'grad--blue', 'sun'],
    ['art--rings', '--c1:#00482a;--c2:#d9ab4a;--c3:#fff', 'grad--aqua', 'x'],
    ['art--zig', '--c1:#e1f2e6;--c2:#8fd0a2;--c3:#d9ab4a', 'grad--sun', 'plus'],
    ['art--stripes', '--c1:#26a047;--c2:#03271a;--c3:#f0dfae', 'grad--lilac', 'sun'],
  ];
  if (Array.isArray(CD.events) && CD.events.length) {
    EVENTS.splice(0, EVENTS.length, ...CD.events.map((e) => ({ title: e.title, m: e.month - 1, d: e.day, cat: e.category || '', text: e.body || e.summary || '', sum: e.summary || e.body || '' })));
    const host = $('#eventos .container');
    if (host) {
      host.querySelectorAll('article.feature').forEach((n) => n.remove());
      EVENTS.forEach((e, i) => {
        const [art, vars, grad, icon] = FEATURE_ART[i % FEATURE_ART.length];
        const a = document.createElement('article');
        a.className = `feature feature--${i % 2 ? 'b' : 'a'}`;
        a.innerHTML = `<div class="feature__art ${art}" style="${vars}"><span class="date"><b>${Number(e.d)}</b><i>${MESES[e.m] || ''}</i></span></div>`
          + `<div class="feature__body ${grad}"><svg class="feature__icon icon--${icon}"><use href="#i-${icon}"/></svg>`
          + `<h3><a href="#eventos" data-event="${i}">${esc(e.title)} <svg><use href="#i-arrow"/></svg></a></h3><p>${esc(e.sum)}</p></div>`;
        host.appendChild(a);
      });
    }
  }
  const nextDate = (ev) => { const now = new Date(); let d = new Date(now.getFullYear(), ev.m, ev.d); if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d = new Date(now.getFullYear() + 1, ev.m, ev.d); return d; };
  const fmtDate = (d) => d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  function downloadICS(name, lines) {
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BiblioHub//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${Date.now()}@bibliohub`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`, ...lines, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${name}.ics` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function openEvent(i) {
    const ev = EVENTS[i]; const d = nextDate(ev);
    openModal(`<p class="eyebrow">Próxima celebración</p>${head(esc(ev.title), '')}
      <p class="modal__date">${esc(fmtDate(d))}</p><p>${esc(ev.text)}</p>
      <div class="modal__actions">
        ${btn('Añadir al calendario', `data-ics="${i}"`)}
        ${btn('Libros para esta fecha', `data-open-search="catalog" data-cat="${esc(ev.cat)}"`, 'btn--outline')}
      </div>`, { focus: false });
  }

  /* ---------- Formularios ---------- */
  const field = (f) => {
    const id = `f-${f.name}`;
    const req = f.required ? ' required' : '';
    let ctl;
    if (f.type === 'select') ctl = `<select id="${id}" name="${f.name}"${req}>${(f.options || []).map((o) => `<option${o === f.value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (f.type === 'textarea') ctl = `<textarea id="${id}" name="${f.name}" rows="4"${req} placeholder="${esc(f.placeholder || '')}">${esc(f.value || '')}</textarea>`;
    else ctl = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}"${req} placeholder="${esc(f.placeholder || '')}" value="${esc(f.value || '')}"${f.min ? ` min="${f.min}"` : ''}${f.max ? ` max="${f.max}"` : ''} autocomplete="${f.ac || 'off'}">`;
    return `<label class="field${f.full ? ' field--full' : ''}" for="${id}"><span>${esc(f.label)}${f.required ? ' *' : ''}</span>${ctl}</label>`;
  };

  function openForm({ title, intro, fields, submit = 'Enviar', foot = '', done, wide = false }) {
    openModal(`${head(title, intro)}<form class="form" novalidate>${fields.map(field).join('')}<div class="form__actions">${btn(submit, 'type="submit"')}</div>${foot ? `<p class="modal__note">${foot}</p>` : ''}</form>`, {
      wide,
      onOpen(root) {
        const form = $('form', root);
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          form.querySelectorAll('.field__err').forEach((n) => n.remove());
          form.querySelectorAll('.is-bad').forEach((n) => n.classList.remove('is-bad'));
          const bad = [...form.elements].filter((el) => el.name && !el.checkValidity());
          if (bad.length) {
            bad.forEach((el) => {
              const msg = el.validity.valueMissing ? 'Completa este campo.' : el.type === 'email' ? 'Escribe un correo válido (ej.: nombre@correo.com).' : 'Revisa este dato.';
              el.classList.add('is-bad');
              const p = document.createElement('small'); p.className = 'field__err'; p.textContent = msg;
              el.closest('.field').appendChild(p);
            });
            bad[0].focus();
            return;
          }
          try {
            const data = Object.fromEntries(new FormData(form).entries());
            Object.keys(data).forEach((k) => { if (typeof data[k] === 'string') data[k] = data[k].trim(); });
            const out = done(data);
            if (typeof out === 'string') { mbody.innerHTML = out; dlg.querySelector('.modal__panel').scrollTop = 0; }
          } catch (err) {
            console.error(err);
            toast('No pudimos completar la acción. Vuelve a intentarlo.', 'info');
          }
        });
      },
    });
  }

  const done = (title, body, actions = '') => `<div class="success"><span class="success__icon"><svg viewBox="0 0 24 24"><path d="M9.500 16.200L5.300 12 3.900 13.400l5.600 5.600L21 7.500 19.600 6.100z"/></svg></span>${head(title)}<p class="modal__intro">${body}</p><div class="modal__actions">${actions}${btn('Cerrar', 'data-close', 'btn--outline')}</div></div>`;

  let pendingAction = null;
  const requireCard = (fn) => {
    if (state.card) return fn();
    pendingAction = fn;
    toast('Para reservar necesitas tu carnet (es gratis)', 'info');
    FORMS.card();
  };

  const FORMS = {
    help: (o = {}) => openForm({
      title: 'Pregunte a un bibliotecario', intro: 'Cuéntanos qué necesitas y un bibliotecario te responde por correo en menos de 24 horas.',
      fields: [
        { name: 'nombre', label: 'Nombre', required: true, ac: 'name' },
        { name: 'correo', label: 'Correo electrónico', type: 'email', required: true, ac: 'email' },
        { name: 'tema', label: 'Tema', type: 'select', options: ['Catálogo y libros', 'Mi cuenta y carnet', 'Investigación', 'Tecnología', 'Otro'], full: true, value: o.subject && 'Otro' },
        { name: 'mensaje', label: 'Tu consulta', type: 'textarea', required: true, full: true, value: o.subject ? `Consulta: ${o.subject}\n\n` : '' },
      ],
      submit: 'Enviar consulta',
      done: (d) => done(`¡Gracias, ${esc(d.nombre.split(' ')[0])}!`, 'Tu consulta está lista. Para que llegue directo a nuestro equipo, ábrela en tu correo y envíala.',
        `<a class="btn btn--dark" href="${mailto('Consulta: ' + d.tema, `${d.mensaje}\n\n— ${d.nombre} (${d.correo})`)}">Abrir en mi correo</a>`),
    }),
    contact: (o = {}) => openForm({
      title: 'Contáctenos', intro: o.subject ? `Asunto: ${esc(o.subject)}` : 'Escríbenos y te respondemos a la brevedad.',
      fields: [
        { name: 'nombre', label: 'Nombre', required: true, ac: 'name' },
        { name: 'correo', label: 'Correo electrónico', type: 'email', required: true, ac: 'email' },
        { name: 'asunto', label: 'Asunto', value: o.subject || '', full: true, required: true },
        { name: 'mensaje', label: 'Mensaje', type: 'textarea', required: true, full: true },
      ],
      submit: 'Preparar mensaje',
      done: (d) => done(`¡Listo, ${esc(d.nombre.split(' ')[0])}!`, 'Tu mensaje está preparado. Ábrelo en tu correo para enviarlo al equipo de BiblioHub.',
        `<a class="btn btn--dark" href="${mailto(d.asunto, `${d.mensaje}\n\n— ${d.nombre} (${d.correo})`)}">Abrir en mi correo</a>`),
    }),
    newsletter: () => openForm({
      title: 'Recibir novedades', intro: 'Una vez por mes: eventos, nuevos libros y actividades. Sin spam.',
      fields: [
        { name: 'correo', label: 'Correo electrónico', type: 'email', required: true, full: true, ac: 'email', value: (state.user && state.user.email) || '' },
        { name: 'intereses', label: 'Me interesa', type: 'select', options: ['Todo', 'Novedades del catálogo', 'Eventos y talleres', 'Infantil y familias'], full: true },
      ],
      submit: 'Suscribirme',
      done: (d) => { store.set('bh_news', { email: d.correo, intereses: d.intereses }); toast('¡Suscripción confirmada!'); closeModal(); return null; },
    }),
    volunteer: () => openForm({
      title: 'Sé voluntario', intro: 'Dedica unas horas al mes a lo que más te guste.',
      fields: [
        { name: 'nombre', label: 'Nombre', required: true, ac: 'name' },
        { name: 'correo', label: 'Correo electrónico', type: 'email', required: true, ac: 'email' },
        { name: 'area', label: 'Área de interés', type: 'select', options: ['Clubes de lectura', 'Talleres para chicos', 'Apoyo escolar', 'Eventos y cultura', 'Archivo y catalogación'], full: true },
        { name: 'dias', label: 'Disponibilidad', placeholder: 'Ej.: martes y jueves por la tarde', full: true },
      ],
      submit: 'Postularme',
      done: (d) => done(`¡Gracias, ${esc(d.nombre.split(' ')[0])}!`, 'Tu postulación está lista. Envíala desde tu correo y te contactamos para coordinar una charla.',
        `<a class="btn btn--dark" href="${mailto('Voluntariado: ' + d.area, `Disponibilidad: ${d.dias || 'a coordinar'}\n\n— ${d.nombre} (${d.correo})`)}">Abrir en mi correo</a>`),
    }),
    rooms: () => {
      const today = new Date().toISOString().slice(0, 10);
      openForm({
        title: 'Reservar una sala o equipo', intro: 'Elige sede, día y horario. Puedes guardar la reserva en tu calendario.',
        fields: [
          { name: 'sede', label: 'Sede', type: 'select', options: BRANCHES.map((b) => b.name), full: true },
          { name: 'tipo', label: 'Qué necesitas', type: 'select', options: ['Sala de estudio', 'Sala de reuniones', 'Computadora', 'Laboratorio de medios'], full: true },
          { name: 'fecha', label: 'Fecha', type: 'date', required: true, min: today },
          { name: 'hora', label: 'Horario', type: 'select', options: ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'] },
          { name: 'personas', label: 'Personas', type: 'number', min: 1, max: 12, value: 1, required: true },
        ],
        submit: 'Confirmar reserva',
        done: (d) => {
          state.rooms.push({ sede: d.sede, tipo: d.tipo, fecha: d.fecha, hora: d.hora, personas: d.personas });
          save();
          window.__lastRoom = d;
          toast('Reserva confirmada');
          return done('¡Reserva confirmada!', `${esc(d.tipo)} en <b>${esc(d.sede)}</b> el <b>${esc(d.fecha)}</b> a las <b>${esc(d.hora)}</b> para ${esc(d.personas)} persona(s).`,
            btn('Añadir al calendario', 'data-ics="room"'));
        },
      });
    },
    card: () => {
      if (state.card) return openAccount();
      openForm({
        title: 'Obtener mi carnet', intro: 'Es gratis y lo obtienes al instante. Con él puedes pedir libros, reservar salas y usar la biblioteca digital.',
        fields: [
          { name: 'nombre', label: 'Nombre y apellido', required: true, full: true, ac: 'name' },
          { name: 'correo', label: 'Correo electrónico', type: 'email', required: true, ac: 'email', value: (state.user && state.user.email) || '' },
          { name: 'doc', label: 'Documento (opcional)', placeholder: 'DNI', ac: 'off' },
        ],
        submit: 'Crear mi carnet',
        foot: 'Demostración: tus datos se guardan solo en este navegador.',
        done: (d) => {
          const number = 'BH-' + String(Math.floor(10000000 + Math.random() * 89999999));
          state.card = { name: d.nombre, number, since: new Date().toISOString().slice(0, 10) };
          state.user = { name: d.nombre, email: d.correo };
          save(); paintAccount();
          toast('¡Tu carnet está listo!');
          return done(`¡Bienvenido/a, ${esc(d.nombre.split(' ')[0])}!`, 'Este es tu carnet digital. Muéstralo en cualquier sede o úsalo para entrar a la biblioteca digital.',
            cardVisual(state.card) + (pendingAction ? btn('Continuar con mi reserva', 'data-resume') : btn('Ir a mi cuenta', 'data-modal="account"')));
        },
      });
    },
    login: () => openForm({
      title: 'Acceder a mi cuenta', intro: 'Ingresa con tu correo para ver tus reservas y tu carnet.',
      fields: [
        { name: 'correo', label: 'Correo electrónico', type: 'email', required: true, full: true, ac: 'email' },
        { name: 'clave', label: 'Contraseña', type: 'password', required: true, full: true, ac: 'current-password' },
      ],
      submit: 'Ingresar',
      foot: '¿No tienes carnet? <button type="button" class="linkbtn" data-modal="card">Obtén uno gratis</button>. Demostración: la sesión se guarda solo en este navegador.',
      done: (d) => {
        const base = d.correo.split('@')[0].replace(/[._-]+/g, ' ');
        state.user = { name: base.replace(/\b\w/g, (c) => c.toUpperCase()), email: d.correo };
        save(); paintAccount(); toast(`Hola, ${state.user.name.split(' ')[0]}`);
        openAccount();
        return null;
      },
    }),
  };


  /* ---------- Equipo ---------- */
  const PEOPLE = [
    { img: 2, name: 'Sandro', role: 'Dirección', bio: 'Bibliotecólogo con más de veinte años de trayectoria en bibliotecas públicas y universitarias. Impulsa el acceso gratuito al conocimiento y la apertura de la biblioteca a todos los barrios.', focus: ['Estrategia y alianzas', 'Políticas de acceso', 'Relación con la comunidad'] },
    { img: 3, name: 'Roxy', role: 'Colecciones y archivo', bio: 'Archivista y especialista en preservación. Cuida las colecciones especiales y coordina la digitalización de fotografías, documentos y publicaciones históricas.', focus: ['Colecciones especiales', 'Digitalización', 'Guías de investigación'] },
    { img: 4, name: 'Paula', role: 'Programas culturales', bio: 'Gestora cultural y mediadora de lectura. Diseña clubes de lectura, ciclos de autores y las celebraciones del calendario literario durante todo el año.', focus: ['Clubes de lectura', 'Ciclos y talleres', 'Primera infancia'] },
    { img: 1, name: 'Dante', role: 'Biblioteca digital', bio: 'Especialista en recursos digitales y tecnología. Administra los libros electrónicos, audiolibros y cursos en línea, y enseña a los socios a sacarles el máximo provecho desde cualquier dispositivo.', focus: ['Libros electrónicos', 'Cursos en línea', 'Alfabetización digital'] },
    { img: 5, name: 'Benjamin Cenoz', role: 'Atención y comunidad', bio: 'Referencista y responsable de la atención al público. Te ayuda con tu carnet, tus préstamos y cualquier trámite, en persona o por correo.', focus: ['Carnet y préstamos', 'Ayuda con la tecnología', 'Accesibilidad'] },
  ];
  // Equipo publicado desde el panel: foto propia (https) o la de images/team/<n>.png
  const teamImg = (p) => (/^https:\/\/[^\s"'<>]+$/.test(p.photo || '') ? p.photo : `images/team/${p.img}.png`);
  if (Array.isArray(CD.team) && CD.team.length) {
    PEOPLE.splice(0, PEOPLE.length, ...CD.team.map((t) => ({ img: t.img || 1, photo: t.photo_url || '', name: t.name, role: t.role, bio: t.bio || '', focus: t.focus || [] })));
    const grid = $('.team__grid');
    if (grid) {
      grid.innerHTML = PEOPLE.map((p) => {
        const ini = p.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
        return `<li><div class="person" role="group" aria-label="${esc(p.name)}"><span class="person__stage"><span class="person__panel" aria-hidden="true"><b>${esc(ini)}</b></span>`
          + `<img class="person__img" src="${esc(teamImg(p))}" alt="" width="640" height="800" loading="lazy"></span>`
          + `<span class="person__info"><small>${esc(p.role)}</small><strong>${esc(p.name)}</strong></span></div></li>`;
      }).join('');
    }
  }
  function openPerson(i) {
    const p = PEOPLE[i]; if (!p) return;
    const initials = p.name.replace(/^(Lic\.|Dr\.|Dra\.)\s*/, '').split(' ').map((w) => w[0]).slice(0, 2).join('');
    openModal(`<div class="personview">
        <div class="personview__avatar"><img src="${esc(teamImg(p))}" alt="${esc(p.name)}"></div>
        <div>
          <p class="eyebrow">${esc(p.role)}</p>
          <h2 class="modal__title" id="modal-title">${esc(p.name)}</h2>
          <p class="modal__intro">${esc(p.bio)}</p>
          <ul class="chips--static">${p.focus.map((f) => `<li class="chipf on">${esc(f)}</li>`).join('')}</ul>
          <div class="modal__actions">${btn('Escribirle un mensaje', `data-modal="contact" data-subject="Mensaje para ${esc(p.name)}"`)}</div>
        </div>
      </div>`, { focus: false });
  }

  /* ---------- Cuenta ---------- */
  const cardVisual = (c) => `<div class="idcard"><img src="images/logo-white.png" alt="BiblioHub"><div><small>Socio/a</small><b>${esc(c.name)}</b></div><div class="idcard__n"><small>N.º de carnet</small><span>${esc(c.number)}</span></div></div>`;
  const fmtShort = (d) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

  const PROG = () => store.get('bh_progress', {});
  function openAccount() {
    if (!state.user) return FORMS.login();
    const res = state.reserves.map((r) => {
      const x = bookOf(r.shelf, r.i);
      return `<li><div><b>${esc(r.title)}</b><span>Código ${esc(r.code)} · Retiro en ${esc(r.sede)} desde el ${fmtShort(r.pick)}</span></div><span class="row-actions">${x && x.b[6] ? btn('Leer', `data-read="${r.shelf}:${r.i}"`, 'btn--sm btn--gold') : ''}${btn('Cancelar', `data-cancel-reserve="${r.code}"`, 'btn--sm btn--outline')}</span></li>`;
    }).join('');
    const waits = state.waits.map((w, k) => `<li><div><b>${esc(w.title)}</b><span>En lista de espera</span></div>${btn('Quitar', `data-unwait="${k}"`, 'btn--sm btn--outline')}</li>`).join('');
    const rooms = state.rooms.map((r) => `<li><div><b>${esc(r.tipo)} · ${esc(r.sede)}</b><span>${esc(r.fecha)} · ${esc(r.hora)}</span></div></li>`).join('');
    const prog = PROG();
    const reading = allBooks().filter((b) => b.pdf && prog[b.slug] > 1).map((b) => `<li><div><b>${esc(b.title)}</b><span>Seguiste en la página ${prog[b.slug]}</span></div>${btn('Continuar', `data-read="${b.shelf}:${b.i}"`, 'btn--sm btn--gold')}</li>`).join('');
    const mine = allBooks().filter((b) => (store.get('bh_ratings', {}))[b.slug]).map((b) => `<li><div><b>${esc(b.title)}</b><span>Tu calificación: ${'★'.repeat(store.get('bh_ratings', {})[b.slug])}</span></div></li>`).join('');
    openModal(`<p class="eyebrow">Mi cuenta</p>${head(`Hola, ${esc(state.user.name.split(' ')[0])}`, esc(state.user.email))}
      ${state.card ? cardVisual(state.card) : `<div class="callout"><p>Aún no tienes carnet digital. Es gratis y lo obtienes al instante.</p>${btn('Obtener mi carnet', 'data-modal="card"')}</div>`}
      ${reading ? `<h3 class="modal__sub">Continuar leyendo</h3><ul class="info-rows info-rows--action">${reading}</ul>` : ''}
      <h3 class="modal__sub">Mis reservas</h3>
      ${res ? `<ul class="info-rows info-rows--action">${res}</ul>` : '<p class="muted">No tienes reservas. Elige un libro y reserva tu copia para retirarla en la sede.</p>'}
      ${waits ? `<h3 class="modal__sub">Lista de espera</h3><ul class="info-rows info-rows--action">${waits}</ul>` : ''}
      ${rooms ? `<h3 class="modal__sub">Mis reservas de salas</h3><ul class="info-rows">${rooms}</ul>` : ''}
      ${mine ? `<h3 class="modal__sub">Mis calificaciones</h3><ul class="info-rows">${mine}</ul>` : ''}
      <div class="modal__actions">${btn('Buscar libros', 'data-open-search="catalog"')}${btn('Cerrar sesión', 'data-logout', 'btn--outline')}</div>`, { wide: true, focus: false });
  }
  function paintAccount() {
    $$('.js-account-label').forEach((el) => { el.textContent = state.user ? state.user.name.split(' ')[0] : 'Mi cuenta'; });
  }

  /* ---------- Libro: ficha, reserva y calificación ---------- */
  const place = (shelfIdx, i) => `Sala ${shelfIdx + 1} · Estante ${String.fromCharCode(65 + (i % 6))}${i + 1}`;
  const MAX_RESERVES = 3;
  const codeOf = () => 'RS-' + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.floor(100 + Math.random() * 900);
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const longDay = (d) => new Date(d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  let viewing = null;                                   // libro abierto en la ficha

  function ratingBlock(b) {
    const rt = B().ratingOf(b);
    const sum = rt.n
      ? `${B().starsHTML(rt.avg)}<b>${B().fmtAvg(rt.avg)}</b><span>${rt.n} ${rt.n === 1 ? 'calificación' : 'calificaciones'}</span>`
      : '<span>Aún sin calificaciones: sé el primero</span>';
    return `<div class="rate" id="rate-block">
      <div class="rate__sum">${sum}</div>
      <div class="rate__mine"><span>${rt.mine ? 'Tu calificación' : 'Califica este libro'}</span>
        <div class="rate__stars" role="radiogroup" aria-label="Tu calificación">${[1, 2, 3, 4, 5].map((v) => `<button type="button" class="rstar${v <= rt.mine ? ' on' : ''}" data-rate="${v}" role="radio" aria-checked="${v === rt.mine}" aria-label="${v} ${v === 1 ? 'estrella' : 'estrellas'}">★</button>`).join('')}</div>
        ${rt.mine ? '<button type="button" class="linkbtn" data-rate="0">Quitar</button>' : ''}</div>
    </div>`;
  }

  function openBook(shelf, i) {
    const r = bookOf(shelf, i); if (!r) return;
    viewing = { shelf, i };
    const b = r.b;
    const [title, author, pages, copies] = b;
    const canRead = !!b[6];
    const cover = B().coverUrl(b);
    const idx = SHELVES().findIndex((s) => s.id === shelf);
    const mine = state.reserves.find((x) => x.shelf === shelf && x.i === i);
    const waiting = state.waits.find((w) => w.shelf === shelf && w.i === i);
    const prog = PROG()[b[5]];
    let action;
    if (mine) action = btn('Cancelar reserva', `data-cancel-reserve="${mine.code}"`, 'btn--outline');
    else if (copies > 0) action = btn('Reservar un ejemplar', `data-reserve="${shelf}:${i}"`);
    else if (waiting) action = btn('Salir de la lista de espera', `data-unwait-book="${shelf}:${i}"`, 'btn--outline');
    else action = btn('Unirme a la lista de espera', `data-wait="${shelf}:${i}"`);
    const status = mine
      ? `<div class="note note--ok"><b>Reservado · código ${esc(mine.code)}</b><span>Retíralo en ${esc(mine.sede)} desde el ${esc(longDay(mine.pick))} (lo guardamos 3 días).</span></div>`
      : copies > 0 ? '' : '<div class="note"><b>Sin ejemplares por ahora</b><span>Anótate en la lista y te avisamos cuando vuelva. Mientras tanto puedes leerlo online si está disponible.</span></div>';
    openModal(`<div class="bookview">
        <div class="bookshow${canRead ? ' is-readable' : ''}"${canRead ? ` data-read="${shelf}:${i}" role="button" tabindex="0" aria-label="Leer ${esc(title)} online"` : ''}>
          <div class="bookshow__book">
            <img class="bookshow__front" src="${cover}" alt="Portada de ${esc(title)}" draggable="false">
            <span class="bookshow__pages" aria-hidden="true"></span>
            <span class="bookshow__spine" aria-hidden="true"></span>
            <span class="bookshow__back" aria-hidden="true"></span>
          </div>
          ${canRead ? '<span class="bookshow__hint">Toca para abrir</span>' : ''}
        </div>
        <div class="bookview__info">
          <p class="eyebrow">${esc(r.s.title)}</p>
          <h2 class="modal__title" id="modal-title">${esc(title)}</h2>
          <p class="bookview__by">por <b>${esc(author)}</b> · ${b[8] ? `publicado en <b>${b[8]}</b>` : 'año no indicado en la edición'}</p>
          ${ratingBlock(b)}
          <ul class="facts">
            <li><span>Autor</span><b>${esc(author)}</b></li>
            <li><span>Año de publicación</span><b>${b[8] || 's. f.'}</b></li>
            <li><span>Páginas</span><b>${pages}</b></li>
            <li><span>Lectura online</span><b class="${canRead ? 'ok' : ''}">${canRead ? 'Disponible' : 'Próximamente'}</b></li>
            <li><span>Ejemplares</span><b class="${copies > 0 || mine ? 'ok' : 'no'}">${mine ? 'Reservado para ti' : copies > 0 ? `${copies} disponible${copies === 1 ? '' : 's'}` : 'Sin ejemplares'}</b></li>
            <li><span>Ubicación</span><b>${esc(place(idx, i))}</b></li>
          </ul>
          ${status}
          <div class="modal__actions">${btn(`<svg class="icon"><use href="#i-openbook"/></svg> ${prog > 1 ? 'Continuar leyendo' : 'Leer ahora'}`, canRead ? `data-read="${shelf}:${i}"` : `data-soon="${shelf}:${i}"`, 'btn--gold')}${action}${btn('Más de ' + esc(r.s.title), `data-open-search="catalog" data-cat="${esc(r.s.title)}"`, 'btn--outline')}</div>
        </div>
      </div>`, { wide: true, focus: false });
  }

  function rate(v) {
    if (!viewing) return;
    const r = bookOf(viewing.shelf, viewing.i); if (!r) return;
    B().setRating(r.b, v);
    B().refreshBook(viewing.shelf, viewing.i);
    const el = $('#rate-block');
    if (el) { const t = document.createElement('div'); t.innerHTML = ratingBlock(r.b); el.replaceWith(t.firstElementChild); }
    toast(v ? `Calificaste "${r.b[0]}" con ${v} ${v === 1 ? 'estrella' : 'estrellas'}` : 'Quitaste tu calificación');
  }

  /* reservar: elegir sede y día de retiro */
  function openReserve(shelf, i) {
    const r = bookOf(shelf, i); if (!r) return;
    if (r.b[3] < 1) return openBook(shelf, i);
    if (state.reserves.length >= MAX_RESERVES) { toast(`Puedes tener hasta ${MAX_RESERVES} reservas activas`, 'info'); return openAccount(); }
    requireCard(() => {
      const days = [1, 2, 3].map((n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; });
      const labels = days.map((d) => longDay(d));
      openForm({
        title: 'Reservar un ejemplar', intro: `<b>${esc(r.b[0])}</b> — ${esc(r.b[1])}. Te lo guardamos 3 días en la sede que elijas.`,
        fields: [
          { name: 'sede', label: 'Sede de retiro', type: 'select', options: BRANCHES.map((x) => x.name), full: true },
          { name: 'dia', label: 'Retiro desde', type: 'select', options: labels, full: true },
        ],
        submit: 'Confirmar reserva',
        foot: 'Retira presentando tu carnet. Si no pasas en 3 días, el ejemplar vuelve al catálogo.',
        done: (d) => {
          const x = bookOf(shelf, i);
          if (!x || x.b[3] < 1) { toast('Ese ejemplar ya no está disponible', 'info'); openBook(shelf, i); return null; }
          const pick = iso(days[Math.max(0, labels.indexOf(d.dia))]);
          const rec = { shelf, i, slug: x.b[5], title: x.b[0], code: codeOf(), sede: d.sede, pick, made: iso(new Date()) };
          x.b[3] -= 1;
          state.reserves.push(rec);
          state.waits = state.waits.filter((w) => !(w.shelf === shelf && w.i === i));
          save(); B().refreshBook(shelf, i);
          toast('¡Reserva confirmada!');
          return done('¡Reserva confirmada!',
            `<b>${esc(rec.title)}</b><br>Código: <b class="code">${esc(rec.code)}</b><br>Retíralo en <b>${esc(rec.sede)}</b> desde el <b>${esc(longDay(rec.pick))}</b> (te lo guardamos 3 días).`,
            btn('Añadir al calendario', `data-ics="reserve:${rec.code}"`) + btn('Mis reservas', 'data-modal="account"', 'btn--outline') + (x.b[6] ? btn('Leer ahora', `data-read="${shelf}:${i}"`, 'btn--gold') : ''));
        },
      });
    });
  }
  function cancelReserve(code) {
    const k = state.reserves.findIndex((r) => r.code === code); if (k < 0) return null;
    const [rec] = state.reserves.splice(k, 1);
    const x = bookOf(rec.shelf, rec.i); if (x) { x.b[3] += 1; B().refreshBook(rec.shelf, rec.i); }
    save(); toast('Reserva cancelada');
    return rec;
  }

  function readBook(shelf, i) {
    const r = bookOf(shelf, i); if (!r || !r.b[6] || !window.BiblioReader) return;
    const [title, author] = r.b;
    closeAllSafe();
    closeModal();
    window.__readerReturn = () => openBook(shelf, i);
    window.BiblioReader.open({ slug: r.b[5], title, author, cover: B().coverUrl(r.b), start: r.b[7] || 1, pdf: r.b[11] || undefined });
  }
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t && t.matches && t.matches('.bookshow.is-readable')) { e.preventDefault(); t.click(); }
  });

  /* ---------- Búsqueda ---------- */
  const SECTIONS = [
    ['Inicio', '#inicio', 'Portada, buscador y accesos rápidos'],
    ['Leer y pedir prestado', '#catalogo', 'Catálogo, libros, biblioteca digital y tecnología'],
    ['Novela y ficción', '#ficcion', 'Carrusel de novelas y cuentos'],
    ['Ciencia y tecnología', '#ciencia', 'Carrusel de divulgación científica'],
    ['Historia y sociedad', '#historia', 'Carrusel de historia y ciencias sociales'],
    ['Infantil y juvenil', '#infantil', 'Carrusel de lecturas para chicos y jóvenes'],
    ['Eventos', '#eventos', 'Fechas para celebrar la literatura'],
    ['Sedes', '#sedes', 'Encuentra tu sucursal y horarios'],
    ['Servicios', '#servicios', 'Motivos para leer, salas y carnet'],
    ['Investigación', '#investigacion', 'Colecciones, archivos y guías'],
    ['Comunidad', '#comunidad', 'Fotos y videos de la biblioteca'],
    ['Opiniones', '#opiniones', 'Lo que dicen nuestros lectores'],
    ['Acerca de', '#nosotros', 'Misión y valores'],
    ['Equipo', '#equipo', 'Quiénes están detrás de BiblioHub'],
    ['Contacto', '#contacto', 'Correo, teléfonos y redes'],
  ];
  const MODAL_PAGES = [
    ['Hábitos de lectura', 'habits'], ['Biblioteca digital', 'digital'], ['Guías de investigación', 'guides'], ['Genealogía y archivos', 'genealogy'],
    ['Cierres por feriados', 'closures'], ['Visitas guiadas', 'tours'], ['Computadoras y tecnología', 'computers'], ['Impresión', 'print'],
    ['Empleos y carreras', 'careers'], ['Voluntariado', 'volunteer'], ['Apoya a la biblioteca', 'support'], ['Políticas y reglas', 'policies'],
    ['Reservar una sala', 'rooms'], ['Obtener un carnet', 'card'], ['Pregunte a un bibliotecario', 'help'], ['Contáctenos', 'contact'], ['Más para pedir prestado', 'borrow'], ['Recibir novedades', 'newsletter'],
  ];
  function siteIndex() {
    const items = [];
    SECTIONS.forEach(([t, id, d]) => items.push({ t, d, attr: `data-go="${id}"`, kind: 'Sección' }));
    MODAL_PAGES.forEach(([t, k]) => items.push({ t, d: 'Información y trámites', attr: `data-modal="${k}"`, kind: 'Página' }));
    EVENTS.forEach((e, i) => items.push({ t: e.title, d: fmtDate(nextDate(e)), attr: `data-event="${i}"`, kind: 'Evento' }));
    (window.BiblioNav || []).forEach((n) => n.groups.forEach((g) => g.links.forEach(([l, tg]) => items.push({ t: l, d: n.label + ' · ' + g.title, attr: window.targetAttrs(tg).replace(/href="[^"]*"\s*/, ''), kind: 'Menú' }))));
    return items;
  }
  const SEARCH = { scope: 'catalog', q: '', cat: '' };

  function searchResults() {
    const q = norm(SEARCH.q.trim());
    const tokens = q.split(/\s+/).filter(Boolean);
    if (SEARCH.scope === 'catalog') {
      let books = allBooks();
      if (SEARCH.cat) books = books.filter((b) => b.cat === SEARCH.cat);
      if (tokens.length) books = books.filter((b) => { const hay = norm(`${b.title} ${b.author} ${b.cat}`); return tokens.every((t) => hay.includes(t)); });
      else books = books.sort((a, b) => (b.copies > 0) - (a.copies > 0));
      return books;
    }
    const idx = siteIndex();
    if (!tokens.length) return idx.filter((x) => x.kind === 'Sección' || x.kind === 'Evento');
    const seen = new Set();
    return idx.filter((x) => {
      const hay = norm(`${x.t} ${x.d}`);
      const ok = tokens.every((t) => hay.includes(t));
      const key = x.t + x.attr;
      if (!ok || seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 40);
  }

  function renderResults() {
    const box = $('#search-results'); if (!box) return;
    const res = searchResults();
    const count = $('#search-count');
    if (SEARCH.scope === 'catalog') {
      box.innerHTML = res.length ? res.map((b) => `
        <li><button type="button" class="result" data-book="${b.shelf}:${b.i}">
          <span class="thumb" style="background-image:url('${esc(b.cover)}')"></span>
          <span class="result__main"><b>${esc(b.title)}</b><small>${esc(b.author)} · ${b.year || 's. f.'} · ${esc(b.cat)}</small></span>
          <span class="result__status ${b.copies > 0 ? 'ok' : 'no'}">${b.copies > 0 ? 'Disponible' : 'Prestado'}</span>
        </button></li>`).join('') : `<li class="empty"><b>Sin resultados</b><p>Prueba con otro título, autor o categoría.</p></li>`;
    } else {
      box.innerHTML = res.length ? res.map((x) => `
        <li><button type="button" class="result" ${x.attr}>
          <span class="result__kind">${esc(x.kind)}</span>
          <span class="result__main"><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span>
          <svg viewBox="0 0 24 24"><use href="#i-arrow"/></svg>
        </button></li>`).join('') : `<li class="empty"><b>Sin resultados</b><p>Prueba con otras palabras clave.</p></li>`;
    }
    if (count) count.textContent = `${res.length} ${res.length === 1 ? 'resultado' : 'resultados'}`;
  }

  function openSearch({ scope = 'catalog', q = '', cat = '' } = {}) {
    SEARCH.scope = scope; SEARCH.q = q; SEARCH.cat = cat;
    const cats = ['', ...SHELVES().map((s) => s.title)];
    const draw = () => {
      openModal(`${head('Buscar en BiblioHub', '')}
        <form class="searchform" role="search">
          <div class="seg" role="tablist">
            <button type="button" role="tab" class="${SEARCH.scope === 'catalog' ? 'on' : ''}" data-scope="catalog">Catálogo</button>
            <button type="button" role="tab" class="${SEARCH.scope === 'website' ? 'on' : ''}" data-scope="website">Sitio web</button>
          </div>
          <label class="searchform__input"><svg viewBox="0 0 24 24"><use href="#i-search"/></svg>
            <input id="search-input" type="search" autocomplete="off" placeholder="${SEARCH.scope === 'catalog' ? 'Título, autor o categoría…' : 'Secciones, servicios, eventos…'}" value="${esc(SEARCH.q)}" autofocus>
          </label>
          ${SEARCH.scope === 'catalog' ? `<div class="chips">${cats.map((c) => `<button type="button" class="chipf ${SEARCH.cat === c ? 'on' : ''}" data-cat-filter="${esc(c)}">${c ? esc(c) : 'Todas'}</button>`).join('')}</div>` : ''}
          <p class="search-count" id="search-count" aria-live="polite"></p>
        </form>
        <ul class="results" id="search-results"></ul>`, { wide: true, focus: false });
      const input = $('#search-input');
      let t;
      input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { SEARCH.q = input.value; renderResults(); }, 100); });
      $('.searchform').addEventListener('submit', (e) => { e.preventDefault(); SEARCH.q = input.value; renderResults(); });
      renderResults();
      setTimeout(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 60);
    };
    draw();
    // cambio de ámbito o de filtro (delegado en el modal)
    window.__searchRedraw = draw;
  }

  /* ---------- Navegación interna ---------- */
  function goTo(id) {
    const el = $(id);
    if (!el) return;
    if (window.closeAllMenus) window.closeAllMenus();
    if (window.closeTopSearch) window.closeTopSearch();
    closeModal();
    if (id === '#contacto') {   // el footer es una cortina fija: se llega bajando hasta el final
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- Delegación de eventos ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const q = (sel) => t.closest(sel);
    let el;

    if ((el = q('[data-scope]')) && dlg.contains(el)) { SEARCH.scope = el.dataset.scope; SEARCH.cat = ''; window.__searchRedraw(); return; }
    if ((el = q('[data-cat-filter]'))) { SEARCH.cat = el.dataset.catFilter; window.__searchRedraw(); return; }

    if ((el = q('[data-ics]'))) {
      e.preventDefault();
      if (el.dataset.ics.startsWith('reserve:')) {
        const rec = state.reserves.find((x) => x.code === el.dataset.ics.slice(8));
        if (rec) { const d = rec.pick.replace(/-/g, ''); const n = new Date(rec.pick); n.setDate(n.getDate() + 3); downloadICS('reserva-libro', [`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${ymd(n)}`, `SUMMARY:Retirar "${rec.title}" (${rec.code})`, `LOCATION:BiblioHub · ${rec.sede}`, 'DESCRIPTION:Presenta tu carnet. Te guardamos el libro 3 días.']); }
      } else if (el.dataset.ics === 'room' && window.__lastRoom) {
        const r = window.__lastRoom; const [h, m] = r.hora.split(':'); const day = r.fecha.replace(/-/g, '');
        const end = String(Number(h) + 1).padStart(2, '0');
        downloadICS('reserva-bibliohub', [`DTSTART:${day}T${h}${m}00`, `DTEND:${day}T${end}${m}00`, `SUMMARY:${r.tipo} · ${r.sede}`, 'LOCATION:BiblioHub']);
      } else {
        const ev = EVENTS[Number(el.dataset.ics)]; const d = nextDate(ev); const n = new Date(d); n.setDate(n.getDate() + 1);
        downloadICS('bibliohub-evento', [`DTSTART;VALUE=DATE:${ymd(d)}`, `DTEND;VALUE=DATE:${ymd(n)}`, `SUMMARY:${ev.title}`, `DESCRIPTION:${ev.text}`, 'RRULE:FREQ=YEARLY']);
      }
      toast('Archivo de calendario descargado');
      return;
    }

    if ((el = q('[data-read]'))) {
      e.preventDefault();
      const [s, i] = el.dataset.read.split(':'); readBook(s, Number(i)); return;
    }
    if ((el = q('[data-soon]'))) {
      e.preventDefault();
      const [s, i] = el.dataset.soon.split(':'); const r = bookOf(s, Number(i)); if (!r) return;
      openModal(`<div class="success"><span class="success__icon"><svg viewBox="0 0 24 24"><path d="M4 5h7a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4zM20 5h-7a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h8z" fill="#fff"/></svg></span>${head('Lo estamos digitalizando', `<b>${esc(r.b[0])}</b> todavía no tiene versión online. Mientras la preparamos, puedes reservar el ejemplar físico y retirarlo en la sede.`)}<div class="modal__actions">${btn('Volver al libro', `data-book="${s}:${i}"`)}${btn('Cerrar', 'data-close', 'btn--outline')}</div></div>`, { focus: false });
      return;
    }
    if ((el = q('[data-rate]'))) { e.preventDefault(); rate(Number(el.dataset.rate)); return; }
    if ((el = q('[data-reserve]'))) { e.preventDefault(); const [s, i] = el.dataset.reserve.split(':'); openReserve(s, Number(i)); return; }
    if (q('[data-resume]')) { e.preventDefault(); const f = pendingAction; pendingAction = null; closeModal(); if (f) f(); return; }
    if ((el = q('[data-cancel-reserve]'))) {
      e.preventDefault();
      const rec = cancelReserve(el.dataset.cancelReserve);
      if (rec && viewing && viewing.shelf === rec.shelf && viewing.i === rec.i && dlg.querySelector('.bookview')) openBook(rec.shelf, rec.i); else openAccount();
      return;
    }
    if ((el = q('[data-wait]'))) {
      const [s, i] = el.dataset.wait.split(':'); const r = bookOf(s, Number(i));
      state.waits.push({ shelf: s, i: Number(i), title: r.b[0] }); save(); toast('Te avisaremos cuando esté disponible'); openBook(s, Number(i)); return;
    }
    if ((el = q('[data-unwait-book]'))) {
      const [s, i] = el.dataset.unwaitBook.split(':');
      state.waits = state.waits.filter((w) => !(w.shelf === s && w.i === Number(i))); save(); openBook(s, Number(i)); return;
    }
    if ((el = q('[data-unwait]'))) { state.waits.splice(Number(el.dataset.unwait), 1); save(); openAccount(); return; }
    if (q('[data-logout]')) { state.user = null; state.card = null; save(); paintAccount(); toast('Sesión cerrada', 'info'); closeModal(); return; }

    if ((el = q('[data-person]'))) { e.preventDefault(); closeAllSafe(); openPerson(Number(el.dataset.person)); return; }

    if ((el = q('[data-event]'))) { e.preventDefault(); closeAllSafe(); openEvent(Number(el.dataset.event)); return; }

    if ((el = q('[data-book]'))) {
      if (e.defaultPrevented) return;
      e.preventDefault(); closeAllSafe();
      const [s, i] = el.dataset.book.split(':'); openBook(s, Number(i)); return;
    }

    if ((el = q('[data-open-search]'))) {
      e.preventDefault(); closeAllSafe();
      openSearch({ scope: el.dataset.openSearch === 'website' ? 'website' : 'catalog', q: el.dataset.q || '', cat: el.dataset.cat || '' }); return;
    }

    if ((el = q('[data-modal]'))) {
      e.preventDefault(); closeAllSafe();
      const key = el.dataset.modal; const o = { subject: el.dataset.subject };
      if (key === 'account') return openAccount();
      if (key === 'branches') return openBranches();
      if (FORMS[key]) return FORMS[key](o);
      if (INFO[key]) return openModal(INFO[key](), { wide: ['digital', 'guides', 'borrow', 'computers', 'support', 'careers'].includes(key), focus: false });
      return;
    }

    if ((el = q('[data-go]'))) {
      const id = el.dataset.go;
      if (id && id.startsWith('#') && $(id)) { e.preventDefault(); goTo(id); }
      return;
    }

    const a = t.closest('a[href^="#"]');
    if (a && a.getAttribute('href').length > 1 && $(a.getAttribute('href'))) { e.preventDefault(); goTo(a.getAttribute('href')); }
  });
  function closeAllSafe() {
    if (window.closeAllMenus) window.closeAllMenus();
    if (window.closeTopSearch) window.closeTopSearch();
  }

  /* ---------- Formularios de la página ---------- */
  $('#finder-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const scope = e.submitter && e.submitter.dataset.target === 'website' ? 'website' : 'catalog';
    const input = $('#finder-input');
    openSearch({ scope, q: input.value.trim() });
  });
  $('#branch-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const zip = $('#branch-zip').value.trim();
    if (!zip) { $('#branch-zip').focus(); toast('Ingresa tu código postal', 'info'); return; }
    openBranches(zip);
  });

  /* ---------- Accesibilidad ---------- */
  const A11Y = { contrast: 'a11y-contrast', font: 'a11y-font', links: 'a11y-links', motion: 'a11y-motion' };
  const a11y = store.get('bh_a11y', {});
  function paintA11y() {
    Object.entries(A11Y).forEach(([k, cls]) => html.classList.toggle(cls, !!a11y[k]));
    $$('[data-a11y]').forEach((b) => { const k = b.dataset.a11y; if (A11Y[k]) b.setAttribute('aria-pressed', String(!!a11y[k])); });
  }
  $$('[data-a11y]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.a11y;
    if (k === 'reset') Object.keys(A11Y).forEach((x) => { a11y[x] = false; }); else a11y[k] = !a11y[k];
    store.set('bh_a11y', a11y); paintA11y();
  }));
  paintA11y();

  /* ---------- Contadores animados ---------- */
  const counters = $$('[data-count]');
  const run = (el) => {
    const end = Number(el.dataset.count); const plus = el.dataset.plus || ''; const t0 = performance.now(); const dur = 1700;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur); const v = Math.round(end * (1 - Math.pow(1 - p, 4)));
      el.textContent = v.toLocaleString('es-AR') + (p === 1 ? plus : '');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } }), { threshold: 0.5 });
    counters.forEach((c) => io.observe(c));
  } else counters.forEach((c) => { c.textContent = Number(c.dataset.count).toLocaleString('es-AR') + (c.dataset.plus || ''); });

  /* ---------- Sección activa en el menú + botón "arriba" ---------- */
  const SPY = [['#catalogo', ['catalogo', 'ficcion', 'ciencia', 'historia', 'infantil']], ['#eventos', ['eventos']], ['#sedes', ['sedes']], ['#servicios', ['servicios']], ['#investigacion', ['investigacion']], ['#nosotros', ['nosotros', 'equipo']]];
  const spyEls = SPY.flatMap(([key, ids]) => ids.map((id) => ({ key, el: document.getElementById(id) }))).filter((x) => x.el);
  const toTop = $('#to-top');
  function spy() {
    const y = window.scrollY + window.innerHeight * 0.35;
    let cur = null;
    spyEls.forEach(({ key, el }) => { const r = el.getBoundingClientRect(); const top = r.top + window.scrollY; if (y >= top && y < top + r.height) cur = key; });
    $$('.mainnav__btn').forEach((a) => a.classList.toggle('is-current', a.dataset.go === cur));
    toTop.classList.toggle('show', window.scrollY > 700);
  }
  window.addEventListener('scroll', () => requestAnimationFrame(spy), { passive: true });

  /* ---------- Inclinación 3D del equipo ---------- */
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine) {
    $$('.person').forEach((p) => {
      const st = p.querySelector('.person__stage');
      p.addEventListener('pointermove', (e) => {
        const r = p.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        st.classList.add('is-moving');
        st.style.setProperty('--ry', (x * 18).toFixed(2) + 'deg');
        st.style.setProperty('--rx', (-y * 14).toFixed(2) + 'deg');
        st.style.setProperty('--px', (x * -22).toFixed(1) + 'px');
        st.style.setProperty('--py', (y * -10).toFixed(1) + 'px');
        st.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(0) + '%');
      });
      p.addEventListener('pointerleave', () => {
        st.classList.remove('is-moving');
        ['--ry', '--rx', '--px', '--py'].forEach((k) => st.style.removeProperty(k));
      });
    });
  }

  /* ---------- Inicio ---------- */
  window.Biblio = Object.assign(window.Biblio || {}, { openSearch, openBranches, toast });
  paintAccount();
  applyReserves();
  spy();
});
