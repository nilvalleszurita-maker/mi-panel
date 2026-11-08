// Módulo de Gym: registro diario de la planificación (js/gym-plan.js),
// vista semanal por días y calendario mensual de gym y carreras.
//
// Datos guardados (Store.get().gym.registros), uno por fecha AAAA-MM-DD:
//   { ej: { [idEjercicio]: { nombre, hecho, series: [{ kg, reps }] } },
//     carrera: { hecho, km, min } | null,
//     notas }
// Los valores se guardan tal y como se escriben (texto) para no alterar "62,5".
const Gym = (() => {
  // Estado de la vista (no se guarda).
  const hoy = new Date();
  let vista = 'registro';          // 'registro' | 'calendario'
  let semana = U.lunes();          // lunes de la semana visible
  let abierto = U.diaSemana();     // día desplegado (0 = lunes), null = ninguno
  let cal = { a: hoy.getFullYear(), m: hoy.getMonth() };
  let desplazar = false;           // llevar el día abierto a la vista tras pintar

  const regs = () => Store.get().gym.registros;
  const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ejerciciosDe = p => (p.ejercicios || []).map(e => ({ ...e, id: e.id || slug(e.nombre) }));
  const planDe = fecha => GYM_PLAN[U.diaSemana(U.deIso(fecha))];
  const fechaDe = i => { const d = new Date(semana); d.setDate(d.getDate() + i); return d; };
  const fechaCorta = f => { const d = U.deIso(f); return `${d.getDate()} ${U.MESES[d.getMonth()].slice(0, 3)}`; };
  const seriesVacias = n => Array.from({ length: n }, () => ({ kg: '', reps: '' }));
  const conDatos = s => String(s.kg).trim() || String(s.reps).trim();

  // ---------- Acceso a los registros ----------
  function registro(fecha, crear) {
    if (!regs()[fecha] && crear) regs()[fecha] = { ej: {}, carrera: null, notas: '' };
    return regs()[fecha] || null;
  }

  // Busca el ejercicio en la planificación de ese día (o entre los ya registrados).
  function ejercicio(fecha, id) {
    return ejerciciosDe(planDe(fecha)).find(e => e.id === id)
      || { id, nombre: regs()[fecha]?.ej[id]?.nombre || id, series: 1, reps: '' };
  }

  // Registro de un ejercicio; al crearlo, con tantas series como dice el plan.
  function regEj(fecha, id) {
    const r = registro(fecha, true);
    if (!r.ej[id]) {
      const e = ejercicio(fecha, id);
      r.ej[id] = { nombre: e.nombre, hecho: false, series: seriesVacias(e.series) };
    }
    return r.ej[id];
  }

  // La última vez que se hizo un ejercicio antes de esa fecha (con algún dato escrito).
  function anterior(fecha, id) {
    const fechas = Object.keys(regs()).filter(f => f < fecha).sort().reverse();
    for (const f of fechas) {
      const x = regs()[f].ej[id];
      if (x && x.series.some(conDatos)) return { fecha: f, series: x.series };
    }
    return null;
  }

  // Qué se hizo un día: gym si hay al menos un ejercicio marcado; carrera si
  // está marcada como hecha o tiene kilómetros.
  function estado(fecha) {
    const r = regs()[fecha];
    const km = r?.carrera ? U.numero(r.carrera.km) : 0;
    return {
      gym: !!r && Object.values(r.ej).some(x => x.hecho),
      run: !!r?.carrera && (r.carrera.hecho || km > 0),
      km,
    };
  }

  // Tiempo en minutos: acepta "52", "52,5" o "52:30".
  function minutos(texto) {
    const t = String(texto || '').trim();
    if (t.includes(':')) {
      const [m, s] = t.split(':');
      return (parseInt(m, 10) || 0) + (parseInt(s, 10) || 0) / 60;
    }
    return U.numero(t);
  }

  function ritmo(c) {
    const km = U.numero(c?.km), min = minutos(c?.min);
    if (!(km > 0 && min > 0)) return '—';
    let m = Math.floor(min / km), s = Math.round((min / km - m) * 60);
    if (s === 60) { m += 1; s = 0; }
    return `${m}:${String(s).padStart(2, '0')} min/km`;
  }

  // ---------- Pintado ----------
  function render(el) {
    el.innerHTML = `
      <div class="segmentado">
        <button type="button" class="${vista === 'registro' ? 'activo' : ''}" data-acc="vista" data-v="registro">Semana</button>
        <button type="button" class="${vista === 'calendario' ? 'activo' : ''}" data-acc="vista" data-v="calendario">Calendario</button>
      </div>
      ${vista === 'registro' ? vistaSemana() : vistaCalendario()}`;

    if (desplazar) {
      el.querySelector('.gym-dia.abierto')?.scrollIntoView({ block: 'start' });
      desplazar = false;
    }
  }

  function vistaSemana() {
    const fin = fechaDe(6);
    const esActual = U.iso(semana) === U.iso(U.lunes());
    return `
      <div class="nav-periodo">
        <button class="icon-btn" data-acc="sem-ant" aria-label="Semana anterior">‹</button>
        <h2>${semana.getDate()} ${U.MESES[semana.getMonth()].slice(0, 3)} – ${fin.getDate()} ${U.MESES[fin.getMonth()].slice(0, 3)}</h2>
        <button class="icon-btn" data-acc="sem-sig" aria-label="Semana siguiente">›</button>
      </div>
      ${esActual ? '' : `<button class="enlace" data-acc="sem-hoy">Volver a esta semana</button>`}
      <section class="dias">${GYM_PLAN.map((_, i) => dia(i)).join('')}</section>`;
  }

  function dia(i) {
    const p = GYM_PLAN[i];
    const f = fechaDe(i), fecha = U.iso(f);
    const esHoy = fecha === U.iso();
    const esAbierto = abierto === i;
    const st = estado(fecha);
    const lista = ejerciciosDe(p);
    const r = regs()[fecha];

    const resumen = p.tipo === 'carrera'
      ? (st.km ? `${String(r.carrera.km).trim()} km` : '')
      : `${lista.filter(e => r?.ej[e.id]?.hecho).length}/${lista.length}`;

    return `
      <article class="dia gym-dia ${esHoy ? 'hoy' : ''} ${esAbierto ? 'abierto' : ''}">
        <button class="gym-cab" data-acc="abrir-dia" data-dia="${i}" aria-expanded="${esAbierto}">
          <span class="crece">
            <span class="muted peq">${U.DIAS[i]} ${f.getDate()}${esHoy ? ' · hoy' : ''}</span>
            <span class="gym-sesion">${U.esc(p.sesion)}</span>
          </span>
          <span class="gym-estado">
            ${st.gym ? '<span class="marca marca-gym" title="Gym hecho"></span>' : ''}
            ${st.run ? '<span class="marca marca-run" title="Carrera hecha"></span>' : ''}
            <span class="muted peq">${resumen}</span>
          </span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
        ${esAbierto ? cuerpoDia(fecha, p, lista) : ''}
      </article>`;
  }

  function cuerpoDia(fecha, p, lista) {
    const r = regs()[fecha];
    let html = '';
    if (p.tipo === 'carrera') {
      html += bloqueCarrera(fecha, p);
    } else {
      html += lista.map(e => bloqueEjercicio(fecha, e)).join('');
      // Ejercicios anotados ese día que ya no están en la planificación.
      if (r) {
        html += Object.keys(r.ej).filter(id => !lista.some(e => e.id === id))
          .map(id => bloqueEjercicio(fecha, ejercicio(fecha, id))).join('');
      }
      html += r?.carrera
        ? bloqueCarrera(fecha, null)
        : `<button class="enlace" data-acc="add-carrera" data-fecha="${fecha}">+ Añadir una carrera este día</button>`;
    }
    html += `
      <label class="gym-notas">Notas
        <textarea data-g="notas" data-fecha="${fecha}" rows="2" placeholder="Opcional: sensaciones, molestias…">${U.esc(r?.notas || '')}</textarea>
      </label>`;
    return `<div class="gym-cuerpo">${html}</div>`;
  }

  function bloqueEjercicio(fecha, e) {
    const x = regs()[fecha]?.ej[e.id];
    const series = x ? x.series : seriesVacias(e.series);
    const prev = anterior(fecha, e.id);
    const attrs = `data-fecha="${fecha}" data-ej="${U.esc(e.id)}"`;
    const info = [e.reps ? `objetivo: ${U.esc(e.reps)}` : '', e.nota ? U.esc(e.nota) : ''].filter(Boolean).join(' · ');

    return `
      <div class="ejercicio ${x?.hecho ? 'hecho' : ''}">
        <label class="ej-titulo">
          <input type="checkbox" data-g="hecho" ${attrs} ${x?.hecho ? 'checked' : ''}>
          <span class="crece">
            <strong>${U.esc(e.nombre)}</strong>
            ${info ? `<span class="muted peq">${info}</span>` : ''}
          </span>
        </label>
        ${visual(e)}
        ${prev ? `<p class="anterior">Última vez (${fechaCorta(prev.fecha)}): ${prev.series.filter(conDatos)
          .map(s => `${U.esc(s.kg || '–')} kg × ${U.esc(s.reps || '–')}`).join(' · ')}</p>` : ''}
        <div class="series">
          <div class="serie serie-cab muted peq"><span></span><span>kg</span><span>reps</span></div>
          ${series.map((s, i) => `
            <div class="serie">
              <span class="muted">${i + 1}</span>
              <input data-g="kg" data-i="${i}" ${attrs} value="${U.esc(s.kg)}" inputmode="decimal" autocomplete="off"
                placeholder="${U.esc(prev?.series[i]?.kg || 'kg')}" aria-label="${U.esc(e.nombre)}, serie ${i + 1}: peso en kg">
              <input data-g="reps" data-i="${i}" ${attrs} value="${U.esc(s.reps)}" inputmode="numeric" pattern="[0-9]*" autocomplete="off"
                placeholder="${U.esc(prev?.series[i]?.reps || 'reps')}" aria-label="${U.esc(e.nombre)}, serie ${i + 1}: repeticiones">
            </div>`).join('')}
        </div>
        <div class="fila-series">
          <button class="btn btn-sec btn-mini" data-acc="quitar-serie" ${attrs} ${series.length <= 1 ? 'disabled' : ''}>− Serie</button>
          <button class="btn btn-sec btn-mini" data-acc="add-serie" ${attrs}>+ Serie</button>
        </div>
      </div>`;
  }

  // Personaje haciendo el ejercicio + mapa de músculos (datos en gym-plan.js).
  function visual(e) {
    const principales = e.musculos || [], secundarios = e.secundarios || [];
    if (!e.figura && !principales.length) return '';
    const nombres = l => { const t = l.map(GymDibujos.nombre).join(', '); return t.charAt(0).toUpperCase() + t.slice(1); };
    return `
      <div class="ej-visual">
        ${e.figura ? `<div class="ej-figura">${GymDibujos.figura(e.figura, `Cómo se hace: ${e.nombre}`)}</div>` : ''}
        ${principales.length ? `
          ${GymDibujos.musculos(principales, secundarios)}
          <div class="ej-musculos">
            <span><i class="musc-marca p"></i><span class="etq">Principal</span> ${nombres(principales)}</span>
            ${secundarios.length ? `
              <span class="muted"><i class="musc-marca s"></i><span class="etq">Secundario</span> ${nombres(secundarios)}</span>` : ''}
          </div>` : ''}
      </div>`;
  }

  // p = planificación del día de carrera; null si es una carrera extra en día de gym.
  function bloqueCarrera(fecha, p) {
    const c = regs()[fecha]?.carrera || { hecho: false, km: '', min: '' };
    const attrs = `data-fecha="${fecha}"`;
    return `
      <div class="ejercicio carrera ${c.hecho ? 'hecho' : ''}">
        <label class="ej-titulo">
          <input type="checkbox" data-g="run-hecho" ${attrs} ${c.hecho ? 'checked' : ''}>
          <span class="crece">
            <strong>${p ? 'Carrera hecha' : 'Carrera extra'}</strong>
            ${p ? `<span class="muted peq">objetivo: ${p.km} km · ${U.esc(p.ritmo)}</span>` : ''}
          </span>
        </label>
        <div class="carrera-campos">
          <label>Distancia (km)
            <input data-g="km" ${attrs} value="${U.esc(c.km)}" inputmode="decimal" autocomplete="off" placeholder="${p ? p.km : '0'}">
          </label>
          <label>Tiempo (min)
            <input data-g="min" ${attrs} value="${U.esc(c.min)}" inputmode="decimal" autocomplete="off" placeholder="52 o 52:30">
          </label>
          <div class="ritmo">
            <span class="muted peq">Ritmo</span>
            <strong data-ritmo="${fecha}">${ritmo(c)}</strong>
          </div>
        </div>
        ${p ? '' : `<button class="enlace" data-acc="quitar-carrera" ${attrs}>Quitar carrera</button>`}
      </div>`;
  }

  function vistaCalendario() {
    const primero = new Date(cal.a, cal.m, 1);
    const diasMes = new Date(cal.a, cal.m + 1, 0).getDate();
    const huecos = U.diaSemana(primero);
    let gym = 0, run = 0, km = 0;

    const celdas = [];
    for (let i = 0; i < huecos; i++) celdas.push('<span></span>');
    for (let d = 1; d <= diasMes; d++) {
      const fecha = U.iso(new Date(cal.a, cal.m, d));
      const st = estado(fecha);
      if (st.gym) gym++;
      if (st.run) { run++; km += st.km; }
      const clase = st.gym && st.run ? 'ambos' : st.gym ? 'gym' : st.run ? 'run' : '';
      const texto = [st.gym && 'gym', st.run && 'carrera'].filter(Boolean).join(' y ');
      celdas.push(`
        <button class="cal-dia ${clase} ${fecha === U.iso() ? 'hoy' : ''}" data-acc="cal-dia" data-fecha="${fecha}"
          aria-label="${d} de ${U.MESES[cal.m]}${texto ? `: ${texto}` : ''}">${d}</button>`);
    }

    const kmTexto = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(km);
    return `
      <div class="nav-periodo">
        <button class="icon-btn" data-acc="cal-ant" aria-label="Mes anterior">‹</button>
        <h2>${U.MESES[cal.m]} ${cal.a}</h2>
        <button class="icon-btn" data-acc="cal-sig" aria-label="Mes siguiente">›</button>
      </div>
      <section class="bloque">
        <div class="cal">
          ${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span class="cal-cab muted peq">${d}</span>`).join('')}
          ${celdas.join('')}
        </div>
        <div class="cal-leyenda muted peq">
          <span><span class="marca marca-gym"></span>Gym</span>
          <span><span class="marca marca-run"></span>Carrera</span>
          <span><span class="marca marca-ambos"></span>Los dos</span>
        </div>
      </section>
      <section class="resumen gym-resumen">
        <div class="tarjeta"><span class="muted">Días de gym</span><strong>${gym}</strong></div>
        <div class="tarjeta"><span class="muted">Días de carrera</span><strong>${run}</strong></div>
        <div class="tarjeta"><span class="muted">Km corridos</span><strong>${kmTexto}</strong></div>
      </section>
      <p class="muted peq centro">Pulsa un día para ver o anotar lo que hiciste.</p>`;
  }

  // ---------- Eventos ----------
  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc, fecha = b.dataset.fecha;

    if (acc === 'vista') vista = b.dataset.v;
    else if (acc === 'sem-ant' || acc === 'sem-sig') {
      semana = new Date(semana);
      semana.setDate(semana.getDate() + (acc === 'sem-sig' ? 7 : -7));
    } else if (acc === 'sem-hoy') { semana = U.lunes(); abierto = U.diaSemana(); }
    else if (acc === 'abrir-dia') {
      const i = Number(b.dataset.dia);
      abierto = abierto === i ? null : i;
      desplazar = abierto !== null;
    } else if (acc === 'add-serie') regEj(fecha, b.dataset.ej).series.push({ kg: '', reps: '' });
    else if (acc === 'quitar-serie') {
      const x = regEj(fecha, b.dataset.ej);
      const ultima = x.series[x.series.length - 1];
      if (x.series.length <= 1) return;
      if (conDatos(ultima) && !confirm('La última serie tiene datos. ¿Quitarla?')) return;
      x.series.pop();
    } else if (acc === 'add-carrera') registro(fecha, true).carrera = { hecho: false, km: '', min: '' };
    else if (acc === 'quitar-carrera') {
      const c = registro(fecha, true).carrera;
      if ((c.hecho || String(c.km).trim() || String(c.min).trim()) && !confirm('¿Quitar esta carrera y sus datos?')) return;
      registro(fecha, true).carrera = null;
    } else if (acc === 'cal-ant' || acc === 'cal-sig') {
      const d = new Date(cal.a, cal.m + (acc === 'cal-sig' ? 1 : -1), 1);
      cal = { a: d.getFullYear(), m: d.getMonth() };
    } else if (acc === 'cal-dia') {
      // Abre ese día en la vista semanal.
      const d = U.deIso(fecha);
      semana = U.lunes(d);
      abierto = U.diaSemana(d);
      vista = 'registro';
      desplazar = true;
    } else return;

    Store.guardar();
    rerender();
  }

  // Guardado automático al escribir. No se repinta la vista para no perder el
  // foco ni cerrar el teclado; solo se repinta al marcar o desmarcar casillas.
  function alEscribir(e, rerender) {
    const t = e.target, g = t.dataset.g, fecha = t.dataset.fecha;
    if (!g || !fecha) return;
    const r = registro(fecha, true);

    if (g === 'notas') r.notas = t.value;
    else if (g === 'kg' || g === 'reps') {
      const x = regEj(fecha, t.dataset.ej);
      const i = Number(t.dataset.i);
      while (x.series.length <= i) x.series.push({ kg: '', reps: '' });
      x.series[i][g] = t.value;
    } else if (g === 'hecho') {
      regEj(fecha, t.dataset.ej).hecho = t.checked;
    } else if (g === 'run-hecho' || g === 'km' || g === 'min') {
      r.carrera = r.carrera || { hecho: false, km: '', min: '' };
      if (g === 'run-hecho') r.carrera.hecho = t.checked;
      else r.carrera[g] = t.value;
      const salida = document.querySelector(`[data-ritmo="${fecha}"]`);
      if (salida) salida.textContent = ritmo(r.carrera);
    } else return;

    Store.guardar();
    if (t.type === 'checkbox') rerender();
  }

  return { id: 'gym', nombre: 'Gym', icono: '🏋️', render, alClic, alEscribir };
})();
