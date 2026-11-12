// Cuidado personal (dentro de «Más»): forma de la cara y recomendaciones de estilo.
//
// Las recomendaciones se leen de data/cuidado.json (copia de
// cuidado-personal-para-code/datos/recomendaciones.json al publicar).
// Store.get().cuidado:
//   forma ('ovalada'|'redonda'|…|null), origenForma ('manual'|'escaner'),
//   favoritos [{ id, seccion ('pelo'|'cejas'|'barba'|'gafas'), forma, texto, fecha }]
const Cuidado = (() => {
  const SECCIONES = [['pelo', 'Pelo'], ['cejas', 'Cejas'], ['barba', 'Barba'], ['gafas', 'Gafas']];
  let datos = null, cargando = null;
  let seccion = 'pelo';
  const c = () => Store.get().cuidado;
  const nombreCorto = f => f.nombre.split(' (')[0];
  const enCuidado = () => location.hash === '#cuidado';

  function asegurar() {
    if (datos) return Promise.resolve(true);
    if (cargando) return cargando;
    cargando = fetch('data/cuidado.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(json => { datos = json; return true; })
      .catch(() => false)
      .finally(() => { cargando = null; });
    return cargando;
  }

  // ---------- Favoritos ----------
  const favorito = (sec, texto) => c().favoritos.find(f => f.seccion === sec && f.texto === texto);
  function alternarFavorito(sec, texto) {
    const ya = favorito(sec, texto);
    if (ya) c().favoritos = c().favoritos.filter(f => f !== ya);
    else c().favoritos.push({ id: Store.id(), seccion: sec, forma: c().forma, texto, fecha: U.iso() });
    Store.guardar();
  }
  const nombreSeccion = s => SECCIONES.find(x => x[0] === s)?.[1] || s;

  // ---------- Pintado ----------
  function render(el) {
    if (!datos) {
      el.innerHTML = '<p class="vacio">Cargando…</p>';
      asegurar().then(ok => {
        if (enCuidado()) ok ? render(el) : (el.innerHTML = '<p class="vacio">No se han podido cargar las recomendaciones. Comprueba la conexión y vuelve a entrar.</p>');
      });
      return;
    }
    const formas = datos.formas;
    const forma = c().forma && formas[c().forma];
    el.innerHTML = `
      <header class="hoy-cab">
        <div class="hoy-saludo">
          <span class="hoy-fecha">Más · Cuidado personal</span>
          <h1>Tu estilo</h1>
        </div>
      </header>

      <section class="tarjeta cp-forma">
        <div class="cab-seccion">
          <h2>Forma de tu cara</h2>
          <span class="muted peq">${forma ? 'Toca para corregirla' : 'Elige la tuya'}</span>
        </div>
        <div class="chips">
          ${Object.entries(formas).map(([k, f]) => `
            <button class="chip ${c().forma === k ? 'on' : ''}" data-acc="cp-forma" data-v="${k}" aria-pressed="${c().forma === k}">${U.esc(nombreCorto(f))}</button>`).join('')}
        </div>
        ${forma
          ? `<p class="cp-desc">${U.esc(forma.descripcion)}${c().origenForma === 'escaner' ? ' <span class="muted peq">· detectada con el escáner (aprox.)</span>' : ''}</p>`
          : '<p class="muted nota">Elige la forma que más se parezca a tu cara para ver las recomendaciones.</p>'}
      </section>

      ${forma ? `
        <section class="tarjeta cp-recos">
          <h2>Recomendaciones</h2>
          <div class="segmentado cuatro" role="tablist">
            ${SECCIONES.map(([k, n]) => `<button type="button" role="tab" aria-selected="${seccion === k}" class="${seccion === k ? 'activo' : ''}" data-acc="cp-seccion" data-v="${k}">${n}</button>`).join('')}
          </div>
          <ol class="cp-tips">
            ${forma[seccion].map((t, i) => {
              const fav = !!favorito(seccion, t);
              return `
                <li>
                  <span class="cp-num" aria-hidden="true">${i + 1}</span>
                  <span class="crece">${U.esc(t)}</span>
                  <button class="cp-estrella ${fav ? 'on' : ''}" data-acc="cp-fav" data-i="${i}" aria-pressed="${fav}"
                    aria-label="${fav ? 'Quitar de favoritos' : 'Guardar como favorito'}">${fav ? '★' : '☆'}</button>
                </li>`;
            }).join('')}
          </ol>
          <p class="muted peq nota">Son puntos de partida para probar, no reglas. Toca ☆ para guardar un estilo.</p>
        </section>` : ''}

      ${favoritos()}`;
  }

  function favoritos() {
    const lista = c().favoritos;
    if (!lista.length) return '';
    return `
      <section class="tarjeta cp-favs">
        <div class="cab-seccion"><h2>Tus favoritos</h2><span class="muted peq">También en Outfits</span></div>
        <ul class="cp-fav-lista">
          ${lista.map(f => `
            <li>
              <span class="cp-fav-etq">${nombreSeccion(f.seccion)}</span>
              <span class="crece">${U.esc(f.texto)}</span>
              <button class="icon-btn peq" data-acc="cp-quitar" data-id="${f.id}" aria-label="Quitar de favoritos">×</button>
            </li>`).join('')}
        </ul>
      </section>`;
  }

  // Tarjeta pequeña para la vista «Outfit de hoy» de Outfits (vacía si no hay favoritos).
  function tarjetaEstilo() {
    const lista = c().favoritos;
    if (!lista.length) return '';
    return `
      <section class="bloque cp-estilo">
        <div class="cab-seccion"><h3>Tu estilo</h3><a class="enlace" href="#cuidado">Ver</a></div>
        <ul class="cp-fav-lista">
          ${lista.map(f => `<li><span class="cp-fav-etq">${nombreSeccion(f.seccion)}</span><span class="crece">${U.esc(f.texto)}</span></li>`).join('')}
        </ul>
      </section>`;
  }

  // ---------- Eventos ----------
  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    switch (b.dataset.acc) {
      case 'cp-forma': c().forma = b.dataset.v; c().origenForma = 'manual'; Store.guardar(); break;
      case 'cp-seccion': seccion = b.dataset.v; break;
      case 'cp-fav': alternarFavorito(seccion, datos.formas[c().forma][seccion][Number(b.dataset.i)]); break;
      case 'cp-quitar': c().favoritos = c().favoritos.filter(f => f.id !== b.dataset.id); Store.guardar(); break;
      default: return;
    }
    rerender();
  }

  return { id: 'cuidado', nombre: 'Cuidado personal', icono: '🪞', render, alClic, tarjetaEstilo, asegurar };
})();
