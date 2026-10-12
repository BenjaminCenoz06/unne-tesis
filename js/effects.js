/* ---------- Efectos: header, progreso, parallax y reveal ---------- */
(() => {
  const root = document.documentElement;
  const header = document.getElementById('site-header');
  const progress = document.getElementById('progress');
  const preloader = document.getElementById('preloader');
  const heroBg = document.getElementById('hero-bg');
  const heroText = document.getElementById('hero-text');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Precarga: cortina verde con el logo y entrada del hero */
  const ready = () => {
    root.classList.add('is-ready');
    if (preloader) {
      preloader.classList.add('is-done');
      setTimeout(() => preloader.remove(), 1400);
    }
  };
  if (reduce) { ready(); }
  else {
    const minWait = new Promise((r) => setTimeout(r, 900));
    const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
    Promise.race([Promise.all([minWait, loaded]), new Promise((r) => setTimeout(r, 3500))]).then(ready);
  }

  /* Header: transparente arriba, sólido al hacer scroll o con un menú abierto */
  const state = { scrolled: false, menu: false };
  function paintHeader() {
    header.classList.toggle('is-scrolled', state.scrolled);
    header.classList.toggle('is-solid', state.scrolled || state.menu);
  }
  window.__headerMenu = (open) => { state.menu = open; paintHeader(); };

  /* Scroll: progreso, parallax y desvanecido del hero */
  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    state.scrolled = y > 40;
    paintHeader();

    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;

    if (!reduce && heroBg && y < window.innerHeight * 1.2) {
      heroBg.style.setProperty('--py', `${y * 0.28}px`);
      if (heroText) {
        const t = Math.min(1, y / (window.innerHeight * 0.7));
        heroText.style.opacity = String(1 - t * 0.9);
        heroText.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
      }
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* Reveal al entrar en pantalla (con escalonado entre hermanos) */
  const TARGETS = [
    '.section-title', '.eyebrow', '.cards > li', '.shelf__head', '.carousel',
    '.spotlight .feature', '.branch__finder', '.pride__title', '.reasons',
    '.voices__avatars', '.voices__wall', '.footer__brand', '.footer__col', '.footer__bottom',
    '.finder', '.research__grid', '.about__text', '.about__stats', '.team__head', '.team__grid', '.team__cta',
  ];
  const els = [...document.querySelectorAll(TARGETS.join(','))];
  els.forEach((el) => {
    const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(TARGETS.join(','))) : [];
    el.style.setProperty('--i', String(Math.max(0, sibs.indexOf(el))));
    el.setAttribute('data-reveal', '');
  });

  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* HERO_VIDEO: calidad según pantalla y conexión; si no se puede, queda la foto */
  const video = document.getElementById('hero-video');
  if (video && !reduce) {
    const conn = navigator.connection || {};
    const saver = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
    if (!saver) {
      const w = Math.max(window.screen.width, window.innerWidth) * (window.devicePixelRatio || 1);
      const mobile = window.matchMedia('(max-width: 960px)').matches;
      const order = mobile && w < 1100 ? ['720', '1080'] : ['1080', '720'];
      let i = 0;
      const load = () => {
        if (i >= order.length) return;
        video.src = 'videos/hero-' + order[i++] + '.mp4';
        video.load();
      };
      video.addEventListener('error', load);
      video.addEventListener('playing', () => video.classList.add('is-playing'));
      load();
      const tryPlay = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
      video.addEventListener('loadeddata', tryPlay);
      // pausa cuando no se ve (ahorra batería y datos)
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) tryPlay(); else video.pause(); }), { threshold: 0.05 }).observe(video);
      }
      document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else tryPlay(); });
    }
  }
})();
