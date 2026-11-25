// Módulo de Gym: registro diario de la planificación (js/gym-plan.js),
// tipos de entreno por día (gym, carrera, boxeo y los que añadas), vista
// semanal por días y calendario mensual con un color por tipo.
//
// Datos guardados (Store.get().gym):
//   registros: uno por fecha AAAA-MM-DD:
//     { ej: { [idEjercicio]: { nombre, hecho, series: [{ kg, reps }] } },
//       gymHecho,                              // gym marcado a mano (sin ejercicios)
//       carrera: { hecho, km, min } | null,
//       boxeo: { min, intensidad, partes: [], rounds, notas } | null,
//       extras: { [idTipo]: { min, notas } },  // tipos añadidos por ti
//       notas }
//   tiposExtra: [{ id, nombre, color }]        // p. ej. Fútbol, Natación
// Los valores se guardan tal y como se escriben (texto) para no alterar "62,5".
// Un día con dos o tres entrenos cuenta como dos o tres en los totales.
const Gym = (() => {
  // Estado de la vista (no se guarda).
  const hoy = new Date();
  let vista = 'registro';          // 'registro' | 'calendario'
  let semana = U.lunes();          // lunes de la semana visible
  let abierto = U.diaSemana();     // día desplegado (0 = lunes), null = ninguno
  let cal = { a: hoy.getFullYear(), m: hoy.getMonth() };
  let desplazar = false;           // llevar el día abierto a la vista tras pintar

  const regs = () => Store.get().gym.registros;

  // ---------- Tipos de entreno ----------
  const TIPOS_BASE = [
    { id: 'gym', nombre: 'Gym', color: 'var(--tipo-gym)' },
    { id: 'carrera', nombre: 'Carrera', color: 'var(--tipo-run)' },
    { id: 'boxeo', nombre: 'Boxeo', color: 'var(--tipo-box)' },
  ];
  const COLORES_EXTRA = ['#c8a8ff', '#f5d76e', '#5fd0e0', '#f07fb4', '#a3e635', '#e2b48c'];
  const PARTES_BOXEO = ['Técnica', 'Saco', 'Manoplas', 'Sparring', 'Comba', 'Físico'];
  const DURACIONES = ['60', '75', '90', '120'];
  const INTENSIDAD = ['', 'suave', 'tranquila', 'media', 'dura', 'a tope'];
  const extrasGuardados = () => Store.get().gym.tiposExtra || (Store.get().gym.tiposExtra = []);
  const tipos = () => TIPOS_BASE.concat(extrasGuardados());
  const tipoPorId = id => tipos().find(t => t.id === id);
  const conBoxeo = b => !!b && (String(b.min).trim() || b.intensidad || b.partes?.length || String(b.rounds).trim() || String(b.notas).trim());
  const conExtra = x => !!x && (String(x.min).trim() || String(x.notas).trim());
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

  // Qué se hizo un día: gym si está marcado o tiene al menos un ejercicio
  // hecho; carrera si está marcada como hecha o tiene kilómetros; boxeo y los
  // tipos añadidos si están marcados. «tipos» = los ids en orden, para colores
  // y totales (cada tipo cuenta como un entreno).
  function estado(fecha) {
    const r = regs()[fecha];
    const km = r?.carrera ? U.numero(r.carrera.km) : 0;
    const st = {
      gym: !!r && (!!r.gymHecho || Object.values(r.ej || {}).some(x => x.hecho)),
      run: !!r?.carrera && (r.carrera.hecho || km > 0),
      boxeo: !!r?.boxeo,
      km,
    };
    const hechos = { gym: st.gym, carrera: st.run, boxeo: st.boxeo };
    st.tipos = tipos().map(t => t.id).filter(id => id in hechos ? hechos[id] : !!r?.extras?.[id]);
    return st;
  }

  // Fondo de un día del calendario: un color, o franjas si hay varios entrenos.
  function fondoTipos(ids) {
    if (!ids.length) return '';
    const cols = ids.map(id => tipoPorId(id)?.color || 'var(--muted)');
    if (cols.length === 1) return cols[0];
    const paso = 100 / cols.length;
    return `linear-gradient(135deg, ${cols.map((c, i) => `${c} ${(i * paso).toFixed(2)}% ${((i + 1) * paso).toFixed(2)}%`).join(', ')})`;
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
      ${tarjetaBoxeo()}
      <section class="dias">${GYM_PLAN.map((_, i) => dia(i)).join('')}</section>
      ${resumenVisible()}`;
  }

  // Boxeo de la semana visible: hechas frente a GYM_BOXEO.porSemana, con los
  // días posibles que quedan (sin días fijos).
  function tarjetaBoxeo() {
    const cfg = typeof GYM_BOXEO !== 'undefined' ? GYM_BOXEO : { porSemana: 2, dias: [0, 1, 2, 3] };
    const hoyIso = U.iso();
    const dias = Array.from({ length: 7 }, (_, i) => {
      const fecha = U.iso(fechaDe(i));
      return { i, fecha, hecho: estado(fecha).boxeo, permitido: cfg.dias.includes(i) };
    });
    const hechos = dias.filter(d => d.hecho).length;
    const posibles = dias.filter(d => d.permitido && !d.hecho && d.fecha >= hoyIso && hechos < cfg.porSemana);
    const faltan = Math.max(0, cfg.porSemana - hechos);
    const nombreDia = d => d.fecha === hoyIso ? 'hoy'
      : d.fecha === U.iso(new Date(Date.now() + 864e5)) ? 'mañana' : `el ${U.DIAS[d.i].toLowerCase()}`;
    const permitidos = cfg.dias.map(i => U.DIAS[i].toLowerCase());
    const rango = permitidos.length > 1 ? `de ${permitidos[0]} a ${permitidos[permitidos.length - 1]}` : permitidos[0];
    const ultimo = U.iso(fechaDe(6));
    let consejo;
    if (!faltan) consejo = 'Objetivo de la semana cumplido. Si vas otro día, suma como extra.';
    else if (ultimo < hoyIso) consejo = `Esa semana hiciste ${hechos} de ${cfg.porSemana}.`;
    else if (!posibles.length) consejo = 'Esta semana ya no quedan días de boxeo.';
    else if (posibles.length <= faltan) consejo = `Te ${faltan === 1 ? 'falta 1' : `faltan ${faltan}`}: ${posibles.map(nombreDia).join(' y ')}.`;
    else consejo = `Te ${faltan === 1 ? 'falta 1' : `faltan ${faltan}`}. Puedes ir ${posibles.map(nombreDia).join(', ').replace(/, ([^,]*)$/, ' o $1')} (cualquier día ${rango}).`;

    return `
      <section class="bloque box-semana">
        <div class="box-cab">
          <h2>Boxeo esta semana</h2>
          <strong class="box-cuenta">${hechos} de ${cfg.porSemana}</strong>
        </div>
        <div class="box-dias">
          ${dias.map(d => {
            const posible = posibles.includes(d);
            return `
              <span class="box-dia ${d.permitido ? '' : 'fuera'}">
                <span class="peq">${'LMXJVSD'[d.i]}</span>
                <span class="box-caja ${d.hecho ? 'hecho' : ''} ${posible ? 'posible' : ''}"
                  aria-label="${U.DIAS[d.i]}: ${d.hecho ? 'boxeo hecho' : posible ? 'puedes ir' : 'sin boxeo'}">${d.hecho ? '✓' : ''}</span>
              </span>`;
          }).join('')}
        </div>
        <p class="muted peq">${consejo}</p>
      </section>`;
  }

  // Resumen de la semana visible por tipo, frente a lo planificado.
  function resumenVisible() {
    const cuenta = {};
    let total = 0;
    for (let i = 0; i < 7; i++) estado(U.iso(fechaDe(i))).tipos.forEach(id => { cuenta[id] = (cuenta[id] || 0) + 1; total++; });
    const objetivo = {
      gym: GYM_PLAN.filter(p => p.tipo === 'gym').length,
      carrera: GYM_PLAN.filter(p => p.tipo === 'carrera').length,
      boxeo: typeof GYM_BOXEO !== 'undefined' ? GYM_BOXEO.porSemana : 2,
    };
    const filas = tipos().filter(t => t.id in objetivo || cuenta[t.id]).map(t => {
      const n = cuenta[t.id] || 0, obj = objetivo[t.id];
      return `
        <div class="tipo-barra">
          <div class="fila-entre peq"><span>${U.esc(t.nombre)}</span><span class="muted">${obj ? `${n} de ${obj}` : n}</span></div>
          <div class="barra"><div style="width:${obj ? Math.min(100, Math.round(n / obj * 100)) : 100}%;background:${t.color}"></div></div>
        </div>`;
    }).join('');
    return `
      <section class="bloque gym-sem-resumen">
        <div class="fila-entre"><h2>Esta semana</h2><strong>${total} ${total === 1 ? 'entreno' : 'entrenos'}</strong></div>
        ${filas}
      </section>`;
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
            ${st.tipos.map(id => `<span class="marca" style="background:${tipoPorId(id).color}" title="${U.esc(tipoPorId(id).nombre)} hecho"></span>`).join('')}
            <span class="muted peq">${resumen}</span>
          </span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
        ${esAbierto ? cuerpoDia(fecha, p, lista) : ''}
      </article>`;
  }

  function cuerpoDia(fecha, p, lista) {
    const r = regs()[fecha];
    let html = selectorTipos(fecha);
    if (p.tipo === 'carrera') {
      html += bloqueCarrera(fecha, p);
    } else {
      html += lista.map(e => bloqueEjercicio(fecha, e)).join('');
      // Ejercicios anotados ese día que ya no están en la planificación.
      if (r) {
        html += Object.keys(r.ej).filter(id => !lista.some(e => e.id === id))
          .map(id => bloqueEjercicio(fecha, ejercicio(fecha, id))).join('');
      }
      if (r?.carrera) html += bloqueCarrera(fecha, null);
    }
    if (r?.boxeo) html += bloqueBoxeo(fecha);
    extrasGuardados().filter(t => r?.extras?.[t.id]).forEach(t => { html += bloqueExtra(fecha, t); });
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

  // Botones para marcar qué entrenos se hicieron ese día (uno, dos o más).
  function selectorTipos(fecha) {
    const st = estado(fecha);
    return `
      <div class="tipos-dia" role="group" aria-label="Entrenos de este día">
        ${tipos().map(t => {
          const on = st.tipos.includes(t.id);
          return `
            <button type="button" class="tipo-btn ${on ? 'on' : ''}" style="--c:${t.color}" data-acc="tipo" data-tipo="${U.esc(t.id)}"
              data-fecha="${fecha}" aria-pressed="${on}">
              <span class="tipo-color"></span><span class="crece">${U.esc(t.nombre)}</span><span class="tipo-check">${on ? '✓' : ''}</span>
            </button>`;
        }).join('')}
        <button type="button" class="tipo-btn tipo-nuevo" data-acc="nuevo-tipo">+ Otro tipo</button>
      </div>`;
  }

  function bloqueBoxeo(fecha) {
    const b = regs()[fecha].boxeo;
    const attrs = `data-fecha="${fecha}"`;
    const chip = (on, acc, v, txt) =>
      `<button type="button" class="chip ${on ? 'on' : ''}" style="--c:var(--tipo-box)" data-acc="${acc}" data-v="${v}" ${attrs} aria-pressed="${on}">${txt}</button>`;
    return `
      <div class="ejercicio tipo-ficha" style="--c:var(--tipo-box)">
        <div class="fila-entre"><strong>Boxeo</strong>${b.intensidad ? `<span class="muted peq">intensidad ${INTENSIDAD[b.intensidad]}</span>` : ''}</div>
        <div class="campo-grupo">
          <span class="muted peq">Duración (min)</span>
          <div class="chips">
            ${DURACIONES.map(m => chip(String(b.min) === m, 'box-min', m, `${m} min`)).join('')}
            <input class="box-otra" data-g="box-min" ${attrs} value="${U.esc(DURACIONES.includes(String(b.min)) ? '' : b.min)}"
              inputmode="numeric" autocomplete="off" placeholder="Otra" aria-label="Otra duración en minutos">
          </div>
        </div>
        <div class="campo-grupo">
          <span class="muted peq">Intensidad</span>
          <div class="box-intensidad">
            ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${b.intensidad >= n ? 'on' : ''}" data-acc="box-int" data-v="${n}" ${attrs}
              aria-pressed="${b.intensidad === n}" aria-label="Intensidad ${n} de 5: ${INTENSIDAD[n]}">${n}</button>`).join('')}
          </div>
        </div>
        <div class="campo-grupo">
          <span class="muted peq">Qué has hecho</span>
          <div class="chips">${PARTES_BOXEO.map(x => chip((b.partes || []).includes(x), 'box-parte', U.esc(x), U.esc(x))).join('')}</div>
        </div>
        <div class="fila-entre">
          <span class="muted">Rounds</span>
          <div class="contador">
            <button type="button" class="btn btn-sec btn-mini" data-acc="box-rounds" data-v="-1" ${attrs} aria-label="Un round menos">−</button>
            <strong>${U.esc(String(b.rounds || 0))}</strong>
            <button type="button" class="btn btn-sec btn-mini" data-acc="box-rounds" data-v="1" ${attrs} aria-label="Un round más">+</button>
          </div>
        </div>
        <input data-g="box-notas" ${attrs} value="${U.esc(b.notas || '')}" autocomplete="off"
          placeholder="Notas: qué has aprendido, qué mejorar…" aria-label="Notas de boxeo">
      </div>`;
  }

  function bloqueExtra(fecha, t) {
    const x = regs()[fecha].extras[t.id];
    const attrs = `data-fecha="${fecha}" data-tipo="${U.esc(t.id)}"`;
    return `
      <div class="ejercicio tipo-ficha" style="--c:${t.color}">
        <strong>${U.esc(t.nombre)}</strong>
        <div class="carrera-campos">
          <label>Duración (min)
            <input data-g="ext-min" ${attrs} value="${U.esc(x.min)}" inputmode="numeric" autocomplete="off" placeholder="60">
          </label>
          <label>Notas
            <input data-g="ext-notas" ${attrs} value="${U.esc(x.notas)}" autocomplete="off" placeholder="Opcional">
          </label>
        </div>
      </div>`;
  }

  function vistaCalendario() {
    const primero = new Date(cal.a, cal.m, 1);
    const diasMes = new Date(cal.a, cal.m + 1, 0).getDate();
    const huecos = U.diaSemana(primero);
    let km = 0, total = 0, diasEntreno = 0, dobles = 0;
    const cuenta = {};

    const celdas = [];
    for (let i = 0; i < huecos; i++) celdas.push('<span></span>');
    for (let d = 1; d <= diasMes; d++) {
      const fecha = U.iso(new Date(cal.a, cal.m, d));
      const st = estado(fecha);
      if (st.run) km += st.km;
      st.tipos.forEach(id => { cuenta[id] = (cuenta[id] || 0) + 1; });
      total += st.tipos.length;
      if (st.tipos.length) diasEntreno++;
      if (st.tipos.length > 1) dobles++;
      const texto = st.tipos.map(id => tipoPorId(id).nombre.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' y $1');
      const fondo = fondoTipos(st.tipos);
      celdas.push(`
        <button class="cal-dia ${st.tipos.length ? 'con' : ''} ${st.tipos.length > 1 ? 'varios' : ''} ${fecha === U.iso() ? 'hoy' : ''}"
          ${fondo ? `style="background:${fondo}"` : ''} data-acc="cal-dia" data-fecha="${fecha}"
          aria-label="${d} de ${U.MESES[cal.m]}${texto ? `: ${texto}` : ''}"><span>${d}</span></button>`);
    }

    const kmTexto = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(km);
    const usados = tipos().filter(t => TIPOS_BASE.some(b => b.id === t.id) || cuenta[t.id]);
    const desglose = usados.map(t => `${cuenta[t.id] || 0} ${t.nombre.toLowerCase()}`).join(' + ');
    return `
      <div class="nav-periodo">
        <button class="icon-btn" data-acc="cal-ant" aria-label="Mes anterior">‹</button>
        <h2>${U.MESES[cal.m]} ${cal.a}</h2>
        <button class="icon-btn" data-acc="cal-sig" aria-label="Mes siguiente">›</button>
      </div>
      <section class="bloque total-entrenos">
        <div class="crece">
          <span class="muted peq mayus">Entrenos este mes</span>
          <span class="peq">${desglose}</span>
          <span class="muted peq">en ${diasEntreno} ${diasEntreno === 1 ? 'día' : 'días'}${dobles ? ` (${dobles} con entreno doble o triple)` : ''}</span>
        </div>
        <strong class="total-num">${total}</strong>
      </section>
      <section class="bloque">
        <div class="cal">
          ${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span class="cal-cab muted peq">${d}</span>`).join('')}
          ${celdas.join('')}
        </div>
        <div class="cal-leyenda muted peq">
          ${usados.map(t => `<span><span class="marca" style="background:${t.color}"></span>${U.esc(t.nombre)} · ${cuenta[t.id] || 0}</span>`).join('')}
        </div>
        <p class="muted peq centro">Un color = un entreno · dos o tres colores = varios entrenos ese día</p>
      </section>
      <section class="resumen gym-resumen">
        <div class="tarjeta"><span class="muted">Días entrenados</span><strong>${diasEntreno}</strong></div>
        <div class="tarjeta"><span class="muted">Km corridos</span><strong>${kmTexto}</strong></div>
      </section>
      <p class="muted peq centro">Pulsa un día para ver o anotar lo que hiciste.</p>`;
  }

  // Marca o desmarca un tipo de entreno en un día. Devuelve false si se cancela.
  function alternarTipo(fecha, id) {
    const r = registro(fecha, true);
    const on = estado(fecha).tipos.includes(id);
    if (id === 'gym') {
      if (on) {
        const marcados = Object.values(r.ej).filter(x => x.hecho);
        if (marcados.length && !confirm('¿Desmarcar el gym de este día? Los ejercicios marcados se desmarcan (los pesos se quedan).')) return false;
        marcados.forEach(x => { x.hecho = false; });
        r.gymHecho = false;
      } else r.gymHecho = true;
    } else if (id === 'carrera') {
      if (on) {
        const c = r.carrera;
        if ((String(c.km).trim() || String(c.min).trim()) && !confirm('¿Quitar la carrera de este día y sus datos?')) return false;
        r.carrera = null;
      } else r.carrera = { ...(r.carrera || { km: '', min: '' }), hecho: true };
    } else if (id === 'boxeo') {
      if (on) {
        if (conBoxeo(r.boxeo) && !confirm('¿Quitar el boxeo de este día y sus datos?')) return false;
        r.boxeo = null;
      } else r.boxeo = { min: '', intensidad: 0, partes: [], rounds: '', notas: '' };
    } else {
      r.extras = r.extras || {};
      if (on) {
        if (conExtra(r.extras[id]) && !confirm(`¿Quitar ${tipoPorId(id)?.nombre || 'este entreno'} de este día y sus datos?`)) return false;
        delete r.extras[id];
      } else r.extras[id] = { min: '', notas: '' };
    }
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
    } else if (acc === 'tipo') {
      if (alternarTipo(fecha, b.dataset.tipo) === false) return;
    } else if (acc === 'nuevo-tipo') {
      const nombre = (prompt('Nombre del nuevo tipo de entreno (p. ej. Fútbol, Natación):') || '').trim();
      if (!nombre) return;
      if (tipos().some(t => t.nombre.toLowerCase() === nombre.toLowerCase())) { alert('Ese tipo ya existe.'); return; }
      const usados = extrasGuardados().map(t => t.color);
      const color = COLORES_EXTRA.find(c => !usados.includes(c)) || COLORES_EXTRA[extrasGuardados().length % COLORES_EXTRA.length];
      extrasGuardados().push({ id: 'x-' + slug(nombre) + '-' + Store.id().slice(-4), nombre, color });
    } else if (acc === 'box-min') registro(fecha, true).boxeo.min = b.dataset.v;
    else if (acc === 'box-int') {
      const x = registro(fecha, true).boxeo, n = Number(b.dataset.v);
      x.intensidad = x.intensidad === n ? 0 : n;
    } else if (acc === 'box-parte') {
      const x = registro(fecha, true).boxeo, v = b.dataset.v;
      x.partes = (x.partes || []).includes(v) ? x.partes.filter(p => p !== v) : (x.partes || []).concat(v);
    } else if (acc === 'box-rounds') {
      const x = registro(fecha, true).boxeo;
      x.rounds = String(Math.max(0, (parseInt(x.rounds, 10) || 0) + Number(b.dataset.v)));
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
    } else if (g === 'box-min' || g === 'box-notas') {
      if (!r.boxeo) return;
      r.boxeo[g === 'box-min' ? 'min' : 'notas'] = t.value;
    } else if (g === 'ext-min' || g === 'ext-notas') {
      const x = r.extras?.[t.dataset.tipo];
      if (!x) return;
      x[g === 'ext-min' ? 'min' : 'notas'] = t.value;
    } else return;

    Store.guardar();
    if (t.type === 'checkbox') rerender();
  }

  // Para Hoy: abre la vista semanal en el día de hoy.
  function irAHoy() {
    vista = 'registro';
    semana = U.lunes();
    abierto = U.diaSemana();
    desplazar = true;
  }

  // Para Hoy: días de gym y de carrera hechos en la semana que empieza en «lunes»,
  // frente a los planificados.
  function resumenSemana(lunes = U.lunes()) {
    let gym = 0, carreras = 0, boxeo = 0, km = 0, dias = 0, entrenos = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes); d.setDate(d.getDate() + i);
      const st = estado(U.iso(d));
      if (st.gym) gym++;
      if (st.run) { carreras++; km += st.km; }
      if (st.boxeo) boxeo++;
      if (st.tipos.length) dias++; // días entrenados (uno o varios entrenos)
      entrenos += st.tipos.length; // un día con gym y boxeo cuenta 2
    }
    return {
      gym, carreras, boxeo, km, dias, entrenos,
      planBoxeo: typeof GYM_BOXEO !== 'undefined' ? GYM_BOXEO.porSemana : 2,
      planGym: GYM_PLAN.filter(p => p.tipo === 'gym').length,
      planCarreras: GYM_PLAN.filter(p => p.tipo === 'carrera').length,
    };
  }

  // Para Hoy: la sesión que toca en una fecha, con cada ejercicio, si ya está
  // marcado ese día y el último peso registrado antes de esa fecha.
  function sesionDe(fecha = U.iso()) {
    const p = planDe(fecha);
    const r = regs()[fecha];
    const ultimoKg = series => {
      const kgs = series.map(s => U.numero(s.kg)).filter(n => n > 0);
      return kgs.length ? Math.max(...kgs) : null;
    };
    return {
      sesion: p.sesion, tipo: p.tipo, km: p.km, ritmo: p.ritmo,
      carrera: r?.carrera || null,
      ejercicios: ejerciciosDe(p).map(e => {
        const prev = anterior(fecha, e.id);
        return {
          id: e.id, nombre: e.nombre, series: e.series, reps: e.reps,
          hecho: !!r?.ej[e.id]?.hecho,
          ultimoKg: prev ? ultimoKg(prev.series) : null,
        };
      }),
    };
  }

  return { id: 'gym', nombre: 'Gym', icono: '🏋️', render, alClic, alEscribir, irAHoy, resumenSemana, estado, sesionDe };
})();
