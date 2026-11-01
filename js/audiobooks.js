/* =========================================================
   BiblioHub · Audiolibros
   Lee en voz alta el texto de los PDF que la biblioteca ya tiene, usando
   las voces del dispositivo (Web Speech API). No genera ni descarga
   archivos de audio: el texto sale del propio libro, página por página.
   ========================================================= */
(() => {
  const root = document.getElementById('audiolibros');
  if (!root) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SUPPORTED = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
  };

  /* Datos medidos de cada PDF: [¿tiene texto digital?, idioma, caracteres promedio por página].
     Los libros nuevos que no estén acá se revisan al abrirlos. */
  const META = {
    'cien-anos-de-soledad': [1, 'es', 4951], 'rayuela': [1, 'es', 1523], 'ficciones': [1, 'es', 3042], 'la-casa-de-los-espiritus': [1, 'es', 3010],
    'pedro-paramo': [1, 'es', 1535], 'el-tunel': [1, 'es', 2855], 'la-sombra-del-viento': [1, 'es', 2399], 'los-detectives-salvajes': [1, 'es', 2147],
    'breve-historia-del-tiempo': [1, 'es', 3095], 'cosmos': [1, 'es', 2460], 'el-gen-egoista': [1, 'es', 3167], 'una-breve-historia-de-casi-todo': [1, 'es', 5248],
    'el-origen-de-las-especies': [1, 'en', 1646], 'astrofisica-para-gente-con-prisa': [1, 'es', 894], 'el-universo-elegante': [1, 'en', 5801], 'la-doble-helice': [0, 'es', 0],
    'sapiens': [1, 'en', 1848], 'armas-germenes-y-acero': [1, 'es', 1935], 'las-venas-abiertas-de-america-latina': [1, 'es', 5009], 'spqr': [1, 'en', 2009],
    'los-origenes-del-totalitarismo': [1, 'es', 5068], 'la-primera-guerra-mundial': [0, 'es', 0], 'history-of-india': [1, 'en', 3100], 'el-mediterraneo': [1, 'es', 2646],
    'el-principito': [1, 'es', 915], 'matilda': [1, 'es', 1226], 'alicia-en-el-pais-de-las-maravillas': [1, 'es', 870], 'harry-potter-y-la-piedra-filosofal': [1, 'es', 3107],
    'charlie-y-la-fabrica-de-chocolate': [1, 'es', 1910], 'peter-pan': [1, 'es', 760], 'el-jardin-secreto': [1, 'es', 2491], 'mujercitas': [1, 'es', 1862],
  };
  const CPM = 950;                         // caracteres por minuto a velocidad 1×
  const RATES = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
  const LANG_NAME = { es: 'Español', en: 'Inglés' };

  const ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
    prevPage: '<svg viewBox="0 0 24 24"><path d="M6 5v14M19 5.5v13L9 12z"/></svg>',
    nextPage: '<svg viewBox="0 0 24 24"><path d="M18 5v14M5 5.5v13L15 12z"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M11 6L4 12l7 6zM20 6l-7 6 7 6z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M13 6l7 6-7 6zM4 6l7 6-7 6z"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M3 5c3-1 6-.6 9 1.5C15 4.5 18 4 21 5v14c-3-1-6-.6-9 1.5C9 18.5 6 18 3 19z"/><path d="M12 6.5v13"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
    speed: '<svg viewBox="0 0 24 24"><path d="M12 14l4-5"/><path d="M4 18a9 9 0 1 1 16 0"/></svg>',
    voice: '<svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4"/></svg>',
    phones: '<svg viewBox="0 0 24 24"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="7" rx="1.8"/><rect x="16.5" y="14" width="4.5" height="7" rx="1.8"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  const B = () => window.Biblio;
  const fmtDur = (min) => {
    if (min < 2) return '1 min';
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60), m = Math.round(min - h * 60);
    return m ? `${h} h ${m} min` : `${h} h`;
  };

  /* ---------- catálogo de audiolibros (sale del mismo catálogo de lectura) ---------- */
  let BOOKS = [];
  function collect() {
    const api = B();
    BOOKS = [];
    if (!api) return;
    api.SHELVES.forEach((sh) => sh.books.forEach((b, i) => {
      if (!b[6]) return;                             // sin PDF no hay nada que narrar
      const slug = b[5];
      const m = META[slug] || [1, 'es', 2400];
      const pages = b[2] || 100;
      BOOKS.push({
        slug, title: b[0], author: b[1], pages, shelf: sh.id, cat: sh.title, i, year: b[8],
        pdf: b[11] || `libros/${slug}.pdf`, cover: api.coverUrl(b), start: b[7] || 1,
        ok: !!m[0], lang: m[1], avg: m[2], minutes: (pages * m[2]) / CPM,
      });
    }));
  }

  /* ---------- estado ---------- */
  const S = {
    book: null, doc: null, page: 1, chunks: [], ci: 0, playing: false, loading: false, started: false, token: 0,
    cache: new Map(), rate: Number(store.get('bh_tts_rate', 1)) || 1, voice: null, voices: [],
    utter: null, timeout: null, timer: null, timerEnd: 0, stopAtPage: false, wake: null, words: [], hl: null,
  };
  // nombre corto y legible de una voz para el botón ("Google español de Estados Unidos" → "Español (EE. UU.)")
  const voiceLabel = (v) => {
    const n = v.name.replace(/^Microsoft |^Google /, '').replace(/ - .*$/, '').replace(/ de Estados Unidos/i, ' (EE. UU.)').replace(/^español/i, 'Español').replace(/^US English/i, 'English (US)');
    return n.length > 18 ? n.slice(0, 17) + '…' : n;
  };
  if (!RATES.includes(S.rate)) S.rate = 1;
  const saved = () => store.get('bh_audio', {});
  function saveProgress() {
    if (!S.book) return;
    const all = saved();
    all[S.book.slug] = { page: S.page, ci: S.ci, t: Date.now() };
    all.__last = S.book.slug;
    store.set('bh_audio', all);
  }

  /* ---------- estructura de la sección ---------- */
  root.innerHTML = `
    <div class="audio__bg" aria-hidden="true"><i class="audio__glow audio__glow--a"></i><i class="audio__glow audio__glow--b"></i></div>
    <div class="container container--narrow audio__inner">
      <header class="audio__head">
        <p class="audio__kicker"><span>${ICON.phones}</span>Audiolibros</p>
        <h2 class="audio__title" id="audio-title">Escucha tus libros,<br><em>donde estés</em></h2>
        <p class="audio__lead">Elige un libro de la biblioteca y deja que te lo lea. Sigues justo donde lo dejaste, ajustas la velocidad y puedes seguir con otra tarea.</p>
        <ul class="audio__stats" id="ab-stats"></ul>
      </header>
      <div class="abp" id="ab-player" aria-label="Reproductor de audiolibros"></div>
      <div class="audio__lib">
        <div class="audio__bar">
          <h3 class="audio__sub">La colección</h3>
          <div class="audio__filters" id="ab-filters" role="group" aria-label="Filtrar por categoría"></div>
        </div>
        <div id="ab-continue"></div>
        <ul class="abgrid" id="ab-grid"></ul>
        <p class="audio__fine">Narración automática con las voces de tu dispositivo: su calidad depende de las voces instaladas (en Edge, Chrome, Android e iPhone suelen ser muy buenas). El texto se toma de los libros de la biblioteca; no se descargan archivos de audio.</p>
      </div>
    </div>`;

  const mini = document.createElement('div');
  mini.className = 'abmini';
  mini.hidden = true;
  mini.innerHTML = `
    <button class="abmini__go" type="button" aria-label="Ir al reproductor"><img alt="" width="40" height="56"><span><b></b><small></small></span></button>
    <button class="abmini__play" type="button" aria-label="Reproducir"></button>
    <button class="abmini__x" type="button" aria-label="Detener y cerrar">${ICON.close}</button>`;
  document.body.appendChild(mini);

  const P = $('#ab-player', root);

  /* ---------- voces ---------- */
  function voiceScore(v, lang) {
    const l = (v.lang || '').toLowerCase().replace('_', '-');
    let s = 0;
    if (lang === 'es') { if (l === 'es-ar') s += 40; else if (l === 'es-mx' || l === 'es-us' || l === 'es-419') s += 30; else if (l === 'es-es') s += 20; else if (l.startsWith('es')) s += 10; }
    else if (l === 'en-us') s += 40; else if (l === 'en-gb') s += 35; else if (l.startsWith('en')) s += 20;
    if (/natural|neural|online/i.test(v.name)) s += 25;
    if (/google/i.test(v.name)) s += 12;
    if (/microsoft/i.test(v.name)) s += 6;
    if (v.localService === false) s += 2;
    return s;
  }
  function loadVoices() {
    if (!SUPPORTED) return;
    S.voices = speechSynthesis.getVoices();
    chooseVoice();
    fillVoiceMenu();
  }
  function chooseVoice() {
    if (!S.book) { S.voice = null; return; }
    const lang = S.book.lang;
    const pool = S.voices.filter((v) => (v.lang || '').toLowerCase().startsWith(lang));
    const prefs = store.get('bh_tts_voice', {});
    S.voice = pool.find((v) => v.voiceURI === prefs[lang]) || pool.sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0] || null;
  }

  /* ---------- extracción y limpieza del texto ---------- */
  const normTxt = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }
  async function ensurePdf() {
    if (!window.pdfjsLib) await loadScript('js/vendor/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
  }
  async function ensureDoc() {
    if (S.doc && S.doc._slug === S.book.slug) return S.doc;
    await ensurePdf();
    const task = window.pdfjsLib.getDocument({ url: S.book.pdf, rangeChunkSize: 524288, disableAutoFetch: true, cMapUrl: 'js/vendor/cmaps/', cMapPacked: true, standardFontDataUrl: 'js/vendor/standard_fonts/' });
    const doc = await task.promise;
    doc._slug = S.book.slug;
    doc._boiler = await detectBoilerplate(doc);          // encabezados y marcas que se repiten en todas las páginas
    if (S.doc) { try { S.doc.destroy(); } catch (e) { /* nada */ } }
    S.doc = doc; S.cache.clear();
    return doc;
  }

  /* ordena los fragmentos de texto de una página en líneas (de arriba hacia abajo) */
  function buildLines(tc) {
    const lines = [];
    // letras capitulares (una letra enorme al inicio del párrafo): se apartan y se pegan a la primera línea
    const sizes = tc.items.filter((i) => i.str && i.str.trim()).map((i) => Math.abs(i.transform[3]) || i.height || 10).sort((a, b) => a - b);
    const medianH = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 10;
    const caps = [];
    const items = tc.items.filter((it) => {
      const h = Math.abs(it.transform[3]) || it.height || 10;
      if (it.str && it.str.trim().length <= 2 && /[A-Za-zÁ-ÿ]/.test(it.str) && h >= medianH * 2.2) { caps.push({ s: it.str.trim(), x: it.transform[4], y: it.transform[5], h }); return false; }
      return true;
    });
    for (const it of items) {
      if (!it.str) continue;
      const y = it.transform[5], x = it.transform[4], h = Math.abs(it.transform[3]) || it.height || 10;
      let ln = lines.find((l) => Math.abs(l.y - y) < h * 0.5);
      if (!ln) { ln = { y, h, items: [] }; lines.push(ln); }
      ln.items.push({ x, w: it.width, s: it.str });
    }
    lines.sort((a, b) => b.y - a.y);
    lines.forEach((ln) => {
      ln.items.sort((a, b) => a.x - b.x);
      let t = '', end = null;
      for (const it of ln.items) {
        if (end !== null && it.x - end > ln.h * 0.15 && !/\s$/.test(t) && !/^\s/.test(it.s)) t += ' ';
        t += it.s; end = it.x + it.w;
      }
      ln.text = t.replace(/\s+/g, ' ').trim();
    });
    for (const c of caps) {
      // la línea más alta de las que arranca la capitular, a su derecha
      const target = lines.filter((l) => l.y >= c.y - c.h * 0.1 && l.y <= c.y + c.h && l.items[0] && l.items[0].x > c.x).sort((a, b) => b.y - a.y)[0];
      if (target) target.text = c.s + target.text;
    }
    return lines;
  }

  const edgeKey = (t) => normTxt(t).replace(/\d+/g, '').trim();
  const edgeLines = (lines) => lines.filter((l, i) => (i < 2 || i >= lines.length - 2) && l.text && l.text.length <= 70);

  // líneas cortas que se repiten arriba o abajo en la mayoría de las páginas de muestra (ej. "BIBLIOTECA ESTUDIANTIL")
  async function detectBoilerplate(doc) {
    const counts = new Map(), n = doc.numPages;
    const picks = [...new Set([0.1, 0.3, 0.5, 0.7].map((f) => Math.max(2, Math.min(n, Math.round(n * f)))))];
    let used = 0;
    for (const p of picks) {
      try {
        const lines = buildLines(await (await doc.getPage(p)).getTextContent());
        const seen = new Set();
        edgeLines(lines).forEach((l) => { const k = edgeKey(l.text); if (k.length > 3 && !seen.has(k)) { seen.add(k); counts.set(k, (counts.get(k) || 0) + 1); } });
        used++;
      } catch (e) { /* se ignora esa página de muestra */ }
    }
    const need = Math.max(2, Math.ceil(used * 0.5));
    return new Set([...counts].filter(([, c]) => c >= need).map(([k]) => k));
  }

  /* arma párrafos a partir de la posición de cada fragmento de texto de la página */
  function pageParagraphs(tc, book) {
    const lines = buildLines(tc);
    const boiler = (S.doc && S.doc._boiler) || null;

    // fuera encabezados, números de página, direcciones web y marcas de descarga
    const T = normTxt(book.title), A = normTxt(book.author);
    const keep = lines.filter((ln, idx) => {
      const t = ln.text; if (!t) return false;
      const n = normTxt(t);
      if (t.length < 12 && /^[\d\s.\-–—|ivxlcdm]+$/i.test(t)) return false;
      if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return false;
      if (t.length < 100 && /escanear para descargar|bibliotecadigital|descargado de|ebooks? gratis|lectulandia|epublibre|www |http/.test(n)) return false;
      const edge = idx < 2 || idx >= lines.length - 2;
      if (edge && boiler && t.length <= 70 && boiler.has(edgeKey(t))) return false;
      if (edge && t.length <= 100 && ((T && n.includes(T)) || (A && A.length > 4 && n.includes(A)) || (n.length > 6 && T.includes(n)))) return false;
      return true;
    });

    const gaps = []; for (let i = 1; i < keep.length; i++) { const g = keep[i - 1].y - keep[i].y; if (g > 0) gaps.push(g); }
    gaps.sort((a, b) => a - b);
    const typical = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 14;

    const paras = []; let cur = '', prevY = null;
    for (const ln of keep) {
      const gap = prevY == null ? 0 : prevY - ln.y;
      const dash = /^[-—–«"“¿¡]/.test(ln.text) && /[.!?…»”"]$/.test(cur);
      if (cur && (gap > typical * 1.55 || dash)) { paras.push(cur); cur = ''; }
      if (cur) cur = /[A-Za-zÁ-ÿ]-$/.test(cur) && /^[a-zá-ÿ]/.test(ln.text) ? cur.slice(0, -1) + ln.text : `${cur} ${ln.text}`;
      else cur = ln.text;
      prevY = ln.y;
    }
    if (cur) paras.push(cur);
    return paras.map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => /[A-Za-zÁ-ÿ]{2}/.test(p));
  }

  /* frases de largo cómodo para la voz (sin lookbehind, para que funcione en Safari antiguo) */
  function toChunks(paras) {
    const out = [];
    for (const p of paras) {
      const sents = (p.match(/[^.!?…]+(?:[.!?…]+["»”)]*\s*|$)/g) || [p]).map((s) => s.trim()).filter(Boolean);
      // une fragmentos muy cortos ("Sr.", "Dr.") con el siguiente
      const merged = [];
      for (const s of sents) { if (merged.length && merged[merged.length - 1].length < 22) merged[merged.length - 1] += ' ' + s; else merged.push(s); }
      let buf = '';
      const flush = (para) => { if (buf.trim()) out.push({ t: buf.trim(), para }); buf = ''; };
      for (const s of merged) {
        if (s.length > 260) {                                   // frase larguísima: se corta en comas o puntos y coma
          flush(false);
          let rest = s;
          while (rest.length > 260) {
            const cut = rest.slice(0, 260).search(/[,;:][^,;:]*$/);
            const at = cut > 80 ? cut + 1 : rest.lastIndexOf(' ', 260);
            out.push({ t: rest.slice(0, at > 0 ? at : 260).trim(), para: false });
            rest = rest.slice(at > 0 ? at : 260).trim();
          }
          buf = rest;
        } else if (buf && (buf + ' ' + s).length > 220) { flush(false); buf = s; }
        else buf = buf ? `${buf} ${s}` : s;
      }
      flush(true);
    }
    return out;
  }

  async function chunksOf(n) {
    if (S.cache.has(n)) return S.cache.get(n);
    const doc = await ensureDoc();
    const pg = await doc.getPage(n);
    const tc = await pg.getTextContent();
    const chunks = toChunks(pageParagraphs(tc, S.book));
    S.cache.set(n, chunks);
    return chunks;
  }
  // primera página con texto (a partir de n); si hay varias vacías seguidas se salta hasta 6
  async function nextWithText(n, dir = 1) {
    const max = S.doc ? S.doc.numPages : S.book.pages;
    for (let k = 0; k < 7; k++) {
      const p = n + k * dir;
      if (p < 1 || p > max) return null;
      const c = await chunksOf(p);
      if (c.length) return { page: p, chunks: c };
    }
    return null;
  }

  /* ---------- reproductor (dibujo) ---------- */
  const pagesOf = () => (S.doc ? S.doc.numPages : S.book.pages);
  const leftMin = () => {
    const b = S.book, rem = Math.max(0, pagesOf() - S.page + 1);
    return (rem * b.avg) / CPM / S.rate;
  };

  function paintPlayer() {
    const b = S.book;
    if (!b) return;
    const bars = Array.from({ length: 34 }, (_, k) => `<i style="--d:${((k * 37) % 17) / 10}s;--h:${28 + ((k * 53) % 62)}%"></i>`).join('');
    P.className = `abp${S.playing ? ' is-playing' : ''}${S.loading ? ' is-loading' : ''}`;
    P.innerHTML = `
      <div class="abp__cover"><span class="abp__ring" aria-hidden="true"></span><img src="${esc(b.cover)}" alt="Portada de ${esc(b.title)}" width="300" height="420"><div class="abp__eq" aria-hidden="true">${bars}</div></div>
      <div class="abp__main">
        <div class="abp__meta">
          <span class="abp__tag"><i></i><span id="ab-tag">${S.playing ? 'Escuchando' : 'Listo para escuchar'}</span></span>
          <h3 class="abp__title">${esc(b.title)}</h3>
          <p class="abp__author">${esc(b.author)} · <span>${LANG_NAME[b.lang]}</span> · <span>≈ ${fmtDur(b.minutes)}</span></p>
        </div>
        <div class="abp__lyrics" id="ab-lyrics" aria-live="off"><p class="abp__prev"></p><p class="abp__now"></p><p class="abp__next"></p></div>
        <div class="abp__progress">
          <input type="range" id="ab-range" min="1" max="${pagesOf()}" value="${S.page}" aria-label="Avance del libro por páginas" aria-valuetext="Página ${S.page} de ${pagesOf()}">
          <div class="abp__times"><span id="ab-pg">Página ${S.page} de ${pagesOf()}</span><span id="ab-left">Quedan ≈ ${fmtDur(leftMin())}</span></div>
        </div>
        <div class="abp__controls">
          <button type="button" data-a="prevPage" aria-label="Página anterior">${ICON.prevPage}</button>
          <button type="button" data-a="prev" aria-label="Frase anterior">${ICON.prev}</button>
          <button type="button" class="abp__play" data-a="toggle" aria-label="${S.playing ? 'Pausar' : 'Escuchar'}">${S.playing ? ICON.pause : ICON.play}<span class="abp__spin" aria-hidden="true"></span></button>
          <button type="button" data-a="next" aria-label="Frase siguiente">${ICON.next}</button>
          <button type="button" data-a="nextPage" aria-label="Página siguiente">${ICON.nextPage}</button>
        </div>
        <div class="abp__tools">
          <div class="abp__menuwrap"><button type="button" class="abp__tool" data-menu="rate" aria-haspopup="true" aria-expanded="false">${ICON.speed}<span id="ab-rate">${String(S.rate).replace('.', ',')}×</span></button><div class="abp__menu" id="ab-menu-rate" role="menu" hidden></div></div>
          <div class="abp__menuwrap"><button type="button" class="abp__tool" data-menu="voice" aria-haspopup="true" aria-expanded="false">${ICON.voice}<span id="ab-voice">Voz</span></button><div class="abp__menu abp__menu--wide" id="ab-menu-voice" role="menu" hidden></div></div>
          <div class="abp__menuwrap"><button type="button" class="abp__tool" data-menu="timer" aria-haspopup="true" aria-expanded="false">${ICON.moon}<span id="ab-timer">Dormir</span></button><div class="abp__menu" id="ab-menu-timer" role="menu" hidden></div></div>
          <button type="button" class="abp__tool abp__tool--ghost" data-a="read">${ICON.book}<span>Abrir el libro</span></button>
        </div>
        <p class="abp__note" id="ab-note" role="status"></p>
      </div>`;
    fillRateMenu(); fillVoiceMenu(); fillTimerMenu(); paintLyrics(); paintMini(); paintProgress();
    if (!b.ok) note('Este libro es un documento escaneado y no tiene texto digital, por eso no se puede narrar. Puedes leerlo con «Abrir el libro».', true);
    else if (!SUPPORTED) note('Tu navegador no admite la lectura en voz alta. Prueba con Chrome, Edge, Safari o Firefox actualizados.', true);
  }

  function note(msg, strong) { const n = $('#ab-note', P); if (n) { n.textContent = msg || ''; n.classList.toggle('is-strong', !!strong); } }
  function setPlayingUI() {
    P.classList.toggle('is-playing', S.playing);
    P.classList.toggle('is-loading', S.loading);
    const t = $('.abp__play', P);
    if (t) { t.setAttribute('aria-label', S.playing ? 'Pausar' : 'Escuchar'); t.firstElementChild.outerHTML = S.playing ? ICON.pause : ICON.play; }
    const tag = $('#ab-tag', P); if (tag) tag.textContent = S.playing ? 'Escuchando' : (S.started ? 'En pausa' : 'Listo para escuchar');
    paintMini();
  }
  function paintProgress() {
    const r = $('#ab-range', P); if (!r) return;
    r.max = pagesOf(); r.value = S.page;
    r.setAttribute('aria-valuetext', `Página ${S.page} de ${pagesOf()}`);
    r.style.setProperty('--p', `${((S.page - 1) / Math.max(1, pagesOf() - 1)) * 100}%`);
    $('#ab-pg', P).textContent = `Página ${S.page} de ${pagesOf()}`;
    $('#ab-left', P).textContent = `Quedan ≈ ${fmtDur(leftMin())}`;
  }
  function paintLyrics() {
    const box = $('#ab-lyrics', P); if (!box) return;
    const cur = S.chunks[S.ci];
    $('.abp__prev', box).textContent = S.chunks[S.ci - 1] ? S.chunks[S.ci - 1].t : '';
    $('.abp__next', box).textContent = S.chunks[S.ci + 1] ? S.chunks[S.ci + 1].t : '';
    const now = $('.abp__now', box);
    S.words = [];
    if (!cur) {
      now.textContent = S.book.ok ? (SUPPORTED ? 'Pulsa ▶ para empezar a escuchar.' : '') : 'Documento escaneado: solo lectura.';
      return;
    }
    now.innerHTML = cur.t.replace(/\S+/g, (w, idx) => { S.words.push(idx); return `<span class="w">${esc(w)}</span>`; });
  }
  function hiliteAt(charIndex) {
    const spans = $$('.abp__now .w', P); if (!spans.length) return;
    let k = 0; while (k + 1 < S.words.length && S.words[k + 1] <= charIndex) k++;
    spans.forEach((s, i) => { s.classList.toggle('is-on', i === k); s.classList.toggle('is-done', i < k); });
  }
  function paintMini() {
    const b = S.book; if (!b) { mini.hidden = true; return; }
    $('img', mini).src = b.cover;
    $('b', mini).textContent = b.title;
    $('small', mini).textContent = `Página ${S.page} · ${S.playing ? 'escuchando' : 'en pausa'}`;
    const pb = $('.abmini__play', mini);
    pb.innerHTML = S.playing ? ICON.pause : ICON.play;
    pb.setAttribute('aria-label', S.playing ? 'Pausar' : 'Reproducir');
    mini.classList.toggle('is-playing', S.playing);
    updateMiniVisibility();
  }
  let inView = true;
  function updateMiniVisibility() {
    const active = S.book && S.started;
    mini.hidden = !(active && !inView) || document.documentElement.classList.contains('reader-open');
  }
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; updateMiniVisibility(); }, { threshold: 0.05 }).observe(root);

  /* ---------- menús (velocidad, voz, temporizador) ---------- */
  const closeMenus = () => $$('.abp__menu', P).forEach((m) => { m.hidden = true; if (m.previousElementSibling) m.previousElementSibling.setAttribute('aria-expanded', 'false'); });
  function fillRateMenu() {
    const m = $('#ab-menu-rate', P); if (!m) return;
    m.innerHTML = RATES.map((r) => `<button type="button" role="menuitemradio" aria-checked="${r === S.rate}" data-rate="${r}">${String(r).replace('.', ',')}×${r === 1 ? ' <small>normal</small>' : ''}</button>`).join('');
  }
  function fillVoiceMenu() {
    const m = $('#ab-menu-voice', P); if (!m || !S.book) return;
    const lang = S.book.lang;
    const pool = S.voices.filter((v) => (v.lang || '').toLowerCase().startsWith(lang)).sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang));
    m.innerHTML = pool.length
      ? pool.map((v) => `<button type="button" role="menuitemradio" aria-checked="${!!S.voice && v.voiceURI === S.voice.voiceURI}" data-voice="${esc(v.voiceURI)}">${esc(v.name.replace(/^Microsoft |^Google /, ''))}<small>${esc(v.lang)}</small></button>`).join('')
      : `<p class="abp__empty">Tu dispositivo no tiene una voz en ${LANG_NAME[lang].toLowerCase()} instalada. Se usará la voz predeterminada.</p>`;
    const lab = $('#ab-voice', P);
    if (lab) lab.textContent = S.voice ? voiceLabel(S.voice) : 'Voz';
    // sin voz instalada en el idioma del libro: se avisa antes de que suene raro
    if (!pool.length && S.voices.length && S.book.ok) note(`Tu dispositivo no tiene una voz en ${LANG_NAME[lang].toLowerCase()}. Se leerá con otra voz y puede sonar extraño; en Chrome, Edge, Android e iPhone suelen estar disponibles.`, true);
  }
  function fillTimerMenu() {
    const m = $('#ab-menu-timer', P); if (!m) return;
    const opts = [['off', 'Apagado'], [15, '15 minutos'], [30, '30 minutos'], [45, '45 minutos'], [60, '1 hora'], ['page', 'Al terminar la página']];
    const cur = S.stopAtPage ? 'page' : S.timer ? 'on' : 'off';
    m.innerHTML = opts.map(([v, l]) => `<button type="button" role="menuitemradio" aria-checked="${(v === 'off' && cur === 'off') || (v === 'page' && cur === 'page')}" data-timer="${v}">${l}</button>`).join('');
  }
  function paintTimerLabel() {
    const t = $('#ab-timer', P); if (!t) return;
    if (S.stopAtPage) t.textContent = 'Fin de página';
    else if (S.timer) t.textContent = `${Math.max(1, Math.ceil((S.timerEnd - Date.now()) / 60000))} min`;
    else t.textContent = 'Dormir';
  }
  let tick = null;
  function setTimer(v) {
    clearTimeout(S.timer); S.timer = null; S.stopAtPage = false; clearInterval(tick);
    if (v === 'page') S.stopAtPage = true;
    else if (v !== 'off') {
      S.timerEnd = Date.now() + Number(v) * 60000;
      S.timer = setTimeout(() => { S.timer = null; pause(); note('Temporizador: lectura detenida. ¡Que descanses!'); paintTimerLabel(); fillTimerMenu(); }, Number(v) * 60000);
      tick = setInterval(paintTimerLabel, 20000);
    }
    paintTimerLabel(); fillTimerMenu();
  }

  /* ---------- reproducción ---------- */
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !S.wake) { S.wake = await navigator.wakeLock.request('screen'); S.wake.addEventListener('release', () => { S.wake = null; }); } } catch (e) { /* no disponible */ }
  }
  function release() { try { if (S.wake) S.wake.release(); } catch (e) { /* nada */ } S.wake = null; }

  function speak(ci) {
    const tk = ++S.token;
    clearTimeout(S.timeout);
    speechSynthesis.cancel();
    const ch = S.chunks[ci];
    if (!ch) { advancePage(true); return; }
    S.ci = ci; paintLyrics();
    const u = new SpeechSynthesisUtterance(ch.t);
    if (S.voice) { u.voice = S.voice; u.lang = S.voice.lang; } else u.lang = S.book.lang === 'en' ? 'en-US' : 'es-AR';
    u.rate = S.rate; u.pitch = 1;
    // Las voces de Google no avisan qué palabra dicen: si no llegan avisos, el resaltado se estima por tiempo
    let seen = false, t0 = 0;
    clearInterval(S.hl);
    u.onstart = () => {
      t0 = performance.now(); clearInterval(S.hl);
      S.hl = setInterval(() => {
        if (seen || tk !== S.token) { clearInterval(S.hl); return; }
        hiliteAt(Math.min(ch.t.length, Math.floor(((performance.now() - t0) / 1000) * (CPM / 60) * S.rate)));
      }, 140);
    };
    u.onboundary = (e) => { if (tk === S.token && e.name !== 'sentence') { seen = true; hiliteAt(e.charIndex); } };
    u.onend = () => {
      clearInterval(S.hl);
      if (tk !== S.token) return;
      saveProgress();
      S.timeout = setTimeout(() => { if (tk === S.token && S.playing) { if (S.ci + 1 < S.chunks.length) speak(S.ci + 1); else advancePage(true); } }, reduce ? 60 : (ch.para ? 420 : 150));
    };
    u.onerror = (e) => {
      if (tk !== S.token || e.error === 'canceled' || e.error === 'interrupted') return;
      pause(); note('La voz no pudo reproducirse. Prueba con otra voz en el menú «Voz» o recarga la página.', true);
    };
    S.utter = u;                                           // se guarda para que el navegador no lo descarte a mitad de frase
    setTimeout(() => { if (tk === S.token) speechSynthesis.speak(u); }, 40);
  }

  async function advancePage(auto) {
    if (S.stopAtPage && auto) {
      S.stopAtPage = false; pause(); note('Temporizador: lectura detenida al terminar la página.'); paintTimerLabel(); fillTimerMenu();
      await goPage(Math.min(S.page + 1, pagesOf()), false); saveProgress(); return;
    }
    const res = await goPage(S.page + 1, true);
    if (res === 'end') {
      pause(); S.page = pagesOf(); paintProgress(); note('¡Terminaste el libro! Elige otro de la colección.');
      const all = saved(); delete all[S.book.slug]; store.set('bh_audio', all); paintGrid();
    }
  }

  async function loadPage(n) {
    S.loading = true; setPlayingUI();
    try {
      const found = await nextWithText(n, 1);
      if (!found) { S.chunks = []; S.ci = 0; return null; }
      S.page = found.page; S.chunks = found.chunks; S.ci = 0;
      paintProgress(); paintLyrics();
      nextWithText(found.page + 1, 1).catch(() => {});     // adelanta la página siguiente
      return found;
    } catch (e) {
      note('No se pudo leer esa página del libro. Revisa tu conexión e inténtalo de nuevo.', true);
      return null;
    } finally { S.loading = false; setPlayingUI(); }
  }

  async function goPage(n, keepPlaying) {
    const max = pagesOf();
    if (n > max) return 'end';
    n = Math.max(1, n);
    const tk = ++S.token; if (SUPPORTED) speechSynthesis.cancel(); clearTimeout(S.timeout);
    const f = await loadPage(n);
    if (tk !== S.token) return 'stale';
    if (!f) return n >= max - 1 ? 'end' : 'empty';
    saveProgress();
    if (S.playing && keepPlaying !== false) speak(0);
    return 'ok';
  }

  // al empezar un libro por primera vez se salta la portada, los créditos y la dedicatoria
  async function skipFrontMatter() {
    const b = S.book, min = Math.min(600, Math.round(b.avg * 0.45));
    const front = /all rights reserved|todos los derechos|derechos reservados|\bisbn\b|copyright|©|impreso en|printed in|library of congress|dep[oó]sito legal|primera edici[oó]n|first published/i;
    // índices y tablas de contenido: empiezan con esa palabra, traen rayas o están llenos de números de página
    const index = (t) => /^(índice|indice|contenido|contents|table of contents|agradecimientos|acknowledg)/i.test(t.trim()) || /_{5,}|\.{6,}/.test(t) || (t.match(/\d/g) || []).length / Math.max(1, t.length) > 0.07;
    S.loading = true; setPlayingUI();
    try {
      for (let p = S.page; p < Math.min(S.page + 14, pagesOf()); p++) {
        const txt = (await chunksOf(p)).map((x) => x.t).join(' ');
        if (txt.length >= min && !front.test(txt) && !index(txt)) { S.page = p; break; }
      }
    } catch (e) { /* si falla, se empieza por donde estaba */ }
    S.loading = false; paintProgress();
  }

  async function play() {
    if (!SUPPORTED || !S.book || !S.book.ok) return;
    S.started = true;
    S.playing = true; setPlayingUI(); keepAwake();
    if (!S.chunks.length) {
      if (S.fresh) { S.fresh = false; await skipFrontMatter(); }
      const f = await loadPage(S.page);
      if (!f) { S.playing = false; setPlayingUI(); note('No se encontró texto para leer en esta parte del libro.', true); return; }
    }
    if (!S.voice) loadVoices();
    speak(S.ci);
    note('');
  }
  function pause() {
    S.token++; clearTimeout(S.timeout); clearInterval(S.hl);
    if (SUPPORTED) speechSynthesis.cancel();
    S.playing = false; release(); saveProgress(); setPlayingUI(); paintGrid();
  }
  const toggle = () => (S.playing ? pause() : play());

  function stepChunk(d) {
    const ci = S.ci + d;
    if (ci < 0) { goPage(S.page - 1).then(() => { if (S.chunks.length) { S.ci = S.chunks.length - 1; paintLyrics(); if (S.playing) speak(S.ci); } }); return; }
    if (ci >= S.chunks.length) { advancePage(false); return; }
    S.ci = ci; paintLyrics(); saveProgress();
    if (S.playing) speak(ci);
  }

  /* ---------- abrir un libro ---------- */
  function select(b, opts = {}) {
    if (S.book && S.book.slug !== b.slug) { if (S.playing) pause(); }
    S.book = b; S.started = !!opts.autoplay;
    const sv = saved()[b.slug];
    S.page = opts.page || (sv && sv.page) || Math.max(1, b.start || 1);
    S.ci = opts.page ? 0 : (sv && sv.ci) || 0;
    S.fresh = !sv && !opts.page;                             // primera vez con este libro
    S.chunks = []; S.cache.clear(); S.doc = null;
    chooseVoice();
    paintPlayer();
    $$('.abc', root).forEach((c) => c.classList.toggle('is-current', c.dataset.slug === b.slug));
    store.set('bh_audio', { ...saved(), __last: b.slug });
    if (opts.autoplay) {
      const y = P.getBoundingClientRect().top + scrollY - 90;
      scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      play();
    }
  }

  /* ---------- biblioteca (tarjetas) ---------- */
  let filter = 'Todos';
  function paintStats() {
    const ok = BOOKS.filter((b) => b.ok);
    const mins = ok.reduce((a, b) => a + b.minutes, 0);
    $('#ab-stats', root).innerHTML = `<li><b>${ok.length}</b><span>libros para escuchar</span></li><li><b>${Math.round(mins / 60)} h</b><span>de lectura en total</span></li><li><b>0,75–2×</b><span>velocidad a tu ritmo</span></li><li><b>ES · EN</b><span>voces en cada idioma</span></li>`;
  }
  function paintFilters() {
    const cats = ['Todos', ...new Set(BOOKS.map((b) => b.cat))];
    $('#ab-filters', root).innerHTML = cats.map((c) => `<button type="button" class="abchip${c === filter ? ' is-on' : ''}" data-cat="${esc(c)}" aria-pressed="${c === filter}">${esc(c)}</button>`).join('');
  }
  function card(b) {
    const sv = saved()[b.slug];
    const prog = sv && sv.page > 1 ? Math.min(99, Math.round((sv.page / b.pages) * 100)) : 0;
    return `<li><button type="button" class="abc${S.book && S.book.slug === b.slug ? ' is-current' : ''}${b.ok ? '' : ' is-off'}" data-slug="${esc(b.slug)}" aria-label="${b.ok ? 'Escuchar' : 'Ver'} ${esc(b.title)}, de ${esc(b.author)}${b.ok ? ', duración aproximada ' + fmtDur(b.minutes) : ', documento escaneado sin narración'}">
      <span class="abc__cover"><img src="${esc(b.cover)}" alt="" loading="lazy" width="200" height="280">
        <span class="abc__badge">${ICON.phones}</span>
        <span class="abc__play">${b.ok ? ICON.play : ICON.book}</span>
        ${prog ? `<span class="abc__bar"><i style="width:${prog}%"></i></span>` : ''}
      </span>
      <span class="abc__info"><b>${esc(b.title)}</b><small>${esc(b.author)}</small>
        <span class="abc__chips">${b.ok ? `<i>≈ ${fmtDur(b.minutes)}</i><i>${b.lang.toUpperCase()}</i>` : '<i class="abc__warn">Solo lectura</i>'}${prog ? `<i class="abc__go">${prog}%</i>` : ''}</span>
      </span></button></li>`;
  }
  function paintGrid() {
    const list = BOOKS.filter((b) => filter === 'Todos' || b.cat === filter);
    $('#ab-grid', root).innerHTML = list.map(card).join('') || '<li class="audio__empty">No hay libros en esta categoría.</li>';
    const all = saved();
    const cont = BOOKS.filter((b) => b.ok && all[b.slug] && all[b.slug].page > 1).sort((a, b) => all[b.slug].t - all[a.slug].t).slice(0, 4);
    $('#ab-continue', root).innerHTML = cont.length
      ? `<div class="abcont"><h4>Continuar escuchando</h4><div>${cont.map((b) => `<button type="button" class="abcont__item" data-slug="${esc(b.slug)}"><img src="${esc(b.cover)}" alt="" width="44" height="62"><span><b>${esc(b.title)}</b><small>Página ${all[b.slug].page} de ${b.pages}</small></span></button>`).join('')}</div></div>`
      : '';
  }

  /* ---------- eventos ---------- */
  P.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]');
    if (a) {
      const k = a.dataset.a;
      if (k === 'toggle') toggle();
      else if (k === 'next') stepChunk(1);
      else if (k === 'prev') stepChunk(-1);
      else if (k === 'nextPage') goPage(S.page + 1).then((r) => { if (r === 'end') note('Ya estás en la última página.'); });
      else if (k === 'prevPage') goPage(Math.max(1, S.page - 1));
      else if (k === 'read' && window.BiblioReader) {
        if (S.playing) pause();
        const b = S.book;
        window.BiblioReader.open({ slug: b.slug, title: b.title, author: b.author, cover: b.cover, start: S.page, pdf: b.pdf === `libros/${b.slug}.pdf` ? undefined : b.pdf });
      }
      return;
    }
    const mb = e.target.closest('[data-menu]');
    if (mb) {
      const menu = $(`#ab-menu-${mb.dataset.menu}`, P); const open = menu.hidden;
      closeMenus(); menu.hidden = !open; mb.setAttribute('aria-expanded', String(open));
      return;
    }
    const r = e.target.closest('[data-rate]');
    if (r) { S.rate = Number(r.dataset.rate); store.set('bh_tts_rate', S.rate); $('#ab-rate', P).textContent = `${String(S.rate).replace('.', ',')}×`; fillRateMenu(); closeMenus(); paintProgress(); if (S.playing) speak(S.ci); return; }
    const v = e.target.closest('[data-voice]');
    if (v) {
      const voice = S.voices.find((x) => x.voiceURI === v.dataset.voice);
      if (voice) { S.voice = voice; const pr = store.get('bh_tts_voice', {}); pr[S.book.lang] = voice.voiceURI; store.set('bh_tts_voice', pr); fillVoiceMenu(); closeMenus(); if (S.playing) speak(S.ci); }
      return;
    }
    const t = e.target.closest('[data-timer]');
    if (t) { setTimer(t.dataset.timer); closeMenus(); }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.abp__menuwrap')) closeMenus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
  P.addEventListener('input', (e) => {
    if (e.target.id !== 'ab-range') return;
    const n = Number(e.target.value);
    $('#ab-pg', P).textContent = `Página ${n} de ${pagesOf()}`;
    e.target.style.setProperty('--p', `${((n - 1) / Math.max(1, pagesOf() - 1)) * 100}%`);
  });
  P.addEventListener('change', (e) => { if (e.target.id === 'ab-range' && S.book && S.book.ok) { S.started = true; goPage(Number(e.target.value)); } });

  root.addEventListener('click', (e) => {
    const c = e.target.closest('.abc, .abcont__item');
    if (c) {
      const b = BOOKS.find((x) => x.slug === c.dataset.slug); if (!b) return;
      if (!b.ok) { select(b); return; }
      select(b, { autoplay: true });
      return;
    }
    const f = e.target.closest('.abchip');
    if (f) { filter = f.dataset.cat; paintFilters(); paintGrid(); }
  });

  mini.addEventListener('click', (e) => {
    if (e.target.closest('.abmini__play')) toggle();
    else if (e.target.closest('.abmini__x')) { if (S.playing) pause(); S.started = false; paintMini(); }
    else if (e.target.closest('.abmini__go')) scrollTo({ top: root.getBoundingClientRect().top + scrollY - 20, behavior: reduce ? 'auto' : 'smooth' });
  });

  // si se abre el lector de libros, la narración se detiene para no superponerse
  new MutationObserver(() => { if (document.documentElement.classList.contains('reader-open') && S.playing) pause(); updateMiniVisibility(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.playing) keepAwake(); });
  addEventListener('pagehide', () => { if (SUPPORTED) speechSynthesis.cancel(); });

  /* ---------- arranque ---------- */
  function init() {
    collect();
    if (!BOOKS.length) { root.hidden = true; return; }
    paintStats(); paintFilters(); paintGrid();
    const last = saved().__last;
    const first = BOOKS.find((b) => b.slug === last && b.ok) || BOOKS.find((b) => b.slug === 'cien-anos-de-soledad' && b.ok) || BOOKS.find((b) => b.ok) || BOOKS[0];
    select(first);
    if (SUPPORTED) { loadVoices(); speechSynthesis.addEventListener('voiceschanged', loadVoices); }
  }
  // el catálogo se arma cuando llegan los datos publicados; se espera a que esté listo
  (window.BiblioCloud ? window.BiblioCloud.ready : Promise.resolve()).then(() => setTimeout(init, 0));

  // utilidad para pruebas: devuelve el texto limpio de una página
  window.BiblioAudio = {
    // desde qué página y con qué frase empezaría a leer un libro nuevo
    async firstSpoken(slug) {
      collect(); const b = BOOKS.find((x) => x.slug === slug); if (!b) return null;
      const kb = S.book, kd = S.doc, kp = S.page; S.book = b; S.doc = null; S.cache.clear(); S.page = Math.max(1, b.start || 1);
      try { await skipFrontMatter(); const c = await chunksOf(S.page); return { page: S.page, text: (c[0] || {}).t || '' }; }
      finally { S.book = kb; S.doc = kd; S.page = kp; S.cache.clear(); }
    },
    async preview(slug, page) {
      collect(); const b = BOOKS.find((x) => x.slug === slug); if (!b) return null;
      const keep = S.book, keepDoc = S.doc; S.book = b; S.doc = null; S.cache.clear();
      try { const c = await chunksOf(page); return c.map((x) => x.t); } finally { S.book = keep; S.doc = keepDoc; S.cache.clear(); }
    },
  };
})();
