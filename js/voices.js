(window.BiblioCloud ? window.BiblioCloud.ready : Promise.resolve()).then(() => {
  const photo = (f) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=640`;

  // t: tarjeta de texto · i: tarjeta de imagen
  const T = (initial, hue, title, tags, quote, h) => ({ k: 't', initial, hue, title, tags, quote, h });
  const I = (file, alt, h) => ({ k: 'i', src: photo(file), alt, h });

  const COLUMNS = [
    [
      T('E', 190, 'Estudiantes', 'Estudio · Salas silenciosas', 'Encontré todo el material de mi tesis sin salir del edificio.', 150),
      T('F', 330, 'Familias', 'Cuentacuentos · Sección infantil', 'Mis hijos piden ir a la biblioteca todos los fines de semana.', 230),
      T('N', 40, 'Nuevos lectores', 'Alfabetización · Idiomas', 'Aprendí a leer en español con tutoría gratuita.', 190),
    ],
    [
      I('Library_of_Birmingham_books_2024-07-19_-_2.jpg', 'Estantes con libros en una biblioteca moderna', 145),
      T('D', 270, 'Docentes', 'Aulas · Préstamo en bloque', 'Armamos cajas de lectura para todo el curso, con seguimiento.', 170),
      T('A', 150, 'Adultos mayores', 'Clubes · Talleres', 'El club de lectura se volvió mi cita favorita de la semana.', 210),
    ],
    [
      T('L', 220, 'Escritores', 'Archivo · Sala de escritura', 'Un lugar para escribir sin distracciones, con todo a mano.', 200),
      I('Sias_Library_Interior.jpg', 'Interior de una biblioteca luminosa', 145),
      T('J', 20, 'Jóvenes', 'Préstamo digital · Cómics', 'Leo en el celular con mi carnet, sin pagar nada.', 150),
    ],
    [
      I('Zevulun_Hammer_library_books_3_2019.jpg', 'Libros en los estantes de una biblioteca', 145),
      T('I', 300, 'Investigadores', 'Colecciones · Archivo', 'Acceso a colecciones especiales y ayuda real de bibliotecarios.', 230),
      I('Yatomi_City_Library_new_books_ac.jpg', 'Mesa de novedades con libros nuevos', 145),
    ],
    [
      T('C', 100, 'Comunidad', 'Eventos · Exposiciones', 'Pasamos de buscar un libro a encontrar nuestro lugar en el barrio.', 210),
      T('T', 0, 'Trabajadores', 'Empleo · Computadoras', 'Armé mi currículum y conseguí trabajo con la ayuda de la biblioteca.', 190),
      I('Houghton_Hall,_A_small_selection_of_books_in_the_library_-_geograph.org.uk_-_5082555.jpg', 'Libros antiguos en una biblioteca histórica', 145),
    ],
  ];

  const GO = { 'Estudiantes': '#servicios', 'Familias': '#eventos', 'Docentes': '#catalogo', 'Adultos mayores': '#eventos', 'Escritores': '#investigacion', 'Jóvenes': '#catalogo', 'Investigadores': '#investigacion', 'Comunidad': '#comunidad', 'Trabajadores': '#servicios', 'Nuevos lectores': '#servicios' };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const dest = (c) => c.link || GO[c.title] || '#servicios';
  const goAttr = (c) => (dest(c)[0] === '#' ? `data-go="${esc(dest(c))}"` : 'target="_blank" rel="noopener noreferrer"');
  const cardHTML = (c) => c.k === 'i'
    ? `<figure class="vcard vcard--img" style="--h:${c.h}px"><img src="${c.src}" alt="${esc(c.alt)}" decoding="async"></figure>`
    : `
      <article class="vcard" style="--h:${c.h}px;--hue:${c.hue}">
        <header>
          <span class="vcard__av">${esc(c.initial)}</span>
          <div>
            <h3>${esc(c.title)}</h3>
            <p>${esc(c.tags)}</p>
          </div>
        </header>
        <blockquote><span aria-hidden="true">”</span>${esc(c.quote)}</blockquote>
        <a class="vcard__more" href="${esc(dest(c))}" ${goAttr(c)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>Conocer más</a>
      </article>`;

  // Testimonios publicados desde el panel: reemplazan a los textos y conservan el lugar de las fotos
  const CT = window.BiblioCloud && window.BiblioCloud.data.testimonials;
  if (Array.isArray(CT) && CT.length) {
    const cards = CT.map((t) => ({
      k: 't', initial: String(t.initial || '?').slice(0, 2), hue: Number(t.hue) || 0, title: t.title, tags: t.tags || '', quote: t.quote,
      h: Number(t.height) || 190, link: /^(#[\w-]+|https:\/\/[^\s"'<>]+)$/.test(t.link || '') ? t.link : '',
    }));
    let n = 0;
    COLUMNS.forEach((col, ci) => {
      COLUMNS[ci] = col.reduce((acc, c) => { if (c.k === 'i') acc.push(c); else if (n < cards.length) acc.push(cards[n++]); return acc; }, []);
    });
    while (n < cards.length) { COLUMNS[n % COLUMNS.length].push(cards[n]); n++; }
  }

  const wall = document.getElementById('voices-wall');
  COLUMNS.forEach((col, i) => {
    const html = col.map(cardHTML).join('');
    const el = document.createElement('div');
    el.className = 'vcol';
    el.style.setProperty('--dur', `${46 + i * 7}s`);
    el.style.setProperty('--delay', `${-i * 9}s`);
    // el contenido se duplica para un desplazamiento continuo
    el.innerHTML = `<div class="vcol__track${i % 2 ? ' is-reverse' : ''}">${html}${html.replace(/<a class="vcard__more"/g, '<a tabindex="-1" class="vcard__more"')}</div>`;
    // la copia duplicada no debe leerse dos veces
    const track = el.firstElementChild;
    [...track.children].slice(col.length).forEach((n) => n.setAttribute('aria-hidden', 'true'));
    wall.appendChild(el);
  });
});
