// Módulo de Finanzas: ingresos y gastos por mes, resumen y gasto por categoría.
const Finanzas = (() => {
  const CATEGORIAS = {
    gasto: ['Comida', 'Casa', 'Transporte', 'Ocio', 'Ropa', 'Salud', 'Suscripciones', 'Otros'],
    ingreso: ['Nómina', 'Extra', 'Otros'],
  };

  // Estado de la vista (no se guarda): mes visible y formulario.
  const hoy = new Date();
  let mes = { a: hoy.getFullYear(), m: hoy.getMonth() };
  let tipo = 'gasto';
  let formAbierto = false;

  const datos = () => Store.get().finanzas;
  const clave = () => `${mes.a}-${String(mes.m + 1).padStart(2, '0')}`;

  function render(el) {
    const lista = datos().movimientos
      .filter(x => x.fecha.startsWith(clave()))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado - a.creado);

    const ingresos = lista.filter(x => x.tipo === 'ingreso').reduce((s, x) => s + x.importe, 0);
    const gastos = lista.filter(x => x.tipo === 'gasto').reduce((s, x) => s + x.importe, 0);
    const balance = ingresos - gastos;

    // Gasto agrupado por categoría, de mayor a menor.
    const porCat = {};
    lista.filter(x => x.tipo === 'gasto').forEach(x => { porCat[x.categoria] = (porCat[x.categoria] || 0) + x.importe; });
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    const max = cats.length ? cats[0][1] : 0;

    el.innerHTML = `
      <div class="nav-periodo">
        <button class="icon-btn" data-acc="mes-ant" aria-label="Mes anterior">‹</button>
        <h2>${U.MESES[mes.m]} ${mes.a}</h2>
        <button class="icon-btn" data-acc="mes-sig" aria-label="Mes siguiente">›</button>
      </div>

      <section class="resumen">
        <div class="tarjeta"><span class="muted">Ingresos</span><strong class="pos">${U.euros(ingresos)}</strong></div>
        <div class="tarjeta"><span class="muted">Gastos</span><strong class="neg">${U.euros(gastos)}</strong></div>
        <div class="tarjeta"><span class="muted">Balance</span><strong class="${balance >= 0 ? 'pos' : 'neg'}">${U.euros(balance)}</strong></div>
      </section>

      ${formAbierto ? formulario() : `<button class="btn ancho" data-acc="abrir">+ Añadir movimiento</button>`}

      ${cats.length ? `
      <section class="bloque">
        <h3>Gasto por categoría</h3>
        ${cats.map(([c, v]) => `
          <div class="barra-fila">
            <div class="barra-cab"><span>${U.esc(c)}</span><span>${U.euros(v)}</span></div>
            <div class="barra"><div style="width:${(v / max) * 100}%"></div></div>
          </div>`).join('')}
      </section>` : ''}

      <section class="bloque">
        <h3>Movimientos</h3>
        ${lista.length ? `<ul class="lista">${lista.map(fila).join('')}</ul>`
          : `<p class="vacio">No hay movimientos este mes.</p>`}
      </section>`;
  }

  function formulario() {
    return `
      <form class="bloque form" id="form-mov">
        <div class="segmentado">
          <button type="button" class="${tipo === 'gasto' ? 'activo' : ''}" data-acc="tipo" data-tipo="gasto">Gasto</button>
          <button type="button" class="${tipo === 'ingreso' ? 'activo' : ''}" data-acc="tipo" data-tipo="ingreso">Ingreso</button>
        </div>
        <label>Importe (€)<input name="importe" type="number" inputmode="decimal" step="0.01" min="0.01" required autofocus></label>
        <div class="dos-col">
          <label>Categoría
            <select name="categoria">${CATEGORIAS[tipo].map(c => `<option>${c}</option>`).join('')}</select>
          </label>
          <label>Fecha<input name="fecha" type="date" value="${U.iso()}" required></label>
        </div>
        <label>Nota<input name="nota" type="text" maxlength="80" placeholder="Opcional"></label>
        <div class="fila-botones">
          <button type="button" class="btn btn-sec" data-acc="cerrar">Cancelar</button>
          <button class="btn">Guardar</button>
        </div>
      </form>`;
  }

  function fila(x) {
    const d = U.deIso(x.fecha);
    return `
      <li>
        <div class="fecha-mini"><strong>${d.getDate()}</strong><span>${U.MESES[d.getMonth()].slice(0, 3)}</span></div>
        <div class="crece">
          <div>${U.esc(x.categoria)}</div>
          ${x.nota ? `<div class="muted peq">${U.esc(x.nota)}</div>` : ''}
        </div>
        <strong class="${x.tipo === 'ingreso' ? 'pos' : 'neg'}">${x.tipo === 'ingreso' ? '+' : '−'}${U.euros(x.importe)}</strong>
        <button class="icon-btn peq" data-acc="borrar" data-id="${x.id}" aria-label="Borrar">×</button>
      </li>`;
  }

  // Un único manejador por evento para toda la vista (delegación).
  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    if (acc === 'mes-ant' || acc === 'mes-sig') {
      const d = new Date(mes.a, mes.m + (acc === 'mes-sig' ? 1 : -1), 1);
      mes = { a: d.getFullYear(), m: d.getMonth() };
    } else if (acc === 'abrir') { formAbierto = true; tipo = 'gasto'; }
    else if (acc === 'cerrar') formAbierto = false;
    else if (acc === 'tipo') {
      // Conserva lo escrito al cambiar entre gasto e ingreso.
      const f = document.getElementById('form-mov');
      const prev = { importe: f.importe.value, fecha: f.fecha.value, nota: f.nota.value };
      tipo = b.dataset.tipo;
      rerender();
      const n = document.getElementById('form-mov');
      Object.assign(n.importe, { value: prev.importe }); n.fecha.value = prev.fecha; n.nota.value = prev.nota;
      return;
    } else if (acc === 'borrar') {
      if (!confirm('¿Borrar este movimiento?')) return;
      const f = datos();
      f.movimientos = f.movimientos.filter(x => x.id !== b.dataset.id);
      Store.guardar();
    } else return;
    rerender();
  }

  function alEnviar(e, rerender) {
    if (e.target.id !== 'form-mov') return;
    e.preventDefault();
    const f = e.target;
    const importe = Math.round(parseFloat(f.importe.value.replace(',', '.')) * 100) / 100;
    if (!(importe > 0)) return;
    datos().movimientos.push({
      id: Store.id(), tipo, importe,
      categoria: f.categoria.value, fecha: f.fecha.value, nota: f.nota.value.trim(), creado: Date.now(),
    });
    Store.guardar();
    // Salta al mes del movimiento para que se vea al guardarlo.
    const d = U.deIso(f.fecha.value);
    mes = { a: d.getFullYear(), m: d.getMonth() };
    formAbierto = false;
    rerender();
  }

  return { id: 'finanzas', nombre: 'Finanzas', icono: '€', render, alClic, alEnviar };
})();
