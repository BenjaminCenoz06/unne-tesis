(() => {
/* ---------- Datos: categorías y libros ---------- */
// Paletas de portada: [color A, color B, color del texto]
const P = {
  wine:   ['#0a6b34', '#03271a', '#fff'],
  navy:   ['#075a33', '#021c12', '#fff'],
  forest: ['#00482a', '#021f14', '#f0dfae'],
  sun:    ['#e8c877', '#c9953a', '#2a1c04'],
  teal:   ['#2c8a6a', '#0f4d3b', '#fff'],
  plum:   ['#3b4a3f', '#18221b', '#f0dfae'],
  coral:  ['#26a047', '#0d6b2b', '#fff'],
  slate:  ['#2f3a33', '#121a15', '#fff'],
  sand:   ['#efe6cc', '#d3c394', '#1e1a0c'],
  sky:    ['#8fd0a2', '#3f9b62', '#03271a'],
};

const SHELVES = [
  {
    id: 'ficcion',
    title: 'Novela y ficción',
    books: [
      ['Cien años de soledad', 'Gabriel García Márquez', 471, 3, 'sun', 'cien-anos-de-soledad', 0, 1, 1967, [4.1, 90]],
      ['Rayuela', 'Julio Cortázar', 600, 2, 'wine', 'rayuela', 0, 1, 1963, [4.2, 13]],
      ['Ficciones', 'Jorge Luis Borges', 224, 4, 'navy', 'ficciones', 0, 1, 1944, [4.4, 40]],
      ['La casa de los espíritus', 'Isabel Allende', 448, 0, 'plum', 'la-casa-de-los-espiritus', 0, 1, 1982, [4.4, 27]],
      ['Pedro Páramo', 'Juan Rulfo', 160, 5, 'sand', 'pedro-paramo', 0, 1, 1955, [4.1, 29]],
      ['El túnel', 'Ernesto Sabato', 65, 2, 'slate', 'el-tunel', 1, 1, 1948, [4.1, 38]],
      ['La sombra del viento', 'Carlos Ruiz Zafón', 455, 1, 'forest', 'la-sombra-del-viento', 1, 2, 2001, [4.3, 52]],
      ['Los detectives salvajes', 'Roberto Bolaño', 653, 0, 'coral', 'los-detectives-salvajes', 1, 2, 1998, [4.3, 8]],
    ],
  },
  {
    id: 'ciencia',
    title: 'Ciencia y tecnología',
    books: [
      ['Breve historia del tiempo', 'Stephen Hawking', 177, 4, 'navy', 'breve-historia-del-tiempo', 1, 1, 1988, [4.1, 239]],
      ['Cosmos', 'Carl Sagan', 372, 2, 'plum', 'cosmos', 1, 2, 1980, [4.6, 25]],
      ['El gen egoísta', 'Richard Dawkins', 345, 1, 'teal', 'el-gen-egoista', 1, 1, 1976, [4.3, 75]],
      ['Una breve historia de casi todo', 'Bill Bryson', 226, 3, 'sun', 'una-breve-historia-de-casi-todo', 1, 1, 2003, [4.2, 101]],
      ['El origen de las especies', 'Charles Darwin', 516, 0, 'forest', 'el-origen-de-las-especies', 1, 1, 1859, [4.3, 25]],
      ['Astrofísica para gente con prisa', 'Neil deGrasse Tyson', 30, 6, 'slate', 'astrofisica-para-gente-con-prisa', 1, 1, 2017, [4, 58]],
      ['El universo elegante', 'Brian Greene', 189, 2, 'sky', 'el-universo-elegante', 1, 1, 1999, [4.1, 27]],
      ['La doble hélice', 'James D. Watson', 93, 1, 'coral', 'la-doble-helice', 1, 1, 1968, [3.5, 6]],
    ],
  },
  {
    id: 'historia',
    title: 'Historia y sociedad',
    books: [
      ['Sapiens', 'Yuval Noah Harari', 480, 5, 'sand', 'sapiens', 1, 2, 2011, [4.2, 212]],
      ['Armas, gérmenes y acero', 'Jared Diamond', 728, 1, 'wine', 'armas-germenes-y-acero', 1, 2, 1997, [4.1, 153]],
      ['Las venas abiertas de América Latina', 'Eduardo Galeano', 158, 3, 'forest', 'las-venas-abiertas-de-america-latina', 1, 2, 1971, [4.5, 14]],
      ['SPQR', 'Mary Beard', 492, 0, 'slate', 'spqr', 1, 2, 2015, [3.9, 22]],
      ['Los orígenes del totalitarismo', 'Hannah Arendt', 427, 2, 'navy', 'los-origenes-del-totalitarismo', 1, 2, 1951, [4.6, 7]],
      ['Primera Guerra Mundial: Los antecedentes', 'Luppa', 49, 1, 'coral', 'la-primera-guerra-mundial', 1, 2, 2014, null],
      ['Historia de la India hasta el siglo VIII', 'Universidad de Delhi', 126, 2, 'sun', 'history-of-india', 1, 1, null, null],
      ['El Mediterráneo', 'Fernand Braudel', 720, 0, 'teal', 'el-mediterraneo', 0, 1, 1949, null],
    ],
  },
  {
    id: 'infantil',
    title: 'Infantil y juvenil',
    books: [
      ['El principito', 'Antoine de Saint-Exupéry', 96, 7, 'sky', 'el-principito', 0, 1, 1943, [3.9, 14]],
      ['Matilda', 'Roald Dahl', 154, 3, 'coral', 'matilda', 1, 2, 1988, [4.3, 282]],
      ['Alicia en el país de las maravillas', 'Lewis Carroll', 201, 4, 'plum', 'alicia-en-el-pais-de-las-maravillas', 1, 1, 1865, [4.1, 235]],
      ['Harry Potter y la piedra filosofal', 'J. K. Rowling', 146, 0, 'wine', 'harry-potter-y-la-piedra-filosofal', 1, 1, 1997, [4.2, 1058]],
      ['Charlie y la fábrica de chocolate', 'Roald Dahl', 85, 2, 'sun', 'charlie-y-la-fabrica-de-chocolate', 1, 1, 1964, [4.1, 287]],
      ['Peter Pan', 'J. M. Barrie', 6, 3, 'forest', 'peter-pan', 1, 1, 1911, [3.6, 46]],
      ['El jardín secreto', 'Frances Hodgson Burnett', 102, 1, 'teal', 'el-jardin-secreto', 1, 1, 1911, [3.9, 99]],
      ['Mujercitas', 'Louisa May Alcott', 255, 2, 'sand', 'mujercitas', 1, 1, 1868, [4.1, 126]],
    ],
  },
];

/* ---------- Utilidades ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};
const myRatings = store.get('bh_ratings', {});
// calificación = lectores de Open Library (b[9] = [promedio, votos]) + el voto de esta persona
function ratingOf(b) {
  const base = b[9] || [0, 0];
  const mine = myRatings[b[5]] || 0;
  const n = base[1] + (mine ? 1 : 0);
  const avg = n ? (base[0] * base[1] + mine) / n : 0;
  return { avg, n, mine, base: base[1] };
}
const fmtAvg = (x) => x.toFixed(1).replace('.', ',');
const starsHTML = (avg) => `<span class="stars" style="--v:${avg.toFixed(2)}" role="img" aria-label="${fmtAvg(avg)} de 5"><i></i></span>`;
function setRating(b, v) { if (v) myRatings[b[5]] = v; else delete myRatings[b[5]]; store.set('bh_ratings', myRatings); }
const vars = (key) => { const [a, b, t] = P[key]; return `--a:${a};--b:${b};--t:${t}`; };

const coverUrl = (b) => `images/covers/${b[5]}.jpg`;
function slideInner(b, shelfId, i) {
  const [title, author, pages, copies] = b;
  const rt = ratingOf(b);
  const year = b[8] ? b[8] : 's. f.';
  const status = copies > 0
    ? `<strong class="ok">${copies} ${copies === 1 ? 'copia disponible' : 'copias disponibles'}</strong>`
    : `<strong class="no">Prestado</strong>`;
  return `
      <a class="slide__cover book book--img" href="#${shelfId}" data-book="${shelfId}:${i}" aria-label="${esc(title)}, de ${esc(author)}">
        <img src="${coverUrl(b)}" alt="Portada de ${esc(title)}" width="600" height="830" loading="lazy" decoding="async" draggable="false">
        ${b[6] ? '<span class="book__tag">Leer online</span>' : ''}
      </a>
      <div class="slide__info">
        <span class="thumb" style="background-image:url('${coverUrl(b)}')" aria-hidden="true"></span>
        <div>
          <h3 class="slide__title">${esc(title)}</h3>
          <p class="slide__by">${esc(author)} · ${year}</p>
          <p class="slide__rate">${rt.n ? `${starsHTML(rt.avg)}<b>${fmtAvg(rt.avg)}</b><small>(${rt.n})</small>` : '<small>Sin calificaciones</small>'}</p>
          <p class="slide__meta">${status}</p>
        </div>
      </div>
      <a class="pill" href="#${shelfId}" data-book="${shelfId}:${i}">${copies > 0 ? 'Ver libro' : 'Reservar'}</a>`;
}
const slideHTML = (b, shelfId, i) => `<article class="slide" style="${vars(b[4])}">${slideInner(b, shelfId, i)}</article>`;

/* ---------- Carrusel ---------- */
function buildShelf(shelf) {
  const n = shelf.books.length;
  const section = document.createElement('section');
  section.className = 'shelf';
  section.id = shelf.id;
  section.setAttribute('aria-labelledby', `shelf-${shelf.id}`);
  section.innerHTML = `
    <div class="shelf__head">
      <h2 class="shelf__title" id="shelf-${shelf.id}">${esc(shelf.title)}</h2>
      <a class="shelf__more" href="#catalogo" data-open-search="catalog" data-cat="${esc(shelf.title)}">Ver toda la categoría</a>
    </div>
    <div class="carousel" role="group" aria-roledescription="carrusel" aria-label="${esc(shelf.title)}">
      <button class="carousel__arrow carousel__arrow--prev" aria-label="Libro anterior"><svg><use href="#i-arrow"/></svg></button>
      <div class="carousel__viewport">${shelf.books.map((b, i) => slideHTML(b, shelf.id, i)).join('')}</div>
      <button class="carousel__arrow carousel__arrow--next" aria-label="Libro siguiente"><svg><use href="#i-arrow"/></svg></button>
      <div class="carousel__dots">
        ${shelf.books.map((b, i) => `<button aria-label="Ir al libro ${i + 1}: ${esc(b[0])}"></button>`).join('')}
      </div>
    </div>`;

  const slides = [...section.querySelectorAll('.slide')];
  const dots = [...section.querySelectorAll('.carousel__dots button')];
  const viewport = section.querySelector('.carousel__viewport');
  let current = 0;

  function render() {
    slides.forEach((s, i) => {
      // desplazamiento circular más corto respecto al activo
      let o = i - current;
      if (o > n / 2) o -= n;
      if (o < -n / 2) o += n;
      s.style.setProperty('--o', o);
      s.dataset.d = Math.abs(o);
      const hidden = Math.abs(o) > 2;
      s.classList.toggle('is-active', o === 0);
      s.classList.toggle('is-hidden', hidden);
      s.setAttribute('aria-hidden', String(hidden));
      s.querySelectorAll('a').forEach((a) => { a.tabIndex = hidden ? -1 : 0; });
    });
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === current)));
  }
  const go = (i) => { current = (i + n) % n; render(); };

  section.querySelector('.carousel__arrow--prev').addEventListener('click', () => go(current - 1));
  section.querySelector('.carousel__arrow--next').addEventListener('click', () => go(current + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
  slides.forEach((s, i) => s.addEventListener('click', (e) => {
    if (i !== current && !s.classList.contains('is-hidden')) { e.preventDefault(); go(i); }
  }));

  // Teclado y gesto de deslizar
  section.querySelector('.carousel').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(current - 1);
    if (e.key === 'ArrowRight') go(current + 1);
  });
  let startX = null;
  viewport.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  viewport.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 45) go(current + (dx < 0 ? 1 : -1));
  });

  render();
  shelf._refresh = (i) => { slides[i].innerHTML = slideInner(shelf.books[i], shelf.id, i); render(); };
  shelf._focus = (i) => go(i);
  return section;
}

/* ---------- Cinta de anuncios ---------- */
const TICKER = [
  'Carné gratuito para toda la comunidad',
  'Hasta 5 libros por 21 días',
  'Renovación en línea sin costo',
  'Reserve su libro desde casa',
];
const tickerItems = [...TICKER, ...TICKER].map((t) =>
  `<span class="ticker__item"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>${esc(t)}</span>`
).join('');
document.getElementById('ticker-track').innerHTML = tickerItems + tickerItems;

/* ---------- Montaje ---------- */
const mount = document.getElementById('shelves');
SHELVES.forEach((s) => mount.appendChild(buildShelf(s)));

/* API pública para js/app.js */
/* Si se sube libros/<slug>.pdf, el libro pasa a "Leer ahora" solo, sin tocar el código */
SHELVES.forEach((sh) => sh.books.forEach((b, i) => {
  if (b[6]) return;
  fetch(`libros/${b[5]}.pdf`, { method: 'HEAD' })
    .then((r) => { if (r.ok && /pdf/i.test(r.headers.get('content-type') || '')) { b[6] = 1; if (sh._refresh) sh._refresh(i); } })
    .catch(() => {});
}));

window.Biblio = Object.assign(window.Biblio || {}, {
  SHELVES, P, bookVars: vars, coverUrl, ratingOf, setRating, starsHTML, fmtAvg,
  refreshBook(shelfId, i) { const s = SHELVES.find((x) => x.id === shelfId); if (s && s._refresh) s._refresh(i); },
  focusBook(shelfId, i) { const s = SHELVES.find((x) => x.id === shelfId); if (s && s._focus) s._focus(i); },
});
})();
