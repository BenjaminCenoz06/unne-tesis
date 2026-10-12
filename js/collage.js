(() => {
  const COMMONS = 'https://commons.wikimedia.org/wiki/';
  const img = (file) => `${COMMONS}Special:FilePath/${encodeURIComponent(file)}?width=640`;
  const vid = (path) => `https://upload.wikimedia.org/wikipedia/commons/${path}`;

  /*
    x, y, w: posición y ancho en % del collage · r: rotación (grados)
    ar: proporción del recuadro · frame: 'polaroid' | 'bare'
  */
  const ITEMS = [
    // ---- izquierda ----
    { type: 'img', file: 'Abdul_Karim_Sahityavisharad_Reference_Library_(01).jpg', author: 'Moheen Reeyad', lic: 'CC BY-SA 4.0', x: -1, y: 8, w: 13, r: -4, ar: '4/3', frame: 'bare', alt: 'Biblioteca de referencia con estantes de libros' },
    { type: 'img', file: 'Interior_of_University_of_Texas_at_Arlington_Library_(10003723).jpg', author: 'University of Texas at Arlington Photograph Collection', lic: 'CC BY 4.0', x: 12, y: 1, w: 14, r: 3, ar: '4/3', frame: 'polaroid', alt: 'Interior de una biblioteca universitaria' },
    { type: 'img', file: 'Jean_Baptiste_Camille_Corot_-_Interrupted_Reading_-_1922.410_-_Art_Institute_of_Chicago.jpg', author: 'Jean-Baptiste-Camille Corot', lic: 'Dominio público', x: 25, y: 15, w: 10.5, r: -2, ar: '3/4', frame: 'bare', alt: 'Pintura de Corot: lectura interrumpida' },
    { type: 'img', file: 'Books_on_a_table_at_State_Central_Library.jpg', author: 'Saiphani02', lic: 'CC BY 4.0', x: 2, y: 34, w: 17, r: 2, ar: '1/1', frame: 'polaroid', alt: 'Libros sobre una mesa en una biblioteca central' },
    { type: 'img', file: 'Interior_view._The_Leadhills_Miners_Library_books.jpg', author: 'Rosser1954', lic: 'CC BY 4.0', x: 20, y: 46, w: 14, r: -3, ar: '4/3', frame: 'polaroid', alt: 'Libros antiguos en la biblioteca de Leadhills' },
    { type: 'vid', src: vid('2/2f/Reading_beginning_book_Ada_%26_Zangemann_by_Alexis_Kauffmann.webm'), file: 'Reading_beginning_book_Ada_&_Zangemann_by_Alexis_Kauffmann.webm', author: 'Wikimedia Commons', lic: 'CC BY-SA 4.0', x: 3, y: 66, w: 12, r: 4, ar: '3/4', frame: 'bare', alt: 'Video: lectura del comienzo de un libro' },
    { type: 'img', file: 'Library_books_(3553821327).jpg', author: 'CCAC North Library', lic: 'CC BY 2.0', x: 17, y: 69, w: 15, r: -2, ar: '4/3', frame: 'polaroid', alt: 'Pila de libros de biblioteca' },

    // ---- centro ----
    { type: 'img', file: 'Sias_Library_Interior.jpg', author: 'Gary Todd', lic: 'CC0', x: 37, y: 62, w: 12.5, r: -3, ar: '4/3', frame: 'polaroid', alt: 'Interior de una biblioteca' },
    { type: 'img', file: 'Books_in_the_library,_Coleton_Fishacre_-_geograph.org.uk_-_5719042.jpg', author: 'Derek Harper', lic: 'CC BY-SA 2.0', x: 29, y: 36, w: 9, r: -5, ar: '3/4', frame: 'bare', alt: 'Libros en una biblioteca histórica' },

    // ---- derecha ----
    { type: 'img', file: 'Lisa_Marie_Actress_reading_the_book_Unbound_03_sunset.jpg', author: 'GrubletGrutKing', lic: 'CC0', x: 50, y: 0, w: 11.5, r: -5, ar: '3/4', frame: 'bare', alt: 'Persona leyendo un libro al atardecer' },
    { type: 'vid', src: vid('1/15/Printing_in_a_letterpress.webm'), file: 'Printing_in_a_letterpress.webm', author: 'Subhashish Panigrahi', lic: 'CC BY-SA 4.0', x: 64, y: 9, w: 11.5, r: 3, ar: '1/1', frame: 'polaroid', alt: 'Video: impresión con tipos móviles' },
    { type: 'img', file: 'International_books_at_Kent_Library.jpg', author: 'Roc0ast3r', lic: 'CC0', x: 77, y: 1, w: 9.5, r: 0, ar: '3/4', frame: 'bare', alt: 'Libros internacionales en una biblioteca' },
    { type: 'img', file: 'Man_sitting_on_a_bench_reading_a_book,_Palácio_das_Galveias,_Lisbon,_Portugal_julesvernex2.jpg', author: 'Jules Verne Times Two', lic: 'CC BY-SA 4.0', x: 88, y: 3, w: 11.5, r: 4, ar: '4/3', frame: 'polaroid', alt: 'Hombre leyendo en un banco en Lisboa' },
    { type: 'img', file: 'Elderly_person_reading_a_book_while_lying_on_a_couch_in_a_living_room_during_the_afternoon.jpg', author: 'Shixart1985', lic: 'CC BY 2.0', x: 56, y: 46, w: 14, r: 2, ar: '4/3', frame: 'polaroid', alt: 'Persona mayor leyendo en un sillón' },
    { type: 'img', file: 'Chinese_books_in_Jubilee_Library,_Brighton_2026-09-29.jpg', author: 'Andy Li', lic: 'CC0', x: 72, y: 33, w: 10.5, r: -3, ar: '1/1', frame: 'bare', alt: 'Libros en chino en una biblioteca' },
    { type: 'img', file: 'Books_for_lending_library,_Mitchell_Building.jpg', author: 'Pix Magazine Photographer', lic: 'Dominio público', x: 86, y: 36, w: 13, r: 3, ar: '4/3', frame: 'polaroid', alt: 'Libros para una biblioteca de préstamo' },
  ];

  const root = document.getElementById('collage');
  const credits = document.getElementById('credits-list');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  ITEMS.forEach((it, i) => {
    const tile = document.createElement('figure');
    tile.className = `tile tile--${it.frame}`;
    tile.style.cssText = `--x:${it.x}%;--y:${it.y}%;--w:${it.w}%;--r:${it.r}deg;--ar:${it.ar};--d:${(i % 8) * 90}ms`;

    if (it.type === 'vid') {
      tile.classList.add('tile--video');
      tile.innerHTML = `
        <div class="tile__media">
          <video muted loop playsinline preload="metadata" src="${it.src}" aria-label="${esc(it.alt)}"></video>
          <span class="tile__play" aria-hidden="true"></span>
        </div>`;
    } else {
      tile.innerHTML = `<div class="tile__media"><img src="${img(it.file)}" alt="${esc(it.alt)}" loading="lazy" decoding="async"></div>`;
    }
    root.appendChild(tile);

    const li = document.createElement('li');
    li.innerHTML = `<a href="${COMMONS}File:${encodeURIComponent(it.file)}" target="_blank" rel="noopener">${esc(it.alt)}</a> — ${esc(it.author)}, ${esc(it.lic)}`;
    credits.appendChild(li);
  });

  /* Aparición al hacer scroll */
  const tiles = [...root.querySelectorAll('.tile')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    tiles.forEach((t) => t.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    tiles.forEach((t) => io.observe(t));
  }

  /* Videos: reproducir solo cuando están a la vista */
  const vids = [...root.querySelectorAll('video')];
  if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target;
        if (e.isIntersecting) {
          v.play().then(() => v.closest('.tile').classList.add('playing')).catch(() => {});
        } else {
          v.pause();
          v.closest('.tile').classList.remove('playing');
        }
      });
    }, { threshold: 0.4 });
    vids.forEach((v) => vio.observe(v));
  }
})();
