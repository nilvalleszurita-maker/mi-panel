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
  // Armario
  let filtroTipo = '';
  let filtroColor = '';
  let ficha = null;               // id de la prenda abierta
  let formPrenda = null;          // { id|null } mientras se añade o edita una prenda
  let fotoNueva = null;           // foto elegida en el formulario: { blob, fondo, url }
  let quitarSubida = false;       // en el formulario: volver a la foto original

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
      ${editor || ficha || formPrenda ? '' : `
      <div class="segmentado tres" role="tablist">
        ${[['hoy', 'Outfit de hoy'], ['outfits', 'Outfits'], ['armario', 'Armario']].map(([v, t]) =>
          `<button type="button" role="tab" aria-selected="${vista === v}" class="${vista === v ? 'activo' : ''}" data-acc="vista" data-v="${v}">${t}</button>`).join('')}
      </div>`}
      ${editor ? vistaEditor() : vista === 'outfits' ? vistaOutfits() : vista === 'hoy' ? vistaHoy()
        : formPrenda ? vistaFormPrenda() : ficha && D.prenda(ficha) ? vistaFicha(D.prenda(ficha)) : vistaArmario()}
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
          <strong>${D.LUGAR.nombre} · ${U.esc(t.cielo)}</strong>
          <span class="muted peq">máx ${String(t.max).replace('.', ',')} °C · mín ${String(t.min).replace('.', ',')} °C</span>
          ${t.lluvia ? `<span class="peq tiempo-aviso">☂ Puede llover: mejor calzado que aguante.</span>` : ''}
        </div>`
      : pidiendoTiempo ? `<p class="muted">Mirando el tiempo en ${D.LUGAR.nombre}…</p>`
      : `<p class="muted">No se ha podido consultar el tiempo ahora mismo (sin conexión o el servicio no responde): elige el clima a mano.</p>`;

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

  // ---------- Vista Armario ----------
  const TIPOS = ['parte_arriba', 'parte_abajo', 'abrigo', 'calzado', 'accesorio'];
  const OCASIONES = ['clase', 'gym', 'tomar_algo', 'fiesta', 'casa'];
  const MUESTRA = {
    blanco: '#f3f3f1', negro: '#111318', gris: '#9ca3af', azul: '#6b9be8', rosa: '#f2b8c6', verde: '#4ade80',
    rojo: '#ef4444', beige: '#d8c3a5', 'marrón': '#8b5e3c', plata: '#c4c7cc', otro: '#6b7280',
    multicolor: 'conic-gradient(#ef4444, #f5a524, #4ade80, #6b9be8, #d55181, #ef4444)',
  };
  const NOMBRE_COLOR = c => c.charAt(0).toUpperCase() + c.slice(1);

  function vistaArmario() {
    const todas = D.prendas();
    const colores = [...new Set(todas.map(D.colorBase))].sort();
    const lista = todas.filter(p => (!filtroTipo || p.tipo === filtroTipo) && (!filtroColor || D.colorBase(p) === filtroColor));
    return `
      <div class="cab-seccion">
        <h2>${lista.length} ${lista.length === 1 ? 'prenda' : 'prendas'}</h2>
        <button class="btn btn-mini" data-acc="prenda-nueva">+ Añadir prenda</button>
      </div>
      <div class="filtros">
        <div class="chips" role="group" aria-label="Tipo">
          <button class="chip ${!filtroTipo ? 'on' : ''}" data-acc="f-tipo" data-v="" aria-pressed="${!filtroTipo}">Todo</button>
          ${TIPOS.map(t => `<button class="chip ${filtroTipo === t ? 'on' : ''}" data-acc="f-tipo" data-v="${t}" aria-pressed="${filtroTipo === t}">${N(t)}</button>`).join('')}
        </div>
        <div class="chips" role="group" aria-label="Color">
          <button class="chip ${!filtroColor ? 'on' : ''}" data-acc="f-color" data-v="" aria-pressed="${!filtroColor}">Todos los colores</button>
          ${colores.map(c => `<button class="chip ${filtroColor === c ? 'on' : ''}" data-acc="f-color" data-v="${c}" aria-pressed="${filtroColor === c}"><span class="muestra" style="background:${MUESTRA[c] || MUESTRA.otro}"></span>${NOMBRE_COLOR(c)}</button>`).join('')}
        </div>
      </div>
      ${lista.length ? `
        <div class="armario-lista">
          ${lista.map(p => `
            <button class="pieza pieza-opcion" data-acc="ficha" data-prenda="${U.esc(p.id)}" ${estiloFondo(p.id)}>
              ${img(p.id)}
              <span class="pieza-nombre">${U.esc(p.nombre)}</span>
              <span class="pieza-pie">${U.esc(p.nombre)}</span>
            </button>`).join('')}
        </div>` : `<p class="vacio">No hay prendas con ese filtro.</p>`}`;
  }

  const puntos = (v, etq) => `
    <div class="valor-fila"><span class="muted">${etq}</span>
      <span class="puntos" role="img" aria-label="${v} de 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span>
      <span class="peq muted">${v}/5</span></div>`;

  function vistaFicha(p) {
    const usos = D.outfitsCon(p.id);
    const detalles = [['Subtipo', p.subtipo], ['Color', p.color_principal], ['Estampado', p.estampado], ['Tejido', p.tejido],
      ['Corte', p.corte], ['Cuello', p.cuello], ['Lavado', p.lavado], ['Detalles', p.detalles]].filter(([, v]) => v);
    return `
      <div class="cab-seccion">
        <button class="enlace" data-acc="cerrar-ficha">‹ Armario</button>
        <button class="enlace" data-acc="prenda-editar" data-prenda="${U.esc(p.id)}">Editar</button>
      </div>
      <article class="ficha">
        <div class="pieza ficha-foto" ${estiloFondo(p.id)}>${img(p.id)}<span class="pieza-nombre">Sin foto todavía</span></div>
        <div class="ficha-datos">
          <div>
            <h2>${U.esc(p.nombre)}</h2>
            <p class="muted">${N(p.tipo)}${p.marca ? ` · ${U.esc(p.marca)}` : ''}</p>
          </div>
          ${puntos(p.abriga ?? 0, 'Abriga')}
          ${puntos(p.formalidad ?? 0, 'Formalidad')}
          ${(p.clima || []).length ? `<div class="etiquetas">${p.clima.map(x => `<span class="etq etq-clima">${N(x)}</span>`).join('')}</div>` : ''}
          ${(p.ocasiones || []).length ? `<div class="etiquetas">${p.ocasiones.map(x => `<span class="etq etq-situacion">${N(x)}</span>`).join('')}</div>` : ''}
          ${p.notas ? `<p class="ficha-notas">${U.esc(p.notas)}</p>` : ''}
          ${detalles.length ? `<dl class="ficha-detalles">${detalles.map(([k, v]) => `<dt>${k}</dt><dd>${U.esc(Array.isArray(v) ? v.join(', ') : v)}</dd>`).join('')}</dl>` : ''}
        </div>
      </article>
      <section class="bloque">
        <h3>${usos.length ? `En ${usos.length} ${usos.length === 1 ? 'outfit' : 'outfits'}` : 'Todavía no está en ningún outfit'}</h3>
        ${usos.length ? `<ul class="lista usos">${usos.map(o => `
          <li><button class="uso" data-acc="editar" data-outfit="${U.esc(o.id)}">
            <span class="uso-fotos">${D.idsDe(D.capasDe(o.id)).slice(0, 4).map(id => `<span class="pieza pieza-micro" ${estiloFondo(id)}>${img(id)}</span>`).join('')}</span>
            <span class="crece">${U.esc(o.nombre)}</span><span class="muted">›</span>
          </button></li>`).join('')}</ul>` : ''}
      </section>
      <button class="enlace peligro" data-acc="prenda-borrar" data-prenda="${U.esc(p.id)}">Borrar esta prenda</button>`;
  }

  function vistaFormPrenda() {
    const p = formPrenda.id ? D.prenda(formPrenda.id) : {};
    const sel = (v, x) => v === x ? 'selected' : '';
    const marcado = (lista, v) => (lista || []).includes(v) ? 'checked' : '';
    const escala = (nombre, valor) => `
      <div class="escala" role="radiogroup">
        ${[0, 1, 2, 3, 4, 5].map(i => `<label><input type="radio" name="${nombre}" value="${i}" ${Number(valor ?? 2) === i ? 'checked' : ''}><span>${i}</span></label>`).join('')}
      </div>`;
    const fotoActual = fotoNueva ? fotoNueva.url : (!quitarSubida && formPrenda.id ? D.foto(formPrenda.id) : (formPrenda.id ? `data/fotos/${encodeURIComponent(formPrenda.id)}.webp` : null));
    return `
      <div class="cab-seccion">
        <button class="enlace" data-acc="cerrar-form">‹ ${formPrenda.id ? 'Volver' : 'Armario'}</button>
        <span class="muted peq">${formPrenda.id ? 'Editar prenda' : 'Nueva prenda'}</span>
      </div>
      <form class="editor-outfit form-prenda" id="form-prenda">
        <div class="foto-campo">
          <div class="pieza ficha-foto" ${fotoNueva ? `style="background:${fotoNueva.fondo}"` : formPrenda.id ? estiloFondo(formPrenda.id) : ''}>
            ${fotoActual ? `<img src="${fotoActual}" alt="" onerror="this.remove()">` : ''}<span class="pieza-nombre">Sin foto</span>
          </div>
          <label class="btn btn-sec btn-mini">${fotoActual ? 'Cambiar foto' : 'Añadir foto'}
            <input type="file" accept="image/*" data-campo="foto" hidden>
          </label>
          ${fotoNueva || (formPrenda.id && D.tieneFotoSubida(formPrenda.id) && !quitarSubida) ? `<button type="button" class="enlace" data-acc="foto-original">Quitar foto subida</button>` : ''}
        </div>
        <label class="campo">Nombre *<input name="nombre" required maxlength="60" value="${U.esc(p.nombre || '')}" placeholder="Ej. Camiseta blanca básica"></label>
        <div class="dos-col">
          <label class="campo">Tipo
            <select name="tipo">${TIPOS.map(t => `<option value="${t}" ${sel(p.tipo || 'parte_arriba', t)}>${N(t)}</option>`).join('')}</select>
          </label>
          <label class="campo">Marca<input name="marca" maxlength="40" value="${U.esc(p.marca || '')}"></label>
        </div>
        <div class="dos-col">
          <label class="campo">Subtipo<input name="subtipo" maxlength="40" value="${U.esc(p.subtipo || '')}" placeholder="Ej. sudadera con capucha"></label>
          <label class="campo">Color<input name="color_principal" maxlength="40" value="${U.esc(p.color_principal || '')}" placeholder="Ej. negro"></label>
        </div>
        <label class="campo">Capa (si es parte de arriba)
          <select name="capa">
            <option value="" ${sel(p.capa || '', '')}>—</option>
            <option value="base" ${sel(p.capa, 'base')}>Base (camiseta, camisa)</option>
            <option value="medio" ${sel(p.capa, 'medio')}>Capa media (sudadera, jersey)</option>
            <option value="abrigo" ${sel(p.capa, 'abrigo')}>Abrigo</option>
          </select>
        </label>
        <div class="campo">Abriga${escala('abriga', p.abriga)}</div>
        <div class="campo">Formalidad${escala('formalidad', p.formalidad)}</div>
        <div class="campo">Clima<div class="chips">${D.CLIMAS.map(c => `<label class="chip-check"><input type="checkbox" name="clima" value="${c}" ${marcado(p.clima, c)}><span>${N(c)}</span></label>`).join('')}</div></div>
        <div class="campo">Ocasiones<div class="chips">${OCASIONES.map(c => `<label class="chip-check"><input type="checkbox" name="ocasiones" value="${c}" ${marcado(p.ocasiones, c)}><span>${N(c)}</span></label>`).join('')}</div></div>
        <label class="campo">Notas<textarea name="notas" rows="3" maxlength="300">${U.esc(p.notas || '')}</textarea></label>
        <button class="btn ancho">${formPrenda.id ? 'Guardar cambios' : 'Añadir al armario'}</button>
      </form>`;
  }

  function cerrarForm() {
    if (fotoNueva) URL.revokeObjectURL(fotoNueva.url);
    formPrenda = fotoNueva = null;
    quitarSubida = false;
  }

  // ---------- Eventos ----------
  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    // Clic en el fondo oscuro del selector (no dentro de él): cerrar.
    if (acc === 'cerrar-selector' && b.classList.contains('selector-fondo') && e.target !== b) return;

    if (acc === 'vista') { vista = b.dataset.v; ficha = null; cerrarForm(); }
    else if (acc === 'f-tipo') filtroTipo = b.dataset.v;
    else if (acc === 'f-color') filtroColor = b.dataset.v;
    else if (acc === 'ficha') { ficha = b.dataset.prenda; window.scrollTo(0, 0); }
    else if (acc === 'cerrar-ficha') ficha = null;
    else if (acc === 'prenda-nueva') { cerrarForm(); formPrenda = { id: null }; window.scrollTo(0, 0); }
    else if (acc === 'prenda-editar') { cerrarForm(); formPrenda = { id: b.dataset.prenda }; window.scrollTo(0, 0); }
    else if (acc === 'cerrar-form') cerrarForm();
    else if (acc === 'foto-original') { if (fotoNueva) { URL.revokeObjectURL(fotoNueva.url); fotoNueva = null; } else quitarSubida = true; }
    else if (acc === 'prenda-borrar') {
      const p = D.prenda(b.dataset.prenda), n = D.outfitsCon(p.id).length;
      if (!confirm(`¿Borrar «${p.nombre}» del armario?${n ? ` Está en ${n} ${n === 1 ? 'outfit' : 'outfits'}: se quitará de ${n === 1 ? 'él' : 'ellos'}.` : ''}`)) return;
      D.borrarPrenda(p.id);
      ficha = null;
    }
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

  // Guardar el formulario de prenda.
  async function alEnviar(e, rerender) {
    if (e.target.id !== 'form-prenda') return;
    e.preventDefault();
    const f = new FormData(e.target);
    const nombre = String(f.get('nombre') || '').trim();
    if (!nombre) return;
    const datos = {
      nombre, tipo: f.get('tipo'), marca: String(f.get('marca')).trim(), subtipo: String(f.get('subtipo')).trim(),
      color_principal: String(f.get('color_principal')).trim().toLowerCase(),
      capa: f.get('tipo') === 'parte_arriba' || f.get('tipo') === 'abrigo' ? (f.get('capa') || (f.get('tipo') === 'abrigo' ? 'abrigo' : 'base')) : undefined,
      abriga: Number(f.get('abriga')), formalidad: Number(f.get('formalidad')),
      clima: f.getAll('clima'), ocasiones: f.getAll('ocasiones'), notas: String(f.get('notas')).trim(),
    };
    if (datos.capa === undefined) delete datos.capa;
    const id = D.guardarPrenda(datos, formPrenda.id);
    try {
      if (fotoNueva) await D.guardarFoto(id, { blob: fotoNueva.blob, fondo: fotoNueva.fondo });
      else if (quitarSubida) await D.quitarFoto(id);
    } catch { alert('La prenda se ha guardado, pero no se ha podido guardar la foto en este dispositivo.'); }
    cerrarForm();
    ficha = id;
    rerender();
  }

  // Nombre y nota se guardan en el borrador al escribir (sin repintar).
  function alEscribir(e, rerender) {
    if (e.target.dataset.campo === 'foto' && e.target.files?.[0]) {
      D.procesarFoto(e.target.files[0]).then(foto => {
        if (fotoNueva) URL.revokeObjectURL(fotoNueva.url);
        // Se conserva lo ya escrito en el formulario al repintar la foto.
        const form = document.getElementById('form-prenda');
        const escrito = form ? Object.fromEntries([...form.elements].filter(x => x.name && x.type !== 'file' && x.type !== 'radio' && x.type !== 'checkbox').map(x => [x.name, x.value])) : {};
        const marcas = form ? [...form.elements].filter(x => (x.type === 'radio' || x.type === 'checkbox')).map(x => [x.name, x.value, x.checked]) : [];
        fotoNueva = { ...foto, url: URL.createObjectURL(foto.blob) };
        rerender();
        const n = document.getElementById('form-prenda');
        if (n) {
          for (const [k, v] of Object.entries(escrito)) if (n.elements[k]) n.elements[k].value = v;
          for (const [k, v, c] of marcas) { const x = [...n.elements].find(y => y.name === k && y.value === v); if (x) x.checked = c; }
        }
      }).catch(() => alert('No se ha podido leer esa imagen.'));
      return;
    }
    const campo = e.target.dataset.campo;
    if (editor && (campo === 'nombre' || campo === 'nota')) editor.b[campo] = e.target.value;
  }

  return { id: 'outfits', nombre: 'Outfits', icono: '👕', render, alClic, alEscribir, alEnviar };
})();
