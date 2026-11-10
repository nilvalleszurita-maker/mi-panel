// Módulo de Trabajo: días de agencia, importes en bruto y neto, y cobros.
//
// Tabla Store.get().trabajo.jornadas (→ jornadas_trabajo en Supabase):
//   id, fecha, lugar, hora_inicio, hora_fin ('HH:MM'), notas,
//   modo ('hora' = importe por hora | 'dia' = importe fijo por día),
//   importe (€/h o €/día), tipo ('bruto' | 'neto'), creado
// Bruto → neto = bruto × ajustes.factorNeto. Neto → se suma tal cual (bruto = neto).
// «Cobrada» no se guarda aparte: una jornada está cobrada si existe su ingreso en
// Finanzas (movimiento con jornada_id). Así nunca se apunta dos veces.
const Trabajo = (() => {
  const hoy = new Date();
  let mes = { a: hoy.getFullYear(), m: hoy.getMonth() };
  let form = null;            // { id|null } mientras se añade o edita un día
  let editandoFactor = false;

  const t = () => Store.get().trabajo;
  const fin = () => Store.get().finanzas;
  const factor = () => Store.get().ajustes.factorNeto ?? 398.02 / 435;
  const r2 = n => Math.round(n * 100) / 100;
  const euros = n => U.euros(r2(n));
  const claveMes = (a, m) => `${a}-${String(m + 1).padStart(2, '0')}`;

  // ---------- Cálculos ----------
  function horas(j) {
    if (!j.hora_inicio || !j.hora_fin) return 0;
    const [a, b] = j.hora_inicio.split(':').map(Number), [c, d] = j.hora_fin.split(':').map(Number);
    let min = c * 60 + d - (a * 60 + b);
    if (min <= 0) min += 24 * 60; // termina pasada la medianoche
    return min / 60;
  }
  function importes(j) {
    const base = j.modo === 'dia' ? j.importe : horas(j) * j.importe;
    return j.tipo === 'neto' ? { neto: r2(base), bruto: r2(base) } : { neto: r2(base * factor()), bruto: r2(base) };
  }
  const cobro = j => fin().movimientos.find(x => x.jornada_id === j.id) || null;
  const delMes = (a = mes.a, m = mes.m) => t().jornadas.filter(j => j.fecha.startsWith(claveMes(a, m)))
    .sort((x, y) => y.fecha.localeCompare(x.fecha) || (y.hora_inicio || '').localeCompare(x.hora_inicio || ''));
  const fmtH = h => `${String(Math.round(h * 10) / 10).replace('.', ',')} h`;

  // ---------- Cobrar: crea o quita el ingreso en Finanzas ----------
  function cobrar(j) {
    const ya = cobro(j);
    if (ya) { fin().movimientos = fin().movimientos.filter(x => x !== ya); }
    else {
      const d = U.deIso(j.fecha);
      fin().movimientos.push({
        id: Store.id(), tipo: 'ingreso', importe: importes(j).neto, categoria: 'Agencia', fecha: U.iso(),
        nota: `${j.lugar} · ${d.getDate()} ${U.MESES[d.getMonth()].slice(0, 3)}`, creado: Date.now(), jornada_id: j.id,
      });
    }
    Store.guardar();
  }

  // ---------- Pintado ----------
  function render(el) {
    const lista = delMes();
    let neto = 0, bruto = 0, cobrado = 0, hrs = 0;
    for (const j of lista) { const i = importes(j); neto += i.neto; bruto += i.bruto; hrs += horas(j); if (cobro(j)) cobrado += i.neto; }
    const pendiente = r2(neto - cobrado);
    const sinCobrar = lista.filter(j => !cobro(j));
    // Días sin cobrar desde hace más de 30 días (de cualquier mes).
    const limite = U.iso(new Date(Date.now() - 30 * 864e5));
    const viejos = t().jornadas.filter(j => j.fecha < limite && !cobro(j));
    const netoViejos = viejos.reduce((s, j) => s + importes(j).neto, 0);

    el.innerHTML = `
      <header class="hoy-cab">
        <div class="hoy-saludo">
          <span class="hoy-fecha">Trabajo · ${U.MESES[mes.m]}</span>
          <h1>Días de agencia</h1>
        </div>
        <button class="btn-mas" data-acc="nuevo" aria-label="Añadir día de trabajo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
          <span class="solo-escritorio">Añadir día</span>
        </button>
      </header>
      ${viejos.length ? `<p class="aviso-viejo">⚠ Tienes ${viejos.length} ${viejos.length === 1 ? 'día' : 'días'} sin cobrar desde hace más de 30 días (${euros(netoViejos)} netos).</p>` : ''}
      <div class="nav-periodo">
        <button class="icon-btn" data-acc="mes-ant" aria-label="Mes anterior">‹</button>
        <h2>${U.MESES[mes.m]} ${mes.a}</h2>
        <button class="icon-btn" data-acc="mes-sig" aria-label="Mes siguiente">›</button>
      </div>
      <section class="trabajo-resumen">
        <div class="ganado">
          <div class="ganado-cab"><span>Ganado este mes · neto</span><span>Bruto ${euros(bruto)}</span></div>
          <strong>${euros(neto)}</strong>
          <div class="barra-doble" role="presentation">
            <div style="width:${neto ? (cobrado / neto) * 100 : 0}%;background:var(--verde)"></div>
            <div style="width:${neto ? (pendiente / neto) * 100 : 0}%;background:var(--ambar)"></div>
          </div>
          <div class="ganado-pie">
            <span><i style="background:var(--verde)"></i>Cobrado ${euros(cobrado)}</span>
            <span><i style="background:var(--ambar)"></i>Pendiente ${euros(pendiente)}</span>
          </div>
        </div>
        <div class="tarjeta mini"><span class="muted">Días trabajados</span><strong>${lista.length}</strong></div>
        <div class="tarjeta mini"><span class="muted">Horas</span><strong>${fmtH(hrs)}</strong></div>
      </section>
      ${form ? formulario() : ''}
      <div class="cab-seccion"><h2>Jornadas</h2>${lista.length ? '<span class="muted peq">Toca para marcar cobrado</span>' : ''}</div>
      ${lista.length ? `<div class="jornadas">${lista.map(fila).join('')}</div>`
        : `<p class="vacio">No hay días este mes. Pulsa «+» para añadir uno.</p>`}
      ${lista.length ? `<p class="aviso-mes">${sinCobrar.length
        ? `Tienes ${sinCobrar.length} ${sinCobrar.length === 1 ? 'día' : 'días'} sin cobrar (${euros(pendiente)} netos). Se sumarán a Finanzas al marcarlos.`
        : 'Todo cobrado este mes. ¡Bien!'}</p>` : ''}
      <section class="bloque retencion">
        ${editandoFactor ? `
          <label class="campo">Neto = bruto × factor (ahora ${String(r2(factor() * 1000) / 1000).replace('.', ',')})
            <input id="factor" value="${String(factor()).replace('.', ',')}" inputmode="decimal">
          </label>
          <p class="muted peq nota">Ejemplo: 398,02 / 435 = 0,915. Solo cambia los importes de los días en bruto.</p>
          <div class="fila-botones"><button class="btn btn-sec" data-acc="factor-cancelar">Cancelar</button><button class="btn" data-acc="factor-guardar">Guardar</button></div>`
        : `<div class="cab-bloque"><span class="muted peq">Retención: neto = bruto × ${String(r2(factor() * 1000) / 1000).replace('.', ',')}</span>
            <button class="enlace peq" data-acc="factor">Cambiar</button></div>`}
      </section>`;
  }

  function fila(j) {
    const d = U.deIso(j.fecha), i = importes(j), c = cobro(j);
    const horario = j.hora_inicio && j.hora_fin ? `${j.hora_inicio}–${j.hora_fin} · ${fmtH(horas(j))}` : '';
    const tarifa = j.modo === 'dia' ? `${euros(j.importe)}/día` : `${euros(j.importe)}/h`;
    return `
      <div class="jornada ${c ? 'cobrada' : ''}">
        <button class="jornada-principal" data-acc="cobrar" data-id="${j.id}" aria-pressed="${!!c}"
          aria-label="${U.esc(j.lugar)}, ${d.getDate()} de ${U.MESES[d.getMonth()]}: ${c ? 'cobrado. Toca para desmarcar' : 'pendiente. Toca para marcar cobrado'}">
          <div class="jornada-fecha"><strong>${d.getDate()}</strong><span>${U.DIAS[U.diaSemana(d)].slice(0, 3)}</span></div>
          <div class="crece">
            <div class="jornada-lugar">${U.esc(j.lugar)}</div>
            <div class="muted peq">${[horario, `${tarifa} ${j.tipo}`].filter(Boolean).join(' · ')}</div>
            ${j.notas ? `<div class="muted peq">${U.esc(j.notas)}</div>` : ''}
          </div>
          <div class="jornada-importes">
            <strong>${euros(i.neto)}</strong>
            <span class="muted">${j.tipo === 'neto' ? 'neto · sin retención' : `${euros(i.bruto)} bruto`}</span>
            <span class="estado ${c ? 'ok' : ''}">${c ? `Cobrado ${U.deIso(c.fecha).getDate()}/${U.deIso(c.fecha).getMonth() + 1}` : 'Pendiente'}</span>
          </div>
        </button>
        <button class="icon-btn peq jornada-editar" data-acc="editar" data-id="${j.id}" aria-label="Editar ${U.esc(j.lugar)}">✎</button>
      </div>`;
  }

  // ---------- Formulario ----------
  function formulario() {
    const j = form.id ? t().jornadas.find(x => x.id === form.id) : null;
    const v = j || { fecha: U.iso(), lugar: '', hora_inicio: '09:00', hora_fin: '15:00', notas: '', modo: 'hora', importe: '', tipo: 'bruto' };
    const lugares = [...new Set(t().jornadas.map(x => x.lugar).filter(Boolean))];
    const opcion = (n, val, txt, sel) => `<label class="chip-check"><input type="radio" name="${n}" value="${val}" ${sel === val ? 'checked' : ''}><span>${txt}</span></label>`;
    return `
      <form class="editor-outfit form-jornada" id="form-jornada">
        <h3>${j ? 'Editar día' : 'Nuevo día de trabajo'}</h3>
        <div class="dos-col">
          <label class="campo">Fecha<input type="date" name="fecha" value="${v.fecha}" required></label>
          <label class="campo">Lugar<input name="lugar" value="${U.esc(v.lugar)}" list="lugares" required maxlength="60" placeholder="Ej. Almacén"></label>
        </div>
        <datalist id="lugares">${lugares.map(l => `<option value="${U.esc(l)}">`).join('')}</datalist>
        <div class="dos-col">
          <label class="campo">Hora inicio<input type="time" name="hora_inicio" value="${v.hora_inicio || ''}"></label>
          <label class="campo">Hora fin<input type="time" name="hora_fin" value="${v.hora_fin || ''}"></label>
        </div>
        <div class="campo">Cómo se paga<div class="chips">${opcion('modo', 'hora', 'Por horas', v.modo)}${opcion('modo', 'dia', 'Fijo por día', v.modo)}</div></div>
        <div class="dos-col">
          <label class="campo"><span id="etq-importe">${v.modo === 'dia' ? 'Importe del día (€)' : 'Tarifa (€/h)'}</span>
            <input name="importe" value="${v.importe === '' ? '' : String(v.importe).replace('.', ',')}" inputmode="decimal" required placeholder="0,00" autocomplete="off"></label>
          <div class="campo">El importe es<div class="chips">${opcion('tipo', 'bruto', 'Bruto', v.tipo)}${opcion('tipo', 'neto', 'Neto', v.tipo)}</div></div>
        </div>
        <p class="calculo-jornada" id="calculo-jornada"></p>
        <label class="campo">Notas<input name="notas" value="${U.esc(v.notas || '')}" maxlength="120" placeholder="Opcional"></label>
        <div class="fila-botones">
          <button type="button" class="btn btn-sec" data-acc="cancelar">Cancelar</button>
          <button class="btn">${j ? 'Guardar cambios' : 'Añadir día'}</button>
        </div>
        ${j ? `<button type="button" class="enlace peligro" data-acc="borrar" data-id="${j.id}">Borrar este día</button>` : ''}
      </form>`;
  }

  // Lee el formulario como una jornada (sin guardar).
  function leerForm(f) {
    const d = new FormData(f);
    return {
      fecha: d.get('fecha'), lugar: String(d.get('lugar') || '').trim(), hora_inicio: d.get('hora_inicio') || '', hora_fin: d.get('hora_fin') || '',
      notas: String(d.get('notas') || '').trim(), modo: d.get('modo') || 'hora', importe: U.numero(d.get('importe') || ''), tipo: d.get('tipo') || 'bruto',
    };
  }
  // Vista previa del importe mientras se escribe.
  function previa() {
    const f = document.getElementById('form-jornada');
    if (!f) return;
    const j = leerForm(f), i = importes(j);
    document.getElementById('etq-importe').textContent = j.modo === 'dia' ? 'Importe del día (€)' : 'Tarifa (€/h)';
    document.getElementById('calculo-jornada').innerHTML = j.importe > 0
      ? `= <strong>${euros(i.neto)} netos</strong> · ${j.tipo === 'neto' ? 'sin retención' : `${euros(i.bruto)} brutos`}${j.modo === 'hora' ? ` · ${fmtH(horas(j))}` : ''}`
      : '';
  }

  // ---------- Eventos ----------
  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    const j = b.dataset.id && t().jornadas.find(x => x.id === b.dataset.id);
    if (acc === 'mes-ant' || acc === 'mes-sig') {
      const d = new Date(mes.a, mes.m + (acc === 'mes-sig' ? 1 : -1), 1);
      mes = { a: d.getFullYear(), m: d.getMonth() };
    } else if (acc === 'nuevo') { form = { id: null }; }
    else if (acc === 'editar') form = { id: j.id };
    else if (acc === 'cancelar') form = null;
    else if (acc === 'cobrar') cobrar(j);
    else if (acc === 'borrar') {
      const c = cobro(j);
      if (!confirm(`¿Borrar el día en «${j.lugar}»?${c ? ' Ya estaba cobrado: también se quitará su ingreso de Finanzas.' : ''}`)) return;
      if (c) fin().movimientos = fin().movimientos.filter(x => x !== c);
      t().jornadas = t().jornadas.filter(x => x !== j);
      Store.guardar();
      form = null;
    } else if (acc === 'factor') editandoFactor = true;
    else if (acc === 'factor-cancelar') editandoFactor = false;
    else if (acc === 'factor-guardar') {
      const txt = document.getElementById('factor').value.trim();
      const v = txt.includes('/') ? txt.split('/').map(x => U.numero(x)).reduce((x, y) => x / y) : U.numero(txt);
      if (!(v > 0 && v <= 1)) { alert('El factor debe estar entre 0 y 1 (por ejemplo 0,915 o 398,02/435).'); return; }
      Store.get().ajustes.factorNeto = v;
      Store.guardar();
      editandoFactor = false;
    } else return;
    rerender();
    if (acc === 'nuevo' || acc === 'editar') { previa(); document.querySelector('#form-jornada')?.scrollIntoView({ block: 'start' }); }
  }

  function alEscribir(e) {
    const f = e.target.closest('#form-jornada');
    if (!f) return;
    // Al elegir un lugar ya usado, se rellenan su importe y su tipo.
    if (e.target.name === 'lugar' && !form.id) {
      const previo = [...t().jornadas].sort((x, y) => y.fecha.localeCompare(x.fecha)).find(x => x.lugar.toLowerCase() === e.target.value.trim().toLowerCase());
      if (previo) {
        f.importe.value = String(previo.importe).replace('.', ',');
        f.querySelector(`[name=modo][value=${previo.modo}]`).checked = true;
        f.querySelector(`[name=tipo][value=${previo.tipo}]`).checked = true;
        if (previo.hora_inicio) f.hora_inicio.value = previo.hora_inicio;
        if (previo.hora_fin) f.hora_fin.value = previo.hora_fin;
      }
    }
    previa();
  }

  function alEnviar(e, rerender) {
    if (e.target.id !== 'form-jornada') return;
    e.preventDefault();
    const datos = leerForm(e.target);
    if (!datos.lugar || !(datos.importe > 0)) return;
    if (datos.modo === 'hora' && !horas(datos)) { alert('Pon la hora de inicio y de fin, o elige «Fijo por día».'); return; }
    if (form.id) {
      const j = t().jornadas.find(x => x.id === form.id);
      Object.assign(j, datos);
      // Si ya estaba cobrada, su ingreso en Finanzas se ajusta al nuevo importe neto.
      const c = cobro(j);
      if (c) c.importe = importes(j).neto;
    } else {
      t().jornadas.push({ id: Store.id(), ...datos, creado: Date.now() });
    }
    Store.guardar();
    const d = U.deIso(datos.fecha);
    mes = { a: d.getFullYear(), m: d.getMonth() };
    form = null;
    rerender();
  }

  return { id: 'trabajo', nombre: 'Trabajo', icono: '💼', render, alClic, alEscribir, alEnviar };
})();
