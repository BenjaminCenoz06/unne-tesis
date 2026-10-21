/* =========================================================
   Lector de libros con efecto de páginas que se dan vuelta.
   - PDF.js dibuja cada página del PDF (solo las cercanas)
   - StPageFlip hace el efecto realista de pasar hojas
   Se carga bajo demanda: no pesa hasta que se abre un libro.
   ========================================================= */
(() => {
  const VENDOR = 'js/vendor/';
  const loaded = {};
  const loadScript = (src) => loaded[src] || (loaded[src] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src));
    document.head.appendChild(s);
  }));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- estructura del lector (se crea una sola vez) ---------- */
  let root;
  function build() {
    if (root) return root;
    root = document.createElement('div');
    root.className = 'reader';
    root.id = 'reader';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Lector de libro');
    root.innerHTML = `
      <div class="reader__bg" aria-hidden="true"></div>
      <header class="reader__bar">
        <div class="reader__title"><b id="reader-title"></b><span id="reader-author"></span></div>
        <div class="reader__count" id="reader-count" aria-live="polite"></div>
        <div class="reader__tools">
          <a class="reader__btn" id="reader-dl" href="#" download title="Descargar PDF" aria-label="Descargar PDF"><svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4.500-4.500M12 15l4.500-4.500M4 20h16"/></svg></a>
          <button class="reader__btn" id="reader-fs" type="button" title="Pantalla completa" aria-label="Pantalla completa"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
          <button class="reader__btn reader__btn--close" id="reader-close" type="button" title="Cerrar" aria-label="Cerrar lector"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
        </div>
      </header>

      <div class="reader__stage" id="reader-stage">
        <div class="reader__loading" id="reader-loading">
          <img id="reader-splash" alt="" width="600" height="830">
          <p id="reader-msg">Abriendo el libro…</p>
          <div class="reader__progress"><i id="reader-bar"></i></div>
        </div>
        <button class="reader__nav reader__nav--prev" id="reader-prev" type="button" aria-label="Página anterior"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
        <div class="reader__book" id="reader-book"></div>
        <button class="reader__nav reader__nav--next" id="reader-next" type="button" aria-label="Página siguiente"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
      </div>

      <footer class="reader__foot">
        <input class="reader__range" id="reader-range" type="range" min="0" max="0" value="0" aria-label="Ir a la página">
        <p class="reader__hint">Arrastra una esquina, haz clic en la página o usa las flechas ← →</p>
      </footer>`;
    document.body.appendChild(root);
    root.querySelector('#reader-close').addEventListener('click', close);
    root.querySelector('#reader-fs').addEventListener('click', () => {
      if (!document.fullscreenElement) root.requestFullscreen && root.requestFullscreen().catch(() => {});
      else document.exitFullscreen();
    });
    return root;
  }

  /* ---------- estado ---------- */
  let flip = null, pdf = null, token = 0, rendering = false;
  let queue = [], done = new Set(), pageEls = [];
  let current = 0;

  function close() {
    token++;
    if (!root || root.hidden) return;
    root.hidden = true;
    document.documentElement.classList.remove('reader-open');
    document.removeEventListener('keydown', onKey);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    try { flip && flip.destroy(); } catch { /* ignorar */ }
    flip = null;
    if (pdf) { pdf.destroy().catch(() => {}); pdf = null; }
    const book = root.querySelector('#reader-book');
    if (book) book.innerHTML = '';
    queue = []; done = new Set(); pageEls = [];
    if (window.__readerReturn) { const f = window.__readerReturn; window.__readerReturn = null; f(); }
  }
  function onKey(e) {
    if (!flip) { if (e.key === 'Escape') close(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); flip.flipNext(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); flip.flipPrev(); }
    else if (e.key === 'Home') flip.flip(0);
    else if (e.key === 'End') flip.flip(flip.getPageCount() - 1);
    else if (e.key === 'Escape' && !document.fullscreenElement) close();
  }

  /* ---------- páginas ---------- */
  const mk = (cls, html, hard) => {
    const d = document.createElement('div');
    d.className = 'pg ' + cls;
    if (hard) d.dataset.density = 'hard';
    d.innerHTML = html;
    return d;
  };

  async function open(opts) {
    const { slug, title, author, cover, start = 1 } = opts;
    const my = ++token;
    build();
    root.hidden = false;
    document.documentElement.classList.add('reader-open');
    document.addEventListener('keydown', onKey);
    $('#reader-title').textContent = title;
    $('#reader-author').textContent = author ? 'de ' + author : '';
    $('#reader-count').textContent = '';
    $('#reader-dl').href = `libros/${slug}.pdf`;
    $('#reader-splash').src = cover || '';
    $('#reader-msg').textContent = 'Abriendo el libro…';
    $('#reader-bar').style.width = '4%';
    $('#reader-loading').classList.remove('is-hidden', 'is-error');
    // StPageFlip elimina el contenedor al destruirse: se crea uno nuevo en cada apertura
    const oldBook = $('#reader-book');
    if (oldBook) oldBook.remove();
    const freshBook = document.createElement('div');
    freshBook.id = 'reader-book';
    freshBook.className = 'reader__book';
    $('#reader-stage').insertBefore(freshBook, $('#reader-next'));
    $('#reader-close').focus({ preventScroll: true });

    try {
      await Promise.all([loadScript(VENDOR + 'pdf.min.js'), loadScript(VENDOR + 'page-flip.js')]);
      if (my !== token) return;
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.js';

      const task = window.pdfjsLib.getDocument({
        url: `libros/${slug}.pdf`,
        rangeChunkSize: 524288,
        disableAutoFetch: true,
        cMapUrl: VENDOR + 'cmaps/', cMapPacked: true,
        standardFontDataUrl: VENDOR + 'standard_fonts/',
      });
      task.onProgress = (p) => { if (p.total) $('#reader-bar').style.width = Math.max(6, Math.min(92, (p.loaded / p.total) * 100)) + '%'; };
      pdf = await task.promise;
      if (my !== token) { pdf.destroy(); pdf = null; return; }

      // proporción de las páginas (según la primera página útil)
      const first = await pdf.getPage(Math.min(start, pdf.numPages));
      const vp = first.getViewport({ scale: 1 });
      const ratio = vp.height / vp.width;
      const total = pdf.numPages;
      $('#reader-bar').style.width = '96%';

      // armar el libro: tapa dura + páginas del PDF + (hoja en blanco) + contratapa
      const pages = [];
      const coverFromPdf = start === 2;
      pages.push(mk('pg--cover', `<img src="${esc(cover)}" alt="" draggable="false">${coverFromPdf ? '<canvas></canvas>' : ''}<span class="pg__foil"></span>`, true));
      if (coverFromPdf) pages[0].dataset.pdf = '1';
      for (let n = start; n <= total; n++) {
        const idx = n - start + 1;
        pages.push(mk('pg--paper', `<canvas></canvas><span class="pg__spin"></span><span class="pg__num">${n}</span><span class="pg__gutter"></span>`, false));
        pages[idx].dataset.pdf = n;
      }
      if ((pages.length + 1) % 2 !== 0) pages.push(mk('pg--paper pg--blank', '<span class="pg__gutter"></span>', false));
      pages.push(mk('pg--back', `<img class="pg__logo" src="images/logo-white.png" alt="" draggable="false"><b>${esc(title)}</b><small>${esc(author || '')}</small>`, true));

      const bookEl = $('#reader-book');
      pages.forEach((p) => bookEl.appendChild(p));
      pageEls = pages;

      // tamaño base de página (se adapta a la pantalla)
      const W = 520, H = Math.round(W * Math.max(1.1, Math.min(1.7, ratio)));
      flip = new window.St.PageFlip(bookEl, {
        width: W, height: H, size: 'stretch',
        minWidth: 240, maxWidth: 760, minHeight: 330, maxHeight: 1100,
        showCover: true, usePortrait: true, startZIndex: 0,
        drawShadow: true, maxShadowOpacity: 0.55, flippingTime: 900,
        mobileScrollSupport: false, swipeDistance: 24, clickEventForward: true,
        useMouseEvents: true, showPageCorners: true, autoSize: true,
      });
      flip.loadFromHTML(pages);
      if (my !== token) { close(); return; }

      const range = $('#reader-range');
      range.max = String(pages.length - 1);
      range.value = '0';
      range.oninput = () => flip.turnToPage(Number(range.value));
      $('#reader-prev').onclick = () => flip.flipPrev();
      $('#reader-next').onclick = () => flip.flipNext();

      const update = () => {
        current = flip.getCurrentPageIndex();
        range.value = String(current);
        const pdfPages = pages.slice(current, current + (flip.getOrientation() === 'portrait' ? 1 : 2)).filter((p) => p.dataset.pdf && !p.classList.contains('pg--cover')).map((p) => p.dataset.pdf);
        $('#reader-count').textContent = current === 0 ? 'Portada' : (pdfPages.length ? `Página ${pdfPages.join('–')} de ${total}` : 'Contratapa');
        $('#reader-prev').disabled = current === 0;
        $('#reader-next').disabled = current >= pages.length - 1;
        schedule();
      };
      flip.on('flip', update);
      flip.on('changeOrientation', () => { done = new Set(); schedule(); });

      // render: la portada ya está; pedimos las primeras hojas
      const targetPx = () => {
        const r = pages[1] ? pages[1].getBoundingClientRect() : { width: 400 };
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        return Math.max(520, Math.min(1200, Math.round((r.width || 400) * dpr * 1.15)));
      };
      const renderOne = async (n) => {
        const el = pages.find((p) => Number(p.dataset.pdf) === n);
        if (!el || done.has(n)) return;
        const pg = await pdf.getPage(n);
        const v0 = pg.getViewport({ scale: 1 });
        const scale = targetPx() / v0.width;
        const v = pg.getViewport({ scale });
        const cv = el.querySelector('canvas');
        cv.width = Math.round(v.width); cv.height = Math.round(v.height);
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        await pg.render({ canvasContext: ctx, viewport: v }).promise;
        pg.cleanup();
        el.classList.add('is-ready');
        done.add(n);
      };
      const pump = async () => {
        if (rendering) return;
        rendering = true;
        try {
          while (queue.length && my === token) {
            const n = queue.shift();
            try { await renderOne(n); } catch (e) { done.add(n); }
          }
        } finally { rendering = false; }
      };
      function schedule() {
        // páginas cercanas a la actual (hacia adelante primero)
        const want = [];
        for (let d = -1; d <= 6; d++) {
          const p = pages[current + d];
          if (p && p.dataset.pdf && !done.has(Number(p.dataset.pdf))) want.push(Number(p.dataset.pdf));
        }
        queue = want;
        // libera memoria de las lejanas
        pages.forEach((p, i) => {
          if (p.dataset.pdf && Math.abs(i - current) > 14 && done.has(Number(p.dataset.pdf))) {
            const cv = p.querySelector('canvas'); cv.width = 0; cv.height = 0;
            p.classList.remove('is-ready'); done.delete(Number(p.dataset.pdf));
          }
        });
        pump();
      }

      bookEl.classList.add('is-ready');
      $('#reader-loading').classList.add('is-hidden');
      update();
    } catch (err) {
      if (my !== token) return;
      console.error(err);
      $('#reader-loading').classList.add('is-error');
      $('#reader-msg').innerHTML = `No pudimos abrir este libro.<br><a href="libros/${esc(slug)}.pdf" target="_blank" rel="noopener">Abrir el PDF en una pestaña nueva</a>`;
    }
  }

  const $ = (s) => root.querySelector(s);
  window.BiblioReader = { open, close };
})();
