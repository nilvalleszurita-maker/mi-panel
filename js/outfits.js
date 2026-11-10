// Módulo de Outfits: outfit de hoy, lista de outfits en cuadrícula y armario.
// Los datos y las reglas están en js/outfits-datos.js.
const Outfits = (() => {
  const D = OutfitsDatos;

  // Estado de la vista (no se guarda).
  let vista = 'hoy';              // 'hoy' | 'outfits' | 'armario'
  // Outfit de hoy
  let climaManual = null;         // clima elegido a mano (si no, el del tiempo)
  let situacionHoy = U.diaSemana() < 5 ? 'clase' : 'tomar_algo';
  let indiceHoy = 0;              // «Otro» avanza en la lista de propuestas
  let pidiendoTiempo = false;
  let sinTiempo = false;          // no se pudo consultar (sin conexión)
  let filtroClima = '';
  let filtroSituacion = '';
  let editor = null;              // { origen: id|null, b: borrador } mientras se edita o crea
  let selector = null;            // { capa, i } mientras se elige una prenda para una capa
  let elVista = null;

  const N = k => D.NOMBRES[k] || k;
  const vacio = () => ({ nombre: '', clima: [], ocasiones: [], nota: '', capas: { abajo: null, base: null, medio: null, abrigo: null, calzado: null, accesorio: [] } });
  const copia = o => JSON.parse(JSON.stringify(o));

  function render(el) {
    elVista = el;
    if (!Store.get().armario.sembrado) {
      el.innerHTML = `<p class="vacio">Cargando tu armario…</p>`;
      D.asegurar().then(ok => {
        if (elVista !== el || !el.isConnected || location.hash !== '#outfits') return;
        if (ok) render(el);
        else el.innerHTML = `<p class="vacio">No se ha podido cargar el armario. Comprueba la conexión y <button class="enlace" data-acc="reintentar">vuelve a intentarlo</button>.</p>`;
      });
      return;
    }

    el.innerHTML = `
      ${editor ? '' : `
      <div class="segmentado tres" role="tablist">
        ${[['hoy', 'Outfit de hoy'], ['outfits', 'Outfits'], ['armario', 'Armario']].map(([v, t]) =>
          `<button type="button" role="tab" aria-selected="${vista === v}" class="${vista === v ? 'activo' : ''}" data-acc="vista" data-v="${v}">${t}</button>`).join('')}
      </div>`}
      ${editor ? vistaEditor() : vista === 'outfits' ? vistaOutfits() : vista === 'hoy' ? vistaHoy() : `<p class="vacio">Esta vista llega en la siguiente parte.</p>`}
      ${selector ? vistaSelector() : ''}`;
  }

  // ---------- Piezas: una prenda en su tarjeta, con su foto o su nombre ----------
  // La foto va delante del nombre: si carga, lo tapa (CSS); si no existe, se quita
  // y queda la tarjeta gris con el nombre. Cuando se añada la foto, aparecerá sola.
  const img = id => `<img src="${D.foto(id)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`;
  // Fondo de la tarjeta = gris exacto de su foto, para que no se note el borde.
  const estiloFondo = id => D.fondo(id) ? `style="background:${D.fondo(id)}"` : '';

  function pieza(id, capa, { accion = 'cambiar', outfit = '', i = 0, clase = '' } = {}) {
    const p = D.prenda(id);
    const datos = `data-acc="${accion}" data-capa="${capa}" data-i="${i}" ${outfit ? `data-outfit="${U.esc(outfit)}"` : ''}`;
    if (!p) {
      return `<button class="pieza pieza-vacia ${clase}" ${datos}><span>+ Añadir ${N(capa).toLowerCase()}</span></button>`;
    }
    return `
      <button class="pieza ${clase}" ${datos} ${estiloFondo(p.id)} aria-label="${U.esc(p.nombre)} (${N(capa).toLowerCase()}). Cambiar">
        ${img(p.id)}
        <span class="pieza-nombre">${U.esc(p.nombre)}</span>
      </button>`;
  }

  // Cuadrícula de un outfit: pantalón a la izquierda; base, medio, abrigo y calzado a la
  // derecha; accesorios debajo. «editable» enseña también los huecos vacíos.
  function collage(c, { outfit = '', editable = false } = {}) {
    const op = { outfit, accion: editable ? 'elegir' : 'cambiar' };
    const derecha = ['base', 'medio', 'abrigo'].filter(k => editable || c[k]);
    derecha.push('calzado'); // siempre: si falta, «+ Añadir calzado»
    const acc = c.accesorio.map((id, i) => pieza(id, 'accesorio', { ...op, i, clase: 'pieza-mini' }));
    if (editable) acc.push(pieza(null, 'accesorio', { ...op, i: c.accesorio.length, clase: 'pieza-mini' }));
    return `
      <div class="collage" style="--filas:${Math.max(2, derecha.length)}">
        ${pieza(c.abajo, 'abajo', { ...op, clase: 'pieza-alta' })}
        <div class="collage-derecha">${derecha.map(k => pieza(c[k], k, op)).join('')}</div>
      </div>
      ${acc.length ? `<div class="collage-accesorios">${acc.join('')}</div>` : ''}`;
  }

  const etiquetas = (o) => `
    <div class="etiquetas">
      ${o.ocasiones.filter(x => x !== 'casa').map(x => `<span class="etq etq-situacion">${N(x)}</span>`).join('')}
      ${o.clima.map(x => `<span class="etq etq-clima">${N(x)}</span>`).join('')}
    </div>`;

  // ---------- Vista Outfit de hoy ----------
  function vistaHoy() {
    const t = D.tiempoGuardado();
    if (!t && !pidiendoTiempo && !sinTiempo) {
      pidiendoTiempo = true;
      D.tiempo().then(r => {
        pidiendoTiempo = false;
        sinTiempo = !r;
        if (location.hash === '#outfits' && vista === 'hoy' && !editor && elVista?.isConnected) render(elVista);
      });
    }
    const climaAuto = t?.clima || null;
    const clima = climaManual || climaAuto;

    const cabTiempo = t ? `
        <div class="tiempo-cifra">${String(Math.round(t.max * 10) / 10).replace('.', ',')}<span>°C</span></div>
        <div class="tiempo-texto">
          <strong>Barcelona · ${U.esc(t.cielo)}</strong>
          <span class="muted peq">máx ${String(t.max).replace('.', ',')} °C · mín ${String(t.min).replace('.', ',')} °C</span>
          ${t.lluvia ? `<span class="peq tiempo-aviso">☂ Puede llover: mejor calzado que aguante.</span>` : ''}
        </div>`
      : pidiendoTiempo ? `<p class="muted">Mirando el tiempo en Barcelona…</p>`
      : `<p class="muted">Sin conexión para ver el tiempo: elige el clima a mano.</p>`;

    const chipsClima = D.CLIMAS.map(c => `
      <button class="chip ${clima === c ? 'on' : ''}" data-acc="hoy-clima" data-v="${c}" aria-pressed="${clima === c}">
        ${N(c)}${c === climaAuto ? ' <span aria-hidden="true">·</span> <span class="peq">hoy</span>' : ''}
      </button>`).join('');
    const chipsSituacion = D.SITUACIONES.map(s => `
      <button class="chip ${situacionHoy === s ? 'on' : ''}" data-acc="hoy-situacion" data-v="${s}" aria-pressed="${situacionHoy === s}">${N(s)}</button>`).join('');

    let cuerpo = '';
    const puesto = D.puestoEl();
    if (puesto && D.outfit(puesto.outfit_id)) {
      cuerpo = `
        <p class="hoy-puesto">✓ Hoy te pones esto</p>
        ${tarjetaOutfit(D.outfit(puesto.outfit_id))}
        <button class="btn btn-sec ancho" data-acc="hoy-cambiar">Elegir otro</button>`;
    } else if (clima) {
      const { lista, aviso, todosUsados } = D.propuestas(clima, situacionHoy);
      if (lista.length) {
        const o = lista[indiceHoy % lista.length];
        cuerpo = `
          ${aviso ? `<p class="aviso-suave">${U.esc(aviso)}</p>` : ''}
          ${todosUsados ? `<p class="aviso-suave">Todos los outfits que encajan los has llevado en los últimos 3 días.</p>` : ''}
          ${tarjetaOutfit(o)}
          <div class="fila-botones">
            ${lista.length > 1 ? `<button class="btn btn-sec" data-acc="hoy-otro">Otro <span class="muted peq">(${indiceHoy % lista.length + 1}/${lista.length})</span></button>` : ''}
            <button class="btn" data-acc="hoy-poner" data-outfit="${U.esc(o.id)}">Me lo pongo</button>
          </div>`;
      } else cuerpo = `<p class="vacio">${U.esc(aviso)}</p>`;
    }

    const hist = D.historial(5);
    return `
      <section class="tiempo-hoy">${cabTiempo}</section>
      <div class="campo">Clima<div class="chips">${chipsClima}</div></div>
      <div class="campo">¿Qué toca hoy?<div class="chips">${chipsSituacion}</div></div>
      ${cuerpo}
      ${hist.length ? `
        <section class="bloque">
          <h3>Últimos días</h3>
          <ul class="lista historial">
            ${hist.map(h => `<li><span class="muted">${fechaRelativa(h.fecha)}</span><span class="crece">${U.esc(D.outfit(h.outfit_id)?.nombre || 'Outfit borrado')}</span></li>`).join('')}
          </ul>
        </section>` : ''}`;
  }

  function fechaRelativa(f) {
    const dias = Math.round((U.deIso(U.iso()) - U.deIso(f)) / 864e5);
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    const d = U.deIso(f);
    return `${U.DIAS[U.diaSemana(d)].slice(0, 3)} ${d.getDate()}`;
  }

  // ---------- Vista Outfits ----------
  function vistaOutfits() {
    const lista = D.outfits().filter(o =>
      (!filtroClima || o.clima.includes(filtroClima)) && (!filtroSituacion || o.ocasiones.includes(filtroSituacion)));
    const chips = (lista, actual, acc, todos) => `
      <div class="chips" role="group">
        <button class="chip ${!actual ? 'on' : ''}" data-acc="${acc}" data-v="" aria-pressed="${!actual}">${todos}</button>
        ${lista.map(v => `<button class="chip ${actual === v ? 'on' : ''}" data-acc="${acc}" data-v="${v}" aria-pressed="${actual === v}">${N(v)}</button>`).join('')}
      </div>`;

    return `
      <div class="cab-seccion">
        <h2>${lista.length} ${lista.length === 1 ? 'outfit' : 'outfits'}</h2>
        <button class="btn btn-mini" data-acc="crear">+ Crear outfit</button>
      </div>
      <div class="filtros">
        ${chips(D.CLIMAS, filtroClima, 'f-clima', 'Todo clima')}
        ${chips(D.SITUACIONES, filtroSituacion, 'f-situacion', 'Toda situación')}
      </div>
      ${lista.length ? `<div class="outfits-lista">${lista.map(tarjetaOutfit).join('')}</div>`
        : `<p class="vacio">No hay outfits para ese filtro. <button class="enlace" data-acc="crear">Crea uno</button>.</p>`}`;
  }

  function tarjetaOutfit(o) {
    const c = D.capasDe(o.id);
    const v = D.valoracion(c);
    return `
      <article class="outfit">
        <header class="outfit-cab">
          <h3>${U.esc(o.nombre)}</h3>
          <button class="enlace" data-acc="editar" data-outfit="${U.esc(o.id)}">Editar</button>
        </header>
        ${collage(c, { outfit: o.id })}
        ${etiquetas(o)}
        <p class="muted peq outfit-valor">Abriga ${v.abriga}/5 · Formalidad ${v.formalidad}/5</p>
        ${o.nota ? `<p class="outfit-nota">${U.esc(o.nota)}</p>` : ''}
      </article>`;
  }

  // ---------- Editor (cambiar prendas o crear desde cero) ----------
  function abrirEditor(outfitId) {
    const o = outfitId ? D.outfit(outfitId) : null;
    editor = o
      ? { origen: o.id, b: { nombre: o.nombre, clima: [...o.clima], ocasiones: [...o.ocasiones], nota: o.nota, capas: copia(D.capasDe(o.id)) } }
      : { origen: null, b: vacio() };
  }

  function vistaEditor() {
    const { b, origen } = editor;
    const toggles = (lista, sel, campo) => `
      <div class="chips" role="group">
        ${lista.map(v => `<button class="chip ${sel.includes(v) ? 'on' : ''}" data-acc="toggle" data-campo="${campo}" data-v="${v}" aria-pressed="${sel.includes(v)}">${N(v)}</button>`).join('')}
      </div>`;
    return `
      <section class="editor-outfit">
        <div class="cab-seccion">
          <button class="enlace" data-acc="cerrar-editor">‹ Volver</button>
          <span class="muted peq">${origen ? 'Editando outfit' : 'Nuevo outfit'}</span>
        </div>
        <label class="campo">Nombre
          <input data-campo="nombre" value="${U.esc(b.nombre)}" maxlength="40" placeholder="Ej. Básico denim">
        </label>
        <p class="muted peq">Toca una prenda para cambiarla por otra del mismo tipo, o un hueco para añadirla.</p>
        ${collage(b.capas, { editable: true })}
        <div class="campo">Clima ${toggles(D.CLIMAS, b.clima, 'clima')}</div>
        <div class="campo">Situación ${toggles(D.SITUACIONES, b.ocasiones, 'ocasiones')}</div>
        <label class="campo">Nota
          <textarea data-campo="nota" rows="2" maxlength="200" placeholder="Opcional">${U.esc(b.nota)}</textarea>
        </label>
        <div class="fila-botones">
          ${origen ? `
            <button class="btn btn-sec" data-acc="guardar-nuevo">Guardar como nuevo</button>
            <button class="btn" data-acc="guardar-sustituir">Guardar cambios</button>`
          : `<button class="btn ancho" data-acc="guardar-nuevo">Guardar outfit</button>`}
        </div>
        ${origen ? `<button class="enlace peligro" data-acc="borrar-outfit">Borrar este outfit</button>` : ''}
      </section>`;
  }

  // Lista de prendas del mismo tipo para una capa.
  function vistaSelector() {
    const { capa, i } = selector;
    const actual = capa === 'accesorio' ? editor.b.capas.accesorio[i] : editor.b.capas[capa];
    const opciones = D.candidatas(capa);
    return `
      <div class="selector-fondo" data-acc="cerrar-selector">
        <div class="selector" role="dialog" aria-modal="true" aria-label="Elegir ${N(capa).toLowerCase()}">
          <div class="cab-seccion">
            <h3>${N(capa)}</h3>
            <button class="icon-btn" data-acc="cerrar-selector" aria-label="Cerrar">×</button>
          </div>
          <div class="selector-lista">
            ${opciones.map(p => `
              <button class="pieza pieza-opcion ${p.id === actual ? 'actual' : ''}" data-acc="poner" data-prenda="${U.esc(p.id)}" ${estiloFondo(p.id)} aria-pressed="${p.id === actual}">
                ${img(p.id)}
                <span class="pieza-nombre">${U.esc(p.nombre)}</span>
                <span class="pieza-pie">${U.esc(p.nombre)}</span>
              </button>`).join('')}
          </div>
          ${actual ? `<button class="btn btn-sec ancho" data-acc="quitar">Quitar ${N(capa).toLowerCase()}</button>` : ''}
        </div>
      </div>`;
  }

  // ---------- Eventos ----------
  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    // Clic en el fondo oscuro del selector (no dentro de él): cerrar.
    if (acc === 'cerrar-selector' && b.classList.contains('selector-fondo') && e.target !== b) return;

    if (acc === 'vista') vista = b.dataset.v;
    else if (acc === 'hoy-clima') { climaManual = b.dataset.v === D.tiempoGuardado()?.clima ? null : b.dataset.v; indiceHoy = 0; }
    else if (acc === 'hoy-situacion') { situacionHoy = b.dataset.v; indiceHoy = 0; }
    else if (acc === 'hoy-otro') indiceHoy++;
    else if (acc === 'hoy-poner') D.ponerHoy(b.dataset.outfit);
    else if (acc === 'hoy-cambiar') { D.quitarHoy(); indiceHoy++; }
    else if (acc === 'reintentar') { render(elVista); return; }
    else if (acc === 'f-clima') filtroClima = b.dataset.v;
    else if (acc === 'f-situacion') filtroSituacion = b.dataset.v;
    else if (acc === 'crear') { abrirEditor(null); window.scrollTo(0, 0); }
    else if (acc === 'editar') { abrirEditor(b.dataset.outfit); window.scrollTo(0, 0); }
    else if (acc === 'cambiar') {
      // Tocar una prenda en la lista: abre el outfit en edición con el selector de esa capa.
      abrirEditor(b.dataset.outfit);
      selector = { capa: b.dataset.capa, i: Number(b.dataset.i) };
      window.scrollTo(0, 0);
    } else if (acc === 'elegir') selector = { capa: b.dataset.capa, i: Number(b.dataset.i) };
    else if (acc === 'cerrar-selector') selector = null;
    else if (acc === 'poner' || acc === 'quitar') {
      const c = editor.b.capas, { capa, i } = selector;
      const id = acc === 'poner' ? b.dataset.prenda : null;
      if (capa === 'accesorio') {
        if (id) c.accesorio[i] = id; else c.accesorio.splice(i, 1);
        c.accesorio = [...new Set(c.accesorio.filter(Boolean))];
      } else c[capa] = id;
      selector = null;
    } else if (acc === 'toggle') {
      const lista = editor.b[b.dataset.campo], v = b.dataset.v;
      const k = lista.indexOf(v);
      if (k >= 0) lista.splice(k, 1); else lista.push(v);
    } else if (acc === 'cerrar-editor') { editor = selector = null; }
    else if (acc === 'guardar-nuevo' || acc === 'guardar-sustituir') {
      const bo = editor.b;
      if (D.idsDe(bo.capas).length < 2) { alert('Añade al menos dos prendas al outfit.'); return; }
      if (acc === 'guardar-nuevo' && editor.origen && bo.nombre.trim() === D.outfit(editor.origen)?.nombre) bo.nombre += ' (variante)';
      D.guardarOutfit(bo, acc === 'guardar-sustituir' ? editor.origen : null);
      editor = selector = null;
      filtroClima = filtroSituacion = ''; // para que se vea el outfit guardado
    } else if (acc === 'borrar-outfit') {
      if (!confirm(`¿Borrar el outfit «${D.outfit(editor.origen)?.nombre}»? Las prendas no se borran.`)) return;
      D.borrarOutfit(editor.origen);
      editor = selector = null;
    } else return;
    rerender();
  }

  // Nombre y nota se guardan en el borrador al escribir (sin repintar).
  function alEscribir(e) {
    const campo = e.target.dataset.campo;
    if (editor && (campo === 'nombre' || campo === 'nota')) editor.b[campo] = e.target.value;
  }

  return { id: 'outfits', nombre: 'Outfits', icono: '👕', render, alClic, alEscribir };
})();
