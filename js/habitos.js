// Hábitos: tarjetas al final de la pantalla Hoy (no es una pestaña) y la página
// «Cosas buenas» (se abre desde el menú ⋯). Datos y rachas en js/habitos-datos.js.
const Habitos = (() => {
  const D = HabitosDatos;
  let editandoBuena = false;
  const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const num = n => String(n).replace('.', ',');
  const fechaCorta = f => { const d = U.deIso(f); return `${U.DIAS[U.diaSemana(d)].toLowerCase()} ${d.getDate()} ${U.MESES[d.getMonth()].slice(0, 3)}`; };

  const ESTADOS = ['Sin hacer', 'Mínimo ✓', 'Completo ✓✓'];
  const estado = id => { const n = D.nivel(id, U.iso()); return `<span class="hab-estado n${n}">${ESTADOS[n]}</span>`; };
  function racha(id) {
    const r = D.rachas(id);
    return `<span class="hab-fuego">🔥 ${r.actual} ${r.actual === 1 ? 'día' : 'días'}</span><span class="muted">Mejor: ${r.mejor}</span>`;
  }
  const tarjeta = (id, titulo, regla, cuerpo) => `
    <article class="hab-tarjeta" data-habito="${id}">
      <header class="hab-cab">
        <div class="hab-titulo">
          <h3>${titulo}</h3>
          <span class="muted peq">${regla}</span>
        </div>
        <span id="hb-est-${id}">${estado(id)}</span>
      </header>
      ${cuerpo}
      <div class="hab-racha" id="hb-racha-${id}">${racha(id)}</div>
    </article>`;

  // ---------- Sección en Hoy ----------
  function seccion() {
    const hoy = U.iso(), r = D.dia(hoy);
    return `
      <section class="habitos" aria-labelledby="titulo-habitos">
        <h2 class="habitos-titulo" id="titulo-habitos">Hábitos</h2>
        <div class="habitos-lista">
          ${tarjeta('leer', 'Leer 10 páginas', 'Mínimo: 1 página', `
            <label class="hab-campo">Páginas leídas hoy
              <input type="number" inputmode="numeric" min="0" step="1" data-hab="paginas" value="${r.paginas ?? ''}" placeholder="0">
            </label>`)}
          ${tarjeta('movil', 'Menos de 3 h de móvil', 'Mínimo: menos de 4 h', `
            <label class="hab-campo">Horas de pantalla hoy
              <span class="hab-con-unidad"><input inputmode="decimal" data-hab="movil" value="${r.movil != null ? num(r.movil) : ''}" placeholder="2,5"><span class="muted">h</span></span>
            </label>`)}
          ${tarjeta('buena', 'Cosa buena del día', 'Escribe algo bueno que te haya pasado', cosaBuena(r.buena))}
          ${tarjetaHabilidad()}
        </div>
      </section>`;
  }

  function cosaBuena(texto) {
    if (texto && !editandoBuena) {
      return `
        <p class="hab-buena">${U.esc(texto)}</p>
        <div class="hab-botones">
          <button class="btn btn-sec btn-mini" data-acc="hb-editar">Editar</button>
          <a class="enlace" href="#cosas-buenas">Ver todas →</a>
        </div>`;
    }
    return `
      <textarea class="hab-texto" id="hb-buena" rows="3" placeholder="Hoy ha estado bien que…">${U.esc(texto || '')}</textarea>
      <div class="hab-botones">
        <button class="btn btn-mini" data-acc="hb-guardar">Guardar</button>
        ${texto ? '<button class="btn btn-sec btn-mini" data-acc="hb-cancelar">Cancelar</button>' : '<a class="enlace" href="#cosas-buenas">Ver todas →</a>'}
      </div>`;
  }

  function tarjetaHabilidad() {
    const s = D.habilidad();
    if (!s) {
      D.asegurar().then(ok => { if (ok && location.hash.replace('#', '') in { '': 1, hoy: 1 }) Hoy.render(document.getElementById('vista')); });
      return tarjeta('habilidad', 'Habilidad de la semana', '15 min al día', '<p class="muted">Cargando…</p>');
    }
    if (s.terminado) {
      const noAprendidas = D.habilidades().filter(x => s.resultados[x.id] && !s.resultados[x.id].aprendida);
      return tarjeta('habilidad', 'Habilidad de la semana', '15 min al día', `
        <div class="hab-fin">
          <strong>¡Completadas!</strong>
          <p class="nota">Has terminado las ${s.total} habilidades. Aprendidas: <strong>${s.aprendidas} de ${s.total}</strong>.</p>
          ${noAprendidas.length ? `<p class="muted peq nota">Para repasar: ${noAprendidas.map(x => U.esc(x.nombre)).join(', ')}.</p>` : ''}
        </div>`);
    }
    const a = s.actual;
    const btn = (nivel, txt) => `<button class="check ${D.dia(U.iso()).practica === nivel ? 'on' : ''}" data-acc="hb-practica" data-nivel="${nivel}" aria-pressed="${D.dia(U.iso()).practica === nivel}">${txt}</button>`;
    return tarjeta('habilidad', 'Habilidad de la semana', 'Completo: 15 min · Mínimo: 5 min', `
      <div class="hab-skill">
        <span class="hab-semana">Semana ${s.numero}/${s.total} · ${U.esc(a.categoria)}</span>
        <strong class="hab-skill-nombre">${U.esc(a.nombre)}</strong>
        <p class="nota"><span class="muted">Objetivo:</span> ${U.esc(a.objetivo)}</p>
        <p class="nota"><span class="muted">Cómo practicar:</span> ${U.esc(a.comoPracticar)}</p>
        ${s.empezada ? '' : `<p class="muted peq nota">Empieza el ${fechaCorta(s.inicio)}.</p>`}
      </div>
      <div class="hab-practica">
        <span class="peq">Practicado hoy</span>
        <div class="hab-botones">${btn('minimo', '5 min')}${btn('completo', '15 min')}</div>
      </div>
      <div class="hab-semana-dias" aria-label="Días practicados esta semana: ${s.practicados} de 7">
        ${s.dias.map((d, i) => `<span class="hab-dia ${d.nivel >= 1 ? 'on' : ''} ${d.fecha === U.iso() ? 'hoy' : ''}"><i aria-hidden="true">${d.nivel >= 1 ? '●' : '○'}</i>${DIAS_CORTOS[i]}</span>`).join('')}
        <span class="muted peq">${s.practicados}/7 días</span>
      </div>
      ${s.preguntar ? `
        <div class="hab-pregunta">
          <strong>¿La has aprendido?</strong>
          <div class="hab-botones">
            <button class="btn btn-mini" data-acc="hb-responder" data-si="1">Sí</button>
            <button class="btn btn-sec btn-mini" data-acc="hb-responder" data-si="0">No</button>
          </div>
        </div>` : ''}
      <p class="muted peq nota">Habilidades aprendidas: <strong>${s.aprendidas}</strong></p>`);
  }

  // Actualiza estado y racha de una tarjeta sin repintar (no se cierra el teclado).
  function refrescar(id) {
    const e = document.getElementById(`hb-est-${id}`), r = document.getElementById(`hb-racha-${id}`);
    if (e) e.innerHTML = estado(id);
    if (r) r.innerHTML = racha(id);
  }

  // Devuelve true si el clic era suyo.
  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc^="hb-"]');
    if (!b) return false;
    const hoy = U.iso();
    switch (b.dataset.acc) {
      case 'hb-editar': editandoBuena = true; break;
      case 'hb-cancelar': editandoBuena = false; break;
      case 'hb-guardar': {
        const t = document.getElementById('hb-buena').value;
        if (!t.trim()) { alert('Escribe algo antes de guardar.'); return true; }
        D.ponerBuena(hoy, t); editandoBuena = false; break;
      }
      case 'hb-practica': {
        const n = b.dataset.nivel;
        D.ponerPractica(hoy, D.dia(hoy).practica === n ? null : n); break;
      }
      case 'hb-responder': D.responder(b.dataset.si === '1'); break;
      default: return false;
    }
    rerender();
    if (b.dataset.acc === 'hb-editar') document.getElementById('hb-buena')?.focus();
    return true;
  }

  function alEscribir(e) {
    const t = e.target, hoy = U.iso();
    if (t.dataset.hab === 'paginas') {
      D.ponerPaginas(hoy, t.value.trim() === '' ? null : Math.max(0, Math.round(Number(t.value) || 0)));
      refrescar('leer');
    } else if (t.dataset.hab === 'movil') {
      D.ponerMovil(hoy, t.value.trim() === '' ? null : Math.max(0, U.numero(t.value)));
      refrescar('movil');
    }
  }

  return { seccion, alClic, alEscribir };
})();

// Página «Cosas buenas»: todas las que has escrito, agrupadas por mes.
const CosasBuenas = (() => {
  const D = HabitosDatos;
  let editando = null;   // fecha que se está editando
  let recuerdo = null;   // fecha del recuerdo aleatorio que se muestra
  const fechaDia = f => { const d = U.deIso(f); return `${U.DIAS[U.diaSemana(d)]} ${d.getDate()}`; };
  const fechaLarga = f => { const d = U.deIso(f); return `${U.DIAS[U.diaSemana(d)]}, ${d.getDate()} de ${U.MESES[d.getMonth()]} de ${d.getFullYear()}`; };

  function render(el) {
    const todas = D.cosasBuenas();
    if (recuerdo && !todas.some(x => x.fecha === recuerdo)) recuerdo = null;
    const meses = [];
    for (const x of todas) {
      const clave = x.fecha.slice(0, 7);
      if (meses.at(-1)?.clave !== clave) meses.push({ clave, items: [] });
      meses.at(-1).items.push(x);
    }
    const r = recuerdo && todas.find(x => x.fecha === recuerdo);
    el.innerHTML = `
      <header class="hoy-cab">
        <div class="hoy-saludo">
          <a class="hoy-fecha cb-volver" href="#hoy">‹ Hoy</a>
          <h1>Cosas buenas</h1>
        </div>
      </header>
      <section class="tarjeta cb-resumen">
        <strong class="cb-total">${todas.length} ${todas.length === 1 ? 'cosa buena' : 'cosas buenas'}</strong>
        <button class="btn btn-mini" data-acc="cb-aleatorio" ${todas.length ? '' : 'disabled'}>Recuerdo aleatorio</button>
      </section>
      ${r ? `
        <section class="cb-recuerdo" aria-live="polite">
          <div class="cab-seccion"><span class="muted peq">${fechaLarga(r.fecha)}</span>
            <button class="icon-btn peq" data-acc="cb-cerrar" aria-label="Cerrar recuerdo">×</button></div>
          <p class="cb-texto">${U.esc(r.texto)}</p>
          ${todas.length > 1 ? '<button class="enlace" data-acc="cb-aleatorio">Otro recuerdo</button>' : ''}
        </section>` : ''}
      ${todas.length ? meses.map(m => {
        const [a, mm] = m.clave.split('-').map(Number);
        return `
          <section class="cb-mes">
            <h2>${U.MESES[mm - 1]} ${a}</h2>
            ${m.items.map(x => x.fecha === editando ? `
              <article class="tarjeta cb-item">
                <span class="muted peq">${fechaDia(x.fecha)}</span>
                <textarea class="hab-texto" id="cb-texto" rows="3">${U.esc(x.texto)}</textarea>
                <div class="hab-botones">
                  <button class="btn btn-mini" data-acc="cb-guardar" data-f="${x.fecha}">Guardar</button>
                  <button class="btn btn-sec btn-mini" data-acc="cb-cancelar">Cancelar</button>
                </div>
              </article>` : `
              <article class="tarjeta cb-item">
                <div class="cab-seccion">
                  <span class="muted peq">${fechaDia(x.fecha)}</span>
                  <span class="cb-acciones">
                    <button class="enlace" data-acc="cb-editar" data-f="${x.fecha}">Editar</button>
                    <button class="enlace peligro" data-acc="cb-borrar" data-f="${x.fecha}">Borrar</button>
                  </span>
                </div>
                <p class="cb-texto">${U.esc(x.texto)}</p>
              </article>`).join('')}
          </section>`;
      }).join('') : '<p class="vacio">Aún no has escrito ninguna. Escríbela en la tarjeta «Cosa buena del día» de Hoy.</p>'}`;
    if (editando) el.querySelector('#cb-texto')?.focus();
  }

  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const f = b.dataset.f;
    switch (b.dataset.acc) {
      case 'cb-aleatorio': {
        const todas = D.cosasBuenas();
        const opciones = todas.length > 1 ? todas.filter(x => x.fecha !== recuerdo) : todas;
        recuerdo = opciones[Math.floor(Math.random() * opciones.length)]?.fecha || null;
        break;
      }
      case 'cb-cerrar': recuerdo = null; break;
      case 'cb-editar': editando = f; break;
      case 'cb-cancelar': editando = null; break;
      case 'cb-guardar': {
        const t = document.getElementById('cb-texto').value;
        if (!t.trim() && !confirm('El texto está vacío. ¿Borrar esta cosa buena?')) return;
        D.ponerBuena(f, t); editando = null; break;
      }
      case 'cb-borrar':
        if (!confirm('¿Borrar esta cosa buena?')) return;
        D.ponerBuena(f, ''); break;
      default: return;
    }
    rerender();
    if (b.dataset.acc === 'cb-aleatorio') document.querySelector('.cb-recuerdo')?.scrollIntoView({ block: 'nearest' });
  }

  return { id: 'cosas-buenas', nombre: 'Cosas buenas', icono: '✦', render, alClic };
})();
