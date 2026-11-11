// Módulo de Comidas: plan semanal, lo comido hoy y edición de platos.
// Datos y cálculos en js/comidas-datos.js. Solo texto, sin imágenes.
const Comidas = (() => {
  const D = ComidasDatos;
  let vista = 'hoy';                // 'hoy' | 'semana'
  let semana = U.lunes();
  // Editor de un plato: { fecha, franja, idx, plato, nuevoAlimento, preguntar }
  let editor = null;

  const kcal = n => `${Math.round(n).toLocaleString('es-ES', { useGrouping: 'always' })} kcal`;
  const prot = n => `${(Math.round(n * 10) / 10).toLocaleString('es-ES')} g`;
  const num = n => String(Math.round(n * 100) / 100).replace('.', ',');
  const fechaLarga = f => { const d = U.deIso(f); return `${U.DIAS[U.diaSemana(d)]}, ${d.getDate()} de ${U.MESES[d.getMonth()]}`; };
  const fechaCorta = f => { const d = U.deIso(f); return `${U.DIAS[U.diaSemana(d)].slice(0, 3).toLowerCase()} ${d.getDate()} ${U.MESES[d.getMonth()].slice(0, 3)}`; };
  const pct = (v, max) => Math.max(0, Math.min(100, max ? (v / max) * 100 : 0));
  const enComidas = () => location.hash === '#comidas';

  // ---------- Pintado ----------
  function render(el) {
    if (!D.listo()) {
      el.innerHTML = '<p class="vacio">Cargando el menú…</p>';
      D.asegurar().then(ok => { if (ok && enComidas()) render(el); });
      return;
    }
    // Si hay un menú nuevo en el JSON (alimentos o platos), se añade y se repinta.
    if (!D.estaSincronizado()) D.asegurar().then(() => { if (enComidas() && !editor) render(el); });

    el.innerHTML = `
      <header class="hoy-cab">
        <div class="hoy-saludo">
          <span class="hoy-fecha">Comidas · ${fechaLarga(U.iso())}</span>
          <h1>${vista === 'hoy' ? 'Hoy como' : 'Menú semanal'}</h1>
        </div>
      </header>
      <div class="segmentado">
        <button type="button" class="${vista === 'hoy' ? 'activo' : ''}" data-acc="vista" data-v="hoy">Hoy</button>
        <button type="button" class="${vista === 'semana' ? 'activo' : ''}" data-acc="vista" data-v="semana">Semana</button>
      </div>
      ${vista === 'hoy' ? vistaHoy() : vistaSemana()}
      ${editor ? vistaEditor() : ''}`;
    if (editor?.foco) { el.querySelector(editor.foco)?.focus(); editor.foco = null; }
  }

  // ---------- Hoy ----------
  function vistaHoy() {
    const f = U.iso();
    const obj = D.objetivos();
    const t = D.totalComido(f);
    const barra = (titulo, v, max, txt, color) => `
      <div class="barra-fila">
        <div class="barra-cab"><span>${titulo}</span><span><strong>${txt(v)}</strong> <span class="muted">/ ${txt(max)}</span></span></div>
        <div class="barra"><div style="width:${pct(v, max)}%;background:${color}"></div></div>
      </div>`;
    const creatina = D.creatinaActiva(f);
    const tomada = D.creatinaTomada(f);
    const conCreatina = D.creatina().conComida || [];
    return `
      <section class="tarjeta com-progreso" aria-label="Progreso de hoy">
        ${barra('Kcal', t.kcal, obj.kcalDia, n => Math.round(n).toLocaleString('es-ES', { useGrouping: 'always' }), 'var(--acento)')}
        ${barra('Proteína', t.proteina, obj.proteinaDia, prot, 'var(--verde)')}
        <p class="muted peq nota">Cuenta solo lo marcado como comido · ${D.contarComidas(f)}/${D.orden().length} comidas</p>
      </section>

      <section class="tarjeta com-extras">
        ${interruptorCorro(f)}
        ${creatina ? `
          <div class="com-extra">
            <div>
              <strong>Creatina</strong>
              <div class="muted peq">Con la ${conCreatina.map(x => D.etiqueta(x).toLowerCase()).join(' o la ')} · hasta el ${fechaCorta(D.creatina().fin)}</div>
            </div>
            <button class="check ${tomada ? 'on' : ''}" data-acc="creatina" aria-pressed="${tomada}">${tomada ? '✓ Creatina tomada' : 'Creatina tomada'}</button>
          </div>` : ''}
      </section>

      <ol class="com-franjas">
        ${D.orden().map(fr => franjaHoy(f, fr, creatina && !tomada && conCreatina.includes(fr))).join('')}
      </ol>`;
  }

  function interruptorCorro(f) {
    const on = D.corro(f), aplicado = D.corroAplicado(f);
    const carbos = D.carbosComida(f);
    let aviso = '';
    if (on && aplicado) {
      aviso = `<div class="com-aviso ok">✓ Comida de hoy con el arroz o la pasta a 160 g.
        <button class="enlace" data-acc="corro-deshacer">Deshacer</button></div>`;
    } else if (on) {
      aviso = carbos.length ? `
        <div class="com-aviso">
          <p class="nota">Hoy corres: sube el arroz o la pasta de la comida a 160 g
            (${carbos.map(c => `${U.esc(c.nombre.replace(/ \(.*\)/, ''))} ${num(c.cantidad)} g → 160 g`).join(', ')}).</p>
          <div class="com-aviso-botones">
            <button class="btn btn-mini" data-acc="corro-aplicar">Aplicar a hoy</button>
            <button class="btn btn-sec btn-mini" data-acc="corro-no">Ahora no</button>
          </div>
        </div>`
        : '<div class="com-aviso">La comida de hoy no lleva arroz ni pasta: no hay nada que subir.</div>';
    }
    return `
      <div class="com-extra">
        <div>
          <strong>Hoy corro</strong>
          <div class="muted peq">Arroz o pasta de la comida a 160 g</div>
        </div>
        <button class="interruptor ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="Hoy corro" data-acc="corro"><span></span></button>
      </div>
      ${aviso}`;
  }

  function franjaHoy(f, fr, recordarCreatina) {
    const hecho = D.comido(f, fr);
    const t = D.totalFranja(f, fr);
    const platos = D.platosDe(f, fr);
    return `
      <li class="tarjeta com-franja ${hecho ? 'hecha' : ''}">
        <header class="com-franja-cab">
          <div>
            <h3>${U.esc(D.etiqueta(fr))}${D.esCambio(f, fr) ? '<span class="com-chip">cambiado hoy</span>' : ''}${recordarCreatina ? '<span class="com-chip creatina">+ creatina</span>' : ''}</h3>
            <span class="muted peq">${kcal(t.kcal)} · ${prot(t.proteina)} proteína</span>
          </div>
          <button class="check ${hecho ? 'on' : ''}" data-acc="comido" data-franja="${fr}" aria-pressed="${hecho}">${hecho ? '✓ Comido' : 'Comido'}</button>
        </header>
        ${platos.map((p, i) => `
          <div class="com-plato">
            <button class="com-plato-nombre" data-acc="abrir" data-fecha="${f}" data-franja="${fr}" data-idx="${i}">
              ${U.esc(p.nombre)} <span class="muted" aria-hidden="true">✎</span>
            </button>
            <ul class="com-ings">
              ${p.ingredientes.map(ing => `
                <li><span>${U.esc(D.alimento(ing.alimento)?.nombre || ing.alimento)}</span>
                  <span class="muted">${num(ing.cantidad)} ${U.esc(ing.unidad)}</span></li>`).join('')}
            </ul>
          </div>`).join('')}
      </li>`;
  }

  // ---------- Semana ----------
  function vistaSemana() {
    const hoy = U.iso();
    const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(semana); d.setDate(d.getDate() + i); return U.iso(d); });
    const ini = U.deIso(dias[0]), fin = U.deIso(dias[6]);
    const rango = ini.getMonth() === fin.getMonth()
      ? `${ini.getDate()} – ${fin.getDate()} ${U.MESES[fin.getMonth()].slice(0, 3)}`
      : `${ini.getDate()} ${U.MESES[ini.getMonth()].slice(0, 3)} – ${fin.getDate()} ${U.MESES[fin.getMonth()].slice(0, 3)}`;
    return `
      <div class="nav-periodo">
        <button class="icon-btn" data-acc="sem-ant" aria-label="Semana anterior">‹</button>
        <h2>${dias.includes(hoy) ? 'Esta semana' : rango}</h2>
        <button class="icon-btn" data-acc="sem-sig" aria-label="Semana siguiente">›</button>
      </div>
      <p class="muted peq nota com-pista">Toca un plato para ver su detalle y editarlo.</p>
      <div class="com-semana">
        ${dias.map(f => {
          const d = U.deIso(f), t = D.totalDia(f);
          const pasado = f < hoy, esHoy = f === hoy;
          const n = D.contarComidas(f), total = D.orden().length;
          return `
            <article class="tarjeta com-dia ${esHoy ? 'hoy' : ''} ${pasado ? 'pasado' : ''}" ${esHoy ? 'aria-current="date"' : ''}>
              <header class="com-dia-cab">
                <h3>${U.DIAS[U.diaSemana(d)]} <span class="muted">${d.getDate()}</span>${esHoy ? '<span class="com-chip hoy">hoy</span>' : ''}</h3>
                ${pasado || esHoy ? `<span class="com-cuenta ${n === total ? 'todo' : ''}" title="Comidas marcadas">${n}/${total}</span>` : ''}
              </header>
              <p class="com-dia-total"><strong>${kcal(t.kcal)}</strong> · ${prot(t.proteina)} proteína</p>
              <ul class="com-dia-lista">
                ${D.orden().map(fr => `
                  <li class="${D.comido(f, fr) ? 'hecha' : ''}">
                    <span class="com-dia-franja">${U.esc(D.etiqueta(fr))}</span>
                    <span class="com-dia-platos">
                      ${D.platosDe(f, fr).map((p, i) => `<button class="com-enlace" data-acc="abrir" data-fecha="${f}" data-franja="${fr}" data-idx="${i}">${U.esc(p.nombre)}</button>`).join('<span class="muted"> + </span>')}
                      ${D.esCambio(f, fr) ? '<span class="com-chip">cambiado</span>' : ''}
                    </span>
                  </li>`).join('')}
              </ul>
            </article>`;
        }).join('')}
      </div>`;
  }

  // ---------- Editor de un plato ----------
  function abrirEditor(fecha, franja, idx) {
    const p = D.platosDe(fecha, franja)[idx];
    editor = { fecha, franja, idx, plato: JSON.parse(JSON.stringify(p)), nuevoAlimento: false, preguntar: false };
  }

  function vistaEditor() {
    const { fecha, franja, plato: p } = editor;
    const t = D.totalPlato(p);
    const diaNombre = U.DIAS[U.diaSemana(U.deIso(fecha))].toLowerCase();
    if (editor.preguntar) {
      const esHoy = fecha === U.iso();
      return hoja(`
        <div class="cab-seccion"><h3>¿Dónde guardas el cambio?</h3>
          <button class="icon-btn" data-acc="ed-cerrar" aria-label="Cerrar">×</button></div>
        <button class="com-opcion" data-acc="ed-guardar" data-modo="dia">
          <strong>${esHoy ? 'Solo hoy' : `Solo el ${fechaCorta(fecha)}`}</strong>
          <span class="muted peq">Un cambio puntual de esa fecha. El menú semanal no cambia.</span>
        </button>
        <button class="com-opcion" data-acc="ed-guardar" data-modo="semana">
          <strong>Cambiar en el menú semanal</strong>
          <span class="muted peq">${p.id && D.plato(p.id)
            ? `Cambia «${U.esc(p.nombre)}» en el menú base y lo pone en la ${U.esc(D.etiqueta(franja).toLowerCase())} de todos los ${diaNombre}.`
            : `Pone el plato en la ${U.esc(D.etiqueta(franja).toLowerCase())} de todos los ${diaNombre}.`}</span>
        </button>
        <button class="btn btn-sec ancho" data-acc="ed-volver">Volver a editar</button>`);
    }
    const opcionesAlimento = D.alimentos().map(a => `<option value="${U.esc(a.id)}">${U.esc(a.nombre)}</option>`).join('');
    const platos = D.platos();
    const mismoTipo = platos.filter(x => x.tipo === franja || (franja === 'cena' && x.tipo === 'cena-extra'));
    const otros = platos.filter(x => !mismoTipo.includes(x));
    const opt = x => `<option value="${U.esc(x.id)}" ${x.id === p.id ? 'selected' : ''}>${U.esc(x.nombre)}</option>`;
    return hoja(`
      <div class="cab-seccion">
        <h3>${U.esc(D.etiqueta(franja))} · ${fechaCorta(fecha)}</h3>
        <button class="icon-btn" data-acc="ed-cerrar" aria-label="Cerrar">×</button>
      </div>

      <label class="campo-com">Cambiar el plato por otro
        <select id="ed-cambiar">
          ${p.id ? '' : '<option value="" selected>— Plato nuevo —</option>'}
          ${mismoTipo.length ? `<optgroup label="${U.esc(D.etiqueta(franja))}">${mismoTipo.map(opt).join('')}</optgroup>` : ''}
          <optgroup label="Otros platos">${otros.map(opt).join('')}</optgroup>
        </select>
      </label>
      <button class="enlace" data-acc="ed-nuevo-plato">＋ Crear un plato nuevo</button>

      <label class="campo-com">Nombre del plato
        <input id="ed-nombre" value="${U.esc(p.nombre)}" placeholder="Por ejemplo: Lentejas con chorizo" autocomplete="off">
      </label>

      <p class="com-ed-total" id="ed-total"><strong>${kcal(t.kcal)}</strong> · ${prot(t.proteina)} proteína</p>

      <ul class="com-ed-ings">
        ${p.ingredientes.map((ing, i) => {
          const n = D.nutri(ing);
          return `
            <li>
              <span class="com-ed-nombre">${U.esc(D.alimento(ing.alimento)?.nombre || ing.alimento)}
                <span class="muted peq" id="ed-n-${i}">${kcal(n.kcal)} · ${prot(n.proteina)}</span></span>
              <span class="com-ed-cant">
                <input data-ing="${i}" inputmode="decimal" value="${num(ing.cantidad)}" aria-label="Cantidad">
                <span class="muted">${U.esc(ing.unidad)}</span>
              </span>
              <button class="icon-btn peq" data-acc="ing-quitar" data-i="${i}" aria-label="Quitar ${U.esc(D.alimento(ing.alimento)?.nombre || '')}">×</button>
            </li>`;
        }).join('') || '<li class="muted">Sin ingredientes. Añade alguno abajo.</li>'}
      </ul>

      <div class="sub-form">
        <strong class="peq">Añadir ingrediente</strong>
        <div class="com-anadir">
          <select id="ed-alimento" aria-label="Alimento">${opcionesAlimento}</select>
          <input id="ed-cantidad" inputmode="decimal" placeholder="Cant." aria-label="Cantidad">
          <span class="muted" id="ed-unidad">${U.esc(D.unidadDe(D.alimentos()[0]?.id))}</span>
          <button class="btn btn-mini" data-acc="ing-anadir">Añadir</button>
        </div>
        ${editor.nuevoAlimento ? `
          <div class="com-nuevo-alimento">
            <strong class="peq">Nuevo alimento para el catálogo</strong>
            <input id="na-nombre" placeholder="Nombre (p. ej. Lentejas cocidas)" autocomplete="off">
            <div class="dos-col">
              <label class="campo-com">Por
                <select id="na-base"><option value="100g">100 g</option><option value="100ml">100 ml</option><option value="unidad">unidad</option></select>
              </label>
              <label class="campo-com">Kcal<input id="na-kcal" inputmode="decimal"></label>
            </div>
            <label class="campo-com">Proteína (g)<input id="na-prot" inputmode="decimal"></label>
            <div class="com-aviso-botones">
              <button class="btn btn-mini" data-acc="na-guardar">Añadir al catálogo</button>
              <button class="btn btn-sec btn-mini" data-acc="na-cancelar">Cancelar</button>
            </div>
          </div>` : '<button class="enlace" data-acc="na-abrir">＋ Alimento nuevo (no está en la lista)</button>'}
      </div>

      <div class="com-ed-pie">
        <button class="btn btn-sec" data-acc="ed-cerrar">Cancelar</button>
        <button class="btn" data-acc="ed-pedir">Guardar</button>
      </div>`);
  }
  const hoja = html => `
    <div class="selector-fondo com-fondo">
      <div class="selector com-hoja" role="dialog" aria-modal="true" aria-label="Detalle del plato">${html}</div>
    </div>`;

  function pintarTotalEditor() {
    const t = D.totalPlato(editor.plato);
    const el = document.getElementById('ed-total');
    if (el) el.innerHTML = `<strong>${kcal(t.kcal)}</strong> · ${prot(t.proteina)} proteína`;
    editor.plato.ingredientes.forEach((ing, i) => {
      const n = D.nutri(ing), s = document.getElementById(`ed-n-${i}`);
      if (s) s.textContent = `${kcal(n.kcal)} · ${prot(n.proteina)}`;
    });
  }

  // ---------- Eventos ----------
  function alClic(e, rerender) {
    if (editor && e.target.classList.contains('com-fondo')) { editor = null; rerender(); return; }
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc, hoy = U.iso();
    switch (acc) {
      case 'vista': vista = b.dataset.v; break;
      case 'sem-ant': semana.setDate(semana.getDate() - 7); semana = new Date(semana); break;
      case 'sem-sig': semana.setDate(semana.getDate() + 7); semana = new Date(semana); break;
      case 'comido': D.alternarComido(hoy, b.dataset.franja); break;
      case 'creatina': D.alternarCreatina(hoy); break;
      case 'corro': D.ponerCorro(hoy, !D.corro(hoy)); break;
      case 'corro-aplicar': D.aplicarCorro(hoy); break;
      case 'corro-no': D.ponerCorro(hoy, false); break;
      case 'corro-deshacer': D.deshacerCorro(hoy); break;
      case 'abrir': abrirEditor(b.dataset.fecha, b.dataset.franja, Number(b.dataset.idx)); break;
      case 'ed-cerrar': editor = null; break;
      case 'ed-volver': editor.preguntar = false; break;
      case 'ed-nuevo-plato':
        editor.plato = { id: null, nombre: '', ingredientes: [] };
        editor.foco = '#ed-nombre';
        break;
      case 'ing-quitar': editor.plato.ingredientes.splice(Number(b.dataset.i), 1); break;
      case 'ing-anadir': {
        const id = document.getElementById('ed-alimento').value;
        const cant = U.numero(document.getElementById('ed-cantidad').value);
        if (!id || !(cant > 0)) { alert('Elige un alimento y escribe la cantidad.'); return; }
        editor.plato.ingredientes.push({ alimento: id, cantidad: cant, unidad: D.unidadDe(id) });
        break;
      }
      case 'na-abrir': editor.nuevoAlimento = true; editor.foco = '#na-nombre'; break;
      case 'na-cancelar': editor.nuevoAlimento = false; break;
      case 'na-guardar': {
        const nombre = document.getElementById('na-nombre').value.trim();
        const kc = document.getElementById('na-kcal').value, pr = document.getElementById('na-prot').value;
        if (!nombre || kc.trim() === '' || pr.trim() === '') { alert('Escribe el nombre, las kcal y la proteína.'); return; }
        const id = D.nuevoAlimento({ nombre, base: document.getElementById('na-base').value, kcal: U.numero(kc), proteina: U.numero(pr) });
        editor.nuevoAlimento = false;
        editor.elegido = id;
        editor.foco = '#ed-cantidad';
        break;
      }
      case 'ed-pedir': {
        const p = editor.plato;
        p.nombre = (document.getElementById('ed-nombre')?.value || p.nombre).trim();
        if (!p.nombre) { alert('Ponle un nombre al plato.'); return; }
        if (!p.ingredientes.length) { alert('Añade al menos un ingrediente.'); return; }
        editor.preguntar = true;
        break;
      }
      case 'ed-guardar':
        D.guardarPlato({ ...editor, modo: b.dataset.modo });
        editor = null;
        break;
      default: return;
    }
    rerender();
    // Tras crear un alimento, queda elegido en «Añadir ingrediente».
    if (editor?.elegido) {
      const sel = document.getElementById('ed-alimento');
      if (sel) { sel.value = editor.elegido; document.getElementById('ed-unidad').textContent = D.unidadDe(editor.elegido); }
      editor.elegido = null;
    }
  }

  function alEscribir(e) {
    if (!editor) return;
    const t = e.target;
    if (t.dataset.ing !== undefined) {
      editor.plato.ingredientes[Number(t.dataset.ing)].cantidad = U.numero(t.value);
      pintarTotalEditor();
    } else if (t.id === 'ed-nombre') {
      editor.plato.nombre = t.value;
    } else if (t.id === 'ed-alimento') {
      document.getElementById('ed-unidad').textContent = D.unidadDe(t.value);
    } else if (t.id === 'ed-cambiar' && t.value) {
      editor.plato = D.plato(t.value);
      render(document.getElementById('vista'));
    }
  }

  return { id: 'comidas', nombre: 'Comidas', icono: '🍽️', render, alClic, alEscribir };
})();
