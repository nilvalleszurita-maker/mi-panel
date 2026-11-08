// Módulo de Finanzas: dónde está el dinero (anillo), gasto mensual (línea),
// ingresos y gastos por mes, y gasto por categoría.
const Finanzas = (() => {
  const CATEGORIAS = {
    gasto: ['Comida', 'Casa', 'Transporte', 'Ocio', 'Ropa', 'Salud', 'Suscripciones', 'Otros'],
    ingreso: ['Nómina', 'Extra', 'Otros'],
  };
  const COLORES = 8; // huecos de la paleta en css (--serie-1 … --serie-8)

  // Estado de la vista (no se guarda): mes visible, formulario y edición.
  const hoy = new Date();
  let mes = { a: hoy.getFullYear(), m: hoy.getMonth() };
  let tipo = 'gasto';
  let formAbierto = false;
  let editandoCuentas = false;
  let enfocar = null; // id de la categoría recién creada, para poner el cursor en ella

  const datos = () => Store.get().finanzas;
  const claveMes = (a, m) => `${a}-${String(m + 1).padStart(2, '0')}`;
  const pct = n => new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(n);
  const color = c => c.color ? `var(--serie-${c.color})` : 'var(--serie-otros)';

  function render(el) {
    const lista = datos().movimientos
      .filter(x => x.fecha.startsWith(claveMes(mes.a, mes.m)))
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
      ${seccionCuentas()}

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

      <section class="bloque">
        <h3>Gasto mensual</h3>
        <div id="graf-linea" class="graf-linea"></div>
      </section>

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

    // La línea se dibuja al ancho real disponible, para que el texto no se deforme.
    dibujarLinea();
    if (enfocar) {
      document.querySelector(`[data-cuenta="${enfocar}"][data-campo="nombre"]`)?.select();
      enfocar = null;
    }
  }

  // ---------- Anillo: dónde tengo el dinero ----------
  function seccionCuentas() {
    const cuentas = datos().cuentas;
    const total = cuentas.reduce((s, c) => s + Math.max(0, c.saldo), 0);

    return `
      <section class="bloque">
        <div class="cab-bloque">
          <h3>¿Dónde tengo el dinero?</h3>
          <button class="enlace" data-acc="editar-cuentas">${editandoCuentas ? 'Listo' : 'Editar'}</button>
        </div>
        <div class="anillo-wrap">
          ${anillo(cuentas, total)}
          ${editandoCuentas ? editorCuentas(cuentas) : leyenda(cuentas, total)}
        </div>
      </section>`;
  }

  function anillo(cuentas, total) {
    const T = 180, r = 70, grosor = 26, C = 2 * Math.PI * r;
    const visibles = cuentas.filter(c => c.saldo > 0);
    const hueco = visibles.length > 1 ? 2 : 0; // separación de 2px entre tramos
    let inicio = 0;

    const tramos = visibles.map(c => {
      const largo = (c.saldo / total) * C;
      const s = `
        <circle cx="${T / 2}" cy="${T / 2}" r="${r}" fill="none" stroke-width="${grosor}"
          style="stroke:${color(c)}"
          stroke-dasharray="${Math.max(largo - hueco, 0.5)} ${C}" stroke-dashoffset="${-inicio}"
          data-tip-t="${U.esc(c.nombre)}" data-tip-v="${U.euros(c.saldo)} · ${pct(c.saldo / total)}"></circle>`;
      inicio += largo;
      return s;
    }).join('');

    return `
      <div class="anillo">
        <svg viewBox="0 0 ${T} ${T}" width="${T}" height="${T}" role="img"
          aria-label="Reparto del dinero: ${visibles.map(c => `${U.esc(c.nombre)} ${pct(c.saldo / total)}`).join(', ') || 'sin saldos'}">
          <circle cx="${T / 2}" cy="${T / 2}" r="${r}" fill="none" stroke-width="${grosor}" class="anillo-fondo"></circle>
          <g transform="rotate(-90 ${T / 2} ${T / 2})">${tramos}</g>
        </svg>
        <div class="anillo-centro">
          <span class="muted peq">Total</span>
          <strong>${U.euros(total)}</strong>
        </div>
      </div>`;
  }

  // La leyenda hace también de tabla: nombre, importe y porcentaje de cada categoría.
  function leyenda(cuentas, total) {
    if (!total) return `<p class="vacio crece">Pulsa «Editar» y escribe cuánto tienes en cada sitio.</p>`;
    return `
      <ul class="leyenda">
        ${cuentas.map(c => `
          <li class="${c.saldo > 0 ? '' : 'apagada'}">
            <span class="punto" style="background:${color(c)}"></span>
            <span class="crece">${U.esc(c.nombre)}</span>
            <span class="muted peq">${total && c.saldo > 0 ? pct(c.saldo / total) : '—'}</span>
            <strong>${U.euros(c.saldo)}</strong>
          </li>`).join('')}
      </ul>`;
  }

  function editorCuentas(cuentas) {
    return `
      <div class="editor-cuentas">
        ${cuentas.map(c => `
          <div class="cuenta-fila">
            <span class="punto" style="background:${color(c)}"></span>
            <input data-cuenta="${c.id}" data-campo="nombre" value="${U.esc(c.nombre)}" maxlength="30" aria-label="Nombre de la categoría">
            <input data-cuenta="${c.id}" data-campo="saldo" value="${c.saldo || ''}" inputmode="decimal" placeholder="0" aria-label="Saldo de ${U.esc(c.nombre)} en euros">
            <button class="icon-btn peq" data-acc="borrar-cuenta" data-id="${c.id}" aria-label="Borrar ${U.esc(c.nombre)}">×</button>
          </div>`).join('')}
        <button class="enlace" data-acc="nueva-cuenta">+ Añadir categoría</button>
      </div>`;
  }

  // Primer hueco de color libre; si están los 8 ocupados, gris neutro
  // (nunca se repite un color: dos categorías serían indistinguibles).
  function colorLibre() {
    const usados = new Set(datos().cuentas.map(c => c.color));
    for (let i = 1; i <= COLORES; i++) if (!usados.has(i)) return i;
    return 0;
  }

  // ---------- Línea: gasto de los últimos 12 meses ----------
  function dibujarLinea() {
    const cont = document.getElementById('graf-linea');
    if (!cont) return;

    // Últimos 12 meses, pero sin los anteriores al primer movimiento
    // (si no, parecería que esos meses no gastaste nada).
    const primero = datos().movimientos.reduce((min, x) => x.fecha < min ? x.fecha : min, '9999').slice(0, 7);
    const meses = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(mes.a, mes.m - i, 1);
      if (claveMes(d.getFullYear(), d.getMonth()) >= primero || i === 0) meses.push({ a: d.getFullYear(), m: d.getMonth(), total: 0 });
    }
    const idx = Object.fromEntries(meses.map((x, i) => [claveMes(x.a, x.m), i]));
    for (const x of datos().movimientos) {
      const i = idx[x.fecha.slice(0, 7)];
      if (x.tipo === 'gasto' && i !== undefined) meses[i].total += x.importe;
    }

    const W = cont.clientWidth, H = 190;
    const m = { izq: 52, der: 10, arr: 12, abj: 26 };
    const ancho = W - m.izq - m.der, alto = H - m.arr - m.abj;
    const tope = escalaBonita(Math.max(...meses.map(x => x.total)));
    const n = meses.length;
    // Con un solo mes, el punto va centrado.
    const x = i => n > 1 ? m.izq + (i / (n - 1)) * ancho : m.izq + ancho / 2;
    const y = v => m.arr + alto - (v / tope) * alto;
    const paso = n > 1 ? ancho / (n - 1) : ancho;
    const cadaCuanto = W < 440 && n > 7 ? 2 : 1; // en móvil, una etiqueta de mes sí y otra no
    const abrev = (x) => U.MESES[x.m].slice(0, 3);
    const yEtiq = v => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' }).format(v) + ' €';
    const sel = meses.length - 1;

    const lineas = [0, 0.25, 0.5, 0.75, 1].map(f => `
      <line x1="${m.izq}" x2="${W - m.der}" y1="${y(tope * f)}" y2="${y(tope * f)}" class="${f ? 'rejilla' : 'eje'}"></line>
      ${f % 0.5 === 0 ? `<text x="${m.izq - 8}" y="${y(tope * f)}" class="etiq" text-anchor="end" dominant-baseline="middle">${yEtiq(tope * f)}</text>` : ''}`).join('');

    const etiquetasX = meses.map((p, i) => (sel - i) % cadaCuanto === 0 ? `
      <text x="${x(i)}" y="${H - 6}" class="etiq ${i === sel ? 'sel' : ''}" text-anchor="middle">${abrev(p)}</text>` : '').join('');

    const ruta = meses.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');

    // Columnas invisibles más anchas que la línea: zona para pasar el ratón o el dedo.
    const columnas = meses.map((p, i) => `
      <g class="col" data-acc="ir-mes" data-a="${p.a}" data-m="${p.m}"
        data-tip-t="${U.MESES[p.m]} ${p.a}" data-tip-v="${U.euros(p.total)} gastados">
        <rect x="${x(i) - paso / 2}" y="${m.arr}" width="${paso}" height="${alto}" fill="transparent"></rect>
        <line class="cruz" x1="${x(i)}" x2="${x(i)}" y1="${m.arr}" y2="${m.arr + alto}"></line>
        <circle class="cruz punto-linea" cx="${x(i)}" cy="${y(p.total)}" r="4.5"></circle>
      </g>`).join('');

    cont.innerHTML = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"
        aria-label="Gasto mensual de los últimos 12 meses: ${meses.map(p => `${abrev(p)} ${U.euros(p.total)}`).join(', ')}">
        ${lineas}
        ${etiquetasX}
        <path d="${ruta}" class="linea"></path>
        <circle class="punto-linea" cx="${x(sel)}" cy="${y(meses[sel].total)}" r="4.5"></circle>
        ${columnas}
      </svg>`;
  }

  // Redondea el máximo hacia arriba a una cifra limpia (1.200, 1.500, 2.000…)
  // cuya mitad también sea redonda, para las etiquetas del eje.
  function escalaBonita(v) {
    if (v <= 0) return 100;
    const p = 10 ** Math.floor(Math.log10(v));
    return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(f => f * p).find(t => t >= v);
  }

  // ---------- Movimientos ----------
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
    } else if (acc === 'ir-mes') {
      mes = { a: Number(b.dataset.a), m: Number(b.dataset.m) };
    } else if (acc === 'abrir') { formAbierto = true; tipo = 'gasto'; }
    else if (acc === 'cerrar') formAbierto = false;
    else if (acc === 'tipo') {
      // Conserva lo escrito al cambiar entre gasto e ingreso.
      const f = document.getElementById('form-mov');
      const prev = { importe: f.importe.value, fecha: f.fecha.value, nota: f.nota.value };
      tipo = b.dataset.tipo;
      rerender();
      const n = document.getElementById('form-mov');
      n.importe.value = prev.importe; n.fecha.value = prev.fecha; n.nota.value = prev.nota;
      return;
    } else if (acc === 'borrar') {
      if (!confirm('¿Borrar este movimiento?')) return;
      const f = datos();
      f.movimientos = f.movimientos.filter(x => x.id !== b.dataset.id);
      Store.guardar();
    } else if (acc === 'editar-cuentas') {
      editandoCuentas = !editandoCuentas;
      // Al terminar, se quitan las categorías que se hayan quedado sin nombre.
      if (!editandoCuentas) {
        datos().cuentas = datos().cuentas.filter(c => c.nombre.trim());
        Store.guardar();
      }
    } else if (acc === 'nueva-cuenta') {
      const c = { id: Store.id(), nombre: 'Nueva categoría', saldo: 0, color: colorLibre() };
      datos().cuentas.push(c);
      Store.guardar();
      enfocar = c.id;
    } else if (acc === 'borrar-cuenta') {
      const c = datos().cuentas.find(x => x.id === b.dataset.id);
      if (!confirm(`¿Borrar «${c.nombre}»?`)) return;
      datos().cuentas = datos().cuentas.filter(x => x.id !== c.id);
      Store.guardar();
    } else return;
    rerender();
  }

  // Lo escrito en el editor de categorías se guarda al momento (sin repintar,
  // para no perder el foco); el anillo se actualiza al pulsar «Listo».
  function alEscribir(e) {
    const t = e.target, c = datos().cuentas.find(x => x.id === t.dataset.cuenta);
    if (!c) return;
    if (t.dataset.campo === 'nombre') c.nombre = t.value;
    else c.saldo = U.numero(t.value);
    Store.guardar();
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

  return {
    id: 'finanzas', nombre: 'Finanzas', icono: '€',
    render, alClic, alEnviar, alEscribir, alRedimensionar: dibujarLinea,
  };
})();
