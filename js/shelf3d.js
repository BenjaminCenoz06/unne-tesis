/* =========================================================
   Estante 3D de "Novela y ficción".
   Una fila infinita de lomos de libros; el libro activo se gira
   en 3D y muestra su portada. Sin librerías: un bucle rAF +
   Web Animations API. Solo se usa en esa sección.
   ========================================================= */
(() => {
  // color de lomo y de texto elegidos a mano para cada portada
  const SPINE = {
    'cien-anos-de-soledad': ['#124230', '#f3ead2'],
    'rayuela': ['#151515', '#f3ead2'],
    'ficciones': ['#b8ad98', '#1a160d'],
    'la-casa-de-los-espiritus': ['#2f6b4f', '#f3ead2'],
    'pedro-paramo': ['#c8b23b', '#1a160d'],
    'el-tunel': ['#c4b48f', '#1a160d'],
    'la-sombra-del-viento': ['#8f2a22', '#f3ead2'],
    'los-detectives-salvajes': ['#c9441f', '#fbefd8'],
    // Ciencia y tecnología
    'breve-historia-del-tiempo': ['#1b2236', '#f3ead2'],
    'cosmos': ['#2a0f0e', '#f3ead2'],
    'el-gen-egoista': ['#b53a2c', '#fbefd8'],
    'una-breve-historia-de-casi-todo': ['#171c33', '#f3ead2'],
    'el-origen-de-las-especies': ['#2f5a43', '#f3ead2'],
    'astrofisica-para-gente-con-prisa': ['#12213f', '#f1dfa6'],
    'el-universo-elegante': ['#0c1030', '#f3ead2'],
    'la-doble-helice': ['#2d2b4f', '#f3ead2'],
    // Historia y sociedad
    'sapiens': ['#a42a2a', '#fbefd8'],
    'armas-germenes-y-acero': ['#7d1d1b', '#f3ead2'],
    'las-venas-abiertas-de-america-latina': ['#8e1c18', '#f3ead2'],
    'spqr': ['#d2bd86', '#1a160d'],
    'los-origenes-del-totalitarismo': ['#7b7d7a', '#f6f1e2'],
    'la-primera-guerra-mundial': ['#b5381f', '#fbefd8'],
    'history-of-india': ['#0d4a2f', '#f3ead2'],
    'el-mediterraneo': ['#d6c27a', '#1a160d'],
    // Infantil y juvenil
    'el-principito': ['#e0a82e', '#1a160d'],
    'matilda': ['#e0457b', '#fff4e4'],
    'alicia-en-el-pais-de-las-maravillas': ['#3a2f55', '#f3ead2'],
    'harry-potter-y-la-piedra-filosofal': ['#a32323', '#f6e3a8'],
    'charlie-y-la-fabrica-de-chocolate': ['#7a3b1f', '#fbefd8'],
    'peter-pan': ['#2d3f8f', '#f3ead2'],
    'el-jardin-secreto': ['#3f7a4a', '#f3ead2'],
    'mujercitas': ['#6f68a8', '#f6f1e2'],
  };
  const smooth = (x) => x * x * (3 - 2 * x);
  const EASE = 'cubic-bezier(.2,.8,.2,1)';

  function build(shelf, api) {
    const { esc, coverUrl, ratingOf, starsHTML, fmtAvg } = api;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;

    // orden cronológico, como un estante ordenado por año
    const items = shelf.books.map((b, i) => ({ b, i, year: b[8] || 0 })).sort((a, c) => a.year - c.year);
    const N = items.length, COPIES = 3, M = N * COPIES;
    // arranca en el libro más calificado de la categoría
    const start = items.reduce((best, x, pos) => ((x.b[9] ? x.b[9][1] : 0) > (items[best].b[9] ? items[best].b[9][1] : 0) ? pos : best), 0);

    /* ---------- estructura ---------- */
    const section = document.createElement('section');
    section.className = 'shelfx';
    section.id = shelf.id;
    section.setAttribute('aria-labelledby', `shelf-${shelf.id}`);
    section.tabIndex = -1;
    section.innerHTML = `
      <div class="shelfx__grain" aria-hidden="true"></div>
      <header class="shelfx__head">
        <div>
          <p class="shelfx__kicker">Colección</p>
          <h2 class="shelfx__title" id="shelf-${shelf.id}">${esc(shelf.title)}</h2>
        </div>
        <a class="shelfx__more" href="#catalogo" data-open-search="catalog" data-cat="${esc(shelf.title)}">Ver toda la categoría <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      </header>
      <div class="shelfx__shelf" role="group" aria-label="Estante de ${esc(shelf.title)}">
        <i class="shelfx__probe" aria-hidden="true"></i>
        <div class="shelfx__stage"></div>
        <button class="shelfx__play" type="button" aria-label="Abrir libro"><svg viewBox="0 0 12 14" aria-hidden="true"><path d="M1 1l10 6-10 6z"/></svg></button>
      </div>
      <div class="shelfx__bottom">
        <button class="shelfx__arrow" data-dir="-1" type="button" aria-label="Libro anterior"><svg viewBox="0 0 18 10" aria-hidden="true"><path d="M5 1L1 5l4 4M1 5h16"/></svg></button>
        <div class="shelfx__cap" aria-live="polite">
          <div class="shelfx__line shelfx__line--t"></div>
          <div class="shelfx__line shelfx__line--s"></div>
          <div class="shelfx__line shelfx__line--m"></div>
        </div>
        <button class="shelfx__arrow" data-dir="1" type="button" aria-label="Libro siguiente"><svg viewBox="0 0 18 10" aria-hidden="true"><path d="M13 1l4 4-4 4M17 5H1"/></svg></button>
      </div>
      <div class="shelfx__cursor" aria-hidden="true"><i></i><b>ABRIR</b></div>`;

    const $ = (s) => section.querySelector(s);
    const shelfEl = $('.shelfx__shelf');
    const stage = $('.shelfx__stage');
    const probe = $('.shelfx__probe');
    const play = $('.shelfx__play');
    const cursor = $('.shelfx__cursor');

    /* ---------- libros (3 copias para que el estante sea infinito) ---------- */
    const tapes = [];
    for (let v = 0; v < M; v++) {
      const it = items[v % N];
      const b = it.b;
      const [bg, fg] = SPINE[b[5]] || ['#1d4b36', '#f3ead2'];
      const surname = String(b[1]).split(' ').slice(-1)[0];
      const el = document.createElement('div');
      el.className = 'tape';
      el.dataset.v = v;
      el.style.setProperty('--bg', bg);
      el.style.setProperty('--fg', fg);
      if (v >= N) el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `
        <div class="f sp"><img class="sp__logo" src="images/logo-icon-white.png" alt="" draggable="false"><span class="sp__title"><em>${esc(b[0])}</em></span><span class="sp__by">${esc(surname)}</span><span class="sp__yr">${b[8] || ''}</span></div>
        <div class="f cv" style="background-image:url('${coverUrl(b)}')"></div>
        <div class="f bk"></div>
        <div class="f pgs"></div>`;
      stage.appendChild(el);
      tapes.push({ el, v, pos: v % N, lift: 0, hidden: false, isAct: null, sp: el.querySelector('.sp'), cv: el.querySelector('.cv'), title: el.querySelector('.sp__title') });
    }

    /* ---------- medidas ---------- */
    let H = 400, ws = 68, d = 264, gap = 12, W = 1200;
    function measure() {
      H = probe.getBoundingClientRect().height || 400;
      ws = H * 0.17; d = H * 0.66; gap = H * 0.03;
      W = shelfEl.clientWidth;
      stage.style.setProperty('--H', H + 'px');
      stage.style.setProperty('--ws', ws + 'px');
      stage.style.setProperty('--d', d + 'px');
      // ajustar el tamaño del título al largo disponible del lomo
      tapes.forEach((t) => {
        let fs = Math.max(11, ws * 0.3);
        t.title.style.fontSize = fs + 'px';
        let guard = 0;
        // el título va en vertical y, si es largo, pasa a varias columnas: se achica hasta que entre
        while ((t.title.scrollHeight > t.title.clientHeight + 1 || t.title.scrollWidth > t.title.clientWidth + 1) && fs > 8 && guard++ < 40) { fs -= 0.5; t.title.style.fontSize = fs + 'px'; }
      });
    }

    /* ---------- estado ---------- */
    let s = start + N, Tt = s;
    let active = start, hover = -1;
    let mx = -999, my = -999, cx = -999, cy = -999;
    let tiltX = 0, tiltY = 0, onCover = false, inside = false, dragging = false, drag0 = null;
    let wheelTimer = 0, running = false, last = 0, justDragged = false;

    const shortest = (pos) => {
      let delta = pos - (((Math.round(Tt) % N) + N) % N);
      if (delta > N / 2) delta -= N;
      if (delta < -N / 2) delta += N;
      return delta;
    };

    /* ---------- leyenda con deslizamiento enmascarado ---------- */
    const lines = { t: $('.shelfx__line--t'), s: $('.shelfx__line--s'), m: $('.shelfx__line--m') };
    function metaHTML(it) {
      const rt = ratingOf(it.b);
      return `${it.b[8] || 's. f.'}${rt.n ? ` · ${starsHTML(rt.avg)} <b>${fmtAvg(rt.avg)}</b>` : ''}${it.b[6] ? ' · <i class="rd">Leer online</i>' : ''}`;
    }
    function slideIn(line, html, dir, animate) {
      const sp = document.createElement('span');
      sp.innerHTML = html;
      [...line.children].forEach((old) => {
        if (old._out) return;
        old._out = true;
        if (!animate) { old.remove(); return; }
        const cur = getComputedStyle(old).transform;
        const a = old.animate([{ transform: cur === 'none' ? 'translateY(0)' : cur }, { transform: `translateY(${-dir * 105}%)` }], { duration: 650, easing: EASE, fill: 'both' });
        a.onfinish = () => old.remove();
      });
      line.appendChild(sp);
      if (animate) sp.animate([{ transform: `translateY(${dir * 105}%)` }, { transform: 'translateY(0)' }], { duration: 650, easing: EASE, fill: 'both' });
    }
    function setActive(pos, dir, animate) {
      const it = items[pos];
      active = pos;
      slideIn(lines.t, esc(it.b[0]), dir, animate);
      slideIn(lines.s, esc(it.b[1]).toUpperCase(), dir, animate);
      slideIn(lines.m, metaHTML(it), dir, animate);
      play.dataset.book = `${shelf.id}:${it.i}`;
      play.setAttribute('aria-label', `Abrir ${it.b[0]}`);
    }
    function refreshMeta() { const sp = lines.m.lastElementChild; if (sp) sp.innerHTML = metaHTML(items[active]); }

    /* ---------- geometría ---------- */
    const rel = (v, sv) => (((v - sv + M / 2) % M) + M) % M - M / 2;
    function F(r) {
      const B = Math.abs(r) < 1 ? (r + Math.sin(Math.PI * r) / Math.PI) / 2 : Math.sign(r) * 0.5;
      return r * (ws + gap) + (d - ws + 1.6 * gap) * B;
    }

    /* ---------- entradas ---------- */
    section.addEventListener('click', (e) => {
      const a = e.target.closest('.shelfx__arrow');
      if (a) { Tt = Math.round(Tt) + Number(a.dataset.dir); return; }
      if (justDragged) { e.preventDefault(); e.stopPropagation(); return; }
      const tp = e.target.closest('.tape'); if (!tp) return;
      const r = rel(Number(tp.dataset.v), s);
      if (Math.abs(r) < 0.5) return;               // el activo: lo abre el atributo data-book de su portada
      e.preventDefault();
      Tt = Math.round(Tt + r);
    }, true);

    shelfEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.shelfx__play')) return;
      drag0 = { x: e.clientX, T: Tt, id: e.pointerId, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag0) return;
      const dx = e.clientX - drag0.x;
      if (!drag0.moved && Math.abs(dx) > 5) { drag0.moved = true; dragging = true; try { shelfEl.setPointerCapture(drag0.id); } catch { /* ignorar */ } }
      if (drag0.moved) Tt = drag0.T - dx / (ws + gap);
    });
    window.addEventListener('pointerup', () => {
      if (!drag0) return;
      if (drag0.moved) { Tt = Math.round(Tt); justDragged = true; setTimeout(() => { justDragged = false; }, 60); }
      drag0 = null; dragging = false;
    });

    section.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;     // el scroll vertical sigue siendo de la página
      e.preventDefault();
      Tt += e.deltaX / (ws + gap) * 0.5;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { Tt = Math.round(Tt); }, 160);
    }, { passive: false });

    section.addEventListener('pointerenter', () => { inside = true; });
    section.addEventListener('pointerleave', () => { inside = false; hover = -1; cursor.className = 'shelfx__cursor'; });
    section.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; if (cx < -900) { cx = mx; cy = my; } });
    stage.addEventListener('pointerover', (e) => { const tp = e.target.closest('.tape'); hover = tp ? Number(tp.dataset.v) : -1; });
    stage.addEventListener('pointerleave', () => { hover = -1; });

    document.addEventListener('keydown', (e) => {
      if (!inside && !section.contains(document.activeElement)) return;
      if (document.getElementById('modal')?.open || document.documentElement.classList.contains('reader-open')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); Tt = Math.round(Tt) + 1; }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); Tt = Math.round(Tt) - 1; }
    });

    /* ---------- bucle ---------- */
    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      const k = reduce ? 40 : (dragging ? 18 : 5.2);
      s += (Tt - s) * (1 - Math.exp(-k * dt));
      if (Math.abs(Tt - s) < 1e-4) s = Tt;
      if (Math.abs(s) > M * 4) { const sh = Math.floor(s / M) * M; s -= sh; Tt -= sh; }

      const pos = ((Math.round(s) % N) + N) % N;
      if (pos !== active) setActive(pos, Math.sign(Tt - s) || 1, !reduce);

      // inclinación hacia el cursor
      const sr = shelfEl.getBoundingClientRect();
      const ccx = sr.left + sr.width / 2, ccy = sr.top + sr.height / 2;
      onCover = fine && inside && !dragging && Math.abs(Tt - s) < 0.3 && Math.abs(mx - ccx) < 0.55 * d && Math.abs(my - ccy) < 0.55 * H;
      const tyT = onCover ? (mx - ccx) / (0.55 * d) * 9 : (inside && fine ? (mx - ccx) / W * 5 : 0);
      const txT = onCover ? -(my - ccy) / (H / 2) * 6 : 0;
      const ke = 1 - Math.exp(-7 * dt);
      tiltY += (tyT - tiltY) * ke; tiltX += (txT - tiltX) * ke;

      for (const t of tapes) {
        const r = rel(t.v, s);
        const x = F(r);
        if (Math.abs(x) > W / 2 + 1.5 * d) { if (!t.hidden) { t.el.style.visibility = 'hidden'; t.hidden = true; } continue; }
        if (t.hidden) { t.el.style.visibility = ''; t.hidden = false; }
        const o = smooth(Math.max(0, 1 - Math.abs(r)));
        const target = hover === t.v && Math.abs(r) > 0.5 ? 1 : 0;
        t.lift += (target - t.lift) * (reduce ? 1 : 1 - Math.exp(-12 * dt));
        t.el.style.transform = `translate3d(${x.toFixed(2)}px,${(-o * 0.025 * H - t.lift * 0.045 * H).toFixed(2)}px,${(o * 0.2 * H).toFixed(2)}px) rotateZ(${(-4.5 * o).toFixed(3)}deg) rotateX(${(tiltX * o).toFixed(3)}deg) rotateY(${(-90 * o + tiltY * o).toFixed(3)}deg)`;
        t.el.style.zIndex = Math.round(100 - Math.abs(r) * 4);
        t.sp.style.setProperty('--shade', (o * 0.55).toFixed(3));
        t.cv.style.setProperty('--shade', ((1 - o) * 0.5).toFixed(3));
        const isAct = Math.abs(r) < 0.5;
        if (isAct !== t.isAct) {
          t.isAct = isAct;
          if (isAct) t.cv.dataset.book = `${shelf.id}:${items[t.pos].i}`; else delete t.cv.dataset.book;
        }
      }

      // botón de abrir
      const ps = smooth(Math.max(0, 1 - Math.abs(Tt - s) * 3));
      play.style.transform = `translate(-50%,-50%) scale(${ps.toFixed(3)})`;
      play.style.left = `${W / 2 - 0.5 * d - 6}px`;
      play.style.top = `${sr.height / 2 + 0.36 * H}px`;
      play.style.pointerEvents = ps > 0.6 ? 'auto' : 'none';

      // cursor propio
      if (fine) {
        cx += (mx - cx) * (1 - Math.exp(-16 * dt)); cy += (my - cy) * (1 - Math.exp(-16 * dt));
        cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
        const over = inside ? document.elementFromPoint(mx, my) : null;
        const isBtn = !!(over && over.closest && over.closest('button, a') && !over.closest('.tape'));
        const cls = onCover ? 'open' : (hover >= 0 && Math.abs(rel(hover, s)) > 0.5 ? 'spine' : (isBtn ? 'btn' : ''));
        cursor.className = `shelfx__cursor${inside ? ' show' : ''}${cls ? ' ' + cls : ''}`;
      }
      requestAnimationFrame(frame);
    }
    const startLoop = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
    const stopLoop = () => { running = false; };

    // solo se anima mientras la sección está a la vista
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) startLoop(); else stopLoop(); }), { rootMargin: '200px 0px' }).observe(section);
    } else startLoop();

    /* ---------- arranque ---------- */
    let resizeT;
    window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(measure, 120); });
    requestAnimationFrame(() => { measure(); setActive(start, 1, false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    /* API usada por el resto de la página */
    shelf._refresh = (i) => { if (items[active] && items[active].i === i) refreshMeta(); };
    shelf._focus = (i) => { const pos = items.findIndex((x) => x.i === i); if (pos >= 0) Tt = Math.round(Tt) + shortest(pos); };
    return section;
  }

  window.BiblioHero = { build };
})();
