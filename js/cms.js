/* =========================================================
   BiblioHub · contenido editable desde el panel de administración
   Lee de Supabase SOLO lo publicado (claves públicas: la seguridad la dan
   las reglas RLS de la base). Si la base no responde, la página usa su
   contenido de siempre, así que nunca queda rota.
   Expone window.BiblioCloud = { data, ready, setting } para los otros scripts.
   ========================================================= */
(() => {
  const CLOUD = { url: 'https://lqjehkbkorsqnkegzdna.supabase.co', key: 'sb_publishable_CzakNo7X3nKT4CRxFWO6nA_u4g_OGz6' };
  const TIMEOUT = 2500;

  const get = (path) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT);
    return fetch(`${CLOUD.url}/rest/v1/${path}`, { headers: { apikey: CLOUD.key }, signal: ctl.signal })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .finally(() => clearTimeout(t));
  };

  const PUB = 'status=eq.published';
  const jobs = {
    settings: get('site_settings?select=value&key=eq.site').then((r) => (r[0] && r[0].value) || {}),
    categories: get(`categories?select=id,title,position&${PUB}&order=position`),
    books: get(`books?select=slug,title,author,pages,copies,year,category_id,pdf_path,cover_path,ol_rating,ol_votes,position&${PUB}&order=position,title`),
    team: get(`team_members?select=name,role,bio,focus,img,photo_url,position&${PUB}&order=position`),
    branches: get(`branches?select=name,addr,hours,tel,tag,position&${PUB}&order=position`),
    events: get(`events?select=title,month,day,category,body,summary&${PUB}&order=month,day`),
    testimonials: get(`testimonials?select=initial,hue,title,tags,quote,height,link,position&${PUB}&order=position`),
  };

  const data = {};
  const names = Object.keys(jobs);
  const ready = Promise.all(names.map((n) => jobs[n].then((v) => { data[n] = v; }, () => { data[n] = null; })));
  const setting = (key, fallback) => {
    const v = data.settings && data.settings[key];
    return v === undefined || v === null || v === '' ? fallback : v;
  };
  window.BiblioCloud = { CLOUD, data, ready, setting };

  /* ---------- Ajustes del sitio ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const isUrl = (v) => /^https:\/\/[^\s"'<>]+$/i.test(v);

  // reemplaza el primer texto de un elemento y respeta íconos u otros hijos
  const setText = (el, text, tail = '') => {
    if (!el || !text) return;
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (node) node.textContent = text + tail;
    else el.insertBefore(document.createTextNode(text + tail), el.firstChild);
  };
  const setLines = (el, text) => { if (el && text) el.innerHTML = esc(text).replace(/\r?\n/g, '<br>'); };

  const SOCIAL = {
    social_instagram: ['Instagram', '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/>'],
    social_facebook: ['Facebook', '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6.5v3.5H9V21h3.5v-8.5h2.5L15.5 9h-3V6.5c0-.3.2-.5.5-.5H15z"/>'],
    social_youtube: ['YouTube', '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.5 9.5v5l4.5-2.5z"/>'],
    social_x: ['X', '<path d="M4 4l16 16M20 4L4 20"/>'],
    social_tiktok: ['TikTok', '<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.5 2.5 2 4 5 4"/>'],
  };

  function announce(s) {
    const text = str(s.announce_text);
    if (String(s.announce_active) !== 'true' || !text) return;
    try { if (sessionStorage.getItem('bh_ann') === text) return; } catch (e) { /* sin sessionStorage */ }
    const link = str(s.announce_link);
    const href = isUrl(link) || /^#[\w-]+$/.test(link) ? link : '';
    const st = document.createElement('style');
    st.textContent = '.annc{position:fixed;left:16px;bottom:16px;z-index:90;max-width:min(560px,calc(100vw - 110px));display:flex;align-items:center;gap:12px;padding:12px 14px 12px 16px;border-radius:14px;background:#03271a;color:#fff;font:500 14px/1.4 var(--font-sans,system-ui);box-shadow:0 14px 40px rgba(0,0,0,.28);border:1px solid rgba(240,223,174,.35)}.annc a{color:var(--gold,#d9ab4a);font-weight:700;white-space:nowrap}.annc button{flex:none;width:28px;height:28px;border-radius:50%;color:#fff;font-size:18px;line-height:1;background:rgba(255,255,255,.12)}.annc button:hover{background:rgba(255,255,255,.24)}@media(max-width:560px){.annc{left:10px;bottom:84px;max-width:calc(100vw - 20px)}}';
    document.head.appendChild(st);
    const box = document.createElement('div');
    box.className = 'annc';
    box.setAttribute('role', 'status');
    box.innerHTML = `<span>${esc(text)}</span>${href ? `<a href="${esc(href)}"${href[0] === '#' ? '' : ' target="_blank" rel="noopener noreferrer"'}>Ver más</a>` : ''}<button type="button" aria-label="Cerrar aviso">×</button>`;
    box.querySelector('button').addEventListener('click', () => {
      box.remove();
      try { sessionStorage.setItem('bh_ann', text); } catch (e) { /* sin sessionStorage */ }
    });
    document.body.appendChild(box);
  }

  function applySettings(s) {
    // inicio
    setText($('.hero__eyebrow span'), str(s.hero_eyebrow));
    setText($('.hero__title .line:nth-child(1) span'), str(s.hero_line1));
    const l2 = $('.hero__title .line:nth-child(2) > span');
    if (l2) {
      if (str(s.hero_line2_pre) && l2.firstChild && l2.firstChild.nodeType === 3) l2.firstChild.textContent = str(s.hero_line2_pre) + ' ';
      if (str(s.hero_line2_em) && l2.querySelector('em')) l2.querySelector('em').textContent = str(s.hero_line2_em);
    }
    setText($('.hero__lead'), str(s.hero_lead));
    setText($('.hero__cta .btn--gold'), str(s.hero_btn1), ' ');
    setText($('.hero__cta .btn--ghost'), str(s.hero_btn2));

    // títulos de sección
    [['borrow_title', '#borrow-title'], ['spot_title', '#spot-title'], ['branch_title', '#branch-title'], ['pride_title', '#pride-title'],
     ['research_title', '#research-title'], ['voices_title', '#voices-title'], ['about_title', '#about-title'], ['team_title', '#team-title'],
     ['footer_tagline', '#sf-title']].forEach(([k, sel]) => setLines($(sel), str(s[k])));
    setText($('.sf__lead'), str(s.footer_lead));
    setText($('.sf__legal p:first-child'), str(s.legal_text));

    // contacto
    const mail = str(s.contact_email);
    if (/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(mail)) {
      $$('a[href^="mailto:"]').forEach((a) => { a.href = `mailto:${mail}`; if (/@/.test(a.textContent)) a.textContent = mail; });
    }
    const wa = str(s.contact_whatsapp).replace(/\D/g, '');
    if (/^\d{8,15}$/.test(wa)) $$('a[href^="https://wa.me/"]').forEach((a) => { a.href = a.href.replace(/wa\.me\/\d+/, `wa.me/${wa}`); });
    const waMsg = str(s.wa_message);
    const fl = $('.wa-float');
    if (fl && waMsg) fl.href = `${fl.href.split('?')[0]}?text=${encodeURIComponent(waMsg)}`;
    setText($('.wa-float__label'), str(s.wa_label));
    if (fl && str(s.wa_label)) fl.setAttribute('aria-label', str(s.wa_label));
    setText($('.sf__panel a[href^="https://wa.me/"]'), str(s.contact_whatsapp_label));
    const phones = $$('.sf__panel a[href^="tel:"]');
    [s.contact_phone1, s.contact_phone2].forEach((p, i) => {
      const v = str(p);
      if (phones[i] && /^[\d\s()+\-]{6,30}$/.test(v)) { phones[i].href = `tel:${v.replace(/[^+\d]/g, '')}`; phones[i].textContent = v; }
    });

    // redes sociales (se agregan en el pie, antes del logo)
    const list = $('.sf__social');
    if (list) {
      const anchor = list.lastElementChild;
      Object.keys(SOCIAL).forEach((k) => {
        const url = str(s[k]);
        if (!isUrl(url)) return;
        const li = document.createElement('li');
        li.innerHTML = `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${SOCIAL[k][0]}"><svg viewBox="0 0 24 24" aria-hidden="true">${SOCIAL[k][1]}</svg></a>`;
        list.insertBefore(li, anchor);
      });
    }

    // color de acento
    const gold = str(s.color_gold);
    if (/^#[0-9a-f]{6}$/i.test(gold)) {
      const r = document.documentElement.style;
      r.setProperty('--gold', gold);
      r.setProperty('--gold-hover', `color-mix(in srgb, ${gold} 82%, white)`);
      r.setProperty('--gold-soft', `color-mix(in srgb, ${gold} 35%, white)`);
    }

    announce(s);
  }

  jobs.settings.then((s) => { try { applySettings(s); } catch (e) { /* la página sigue con su contenido */ } }, () => {});
})();
