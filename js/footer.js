/* Footer "cortina": revela el footer al final, anima la palabra gigante y
   convierte las columnas en acordeón en el celular. */
(() => {
  const html = document.documentElement;
  const footer = document.querySelector('.site-footer');
  const main = document.querySelector('main');
  if (!footer || !main) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- palabra gigante: una letra por <span> ---- */
  const word = document.getElementById('sf-word');
  if (word) {
    const text = word.dataset.text || '';
    word.innerHTML = '<span class="w">' + [...text].map((ch, i) => `<span class="ch" style="--i:${i}">${ch}</span>`).join('') + '</span>';
  }

  /* ---- acordeón (solo se usa en pantallas chicas) ---- */
  footer.querySelectorAll('.sf__acc').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      // un solo panel abierto a la vez (mantiene el footer compacto)
      footer.querySelectorAll('.sf__acc').forEach((b) => {
        const on = b === btn && open;
        b.setAttribute('aria-expanded', String(on));
        document.getElementById(b.getAttribute('aria-controls')).classList.toggle('is-open', on);
      });
      // el footer cambia de alto: recalcula si entra en la pantalla
      requestAnimationFrame(fit);
    });
  });

  /* ---- cortina: solo si el footer cabe en la pantalla ---- */
  let curtain = false;
  function fit() {
    const ok = footer.offsetHeight <= window.innerHeight;
    if (ok !== curtain) { curtain = ok; html.classList.toggle('curtain', ok); }
    update();
  }

  /* ---- progreso de la revelación (0 = tapado, 1 = visible) ---- */
  let shown = false;
  function update() {
    const vh = window.innerHeight;
    const fh = footer.offsetHeight || 1;
    let revealed;
    if (curtain) revealed = vh - main.getBoundingClientRect().bottom;      // cuánto subió la página
    else revealed = vh - footer.getBoundingClientRect().top;               // footer en flujo normal
    const p = Math.max(0, Math.min(1, revealed / Math.min(fh, vh)));
    footer.style.setProperty('--p', p.toFixed(3));
    html.classList.toggle('footer-open', p > 0.3);

    if (word) {
      if (!shown && (p > 0.4 || reduce)) {
        shown = true; word.classList.add('is-in');
        setTimeout(() => word.classList.add('is-done'), 1700);
      } else if (shown && p < 0.12 && !reduce) {      // al volver a subir, se repite la animación
        shown = false; word.classList.remove('is-in', 'is-done');
      }
    }
  }

  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { update(); ticking = false; }); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(footer);
  fit();
})();
