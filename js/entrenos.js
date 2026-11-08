// Módulo de Entrenos: plan semanal fijo (plantilla) + registro de días hechos por semana.
const Entrenos = (() => {
  let semana = U.lunes();     // lunes de la semana visible
  let editando = null;        // índice del día en edición (0 = lunes)
  let borrador = null;        // copia del día mientras se edita

  const datos = () => Store.get().entrenos;
  const claveSemana = () => U.iso(semana);
  const plan = i => datos().plan[i] || { titulo: '', ejercicios: [] };
  const tienePlan = p => p.titulo.trim() || p.ejercicios.length;

  function render(el) {
    const hechos = datos().hechos[claveSemana()] || [];
    const esActual = claveSemana() === U.iso(U.lunes());
    const hoy = U.diaSemana();
    const planificados = U.DIAS.filter((_, i) => tienePlan(plan(i))).length;
    const fin = new Date(semana); fin.setDate(fin.getDate() + 6);
    const pct = planificados ? Math.min(100, (hechos.length / planificados) * 100) : 0;

    el.innerHTML = `
      <div class="nav-periodo">
        <button class="icon-btn" data-acc="sem-ant" aria-label="Semana anterior">‹</button>
        <h2>${semana.getDate()} ${U.MESES[semana.getMonth()].slice(0, 3)} – ${fin.getDate()} ${U.MESES[fin.getMonth()].slice(0, 3)}</h2>
        <button class="icon-btn" data-acc="sem-sig" aria-label="Semana siguiente">›</button>
      </div>
      ${esActual ? '' : `<button class="enlace" data-acc="sem-hoy">Volver a esta semana</button>`}

      <section class="tarjeta progreso">
        <div class="barra-cab"><span>Entrenos completados</span><strong>${hechos.length} / ${planificados}</strong></div>
        <div class="barra"><div style="width:${pct}%"></div></div>
      </section>

      ${planificados ? '' : `<p class="vacio">Empieza creando tu plan: pulsa «Editar» en cada día que entrenes.</p>`}

      <section class="dias">
        ${U.DIAS.map((nombre, i) => editando === i ? editor(nombre) : dia(nombre, i, hechos.includes(i), esActual && i === hoy)).join('')}
      </section>`;
  }

  function dia(nombre, i, hecho, esHoy) {
    const p = plan(i);
    const activo = tienePlan(p);
    return `
      <article class="dia ${esHoy ? 'hoy' : ''} ${hecho ? 'hecho' : ''}">
        <header>
          <div>
            <span class="muted peq">${nombre}${esHoy ? ' · hoy' : ''}</span>
            <h3>${activo ? U.esc(p.titulo || 'Entreno') : '<span class="muted">Descanso</span>'}</h3>
          </div>
          <div class="acciones">
            ${activo ? `<button class="check ${hecho ? 'on' : ''}" data-acc="hecho" data-dia="${i}" aria-pressed="${hecho}">${hecho ? '✓ Hecho' : 'Marcar hecho'}</button>` : ''}
            <button class="icon-btn peq" data-acc="editar" data-dia="${i}" aria-label="Editar ${nombre}">✎</button>
          </div>
        </header>
        ${p.ejercicios.length ? `<ul class="ejercicios">${p.ejercicios.map(e => `
          <li><span>${U.esc(e.nombre)}</span><span class="muted">${[
            e.series && e.reps ? `${U.esc(e.series)}×${U.esc(e.reps)}` : U.esc(e.series || e.reps),
            e.peso ? `${U.esc(e.peso)} kg` : '',
          ].filter(Boolean).join(' · ')}</span></li>`).join('')}</ul>` : ''}
      </article>`;
  }

  function editor(nombre) {
    return `
      <article class="dia editando">
        <span class="muted peq">${nombre}</span>
        <label>Tipo de entreno<input data-campo="titulo" value="${U.esc(borrador.titulo)}" placeholder="Ej. Pierna, Running… (vacío = descanso)"></label>
        <div class="ej-cab muted peq"><span>Ejercicio</span><span>Series</span><span>Reps</span><span>Kg</span><span></span></div>
        ${borrador.ejercicios.map((e, j) => `
          <div class="ej-fila">
            <input data-ej="${j}" data-campo="nombre" value="${U.esc(e.nombre)}" placeholder="Sentadilla" aria-label="Ejercicio">
            <input data-ej="${j}" data-campo="series" value="${U.esc(e.series)}" inputmode="numeric" placeholder="4" aria-label="Series">
            <input data-ej="${j}" data-campo="reps" value="${U.esc(e.reps)}" placeholder="10" aria-label="Repeticiones">
            <input data-ej="${j}" data-campo="peso" value="${U.esc(e.peso)}" inputmode="decimal" placeholder="60" aria-label="Peso en kg">
            <button class="icon-btn peq" data-acc="quitar-ej" data-ej="${j}" aria-label="Quitar ejercicio">×</button>
          </div>`).join('')}
        <button class="enlace" data-acc="add-ej">+ Añadir ejercicio</button>
        <div class="fila-botones">
          <button class="btn btn-sec" data-acc="cancelar">Cancelar</button>
          <button class="btn" data-acc="guardar">Guardar</button>
        </div>
      </article>`;
  }

  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    const i = Number(b.dataset.dia);

    if (acc === 'sem-ant' || acc === 'sem-sig') {
      semana = new Date(semana); semana.setDate(semana.getDate() + (acc === 'sem-sig' ? 7 : -7));
    } else if (acc === 'sem-hoy') semana = U.lunes();
    else if (acc === 'hecho') {
      const h = datos().hechos;
      const k = claveSemana();
      const lista = h[k] || [];
      h[k] = lista.includes(i) ? lista.filter(x => x !== i) : [...lista, i];
      if (!h[k].length) delete h[k];
      Store.guardar();
    } else if (acc === 'editar') {
      editando = i;
      borrador = structuredClone(plan(i));
      if (!borrador.ejercicios.length) borrador.ejercicios.push(nuevoEj());
    } else if (acc === 'add-ej') borrador.ejercicios.push(nuevoEj());
    else if (acc === 'quitar-ej') borrador.ejercicios.splice(Number(b.dataset.ej), 1);
    else if (acc === 'cancelar') editando = borrador = null;
    else if (acc === 'guardar') {
      const limpio = {
        titulo: borrador.titulo.trim(),
        ejercicios: borrador.ejercicios.filter(x => x.nombre.trim()).map(x => ({ ...x, nombre: x.nombre.trim() })),
      };
      if (tienePlan(limpio)) datos().plan[editando] = limpio;
      else delete datos().plan[editando];
      Store.guardar();
      editando = borrador = null;
    } else return;
    rerender();
  }

  // Lo que se escribe en el editor va al borrador sin volver a pintar,
  // para no perder el foco del campo.
  function alEscribir(e) {
    const c = e.target.dataset.campo;
    if (!borrador || !c) return;
    if (e.target.dataset.ej !== undefined) borrador.ejercicios[Number(e.target.dataset.ej)][c] = e.target.value;
    else borrador[c] = e.target.value;
  }

  const nuevoEj = () => ({ id: Store.id(), nombre: '', series: '', reps: '', peso: '' });

  return { id: 'entrenos', nombre: 'Entrenos', icono: '💪', render, alClic, alEscribir };
})();
