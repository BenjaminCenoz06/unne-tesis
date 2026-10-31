/* =========================================================
   BiblioHub · chat de ayuda
   Asistente sencillo por reglas (no usa inteligencia artificial ni envía
   lo que se escribe a ningún servidor). Responde las dudas más comunes,
   ayuda a resolver problemas y deriva a una persona por WhatsApp.
   Los botones de las respuestas usan los mismos atributos que el resto del
   sitio (data-modal, data-go, data-open-search), así que abren sus ventanas.
   ========================================================= */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CLOUD = window.BiblioCloud;

  /* ---------- datos editables desde el panel (con valores de respaldo) ---------- */
  const cfg = {
    wa: '5493786403914',
    waMsg: 'Hola BiblioHub, quisiera hacer una consulta.',
    label: 'Chatea con nosotros',
    welcome: '¡Hola! Soy el asistente de BiblioHub. Cuéntame qué necesitas o elige un tema.',
    email: 'contacto@bibliohub.org',
    waLabel: '3786 403914',
    phones: ['(+54-11) 4000-0000', '(+54-11) 4000-0002'],
  };
  const DEFAULT_BRANCHES = [
    { name: 'Sede Central', addr: 'Av. de la Libertad 1234', hours: 'Lun–Vie 9–20 · Sáb 10–18' },
    { name: 'Sede Norte', addr: 'Calle Los Olivos 450', hours: 'Lun–Vie 10–19 · Sáb 10–15' },
    { name: 'Sede Sur', addr: 'Av. del Parque 980', hours: 'Lun–Vie 10–19 · Sáb 10–14' },
  ];
  const branches = () => (CLOUD && Array.isArray(CLOUD.data.branches) && CLOUD.data.branches.length ? CLOUD.data.branches : DEFAULT_BRANCHES);

  function loadSettings() {
    if (!CLOUD) return;
    const get = (k, d) => CLOUD.setting(k, d);
    const wa = String(get('contact_whatsapp', cfg.wa)).replace(/\D/g, '');
    if (/^\d{8,15}$/.test(wa)) cfg.wa = wa;
    cfg.waMsg = String(get('wa_message', cfg.waMsg)).slice(0, 160);
    cfg.label = String(get('wa_label', cfg.label)).slice(0, 50);
    cfg.welcome = String(get('chat_welcome', cfg.welcome)).slice(0, 200);
    const mail = String(get('contact_email', cfg.email));
    if (/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(mail)) cfg.email = mail;
    cfg.waLabel = String(get('contact_whatsapp_label', cfg.waLabel)).slice(0, 60);
    ['contact_phone1', 'contact_phone2'].forEach((k, i) => { const v = String(get(k, '')); if (/^[\d\s()+\-]{6,30}$/.test(v)) cfg.phones[i] = v; });
  }

  /* ---------- estructura ---------- */
  const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8c-.9-.4-1.7-1.2-2.1-2.1l.8-1-1-2z"/></svg>';
  const root = document.createElement('div');
  root.innerHTML = `
    <button class="chat-fab" id="chat-fab" type="button" aria-label="Abrir el chat de ayuda" aria-expanded="false" aria-controls="chat">
      <span class="chat-fab__pulse" aria-hidden="true"></span>
      <img class="chat-fab__logo" src="images/logo-icon.png" alt="" width="64" height="61">
      <svg class="chat-fab__x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      <span class="chat-fab__label"></span>
    </button>
    <section class="chat" id="chat" role="dialog" aria-modal="false" aria-labelledby="chat-title" hidden>
      <header class="chat__head">
        <img class="chat__logo" src="images/logo-icon-white.png" alt="" width="34" height="32">
        <div class="chat__who"><b id="chat-title">Asistente BiblioHub</b><span><i aria-hidden="true"></i>En línea · responde al instante</span></div>
        <button class="chat__close" type="button" aria-label="Cerrar el chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </header>
      <a class="chat__wa" id="chat-wa" target="_blank" rel="noopener noreferrer" href="#">
        ${WA_ICON}<span><b>Seguir hablando por WhatsApp</b><small>Te atiende una persona</small></span>
        <svg class="chat__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
      <div class="chat__log" id="chat-log" role="log" aria-live="polite" aria-relevant="additions"></div>
      <form class="chat__form" id="chat-form" autocomplete="off">
        <input id="chat-input" type="text" maxlength="200" placeholder="Escribe tu consulta…" aria-label="Escribe tu consulta">
        <button type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 17-3-7z"/></svg></button>
      </form>
      <p class="chat__foot">Asistente automático. Para algo más, te atiende una persona por WhatsApp.</p>
    </section>`;
  document.body.append(...root.children);

  const fab = $('#chat-fab');
  const panel = $('#chat');
  const log = $('#chat-log');
  const form = $('#chat-form');
  const input = $('#chat-input');
  const waLink = $('#chat-wa');
  let started = false;
  let lastQuestion = '';
  let misses = 0;

  const waHref = (extra = '') => {
    // si el botón trae un tema ("Un libro no me abre") se le suma lo que la persona escribió
    const ctx = extra && lastQuestion && extra !== lastQuestion ? `${extra} — "${lastQuestion}"` : extra ? extra : lastQuestion;
    const text = `${cfg.waMsg} (Vengo del chat de la web${ctx ? `: ${ctx.startsWith('"') || ctx.includes(' — "') ? ctx : `"${ctx}"`}` : ''}.)`.slice(0, 380);
    return `https://wa.me/${cfg.wa}?text=${encodeURIComponent(text)}`;
  };
  const refreshWa = () => { waLink.href = waHref(); };

  /* ---------- respuestas ---------- */
  const A = (label, attr, val, kind) => ({ label, attr, val, kind });
  const go = (label, id) => A(label, 'data-go', id);
  const modal = (label, key) => A(label, 'data-modal', key);
  const search = (label, scope = 'catalog') => A(label, 'data-open-search', scope);
  const wa = (label = 'Escribir por WhatsApp', extra) => ({ label, kind: 'wa', extra });
  const MENU = ['carnet', 'leer', 'reservar', 'sedes', 'problemas', 'humano'];

  const INTENTS = {
    saludo: { keys: ['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'que tal'], text: () => '¡Hola! ¿En qué puedo ayudarte hoy?', chips: MENU },
    gracias: { keys: ['gracias', 'muchas gracias', 'genial', 'perfecto', 'excelente', 'me sirvio'], text: () => '¡De nada! Si necesitas algo más, aquí estoy.', chips: MENU },
    menu: { keys: ['menu', 'opciones', 'temas', 'que puedes hacer', 'que haces', 'para que sirves'], text: () => 'Puedo ayudarte con estos temas:', chips: MENU },
    carnet: {
      chip: 'Sacar mi carnet', keys: ['carnet', 'credencial', 'socio', 'asociarme', 'hacerme socio', 'registrarme', 'inscribirme', 'crear cuenta', 'sacar carnet', 'tarjeta de biblioteca'],
      text: () => 'El carnet es <b>gratuito</b> y lo obtienes al instante desde esta página: completas tu nombre y correo (el documento es opcional) y listo.<br><br>Con él puedes <b>reservar libros</b>, <b>guardar tu progreso de lectura</b> y retirar ejemplares en las sedes.',
      acts: [modal('Obtener mi carnet', 'card'), modal('Ya tengo cuenta', 'account')], chips: ['leer', 'reservar'],
    },
    leer: {
      chip: 'Leer un libro', keys: ['leer', 'lectura', 'leo', 'como se lee', 'abrir un libro', 'leer online', 'leer en linea', 'ver un libro', 'pdf', 'libro digital', 'online', 'en linea'],
      text: () => 'Leer en línea es muy fácil:<ol><li>Elige un libro en el <b>catálogo</b>.</li><li>Toca el libro del centro del estante (o su lomo).</li><li>Pulsa <b>«Leer ahora»</b>.</li></ol>Se abre como un libro de verdad: pasa las páginas con las flechas, con un clic o arrastrando una esquina. <b>Tu progreso se guarda solo.</b>',
      acts: [go('Ir al catálogo', '#catalogo'), search('Buscar un libro')], chips: ['problemas', 'calificar'],
    },
    reservar: {
      chip: 'Reservar un libro', keys: ['reserv', 'apartar', 'guardar un libro', 'retirar', 'retiro', 'lista de espera', 'quiero un libro', 'pedir un libro'],
      text: () => 'Puedes reservar <b>hasta 3 libros</b>. Eliges la sede y la fecha de retiro y recibes un <b>código (RS-…)</b>.<br><br>Te guardamos el ejemplar <b>3 días</b>: retíralo presentando tu carnet. Si un libro no tiene ejemplares, puedes sumarte a la <b>lista de espera</b>.<br><br>Para reservar necesitas tener tu carnet o iniciar sesión.',
      acts: [search('Buscar un libro'), modal('Mi cuenta', 'account'), modal('Obtener mi carnet', 'card')], chips: ['prestamo', 'sedes'],
    },
    prestamo: {
      chip: 'Plazos de préstamo', keys: ['prestamo', 'prestar', 'plazo', 'devolver', 'devolucion', 'renov', 'cuantos libros', 'cuanto tiempo', 'mora', 'multa', '21 dias', 'llevar'],
      text: () => 'Puedes llevar <b>hasta 5 libros por 21 días</b>, renovables <b>dos veces por 14 días</b> si no tienen reservas.<br><br>La mora <b>no genera multas</b>: solo suspende nuevos préstamos hasta que devuelvas el material.',
      acts: [modal('Ver políticas completas', 'policies')], chips: ['reservar', 'sedes'],
    },
    sedes: {
      chip: 'Sedes y horarios', keys: ['sede', 'sucursal', 'horario', 'direccion', 'donde estan', 'ubicacion', 'abren', 'cierran', 'como llegar', 'mapa', 'cerca', 'atienden', 'hora'],
      text: () => `Estas son nuestras sedes:<ul>${branches().map((b) => `<li><b>${esc(b.name)}</b><br>${esc(b.addr || '')}${b.hours ? `<br><span class="chat__muted">${esc(b.hours)}</span>` : ''}</li>`).join('')}</ul>`,
      acts: [modal('Ver sedes y cómo llegar', 'branches'), go('Buscar la más cercana', '#sedes')], chips: ['salas', 'contacto'],
    },
    buscar: {
      chip: 'Buscar un libro', keys: ['buscar', 'encontrar', 'busco', 'catalogo', 'titulo', 'autor', 'categoria', 'tienen el libro', 'tienen libros', 'hay libros', 'libros de'],
      text: () => 'Escribe el <b>título, autor o categoría</b> en el buscador de la portada («¿Qué podemos ayudarle a encontrar?»). También puedes filtrar por categoría y ver si el libro está <b>disponible</b>.',
      acts: [search('Buscar en el catálogo'), search('Buscar en todo el sitio', 'website')], chips: ['leer', 'reservar'],
    },
    cuenta: {
      chip: 'Mi cuenta', keys: ['mi cuenta', 'cuenta', 'sesion', 'iniciar sesion', 'login', 'contrasena', 'clave', 'olvide', 'perfil', 'cerrar sesion', 'mis reservas'],
      text: () => 'Tu cuenta y tu carnet se guardan <b>en este navegador</b>. Entra en <b>«Mi cuenta»</b> para ver tus reservas, tu lista de espera y los libros que estás leyendo.<br><br>Si cambiaste de dispositivo o de navegador, vuelve a crear el carnet: es gratis y tarda un minuto.',
      acts: [modal('Abrir Mi cuenta', 'account'), modal('Obtener mi carnet', 'card')], chips: ['problemas'],
    },
    calificar: {
      chip: 'Calificar un libro', keys: ['calific', 'estrella', 'puntuar', 'puntaje', 'votar', 'valorar', 'resena', 'nota del libro'],
      text: () => 'Cada libro muestra el <b>promedio de Open Library</b>. Para dar tu voto, abre la ficha del libro y toca las <b>estrellas (1 a 5)</b>.',
      acts: [go('Ir al catálogo', '#catalogo')], chips: ['leer'],
    },
    salas: {
      chip: 'Reservar una sala', keys: ['sala', 'salas', 'estudiar', 'sala de estudio', 'espacio para', 'grupo de estudio'],
      text: () => 'Puedes reservar una <b>sala de estudio</b> eligiendo sede, fecha, hora y cantidad de personas. Recibes la confirmación al instante.',
      acts: [modal('Reservar una sala', 'rooms')], chips: ['sedes'],
    },
    eventos: {
      chip: 'Eventos y fechas', keys: ['evento', 'eventos', 'efemeride', 'fecha', 'actividad', 'actividades', 'taller', 'club de lectura', 'celebr', 'calendario'],
      text: () => 'En <b>«Fechas para celebrar la literatura»</b> ves las próximas celebraciones y puedes <b>añadirlas a tu calendario</b>.',
      acts: [go('Ver eventos', '#eventos')], chips: ['sedes'],
    },
    imprimir: {
      chip: 'Impresión', keys: ['imprim', 'impresion', 'fotocopia', 'escanear', 'escaner'],
      text: () => 'Mira cómo funciona el servicio de impresión en las sedes:',
      acts: [modal('Ver impresión', 'print')], chips: ['sedes'],
    },
    computadoras: {
      chip: 'Computadoras', keys: ['computadora', 'computadoras', 'compu', 'internet', 'wifi', 'wi fi'],
      text: () => 'Mira la información de computadoras e internet en las sedes:',
      acts: [modal('Ver computadoras', 'computers')], chips: ['sedes'],
    },
    donar: {
      chip: 'Donar o ser voluntario', keys: ['donar', 'donacion', 'voluntari', 'colaborar', 'apoyar', 'ayudar a la biblioteca', 'amigo de la biblioteca'],
      text: () => 'Aceptamos <b>libros en buen estado</b> de lunes a viernes en todas las sedes, y buscamos <b>voluntarios</b> para talleres y clubes de lectura. ¡Gracias por sumarte!',
      acts: [modal('Apoyar a la biblioteca', 'support'), modal('Quiero ser voluntario', 'volunteer')], chips: ['sedes'],
    },
    accesibilidad: {
      chip: 'Accesibilidad', keys: ['accesib', 'contraste', 'letra grande', 'discapacidad', 'braille', 'silla de ruedas', 'daltonic', 'vista', 'ver mejor'],
      text: () => 'En la barra superior está <b>«Accesibilidad»</b>: alto contraste, tipografía legible, subrayado de enlaces y reducción de animaciones.<br><br>Las sedes tienen acceso para sillas de ruedas y material en braille y letra grande.',
      acts: [modal('Ver políticas', 'policies')], chips: ['problemas'],
    },
    gratis: {
      chip: 'Costos', keys: ['gratis', 'gratuito', 'costo', 'precio', 'cuanto cuesta', 'pagar', 'cobran', 'sale plata'],
      text: () => 'El <b>carnet</b> y la <b>lectura en línea</b> son <b>gratuitos</b>.',
      acts: [modal('Obtener mi carnet', 'card')], chips: ['leer'],
    },
    contacto: {
      chip: 'Contacto', keys: ['contacto', 'contactar', 'correo', 'mail', 'email', 'escribir', 'mensaje', 'comunicarme', 'telefono', 'llamar', 'numero'],
      text: () => `Puedes comunicarte por:<ul><li><b>Correo:</b> ${esc(cfg.email)}</li><li><b>WhatsApp:</b> ${esc(cfg.waLabel)}</li><li><b>Teléfono:</b> ${esc(cfg.phones[0])} · ${esc(cfg.phones[1])}</li></ul>`,
      acts: [modal('Escribir un mensaje', 'contact'), wa('Abrir WhatsApp')], chips: ['sedes'],
    },
    humano: {
      chip: 'Hablar con una persona', keys: ['persona', 'humano', 'agente', 'asesor', 'bibliotecario', 'bibliotecaria', 'hablar con', 'whatsapp', 'wasap', 'wsp', 'atencion al cliente', 'alguien'],
      text: () => 'Claro, te atiende <b>una persona por WhatsApp</b>. Al tocar el botón se abre la conversación con el tema de tu consulta ya escrito.',
      acts: [wa('Seguir por WhatsApp')], chips: ['menu'],
    },
    problemas: {
      chip: 'Algo no funciona', keys: ['problema', 'no funciona', 'no anda', 'falla', 'error', 'roto', 'ayuda', 'no puedo', 'no me deja', 'se rompio', 'bug', 'no responde'],
      text: () => 'Lamento el inconveniente. ¿Qué te pasa?',
      subchips: ['prob_pdf', 'prob_carnet', 'prob_reserva', 'prob_visual'], chips: ['humano'],
    },
    prob_pdf: {
      chip: 'No abre un libro', keys: ['no abre', 'no se abre', 'no carga', 'no puedo leer', 'pdf no', 'libro no', 'se queda cargando', 'pantalla en blanco', 'no se ve el libro', 'no abre el libro', 'no leer'],
      text: () => 'Si el libro no abre, prueba esto en orden:<ol><li>Revisa tu <b>conexión a internet</b>.</li><li>Recarga la página con <b>Ctrl + F5</b> (en el celular, cierra y vuelve a abrir el navegador).</li><li>Prueba con otro navegador actualizado (Chrome, Edge o Firefox).</li><li>En el lector usa <b>«Abrir el PDF en una pestaña nueva»</b> o el botón de descarga.</li></ol>Si sigue fallando, escríbenos con el nombre del libro.',
      acts: [wa('Avisar por WhatsApp', 'Un libro no me abre')], chips: ['problemas'],
    },
    prob_carnet: {
      chip: 'No puedo crear el carnet', keys: ['no puedo crear', 'no me deja crear', 'no puedo sacar', 'carnet no', 'no se guarda', 'no me guarda', 'no puedo registrarme'],
      text: () => 'Para crear el carnet completa un <b>nombre y un correo válidos</b> (el documento es opcional).<br><br>Si usas una <b>ventana privada</b> o tu navegador bloquea el almacenamiento, el carnet puede no guardarse: ábrelo en una ventana normal. Además, el carnet queda guardado <b>en este dispositivo</b>; si cambias de navegador tendrás que crearlo de nuevo.',
      acts: [modal('Probar de nuevo', 'card'), wa('Avisar por WhatsApp', 'No puedo crear mi carnet')], chips: ['problemas'],
    },
    prob_reserva: {
      chip: 'No me deja reservar', keys: ['no puedo reservar', 'no me deja reservar', 'reserva no', 'no reserva', 'no puedo apartar'],
      text: () => 'Revisa estos puntos:<ul><li>Necesitas haber <b>iniciado sesión</b> o tener tu carnet.</li><li>El máximo es de <b>3 reservas activas</b>: cancela una desde «Mi cuenta» para hacer otra.</li><li>Si el libro no tiene ejemplares, súmate a la <b>lista de espera</b>.</li></ul>',
      acts: [modal('Abrir Mi cuenta', 'account'), wa('Avisar por WhatsApp', 'No puedo reservar un libro')], chips: ['problemas'],
    },
    prob_visual: {
      chip: 'La página se ve mal', keys: ['se ve mal', 'se ven mal', 'se ve rar', 'se ve feo', 'se ve cortad', 'se ve desorden', 'pagina rota', 'pagina fea', 'no se ve bien', 'lenta', 'lento', 'tarda', 'se traba', 'desordenada'],
      text: () => 'Prueba recargar con <b>Ctrl + F5</b>. En «Accesibilidad» (barra superior) puedes activar <b>reducir animaciones</b>, que ayuda en equipos lentos.<br><br>Si algo se ve roto, cuéntanos qué <b>navegador y dispositivo</b> usas.',
      acts: [wa('Avisar por WhatsApp', 'Algo se ve mal en la página')], chips: ['problemas'],
    },
  };
  const CHIP = Object.fromEntries(Object.entries(INTENTS).filter(([, v]) => v.chip).map(([k, v]) => [k, v.chip]));
  CHIP.menu = 'Ver otros temas';

  /* ---------- comprensión del texto ---------- */
  // "no me abre", "no puedo reservar", "no me deja"…: se detecta un problema aunque la frase cambie
  const NEG = /\b(no|nunca|ni)\b/;
  const VERB = /\b(abre|abrir|abro|carga|cargar|funciona|funcionan|anda|andan|deja|dejan|puedo|puede|veo|ve|aparece|sale|guarda|guardo|logro|permite)\b/;
  function trouble(n) {
    if (!(NEG.test(n) && VERB.test(n))) return null;
    if (/(reserv|apart|retir)/.test(n)) return 'prob_reserva';
    if (/(carnet|cuenta|registr|socio|sesion)/.test(n)) return 'prob_carnet';
    if (/(libro|pdf|leer|lector|lectura|abre|abrir|carga|cargar)/.test(n)) return 'prob_pdf';
    if (/(pagina|sitio|web|se ve)/.test(n)) return 'prob_visual';
    return 'problemas';
  }

  function match(text) {
    const tr = trouble(norm(text));
    if (tr) return tr;
    const t = ` ${norm(text)} `;
    let best = null, top = 0;
    for (const [id, it] of Object.entries(INTENTS)) {
      let score = 0;
      for (const k of it.keys || []) {
        const key = norm(k);
        // las palabras cortas deben coincidir completas; las raíces largas ("reserv") sirven para cualquier forma
        const hit = key.length <= 4 || key.includes(' ') ? t.includes(` ${key} `) || (key.includes(' ') && t.includes(key)) : t.includes(key);
        if (hit) score += key.length > 5 ? 3 : 1;
      }
      if (score > top) { top = score; best = id; }
    }
    return best;
  }

  /* ---------- pintar mensajes ---------- */
  const scroll = () => { log.scrollTo({ top: log.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }); };
  function bubble(kind, html, isText) {
    const d = document.createElement('div');
    d.className = `chat__msg chat__msg--${kind}`;
    if (isText) d.textContent = html; else d.innerHTML = html;
    log.appendChild(d);
    scroll();
    return d;
  }
  function chipsRow(ids) {
    const row = document.createElement('div');
    row.className = 'chat__chips';
    ids.filter((id) => CHIP[id]).forEach((id) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chat__chip'; b.dataset.say = id; b.textContent = CHIP[id];
      row.appendChild(b);
    });
    return row;
  }
  function actionsRow(acts) {
    const row = document.createElement('div');
    row.className = 'chat__acts';
    acts.forEach((a) => {
      let el;
      if (a.kind === 'wa') {
        el = document.createElement('a');
        el.href = waHref(a.extra); el.target = '_blank'; el.rel = 'noopener noreferrer';
        el.className = 'chat__act chat__act--wa';
        el.innerHTML = `${WA_ICON}<span></span>`;
        el.lastChild.textContent = a.label;
      } else {
        el = document.createElement('button');
        el.type = 'button'; el.className = 'chat__act';
        el.setAttribute(a.attr, a.val);
        el.textContent = a.label;
      }
      row.appendChild(el);
    });
    return row;
  }

  let typingEl = null;
  function typing() {
    typingEl = bubble('bot', '<span class="chat__dots" aria-label="Escribiendo"><i></i><i></i><i></i></span>');
  }

  function answer(id) {
    const it = INTENTS[id];
    const msg = bubble('bot', it.text());
    if (it.acts) msg.appendChild(actionsRow(it.acts));
    const chips = [...(it.subchips || []), ...(it.chips || [])];
    if (chips.length) msg.appendChild(chipsRow(chips));
    scroll();
  }

  function fallback() {
    misses += 1;
    const strong = misses >= 2;
    const msg = bubble('bot', strong
      ? 'Sigo sin entender bien tu consulta. Lo mejor es que te ayude <b>una persona por WhatsApp</b>; también puedes elegir un tema.'
      : 'No estoy seguro de haberte entendido. Elige un tema o cuéntamelo con otras palabras.');
    if (strong) msg.appendChild(actionsRow([wa('Hablar con una persona')]));
    msg.appendChild(chipsRow(MENU));
    scroll();
  }

  function respond(id) {
    typing();
    const wait = reduce ? 0 : 420 + Math.random() * 380;
    setTimeout(() => {
      if (typingEl) { typingEl.remove(); typingEl = null; }
      if (id) { misses = 0; answer(id); } else fallback();
    }, wait);
  }

  function userSays(text, forceId) {
    const clean = String(text).trim().slice(0, 200);
    if (!clean) return;
    bubble('user', clean, true);
    lastQuestion = clean;
    refreshWa();
    respond(forceId || match(clean));
  }

  /* ---------- abrir y cerrar ---------- */
  function start() {
    started = true;
    const m = bubble('bot', esc(cfg.welcome));
    m.appendChild(chipsRow(MENU));
  }
  // el estado "abierto" se lee del botón: no depende de animaciones ni de que la pestaña esté visible
  const isOpen = () => fab.getAttribute('aria-expanded') === 'true';
  function open() {
    loadSettings();
    refreshWa();
    panel.hidden = false;
    void panel.offsetWidth; // fuerza el cálculo de estilos para que la transición de entrada se vea
    panel.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');
    fab.setAttribute('aria-label', 'Cerrar el chat de ayuda');
    fab.classList.add('is-open');
    fab.classList.remove('hint');
    if (!started) start();
    if (matchMedia('(pointer: fine)').matches) setTimeout(() => input.focus({ preventScroll: true }), 60);
  }
  function close(returnFocus = true) {
    panel.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', 'Abrir el chat de ayuda');
    fab.classList.remove('is-open');
    setTimeout(() => { if (!isOpen()) panel.hidden = true; }, reduce ? 0 : 260);
    if (returnFocus) fab.focus({ preventScroll: true });
  }

  fab.addEventListener('click', () => (isOpen() ? close() : open()));
  $('.chat__close', panel).addEventListener('click', () => close());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; userSays(v); });
  log.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-say]');
    if (chip) { userSays(CHIP[chip.dataset.say], chip.dataset.say); return; }
    // en el celular, al abrir una ventana o ir a una sección el chat se cierra para dejarla a la vista
    if (e.target.closest('[data-modal],[data-go],[data-open-search]') && matchMedia('(max-width: 640px)').matches) close(false);
  });

  /* ---------- ajustes y aviso inicial ---------- */
  const applyLabel = () => { loadSettings(); $('.chat-fab__label', fab).textContent = cfg.label; };
  applyLabel();
  refreshWa();
  if (CLOUD) CLOUD.ready.then(() => { applyLabel(); refreshWa(); });

  // una sola invitación suave por visita, sin robar el foco
  setTimeout(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('bh_chat_hint') === '1'; sessionStorage.setItem('bh_chat_hint', '1'); } catch (e) { /* sin sessionStorage */ }
    if (seen || isOpen()) return;
    fab.classList.add('hint');
    setTimeout(() => fab.classList.remove('hint'), 5500);
  }, 7000);
})();
