// Módulo de Finanzas: dónde está el dinero (anillo), gasto mensual (línea),
// ingresos y gastos por mes, gasto por categoría y traspasos entre categorías.
const Finanzas = (() => {
  const CATEGORIAS = {
    gasto: ['Comida', 'Casa', 'Transporte', 'Ocio', 'Ropa', 'Salud', 'Suscripciones', 'Otros'],
    ingreso: ['Nómina', 'Extra', 'Otros'],
  };
  const COLORES = 8; // huecos de la paleta en css (--serie-1 … --serie-8)

  // Estado de la vista (no se guarda): mes visible, formularios y edición.
  const hoy = new Date();
  let mes = { a: hoy.getFullYear(), m: hoy.getMonth() };
  let tipo = 'gasto';
  let formAbierto = false;
  let moviendo = false;       // formulario de traspaso abierto
  let editandoCuentas = false;
  let enfocar = null;         // selector del campo donde poner el cursor tras pintar

  const datos = () => Store.get().finanzas;
  const principal = () => datos().cuentas.find(c => c.principal);
  const claveMes = (a, m) => `${a}-${String(m + 1).padStart(2, '0')}`;
  const pct = n => new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(n);
  const color = c => c.color ? `var(--serie-${c.color})` : 'var(--serie-otros)';
  const redondo = n => Math.round(n * 100) / 100;

  // Saldo actual de cada categoría, calculado (nunca guardado):
  //   saldo de partida + ingresos − gastos (solo la principal) ± traspasos.
  // Así, al borrar un movimiento o un traspaso, los saldos se corrigen solos.
  function saldos() {
    const f = datos();
    const s = Object.fromEntries(f.cuentas.map(c => [c.id, c.base]));
    const p = principal();
    if (p) for (const m of f.movimientos) s[p.id] += m.tipo === 'ingreso' ? m.importe : -m.importe;
    for (const t of f.traspasos) {
      if (t.de in s) s[t.de] -= t.importe;
      if (t.a in s) s[t.a] += t.importe;
    }
    for (const k in s) s[k] = redondo(s[k]);
    return s;
  }

  function render(el) {
    const clave = claveMes(mes.a, mes.m);
    const delMes = datos().movimientos.filter(x => x.fecha.startsWith(clave));
    const ingresos = delMes.filter(x => x.tipo === 'ingreso').reduce((s, x) => s + x.importe, 0);
    const gastos = delMes.filter(x => x.tipo === 'gasto').reduce((s, x) => s + x.importe, 0);
    const balance = ingresos - gastos;

    // Lista del mes: movimientos y traspasos juntos, del más reciente al más antiguo.
    const lista = [
      ...delMes,
      ...datos().traspasos.filter(t => t.fecha.startsWith(clave)).map(t => ({ ...t, tipo: 'traspaso' })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado - a.creado);

    // Gasto agrupado por categoría, de mayor a menor.
    const porCat = {};
    delMes.filter(x => x.tipo === 'gasto').forEach(x => { porCat[x.categoria] = (porCat[x.categoria] || 0) + x.importe; });
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
        <h3>Gasto acumulado del mes</h3>
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
      const campo = document.querySelector(enfocar);
      campo?.focus();
      campo?.select?.();
      enfocar = null;
    }
  }

  // ---------- Anillo: dónde tengo el dinero ----------
  function seccionCuentas() {
    const cuentas = datos().cuentas;
    const s = saldos();
    const total = redondo(cuentas.reduce((t, c) => t + s[c.id], 0));
    const positivo = cuentas.reduce((t, c) => t + Math.max(0, s[c.id]), 0);

    return `
      <section class="bloque">
        <div class="cab-bloque">
          <h3>¿Dónde tengo el dinero?</h3>
          <div class="acciones">
            ${editandoCuentas ? '' : `<button class="btn btn-sec btn-mini" data-acc="mover">⇄ Mover</button>`}
            <button class="enlace" data-acc="editar-cuentas">${editandoCuentas ? 'Listo' : 'Editar'}</button>
          </div>
        </div>
        ${moviendo && !editandoCuentas ? formTraspaso(cuentas, s) : ''}
        <div class="anillo-wrap">
          ${anillo(cuentas, s, total, positivo)}
          ${editandoCuentas ? editorCuentas(cuentas, s) : leyenda(cuentas, s, positivo)}
        </div>
      </section>`;
  }

  function anillo(cuentas, s, total, positivo) {
    const T = 180, r = 70, grosor = 26, C = 2 * Math.PI * r;
    // Solo se dibujan saldos positivos; uno negativo aparece en la leyenda en rojo.
    const visibles = cuentas.filter(c => s[c.id] > 0);
    const hueco = visibles.length > 1 ? 2 : 0; // separación de 2px entre tramos
    let inicio = 0;

    const tramos = visibles.map(c => {
      const largo = (s[c.id] / positivo) * C;
      const t = `
        <circle cx="${T / 2}" cy="${T / 2}" r="${r}" fill="none" stroke-width="${grosor}"
          style="stroke:${color(c)}"
          stroke-dasharray="${Math.max(largo - hueco, 0.5)} ${C}" stroke-dashoffset="${-inicio}"
          data-tip-t="${U.esc(c.nombre)}" data-tip-v="${U.euros(s[c.id])} · ${pct(s[c.id] / positivo)}"></circle>`;
      inicio += largo;
      return t;
    }).join('');

    return `
      <div class="anillo">
        <svg viewBox="0 0 ${T} ${T}" width="${T}" height="${T}" role="img"
          aria-label="Reparto del dinero: ${visibles.map(c => `${U.esc(c.nombre)} ${pct(s[c.id] / positivo)}`).join(', ') || 'sin saldos'}">
          <circle cx="${T / 2}" cy="${T / 2}" r="${r}" fill="none" stroke-width="${grosor}" class="anillo-fondo"></circle>
          <g transform="rotate(-90 ${T / 2} ${T / 2})">${tramos}</g>
        </svg>
        <div class="anillo-centro">
          <span class="muted peq">Total</span>
          <strong class="${total < 0 ? 'neg' : ''}">${U.euros(total)}</strong>
        </div>
      </div>`;
  }

  // La leyenda hace también de tabla: nombre, porcentaje e importe de cada categoría.
  function leyenda(cuentas, s, positivo) {
    if (!cuentas.some(c => s[c.id])) {
      return `<p class="vacio crece">Añade un ingreso y aparecerá en ${U.esc(principal()?.nombre || 'Dinero')}, o pulsa «Editar» para escribir lo que ya tienes en cada sitio.</p>`;
    }
    return `
      <ul class="leyenda">
        ${cuentas.map(c => `
          <li class="${s[c.id] > 0 ? '' : 'apagada'}">
            <span class="punto" style="background:${color(c)}"></span>
            <span class="crece">${U.esc(c.nombre)}${c.principal ? ' <span class="chip">principal</span>' : ''}</span>
            <span class="muted peq">${s[c.id] > 0 ? pct(s[c.id] / positivo) : '—'}</span>
            <strong class="${s[c.id] < 0 ? 'neg' : ''}">${U.euros(s[c.id])}</strong>
          </li>`).join('')}
      </ul>`;
  }

  function editorCuentas(cuentas, s) {
    return `
      <div class="editor-cuentas">
        ${cuentas.map(c => `
          <div class="cuenta-fila">
            <span class="punto" style="background:${color(c)}"></span>
            <input data-cuenta="${c.id}" data-campo="nombre" value="${U.esc(c.nombre)}" maxlength="30" aria-label="Nombre de la categoría">
            <input data-cuenta="${c.id}" data-campo="saldo" value="${s[c.id] || ''}" inputmode="decimal" placeholder="0" aria-label="Saldo actual de ${U.esc(c.nombre)} en euros">
            ${c.principal
              ? `<span class="candado" title="La categoría principal recibe los ingresos y paga los gastos; no se puede borrar">🔒</span>`
              : `<button class="icon-btn peq" data-acc="borrar-cuenta" data-id="${c.id}" aria-label="Borrar ${U.esc(c.nombre)}">×</button>`}
          </div>`).join('')}
        <button class="enlace" data-acc="nueva-cuenta">+ Añadir categoría</button>
        <p class="muted peq nota">Escribe el saldo real si no cuadra con tu banco. Los ingresos, gastos y traspasos se seguirán sumando a partir de ahí.</p>
      </div>`;
  }

  // ---------- Traspasos entre categorías ----------
  function formTraspaso(cuentas, s) {
    const p = principal();
    const destino = cuentas.find(c => c !== p)?.id;
    const opciones = sel => cuentas.map(c =>
      `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${U.esc(c.nombre)} · ${U.euros(s[c.id])}</option>`).join('');
    return `
      <form class="form sub-form" id="form-traspaso">
        <div class="dos-col apilar">
          <label>Desde<select name="de">${opciones(p?.id)}</select></label>
          <label>Hacia<select name="a">${opciones(destino)}</select></label>
        </div>
        <div class="dos-col">
          <label>Importe (€)<input name="importe" inputmode="decimal" placeholder="0,00" autocomplete="off" required></label>
          <label>Fecha<input name="fecha" type="date" value="${U.iso()}" required></label>
        </div>
        <div class="fila-botones">
          <button type="button" class="btn btn-sec" data-acc="cerrar-mover">Cancelar</button>
          <button class="btn">Mover dinero</button>
        </div>
      </form>`;
  }


  // Primer hueco de color libre; si están los 8 ocupados, gris neutro
  // (nunca se repite un color: dos categorías serían indistinguibles).
  function colorLibre() {
    const usados = new Set(datos().cuentas.map(c => c.color));
    for (let i = 1; i <= COLORES; i++) if (!usados.has(i)) return i;
    return 0;
  }

  // ---------- Línea: gasto acumulado del mes visible ----------
  // Empieza en 0 € y cada día sube lo que se gastó ese día (en escalón).
  // En el mes actual la línea llega solo hasta hoy.
  function dibujarLinea() {
    const cont = document.getElementById('graf-linea');
    if (!cont) return;

    const diasMes = new Date(mes.a, mes.m + 1, 0).getDate();
    const clave = claveMes(mes.a, mes.m);
    const claveHoy = claveMes(hoy.getFullYear(), hoy.getMonth());
    // Días con línea: todo el mes si ya pasó, hasta hoy si es el actual, ninguno si es futuro.
    const hasta = clave < claveHoy ? diasMes : clave === claveHoy ? new Date().getDate() : 0;

    const delDia = Array(diasMes + 1).fill(0); // delDia[d] = gastado el día d
    for (const x of datos().movimientos) {
      if (x.tipo === 'gasto' && x.fecha.startsWith(clave)) delDia[Number(x.fecha.slice(8, 10))] += x.importe;
    }
    const acum = [0]; // acum[d] = gastado del día 1 al d
    for (let d = 1; d <= diasMes; d++) acum[d] = redondo(acum[d - 1] + delDia[d]);

    const W = cont.clientWidth, H = 190;
    const m = { izq: 52, der: 12, arr: 12, abj: 26 };
    const ancho = W - m.izq - m.der, alto = H - m.arr - m.abj;
    const tope = escalaBonita(acum[Math.max(hasta, 0)]);
    const x = d => m.izq + (d / diasMes) * ancho; // 0 = inicio del mes, d = final del día d
    const y = v => m.arr + alto - (v / tope) * alto;
    const paso = ancho / diasMes;
    const yEtiq = v => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' }).format(v) + ' €';
    const nombreMes = U.MESES[mes.m];

    const lineas = [0, 0.25, 0.5, 0.75, 1].map(f => `
      <line x1="${m.izq}" x2="${W - m.der}" y1="${y(tope * f)}" y2="${y(tope * f)}" class="${f ? 'rejilla' : 'eje'}"></line>
      ${f % 0.5 === 0 ? `<text x="${m.izq - 8}" y="${y(tope * f)}" class="etiq" text-anchor="end" dominant-baseline="middle">${yEtiq(tope * f)}</text>` : ''}`).join('');

    // Etiquetas de día: 1, 5, 10, 15, 20, 25 y el último (sin pisarse).
    const marcas = [1, 5, 10, 15, 20, 25].filter(d => diasMes - d >= 3).concat(diasMes);
    const etiquetasX = marcas.map(d => `
      <text x="${x(d)}" y="${H - 6}" class="etiq ${d === hasta ? 'sel' : ''}" text-anchor="middle">${d}</text>`).join('');

    // Escalones: plano mientras no hay gastos, sube de golpe el día que gastas.
    let ruta = `M${x(0).toFixed(1)},${y(0).toFixed(1)}`;
    for (let d = 1; d <= hasta; d++) ruta += ` H${x(d).toFixed(1)} V${y(acum[d]).toFixed(1)}`;

    // Una columna invisible por día (zona para el ratón o el dedo).
    const columnas = [];
    for (let d = 1; d <= hasta; d++) {
      columnas.push(`
      <g class="col" data-tip-t="${d} de ${nombreMes}"
        data-tip-v="${U.euros(acum[d])} acumulado${delDia[d] ? ` · +${U.euros(delDia[d])} ese día` : ''}">
        <rect x="${x(d) - paso / 2}" y="${m.arr}" width="${paso}" height="${alto}" fill="transparent"></rect>
        <line class="cruz" x1="${x(d)}" x2="${x(d)}" y1="${m.arr}" y2="${m.arr + alto}"></line>
        <circle class="cruz punto-linea" cx="${x(d)}" cy="${y(acum[d])}" r="4.5"></circle>
      </g>`);
    }

    cont.innerHTML = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"
        aria-label="Gasto acumulado de ${nombreMes}: ${U.euros(acum[hasta] || 0)}${hasta && hasta < diasMes ? ` a día ${hasta}` : ''}">
        ${lineas}
        ${etiquetasX}
        ${hasta ? `<path d="${ruta}" class="linea"></path>
        <circle class="punto-linea" cx="${x(hasta)}" cy="${y(acum[hasta])}" r="4.5"></circle>` : ''}
        ${columnas.join('')}
      </svg>
      ${hasta ? '' : `<p class="vacio peq">Este mes aún no ha empezado.</p>`}`;
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
    const p = principal()?.nombre || 'Dinero';
    return `
      <form class="bloque form" id="form-mov">
        <div class="segmentado">
          <button type="button" class="${tipo === 'gasto' ? 'activo' : ''}" data-acc="tipo" data-tipo="gasto">Gasto</button>
          <button type="button" class="${tipo === 'ingreso' ? 'activo' : ''}" data-acc="tipo" data-tipo="ingreso">Ingreso</button>
        </div>
        <label>Importe (€)<input name="importe" inputmode="decimal" placeholder="0,00" autocomplete="off" required autofocus></label>
        <div class="dos-col">
          <label>Categoría
            <select name="categoria">${CATEGORIAS[tipo].map(c => `<option>${c}</option>`).join('')}</select>
          </label>
          <label>Fecha<input name="fecha" type="date" value="${U.iso()}" required></label>
        </div>
        <label>Nota<input name="nota" type="text" maxlength="80" placeholder="Opcional"></label>
        <p class="muted peq nota">${tipo === 'ingreso' ? `Se sumará a ${U.esc(p)}.` : `Se restará de ${U.esc(p)}.`}</p>
        <div class="fila-botones">
          <button type="button" class="btn btn-sec" data-acc="cerrar">Cancelar</button>
          <button class="btn">Guardar</button>
        </div>
      </form>`;
  }

  function fila(x) {
    const d = U.deIso(x.fecha);
    const fecha = `<div class="fecha-mini"><strong>${d.getDate()}</strong><span>${U.MESES[d.getMonth()].slice(0, 3)}</span></div>`;

    if (x.tipo === 'traspaso') {
      const nombre = id => datos().cuentas.find(c => c.id === id)?.nombre;
      const de = nombre(x.de), a = nombre(x.a);
      return `
        <li>
          ${fecha}
          <div class="crece">
            <div>${U.esc(de || 'categoría borrada')} → ${U.esc(a || 'categoría borrada')}</div>
            <div class="muted peq">Traspaso</div>
          </div>
          <strong class="muted">${U.euros(x.importe)}</strong>
          ${de && a
            ? `<button class="icon-btn peq" data-acc="borrar-traspaso" data-id="${x.id}" aria-label="Deshacer traspaso">×</button>`
            : `<span class="icon-btn peq" aria-hidden="true"></span>`}
        </li>`;
    }

    return `
      <li>
        ${fecha}
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
    const f = datos();

    if (acc === 'mes-ant' || acc === 'mes-sig') {
      const d = new Date(mes.a, mes.m + (acc === 'mes-sig' ? 1 : -1), 1);
      mes = { a: d.getFullYear(), m: d.getMonth() };
    } else if (acc === 'abrir') { formAbierto = true; tipo = 'gasto'; }
    else if (acc === 'cerrar') formAbierto = false;
    else if (acc === 'tipo') {
      // Conserva lo escrito al cambiar entre gasto e ingreso.
      const form = document.getElementById('form-mov');
      const prev = { importe: form.importe.value, fecha: form.fecha.value, nota: form.nota.value };
      tipo = b.dataset.tipo;
      rerender();
      const n = document.getElementById('form-mov');
      n.importe.value = prev.importe; n.fecha.value = prev.fecha; n.nota.value = prev.nota;
      return;
    } else if (acc === 'borrar') {
      if (!confirm('¿Borrar este movimiento? Su importe se devolverá al saldo.')) return;
      f.movimientos = f.movimientos.filter(x => x.id !== b.dataset.id);
      Store.guardar();
    } else if (acc === 'mover') {
      moviendo = !moviendo;
      if (moviendo) enfocar = '#form-traspaso [name=importe]';
    } else if (acc === 'cerrar-mover') moviendo = false;
    else if (acc === 'borrar-traspaso') {
      if (!confirm('¿Deshacer este traspaso? El dinero volverá a su categoría de origen.')) return;
      f.traspasos = f.traspasos.filter(x => x.id !== b.dataset.id);
      Store.guardar();
    } else if (acc === 'editar-cuentas') {
      editandoCuentas = !editandoCuentas;
      // Al terminar, se quitan las categorías que se hayan quedado sin nombre.
      if (!editandoCuentas) {
        f.cuentas.filter(c => !c.nombre.trim()).forEach(c => { if (c.principal) c.nombre = 'Dinero'; else quitarCuenta(c); });
        Store.guardar();
      }
    } else if (acc === 'nueva-cuenta') {
      const c = { id: Store.id(), nombre: 'Nueva categoría', base: 0, color: colorLibre() };
      f.cuentas.push(c);
      Store.guardar();
      enfocar = `[data-cuenta="${c.id}"][data-campo="nombre"]`;
    } else if (acc === 'borrar-cuenta') {
      const c = f.cuentas.find(x => x.id === b.dataset.id);
      const saldo = saldos()[c.id];
      const aviso = saldo ? ` Su saldo (${U.euros(saldo)}) pasará a ${principal().nombre}.` : '';
      if (!confirm(`¿Borrar «${c.nombre}»?${aviso}`)) return;
      quitarCuenta(c);
      Store.guardar();
    } else return;
    rerender();
  }

  // Al borrar una categoría su dinero no desaparece: pasa a la principal,
  // así el total sigue cuadrando.
  function quitarCuenta(c) {
    const f = datos(), p = principal();
    const saldo = saldos()[c.id];
    if (p && p !== c) p.base = redondo(p.base + saldo);
    f.cuentas = f.cuentas.filter(x => x !== c);
  }

  // Lo escrito en el editor de categorías se guarda al momento (sin repintar,
  // para no perder el foco); el anillo se actualiza al pulsar «Listo».
  // Al escribir un saldo se ajusta el saldo de partida para que el actual sea ese.
  function alEscribir(e) {
    const t = e.target, c = datos().cuentas.find(x => x.id === t.dataset.cuenta);
    if (!c) return;
    if (t.dataset.campo === 'nombre') c.nombre = t.value;
    else c.base = redondo(c.base + U.numero(t.value) - saldos()[c.id]);
    Store.guardar();
  }

  function alEnviar(e, rerender) {
    const form = e.target;
    if (form.id === 'form-mov') {
      e.preventDefault();
      const importe = U.numero(form.importe.value);
      if (!(importe > 0)) return avisar(form.importe, 'Escribe un importe mayor que 0');
      datos().movimientos.push({
        id: Store.id(), tipo, importe,
        categoria: form.categoria.value, fecha: form.fecha.value, nota: form.nota.value.trim(), creado: Date.now(),
      });
      // Salta al mes del movimiento para que se vea al guardarlo.
      const d = U.deIso(form.fecha.value);
      mes = { a: d.getFullYear(), m: d.getMonth() };
      formAbierto = false;
    } else if (form.id === 'form-traspaso') {
      e.preventDefault();
      const importe = U.numero(form.importe.value);
      const de = form.de.value, a = form.a.value;
      if (de === a) return avisar(form.a, 'Elige una categoría distinta a la de origen');
      if (!(importe > 0)) return avisar(form.importe, 'Escribe un importe mayor que 0');
      const disponible = saldos()[de];
      const nombre = datos().cuentas.find(c => c.id === de).nombre;
      if (importe > disponible && !confirm(`En ${nombre} solo hay ${U.euros(disponible)}. Si mueves ${U.euros(importe)} se quedará en negativo. ¿Continuar?`)) return;
      datos().traspasos.push({ id: Store.id(), de, a, importe, fecha: form.fecha.value, creado: Date.now() });
      moviendo = false;
    } else return;
    Store.guardar();
    rerender();
  }

  function avisar(campo, texto) {
    campo.setCustomValidity(texto);
    campo.reportValidity();
    campo.addEventListener('input', () => campo.setCustomValidity(''), { once: true });
  }

  // Para el botón «+» de Hoy: abre el formulario de un movimiento en el mes actual.
  function abrirFormulario(t = 'gasto') {
    tipo = t;
    formAbierto = true;
    mes = { a: new Date().getFullYear(), m: new Date().getMonth() };
  }

  return {
    id: 'finanzas', nombre: 'Finanzas', icono: '€',
    render, alClic, alEnviar, alEscribir, alRedimensionar: dibujarLinea,
    abrirFormulario,
  };
})();
