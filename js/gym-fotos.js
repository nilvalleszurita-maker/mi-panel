// Fotos de progreso del gym (pestaña «Fotos» de Gym).
//
// Las fotos se guardan solo en este dispositivo, en IndexedDB (base 'mi-panel-progreso',
// almacén 'fotos'): clave = id, valor = { blob, fecha 'AAAA-MM-DD', creado }.
// No van en localStorage ni en la copia de seguridad JSON, y nunca se suben a ningún sitio.
// Al guardar una foto de hoy se marca el recordatorio «Foto de progreso» de Cuidado personal.
const GymFotos = (() => {
  const BD = (() => {
    let db = null;
    const abrir = () => db ? Promise.resolve(db) : new Promise((ok, mal) => {
      const r = indexedDB.open('mi-panel-progreso', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('fotos');
      r.onsuccess = () => ok(db = r.result);
      r.onerror = () => mal(r.error);
    });
    const escribir = fn => abrir().then(d => new Promise((ok, mal) => {
      const t = d.transaction('fotos', 'readwrite');
      fn(t.objectStore('fotos'));
      t.oncomplete = () => ok();
      t.onerror = () => mal(t.error);
    }));
    const todas = () => abrir().then(d => new Promise((ok, mal) => {
      const res = [];
      const c = d.transaction('fotos').objectStore('fotos').openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { res.push({ id: cur.key, ...cur.value }); cur.continue(); } else ok(res); };
      c.onerror = () => mal(c.error);
    }));
    return { poner: (k, v) => escribir(s => s.put(v, k)), quitar: k => escribir(s => s.delete(k)), todas };
  })();

  let fotos = null;        // [{ id, fecha, url }] de la más antigua a la más reciente
  let error = false;
  let nueva = null;        // { blob, url, fecha } antes de guardarla
  let abierta = null;      // id de la foto ampliada
  let antes = null, ahora = null;
  let esperandoCuidado = false;
  const repintar = () => { if (location.hash === '#gym') Gym.render(document.getElementById('vista')); };
  const fechaTxt = f => { const d = U.deIso(f); return `${d.getDate()} ${U.MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
  const semanasEntre = (a, b) => Math.round((U.deIso(b) - U.deIso(a)) / (7 * 864e5));

  function cargar() {
    if (typeof indexedDB === 'undefined') { error = true; fotos = []; return; }
    BD.todas().then(lista => {
      fotos = lista.map(x => ({ id: x.id, fecha: x.fecha, url: URL.createObjectURL(x.blob) }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
      repintar();
    }).catch(() => { error = true; fotos = []; repintar(); });
  }

  // Reduce la foto a 1280 px (JPEG) para que ocupe poco.
  async function procesar(archivo) {
    const bmp = await createImageBitmap(archivo);
    const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(bmp.width * k); lienzo.height = Math.round(bmp.height * k);
    lienzo.getContext('2d').drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    return new Promise(ok => lienzo.toBlob(ok, 'image/jpeg', 0.85));
  }

  // ---------- Pintado ----------
  function vista() {
    if (!fotos) { cargar(); return '<p class="vacio">Cargando fotos…</p>'; }
    const rec = Cuidado.estadoRecordatorio('foto-progreso');
    if (!rec && !esperandoCuidado) { esperandoCuidado = true; Cuidado.asegurar().then(ok => ok && repintar()); }
    const par = comparar();
    return `
      <section class="tarjeta gf-cab">
        <div>
          <h2>Fotos de progreso</h2>
          <p class="muted peq nota">Una cada 3 semanas, con la misma pose, sitio, luz y distancia.${rec ? ` <span class="${rec.pronto ? 'cp-pronto' : ''}">Próxima: ${U.esc(rec.texto.toLowerCase())}.</span>` : ''}</p>
        </div>
        <label class="btn">Añadir foto<input type="file" accept="image/*" id="gf-archivo" hidden></label>
      </section>
      ${error ? '<p class="aviso-suave">Este navegador no deja guardar fotos en el dispositivo.</p>' : ''}
      ${nueva ? `
        <section class="tarjeta gf-nueva">
          <img src="${nueva.url}" alt="Foto nueva">
          <label class="gf-fecha">Fecha de la foto <input type="date" id="gf-fecha" value="${nueva.fecha}" max="${U.iso()}"></label>
          <div class="fila-botones">
            <button class="btn btn-sec" data-acc="gf-cancelar">Cancelar</button>
            <button class="btn" data-acc="gf-guardar">Guardar foto</button>
          </div>
        </section>` : ''}
      ${par ? `
        <section class="tarjeta gf-comparar">
          <h3>Antes / ahora</h3>
          <div class="gf-par">
            ${[['antes', par.a], ['ahora', par.b]].map(([k, f]) => `
              <figure>
                <img src="${f.url}" alt="Foto del ${fechaTxt(f.fecha)}">
                <select data-gf="${k}" aria-label="Foto de ${k}">
                  ${fotos.map(x => `<option value="${x.id}" ${x.id === f.id ? 'selected' : ''}>${fechaTxt(x.fecha)}</option>`).join('')}
                </select>
              </figure>`).join('')}
          </div>
          <p class="muted peq nota">${semanasEntre(par.a.fecha, par.b.fecha)} semanas entre las dos.</p>
        </section>` : ''}
      <section class="gf-galeria">
        ${fotos.length ? [...fotos].reverse().map(f => `
          <button class="gf-mini" data-acc="gf-abrir" data-id="${f.id}" aria-label="Ver foto del ${fechaTxt(f.fecha)}">
            <img src="${f.url}" alt="" loading="lazy"><span>${fechaTxt(f.fecha)}</span>
          </button>`).join('') : '<p class="vacio">Aún no hay fotos. Haz la primera hoy y compara dentro de unas semanas.</p>'}
      </section>
      <p class="muted peq nota gf-privado">Las fotos se guardan solo en este móvil: no se suben a ningún sitio ni van en la copia de seguridad. Si quieres conservarlas, ábrelas y pulsa «Descargar».</p>
      ${abierta ? ampliada() : ''}`;
  }
  function comparar() {
    if (fotos.length < 2) return null;
    const a = fotos.find(x => x.id === antes) || fotos[0];
    const b = fotos.find(x => x.id === ahora) || fotos[fotos.length - 1];
    return { a, b };
  }
  function ampliada() {
    const f = fotos.find(x => x.id === abierta);
    if (!f) return '';
    return `
      <div class="selector-fondo gf-fondo">
        <div class="selector gf-grande" role="dialog" aria-modal="true" aria-label="Foto del ${fechaTxt(f.fecha)}">
          <div class="cab-seccion"><h3>${fechaTxt(f.fecha)}</h3><button class="icon-btn" data-acc="gf-cerrar" aria-label="Cerrar">×</button></div>
          <img src="${f.url}" alt="Foto del ${fechaTxt(f.fecha)}">
          <div class="fila-botones">
            <a class="btn btn-sec" href="${f.url}" download="progreso-${f.fecha}.jpg">Descargar</a>
            <button class="btn btn-sec gf-borrar" data-acc="gf-borrar" data-id="${f.id}">Borrar</button>
          </div>
        </div>
      </div>`;
  }

  // ---------- Eventos (devuelven true si eran suyos) ----------
  function alClic(e, rerender) {
    if (abierta && e.target.classList.contains('gf-fondo')) { abierta = null; rerender(); return true; }
    const b = e.target.closest('[data-acc^="gf-"]');
    if (!b) return false;
    switch (b.dataset.acc) {
      case 'gf-cancelar': URL.revokeObjectURL(nueva.url); nueva = null; break;
      case 'gf-guardar': {
        const fecha = document.getElementById('gf-fecha').value || U.iso();
        const id = `${fecha}-${Store.id()}`;
        const { blob, url } = nueva;
        nueva = null;
        BD.poner(id, { blob, fecha, creado: Date.now() }).then(() => {
          fotos.push({ id, fecha, url });
          fotos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
          ahora = null;
          if (fecha === U.iso()) Cuidado.marcarHecho('foto-progreso');
          repintar();
        }).catch(() => alert('No se ha podido guardar la foto en este dispositivo.'));
        return true;
      }
      case 'gf-abrir': abierta = b.dataset.id; break;
      case 'gf-cerrar': abierta = null; break;
      case 'gf-borrar': {
        if (!confirm('¿Borrar esta foto? No se puede deshacer.')) return true;
        const id = b.dataset.id;
        BD.quitar(id).then(() => {
          const f = fotos.find(x => x.id === id);
          if (f) URL.revokeObjectURL(f.url);
          fotos = fotos.filter(x => x.id !== id);
          abierta = null;
          repintar();
        });
        return true;
      }
      default: return false;
    }
    rerender();
    return true;
  }

  function alEscribir(e, rerender) {
    const t = e.target;
    if (t.id === 'gf-archivo') {
      const f = t.files?.[0];
      t.value = '';
      if (!f) return true;
      procesar(f).then(blob => {
        if (nueva) URL.revokeObjectURL(nueva.url);
        // Fecha propuesta: la del archivo si es de antes de hoy; si no, hoy.
        const delArchivo = f.lastModified ? U.iso(new Date(f.lastModified)) : U.iso();
        nueva = { blob, url: URL.createObjectURL(blob), fecha: delArchivo < U.iso() ? delArchivo : U.iso() };
        repintar();
      }).catch(() => alert('No se ha podido leer la foto.'));
      return true;
    }
    if (t.dataset.gf) {
      if (t.dataset.gf === 'antes') antes = t.value; else ahora = t.value;
      rerender();
      return true;
    }
    return false;
  }

  return { vista, alClic, alEscribir };
})();
