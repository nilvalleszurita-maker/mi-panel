// Módulo Mood: registro diario de ánimo, energía, etiquetas y una frase,
// con tres formas de mirarlo: Diario, Semanas y Tarro (días buenos).
//
// Datos en Store.get().mood (→ tabla mood_registro en Supabase):
//   entradas: { 'AAAA-MM-DD': { animo 1–5, energia 1–5, etiquetas: [..], frase, creado, editado } }
//   etiquetas: lista de etiquetas disponibles (editable)
//   pinHash: SHA-256 del PIN (null = sin PIN). El PIN solo oculta la pantalla en
//            este dispositivo; los datos siguen guardados en el navegador.
const Mood = (() => {
  const NIVELES = [
    null,
    { label: 'Muy mal', color: '#ff8a80', boca: 'M8 17 Q12 12 16 17' },
    { label: 'Mal', color: '#f5a524', boca: 'M8 16.5 Q12 14 16 16.5' },
    { label: 'Normal', color: '#b4bdcc', boca: 'M8 15.5 L16 15.5' },
    { label: 'Bien', color: '#8fa8ff', boca: 'M8 14.5 Q12 17.5 16 14.5' },
    { label: 'Muy bien', color: '#7dd3a8', boca: 'M7.5 13.5 Q12 19.5 16.5 13.5' },
  ];
  const ETIQUETAS_BASE = ['Estudio', 'Exámenes', 'Gym', 'Correr', 'Trabajo', 'Amigos', 'Familia', 'Dormí mal', 'Mucho móvil', 'Proyectos'];
  const INICIALES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  let vista = 'diario';          // 'diario' | 'semanas' | 'tarro'
  let filtro = 'todos';          // 'todos' | 'buenos' | 'malos'
  let busqueda = '';
  let abiertas = new Set();      // semanas desplegadas (clave = lunes ISO)
  let recuerdo = null;           // fecha del recuerdo sacado del tarro
  let borrador = null;           // { fecha, animo, energia, etiquetas:Set, frase }
  let desbloqueado = false;      // solo en memoria: al recargar vuelve a pedir PIN
  let pinModo = null;            // null | 'poner' | 'quitar'
  let editEtiquetas = false;

  const m = () => {
    const s = Store.get();
    if (!s.mood) s.mood = { entradas: {}, etiquetas: [...ETIQUETAS_BASE], pinHash: null };
    if (!s.mood.etiquetas?.length) s.mood.etiquetas = [...ETIQUETAS_BASE];
    return s.mood;
  };
  const entradas = () => Object.entries(m().entradas).map(([f, e]) => ({ fecha: f, ...e })).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const fmt = n => String(Math.round(n * 10) / 10).replace('.', ',');
  const fechaLarga = f => { const d = U.deIso(f); return `${U.DIAS[U.diaSemana(d)].slice(0, 3).toLowerCase()} ${d.getDate()} ${U.MESES[d.getMonth()].slice(0, 3)}`; };

  const cara = (n, size = 30) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${NIVELES[n].color}" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><circle cx="9" cy="10" r=".9" fill="${NIVELES[n].color}"></circle><circle cx="15" cy="10" r=".9" fill="${NIVELES[n].color}"></circle><path d="${NIVELES[n].boca}"></path></svg>`;

  async function hash(txt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mi-panel-mood:' + txt));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function nuevoBorrador(fecha = U.iso()) {
    const e = m().entradas[fecha];
    borrador = { fecha, animo: e?.animo || 0, energia: e?.energia || 0, etiquetas: new Set(e?.etiquetas || []), frase: e?.frase || '' };
  }

  // ---------- Pintado ----------
  function render(el) {
    if (m().pinHash && !desbloqueado) { el.innerHTML = pantallaPin(); return; }
    if (!borrador) nuevoBorrador();
    const yaHoy = !!m().entradas[borrador.fecha];
    el.innerHTML = `
      <header class="hoy-cab">
        <div class="hoy-saludo">
          <span class="hoy-fecha">Mood</span>
          <h1>Cómo estoy</h1>
        </div>
        <button class="enlace peq" data-acc="pin">${m().pinHash ? '🔒 Quitar PIN' : 'Poner PIN'}</button>
      </header>
      ${pinModo ? formPin() : ''}
      <section class="mood-registro">
        <div class="cab-seccion">
          <h2>${borrador.fecha === U.iso() ? '¿Cómo ha ido hoy?' : 'Registro del ' + fechaLarga(borrador.fecha)}</h2>
          <input type="date" class="mood-fecha" id="mood-fecha" value="${borrador.fecha}" max="${U.iso()}" aria-label="Día que registras">
        </div>
        <div class="mood-caras" role="radiogroup" aria-label="Cómo estás">
          ${[1, 2, 3, 4, 5].map(n => `
            <button class="mood-cara ${borrador.animo === n ? 'on' : ''}" style="--c:${NIVELES[n].color}" data-acc="animo" data-n="${n}" role="radio" aria-checked="${borrador.animo === n}">
              ${cara(n)}<span>${NIVELES[n].label}</span>
            </button>`).join('')}
        </div>
        <div class="mood-energia">
          <span class="muted peq">Energía</span>
          <div class="mood-energia-botones" role="radiogroup" aria-label="Energía">
            ${[1, 2, 3, 4, 5].map(n => `<button class="${borrador.energia >= n ? 'on' : ''}" data-acc="energia" data-n="${n}" role="radio" aria-checked="${borrador.energia === n}" aria-label="Energía ${n}">${n}</button>`).join('')}
          </div>
        </div>
        <div class="chips">
          ${m().etiquetas.map(t => `<button class="chip ${borrador.etiquetas.has(t) ? 'on' : ''}" data-acc="etiqueta" data-t="${U.esc(t)}" aria-pressed="${borrador.etiquetas.has(t)}">${U.esc(t)}</button>`).join('')}
          <button class="chip" data-acc="editar-etiquetas" aria-label="Editar etiquetas">✎</button>
        </div>
        ${editEtiquetas ? `
          <label class="campo">Etiquetas (separadas por comas)
            <input id="mood-etiquetas" value="${U.esc(m().etiquetas.join(', '))}">
          </label>
          <div class="fila-botones"><button class="btn btn-sec" data-acc="etiquetas-cancelar">Cancelar</button><button class="btn" data-acc="etiquetas-guardar">Guardar etiquetas</button></div>` : ''}
        <label class="campo">Una frase del día (opcional)
          <input id="mood-frase" value="${U.esc(borrador.frase)}" maxlength="200" placeholder="¿Qué ha pasado hoy?">
        </label>
        <button class="btn ancho" data-acc="guardar" ${borrador.animo ? '' : 'disabled'}>${borrador.animo ? (yaHoy ? 'Guardar cambios' : 'Guardar el día') : 'Elige cómo estás para guardar'}</button>
        ${yaHoy ? `<button class="enlace peligro peq" data-acc="borrar">Borrar este día</button>` : ''}
      </section>

      <div class="segmentado tres" role="tablist" aria-label="Vista del registro">
        ${[['diario', 'Diario'], ['semanas', 'Semanas'], ['tarro', 'Tarro']].map(([k, t]) =>
          `<button role="tab" class="${vista === k ? 'activo' : ''}" aria-selected="${vista === k}" data-acc="vista" data-v="${k}">${t}</button>`).join('')}
      </div>
      <div id="mood-contenido">${vista === 'diario' ? diario() : vista === 'semanas' ? semanas() : tarro()}</div>`;
  }

  function pantallaPin() {
    return `
      <section class="bloque mood-bloqueo">
        <h2>🔒 Mood está bloqueado</h2>
        <p class="muted">Escribe tu PIN para ver tu registro.</p>
        <form id="mood-desbloquear" class="bloque-form">
          <input id="mood-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" aria-label="PIN" required>
          <button class="btn ancho">Desbloquear</button>
        </form>
        <p class="muted peq">¿Lo has olvidado? Puedes quitarlo importando una copia de seguridad anterior desde Ajustes.</p>
      </section>`;
  }

  function formPin() {
    return `
      <form id="mood-form-pin" class="sub-form">
        <label class="campo">${pinModo === 'poner' ? 'Nuevo PIN (4–8 números)' : 'PIN actual para quitarlo'}
          <input id="mood-pin-nuevo" type="password" inputmode="numeric" pattern="[0-9]{4,8}" autocomplete="off" maxlength="8" required>
        </label>
        <div class="fila-botones"><button type="button" class="btn btn-sec" data-acc="pin-cancelar">Cancelar</button><button class="btn">${pinModo === 'poner' ? 'Poner PIN' : 'Quitar PIN'}</button></div>
        <p class="muted peq nota">El PIN oculta esta pantalla en este dispositivo. Pide el PIN cada vez que abras la app.</p>
      </form>`;
  }

  // ---------- Diario ----------
  function filtradas() {
    const q = busqueda.trim().toLowerCase();
    return entradas().filter(e =>
      (filtro === 'todos' || (filtro === 'buenos' ? e.animo >= 4 : e.animo <= 2)) &&
      (!q || (e.frase || '').toLowerCase().includes(q) || e.etiquetas.some(t => t.toLowerCase().includes(q))));
  }
  function diario() {
    if (!entradas().length) return `<p class="vacio">Aún no has registrado ningún día. Empieza hoy arriba.</p>`;
    return `
      <div class="mood-diario">
        <input type="search" id="mood-buscar" value="${U.esc(busqueda)}" placeholder="Buscar: exámenes, gym…" aria-label="Buscar en el diario">
        <div class="chips">
          ${[['todos', 'Todos'], ['buenos', 'Días buenos'], ['malos', 'Días malos']].map(([k, t]) =>
            `<button class="chip ${filtro === k ? 'on' : ''}" data-acc="filtro" data-f="${k}" aria-pressed="${filtro === k}">${t}</button>`).join('')}
        </div>
        <div id="mood-lista">${lista()}</div>
      </div>`;
  }
  function lista() {
    const es = filtradas();
    return `<p class="muted peq">${es.length} ${es.length === 1 ? 'día' : 'días'}</p>` + (es.length
      ? es.map(e => `
        <article class="mood-tarjeta" style="--c:${NIVELES[e.animo].color}">
          <div class="mood-tarjeta-cara">${cara(e.animo)}<span>⚡ ${e.energia || '–'}</span></div>
          <div class="crece">
            <div class="mood-tarjeta-cab"><strong>${fechaLarga(e.fecha)}</strong><span style="color:var(--c)">${NIVELES[e.animo].label}</span></div>
            ${e.frase ? `<p>${U.esc(e.frase)}</p>` : ''}
            ${e.etiquetas.length ? `<div class="mood-tags">${e.etiquetas.map(t => `<span>${U.esc(t)}</span>`).join('')}</div>` : ''}
          </div>
          <button class="icon-btn peq" data-acc="editar" data-f="${e.fecha}" aria-label="Editar ${fechaLarga(e.fecha)}">✎</button>
        </article>`).join('')
      : `<p class="vacio">No hay días con ese filtro.</p>`);
  }

  // ---------- Semanas ----------
  function semanas() {
    const es = entradas();
    if (!es.length) return `<p class="vacio">Cuando registres días, aquí verás un resumen de cada semana.</p>`;
    const grupos = {};
    for (const e of es) { const k = U.iso(U.lunes(U.deIso(e.fecha))); (grupos[k] = grupos[k] || []).push(e); }
    return Object.keys(grupos).sort().reverse().map(k => {
      const g = grupos[k], ini = U.deIso(k), fin = new Date(ini); fin.setDate(fin.getDate() + 6);
      const media = g.reduce((s, e) => s + e.animo, 0) / g.length;
      const conE = g.filter(e => e.energia), en = conE.length ? conE.reduce((s, e) => s + e.energia, 0) / conE.length : 0;
      const cuenta = {}; g.forEach(e => e.etiquetas.forEach(t => { cuenta[t] = (cuenta[t] || 0) + 1; }));
      const top = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]).slice(0, 3);
      const mejor = [...g].filter(e => e.frase).sort((a, b) => b.animo - a.animo || (b.energia || 0) - (a.energia || 0))[0];
      const nivel = NIVELES[Math.round(media)];
      const abierta = abiertas.has(k);
      const barras = INICIALES.map((d, i) => {
        const dia = new Date(ini); dia.setDate(dia.getDate() + i);
        const e = g.find(x => x.fecha === U.iso(dia));
        return `<div class="mood-barra"><div style="height:${e ? e.animo * 11 + 4 : 4}px;background:${e ? NIVELES[e.animo].color : 'var(--pista)'}"></div><span>${d}</span></div>`;
      }).join('');
      return `
        <article class="mood-semana">
          <button class="mood-semana-cab" data-acc="semana" data-k="${k}" aria-expanded="${abierta}">
            <div class="cab-seccion"><strong>Semana del ${ini.getDate()} al ${fin.getDate()} ${U.MESES[fin.getMonth()].slice(0, 3)}</strong><span class="muted peq">${g.length} de 7 días</span></div>
            <div class="mood-barras" aria-hidden="true">${barras}</div>
            <div class="dos-col">
              <div class="mood-dato"><span>Ánimo medio</span><strong style="color:${nivel.color}">${fmt(media)} · ${nivel.label}</strong></div>
              <div class="mood-dato"><span>Energía media</span><strong>${en ? fmt(en) + ' / 5' : '–'}</strong></div>
            </div>
            ${top.length ? `<span class="muted peq">Lo que más se repitió: ${top.map(U.esc).join(', ')}</span>` : ''}
            ${mejor ? `<span class="mood-frase">«${U.esc(mejor.frase)}»</span>` : ''}
            <span class="enlace peq">${abierta ? 'Ocultar días' : 'Ver los días'}</span>
          </button>
          ${abierta ? `<div class="mood-semana-dias">${[...g].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(e => `
            <div><span class="muted">${fechaLarga(e.fecha)}</span><strong style="color:${NIVELES[e.animo].color}">${NIVELES[e.animo].label}</strong><span>${U.esc(e.frase || '—')}</span></div>`).join('')}</div>` : ''}
        </article>`;
    }).join('');
  }

  // ---------- Tarro ----------
  const POS = [[78, 186], [102, 188], [126, 186], [90, 166], [114, 166], [70, 164], [134, 164], [80, 144], [104, 144], [128, 144], [92, 122], [116, 122], [72, 120], [136, 120], [100, 100], [124, 100], [80, 98], [112, 80], [88, 78], [134, 80]];
  function tarro() {
    const buenos = entradas().filter(e => e.animo >= 4);
    const r = recuerdo && m().entradas[recuerdo] ? { fecha: recuerdo, ...m().entradas[recuerdo] } : null;
    return `
      <section class="mood-tarro">
        <p class="muted peq">Cada día bueno cae al tarro. Cuando tengas un mal día, saca un recuerdo.</p>
        <div class="mood-tarro-dibujo" role="img" aria-label="Tarro con ${buenos.length} días buenos">
          <svg width="200" height="220" viewBox="0 0 200 220" aria-hidden="true">
            <rect x="62" y="10" width="76" height="22" rx="6" fill="#3a4150"></rect>
            <path d="M58 34 h84 q20 0 20 22 v130 q0 24 -24 24 h-76 q-24 0 -24 -24 v-130 q0 -22 20 -22z" fill="var(--superficie)" stroke="#3a4150" stroke-width="3"></path>
            ${buenos.slice(0, POS.length).map((e, i) => `<circle cx="${POS[i][0]}" cy="${POS[i][1]}" r="11" fill="${NIVELES[e.animo].color}"></circle>`).join('')}
          </svg>
        </div>
        <strong>${buenos.length} ${buenos.length === 1 ? 'día bueno guardado' : 'días buenos guardados'}${buenos.length > POS.length ? ' (el tarro está lleno 🫙)' : ''}</strong>
        <button class="btn ancho mood-sacar" data-acc="sacar" ${buenos.length ? '' : 'disabled'}>Sacar un recuerdo</button>
        ${r ? `
          <div class="mood-recuerdo">
            <span class="muted peq">${fechaLarga(r.fecha)} · ${NIVELES[r.animo].label}</span>
            <p>«${U.esc(r.frase || 'Un día bueno, sin frase.')}»</p>
            ${r.etiquetas.length ? `<span class="muted peq">${r.etiquetas.map(U.esc).join(' · ')}</span>` : ''}
          </div>` : ''}
      </section>`;
  }

  // ---------- Eventos ----------
  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    if (acc === 'animo') borrador.animo = Number(b.dataset.n);
    else if (acc === 'energia') borrador.energia = borrador.energia === Number(b.dataset.n) ? 0 : Number(b.dataset.n);
    else if (acc === 'etiqueta') { const t = b.dataset.t; borrador.etiquetas.has(t) ? borrador.etiquetas.delete(t) : borrador.etiquetas.add(t); }
    else if (acc === 'editar-etiquetas') editEtiquetas = !editEtiquetas;
    else if (acc === 'etiquetas-cancelar') editEtiquetas = false;
    else if (acc === 'etiquetas-guardar') {
      const lista = document.getElementById('mood-etiquetas').value.split(',').map(s => s.trim()).filter(Boolean);
      if (!lista.length) return;
      m().etiquetas = [...new Set(lista)];
      Store.guardar();
      editEtiquetas = false;
    } else if (acc === 'guardar') {
      if (!borrador.animo) return;
      const previa = m().entradas[borrador.fecha];
      m().entradas[borrador.fecha] = {
        animo: borrador.animo, energia: borrador.energia || null, etiquetas: [...borrador.etiquetas],
        frase: borrador.frase.trim(), creado: previa?.creado || Date.now(), ...(previa ? { editado: Date.now() } : {}),
      };
      Store.guardar();
      vista = 'diario';
    } else if (acc === 'borrar') {
      if (!confirm(`¿Borrar el registro del ${fechaLarga(borrador.fecha)}?`)) return;
      delete m().entradas[borrador.fecha];
      Store.guardar();
      nuevoBorrador(borrador.fecha);
    } else if (acc === 'editar') { nuevoBorrador(b.dataset.f); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (acc === 'vista') vista = b.dataset.v;
    else if (acc === 'filtro') { filtro = b.dataset.f; }
    else if (acc === 'semana') { const k = b.dataset.k; abiertas.has(k) ? abiertas.delete(k) : abiertas.add(k); }
    else if (acc === 'sacar') {
      const buenos = entradas().filter(x => x.animo >= 4);
      const otros = buenos.length > 1 ? buenos.filter(x => x.fecha !== recuerdo) : buenos;
      recuerdo = otros[Math.floor(Math.random() * otros.length)]?.fecha || null;
    } else if (acc === 'pin') pinModo = m().pinHash ? 'quitar' : 'poner';
    else if (acc === 'pin-cancelar') pinModo = null;
    else return;
    rerender();
  }

  function alEscribir(e, rerender) {
    if (e.target.id === 'mood-frase') borrador.frase = e.target.value;
    else if (e.target.id === 'mood-fecha' && e.target.value) { nuevoBorrador(e.target.value); rerender(); }
    else if (e.target.id === 'mood-buscar') {
      busqueda = e.target.value;
      const l = document.getElementById('mood-lista');
      if (l) l.innerHTML = lista(); // solo la lista: así no se cierra el teclado
    }
  }

  async function alEnviar(e, rerender) {
    if (e.target.id === 'mood-desbloquear') {
      e.preventDefault();
      const v = document.getElementById('mood-pin').value;
      if (await hash(v) === m().pinHash) { desbloqueado = true; rerender(); }
      else { alert('PIN incorrecto.'); document.getElementById('mood-pin').value = ''; }
    } else if (e.target.id === 'mood-form-pin') {
      e.preventDefault();
      const v = document.getElementById('mood-pin-nuevo').value;
      if (!/^[0-9]{4,8}$/.test(v)) { alert('El PIN debe tener entre 4 y 8 números.'); return; }
      if (pinModo === 'poner') { m().pinHash = await hash(v); desbloqueado = true; }
      else if (await hash(v) === m().pinHash) m().pinHash = null;
      else { alert('PIN incorrecto.'); return; }
      Store.guardar();
      pinModo = null;
      rerender();
    }
  }

  // Al salir de la pestaña se vuelve a bloquear (si hay PIN).
  window.addEventListener('hashchange', () => { if (location.hash !== '#mood') { desbloqueado = false; borrador = null; recuerdo = null; } });

  return { id: 'mood', nombre: 'Mood', icono: '🙂', render, alClic, alEscribir, alEnviar };
})();
