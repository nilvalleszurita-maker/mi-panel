// Módulo de Estudio: cuenta atrás de exámenes y calculadora de notas.
// Datos y fórmulas en js/estudio-datos.js.
const Estudio = (() => {
  const D = EstudioDatos;
  let sel = null;            // asignatura seleccionada
  let editando = false;      // modo edición de la asignatura seleccionada
  let fijando = null;        // ids del examen cuya fecha aproximada se está fijando
  let elVista = null;

  const fmt = n => (Math.round(n * 100) / 100).toString().replace('.', ',');
  const fechaTxt = f => {
    const d = U.deIso(f);
    return `${U.DIAS[U.diaSemana(d)].slice(0, 3).toLowerCase()} ${d.getDate()} ${U.MESES[d.getMonth()].slice(0, 3)}`;
  };
  const TONO = { ok: 'var(--verde)', mal: '#ff8a80', aviso: 'var(--ambar)', normal: 'var(--texto)' };

  function render(el) {
    elVista = el;
    const lista = D.asignaturas();
    if (!lista.length) {
      el.innerHTML = `<p class="vacio">Cargando tus asignaturas…</p>`;
      D.asegurar().then(ok => {
        if (elVista !== el || !el.isConnected || location.hash !== '#estudio') return;
        if (ok && D.asignaturas().length) render(el);
        else el.innerHTML = `<p class="vacio">No se han podido cargar las asignaturas. Comprueba la conexión.</p>`;
      });
      return;
    }
    // Sincroniza con asignaturas.json una vez por sesión y repinta solo si se acaba de hacer.
    if (!D.estaSincronizado()) {
      D.asegurar().then(() => { if (elVista === el && el.isConnected && location.hash === '#estudio' && !editando && !document.activeElement?.closest?.('#vista')) render(el); });
    }
    if (!sel || !D.asignatura(sel)) sel = lista[0].id;

    el.innerHTML = `
      <header class="hoy-saludo estudio-cab">
        <span class="hoy-fecha">Estudio${D.curso() ? ` · ${U.esc(D.curso())}` : ''}</span>
        <h1>Notas y exámenes</h1>
      </header>
      ${cuentaAtras()}
      <div class="cab-seccion"><h2>Calculadora</h2>
        <button class="enlace" data-acc="editar">${editando ? 'Listo' : 'Editar'}</button></div>
      <div class="chips" role="group" aria-label="Asignatura">
        ${lista.map(a => `<button class="chip ${a.id === sel ? 'on' : ''}" data-acc="sel" data-id="${a.id}" aria-pressed="${a.id === sel}">${U.esc(a.corto)}</button>`).join('')}
        ${editando ? `<button class="chip" data-acc="nueva-asig">+ Asignatura</button>` : ''}
      </div>
      ${editando ? editor() : `<div id="calc">${tarjetaCalculo()}</div>${listaEvaluaciones()}`}
      <section class="bloque"><h3>Todas las asignaturas</h3><div id="resumen-asig">${resumen()}</div></section>`;
  }

  // ---------- Cuenta atrás ----------
  function cuentaAtras() {
    const ex = D.examenes();
    if (!ex.length) return `<section class="examen-grande vacio-examen"><p>No tienes exámenes próximos. 🎉</p></section>`;
    const [p, ...resto] = ex;
    const cuando = x => x.aprox && x.fecha_texto ? U.esc(x.fecha_texto) : fechaTxt(x.fecha);
    const fijar = x => x.aprox ? (fijando === x.ids.join(',')
      ? `<span class="fijar"><input type="date" value="${x.fecha}" data-fijar="${x.ids.join(',')}" aria-label="Fecha segura de ${U.esc(x.nombre)}">
         <button class="btn btn-mini" data-acc="fijar-ok" data-ids="${x.ids.join(',')}">Guardar</button></span>`
      : `<button class="enlace peq" data-acc="fijar" data-ids="${x.ids.join(',')}">Fijar fecha</button>`) : '';
    const dias = x => x.dias === 0 ? 'hoy' : x.dias;
    return `
      <section class="examen-grande" aria-label="Próximo examen">
        <div class="examen-dias"><strong>${dias(p)}</strong><span>${p.dias === 0 ? '' : p.dias === 1 ? 'día' : 'días'}</span></div>
        <div class="examen-info">
          <span class="examen-etq">Próximo examen</span>
          <strong>${U.esc(p.nombre)}</strong>
          <span>${U.esc(p.asignatura)} · ${cuando(p)}${p.aprox ? ' (aprox.)' : ''}</span>
          ${fijar(p)}
        </div>
      </section>
      ${resto.length ? `
        <section class="bloque examenes-lista">
          ${resto.map(x => `
            <div class="examen-fila">
              <span class="examen-d ${x.dias <= 14 ? 'cerca' : ''}">${x.dias} d</span>
              <div class="crece"><div>${U.esc(x.nombre)}</div>
                <div class="muted peq">${U.esc(x.asignatura)} · ${cuando(x)}${x.aprox ? ' (aprox.)' : ''}</div>${fijar(x)}</div>
            </div>`).join('')}
        </section>` : ''}`;
  }

  // ---------- Calculadora ----------
  function tarjetaCalculo() {
    const a = D.asignatura(sel), v = D.veredicto(sel), c = v.c;
    const avisoPesos = Math.abs(c.totalPesos - 100) > 0.01
      ? `<p class="aviso-pesos">⚠ Los pesos suman ${fmt(c.totalPesos)} % (deberían sumar 100 %).</p>` : '';
    return `
      <section class="calc">
        <div class="calc-cab">
          <div><h3>${U.esc(a.nombre)}</h3>${a.objetivo_motivo ? `<span class="calc-motivo">${U.esc(a.objetivo_motivo)}</span>` : ''}</div>
          <span class="pastilla">Objetivo ${fmt(a.objetivo)}</span>
        </div>
        <div class="calc-nec">
          <strong style="color:${TONO[v.tono]}">${v.valor === null ? '✓' : fmt(v.valor)}</strong>
          <span>${v.etiqueta}</span>
        </div>
        <div class="calc-barra">
          <div class="kpi-barra"><div style="width:${Math.min(100, c.asegurado * 10)}%;background:var(--acento)"></div></div>
          <div class="calc-pie"><span>Llevas ${fmt(c.asegurado)} de 10 asegurados</span><span>${fmt(c.pendiente)} % por evaluar</span></div>
        </div>
        ${avisoPesos}
        ${(a.reglas || []).map(r => `<p class="calc-regla">${U.esc(r)}</p>`).join('')}
      </section>`;
  }

  function listaEvaluaciones() {
    const evs = D.evaluacionesDe(sel);
    const campo = (ev, max) => `
      <label class="nota-campo">${max === 10 ? 'Nota' : `Sobre ${max}`}
        <input data-nota="${ev.id}" value="${ev.nota === null ? '' : String(ev.nota).replace('.', ',')}" inputmode="decimal" placeholder="–" autocomplete="off" aria-label="Nota de ${U.esc(ev.nombre)}" class="${ev.nota === null ? '' : 'con-nota'}">
      </label>`;
    const detalle = ev => [
      ev.tipo === 'reconduccion' ? '' : `${fmt(ev.peso)} %`,
      ev.fecha ? (ev.fecha_aprox && ev.fecha_texto ? ev.fecha_texto : fechaTxt(ev.fecha)) : '',
      ev.nota_extra,
    ].filter(Boolean).map(U.esc).join(' · ');
    return `
      <div class="evaluaciones">
        ${evs.map(ev => {
          if (ev.tipo === 'media') {
            const m = D.mediaDe(ev);
            return `
              <div class="eval eval-media">
                <div class="crece"><div class="eval-nombre">${U.esc(ev.nombre)}</div><div class="muted peq">${detalle(ev)}</div></div>
                <div class="nota-calculada" id="media-${ev.id}"><span>Media</span><strong>${m.media !== null ? fmt(m.media) : m.parcial !== null ? `${fmt(m.parcial)}…` : '–'}</strong></div>
              </div>`;
          }
          return `
            <div class="eval ${ev.tipo === 'parte' ? 'eval-parte' : ''} ${ev.tipo === 'reconduccion' ? 'eval-recon' : ''}">
              <div class="crece"><div class="eval-nombre">${U.esc(ev.nombre)}</div><div class="muted peq">${detalle(ev)}</div></div>
              ${campo(ev, ev.nota_maxima || 10)}
            </div>`;
        }).join('')}
      </div>`;
  }

  function resumen() {
    return `<ul class="lista">${D.asignaturas().map(a => {
      const v = D.veredicto(a.id);
      const txt = v.corto || `Necesitas ${fmt(v.valor)}`;
      return `<li><div class="crece"><div>${U.esc(a.nombre)}</div><div class="muted peq">Objetivo ${fmt(a.objetivo)}</div></div>
        <strong style="color:${TONO[v.tono]}">${txt}</strong></li>`;
    }).join('')}</ul>`;
  }

  // ---------- Edición ----------
  function editor() {
    const a = D.asignatura(sel), evs = D.evaluacionesDe(sel), c = D.calculo(sel);
    const ok = Math.abs(c.totalPesos - 100) <= 0.01;
    const inp = (id, campo, valor, extra = '') => `<input data-ed="${id}" data-campo="${campo}" value="${U.esc(valor ?? '')}" ${extra}>`;
    return `
      <section class="editor-outfit editor-asig">
        <div class="dos-col">
          <label class="campo">Nombre${inp(a.id, 'nombre', a.nombre, 'data-tabla="asig" maxlength="60"')}</label>
          <label class="campo">Nombre corto${inp(a.id, 'corto', a.corto, 'data-tabla="asig" maxlength="20"')}</label>
        </div>
        <div class="dos-col">
          <label class="campo">Objetivo${inp(a.id, 'objetivo', String(a.objetivo).replace('.', ','), 'data-tabla="asig" inputmode="decimal"')}</label>
          <label class="campo">Motivo${inp(a.id, 'objetivo_motivo', a.objetivo_motivo, 'data-tabla="asig" maxlength="80"')}</label>
        </div>
        <h3>Evaluaciones</h3>
        <p class="peq ${ok ? 'muted' : 'aviso-pesos'}" id="suma-pesos">${ok ? '✓ Los pesos suman 100 %' : `⚠ Los pesos suman ${fmt(c.totalPesos)} % (deberían sumar 100 %)`}</p>
        ${evs.map(ev => `
          <div class="ed-eval ${ev.tipo === 'parte' ? 'eval-parte' : ''}">
            <div class="ed-eval-fila">
              ${inp(ev.id, 'nombre', ev.nombre, 'aria-label="Nombre" maxlength="60"')}
              ${ev.tipo === 'reconduccion' || ev.tipo === 'media' ? `<span class="muted peq ed-peso">${ev.tipo === 'media' ? `${fmt(ev.peso)} % (suma de partes)` : 'sin peso'}</span>`
                : `<label class="ed-peso">${inp(ev.id, 'peso', String(ev.peso).replace('.', ','), 'inputmode="decimal" aria-label="Peso en %"')}<span>%</span></label>`}
              <button class="icon-btn peq" data-acc="borrar-eval" data-id="${ev.id}" aria-label="Borrar ${U.esc(ev.nombre)}">×</button>
            </div>
            ${ev.tipo === 'media' ? '' : `
            <div class="ed-eval-fila">
              <label class="campo">Fecha${inp(ev.id, 'fecha', ev.fecha || '', 'type="date"')}</label>
              <label class="chip-check"><input type="checkbox" data-ed="${ev.id}" data-campo="fecha_aprox" ${ev.fecha_aprox ? 'checked' : ''}><span>Aproximada</span></label>
            </div>
            ${ev.fecha_aprox ? `<label class="campo">Texto de la fecha${inp(ev.id, 'fecha_texto', ev.fecha_texto, 'maxlength="60" placeholder="Ej. semana del 14 al 20 dic"')}</label>` : ''}`}
          </div>`).join('')}
        <button class="enlace" data-acc="nueva-eval">+ Añadir evaluación</button>
        <button class="enlace peligro" data-acc="borrar-asig">Borrar esta asignatura</button>
      </section>`;
  }

  // ---------- Eventos ----------
  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    if (acc === 'sel') sel = b.dataset.id;
    else if (acc === 'editar') editando = !editando;
    else if (acc === 'fijar') fijando = b.dataset.ids;
    else if (acc === 'fijar-ok') {
      const v = document.querySelector(`[data-fijar="${b.dataset.ids}"]`)?.value;
      if (v) D.fijarFecha(b.dataset.ids.split(','), v);
      fijando = null;
    } else if (acc === 'nueva-asig') {
      sel = D.guardarAsignatura({ nombre: 'Nueva asignatura', corto: 'Nueva', objetivo: 5 });
      D.nuevaEvaluacion(sel);
    } else if (acc === 'borrar-asig') {
      const a = D.asignatura(sel);
      if (!confirm(`¿Borrar «${a.nombre}» y todas sus evaluaciones y notas?`)) return;
      D.borrarAsignatura(sel); sel = null; editando = false;
    } else if (acc === 'nueva-eval') D.nuevaEvaluacion(sel);
    else if (acc === 'borrar-eval') {
      const ev = D.evaluacion(b.dataset.id);
      if (!confirm(`¿Borrar «${ev.nombre}»${ev.nota !== null ? ' y su nota' : ''}?`)) return;
      D.borrarEvaluacion(ev.id);
    } else return;
    rerender();
  }

  // Al escribir: notas → recalcula sin repintar los campos (no se pierde el cursor).
  function alEscribir(e, rerender) {
    const t = e.target;
    if (t.dataset.nota) {
      const txt = t.value.trim();
      D.ponerNota(t.dataset.nota, txt === '' ? null : U.numero(txt));
      t.classList.toggle('con-nota', txt !== '');
      document.getElementById('calc').innerHTML = tarjetaCalculo();
      document.getElementById('resumen-asig').innerHTML = resumen();
      for (const ev of D.evaluacionesDe(sel).filter(x => x.tipo === 'media')) {
        const m = D.mediaDe(ev), out = document.querySelector(`#media-${ev.id} strong`);
        if (out) out.textContent = m.media !== null ? fmt(m.media) : m.parcial !== null ? `${fmt(m.parcial)}…` : '–';
      }
      return;
    }
    if (t.dataset.ed) {
      const campo = t.dataset.campo;
      if (t.dataset.tabla === 'asig') {
        const a = D.asignatura(t.dataset.ed);
        a[campo] = campo === 'objetivo' ? U.numero(t.value) : t.value;
        Store.guardar();
        return;
      }
      const ev = D.evaluacion(t.dataset.ed);
      if (campo === 'fecha_aprox') { ev.fecha_aprox = t.checked; Store.guardar(); rerender(); return; }
      ev[campo] = campo === 'peso' ? U.numero(t.value) : campo === 'fecha' ? (t.value || null) : t.value;
      Store.guardar();
      if (campo === 'peso') {
        const c = D.calculo(sel), ok = Math.abs(c.totalPesos - 100) <= 0.01, out = document.getElementById('suma-pesos');
        out.className = `peq ${ok ? 'muted' : 'aviso-pesos'}`;
        out.textContent = ok ? '✓ Los pesos suman 100 %' : `⚠ Los pesos suman ${fmt(c.totalPesos)} % (deberían sumar 100 %)`;
      }
    }
  }

  // Para Hoy: el examen más cercano.
  const proximoExamen = () => D.examenes()[0] || null;

  return { id: 'estudio', nombre: 'Estudio', icono: '📚', render, alClic, alEscribir, proximoExamen, fechaTxt };
})();
