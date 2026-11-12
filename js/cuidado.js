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

  // ---------- Escáner de la forma de la cara ----------
  // MediaPipe Face Landmarker en el navegador. La librería (~10 MB con su modelo) no va
  // dentro de la app: se descarga la primera vez que pulsas «Escanear».
  // La imagen se analiza en el móvil; no se guarda ni se envía: solo se guarda la forma.
  const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const MODELO = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  const FOTOGRAMAS = 10;
  let detector = null, cargandoDetector = null;
  // escaner.estado: 'listo' | 'cargando' | 'camara' | 'analizando' | 'hecho' | 'error'
  let escaner = { estado: 'listo', texto: '', n: 0 };
  let stream = null;

  function cargarDetector() {
    if (detector) return Promise.resolve(detector);
    if (cargandoDetector) return cargandoDetector;
    cargandoDetector = (async () => {
      const vision = await import(`${MP}/vision_bundle.mjs`);
      const archivos = await vision.FilesetResolver.forVisionTasks(`${MP}/wasm`);
      detector = await vision.FaceLandmarker.createFromOptions(archivos, {
        baseOptions: { modelAssetPath: MODELO, delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 1,
      });
      return detector;
    })().finally(() => { cargandoDetector = null; });
    return cargandoDetector;
  }

  // Medidas con los puntos de deteccion_forma (en píxeles, para no deformar por el formato).
  function medir(puntos, ancho, alto) {
    const d = (a, b) => Math.hypot((puntos[a].x - puntos[b].x) * ancho, (puntos[a].y - puntos[b].y) * alto);
    return { largo: d(10, 152), frente: d(54, 284), pomulos: d(234, 454), mandibula: d(172, 397) };
  }
  // Reglas de deteccion_forma.reglas_en_orden.
  function clasificar(m) {
    const ratio = m.largo / m.pomulos;
    if (ratio >= 1.55) return 'alargada';
    if (m.pomulos > m.frente * 1.08 && m.pomulos > m.mandibula * 1.12) return 'diamante';
    if (m.frente > m.mandibula * 1.15 && m.frente >= m.pomulos * 0.95) return 'corazon';
    if (ratio < 1.3 && Math.abs(m.mandibula - m.pomulos) / m.pomulos < 0.10) return 'cuadrada';
    if (ratio < 1.3) return 'redonda';
    return 'ovalada';
  }
  const media = lista => Object.fromEntries(Object.keys(lista[0]).map(k => [k, lista.reduce((s, m) => s + m[k], 0) / lista.length]));

  function pintarEscaner() {
    const caja = document.getElementById('cp-escaner');
    if (caja) caja.outerHTML = tarjetaEscaner();
    const v = document.getElementById('cp-video');
    if (v && stream && v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}); }
  }
  function ponerEstado(estado, texto = '') { escaner = { ...escaner, estado, texto }; pintarEscaner(); }
  function pararCamara() { stream?.getTracks().forEach(t => t.stop()); stream = null; }
  function guardarForma(forma) {
    c().forma = forma; c().origenForma = 'escaner'; Store.guardar();
    ponerEstado('hecho', `Forma detectada: ${nombreCorto(datos.formas[forma])} (aprox.)`);
    if (enCuidado()) render(document.getElementById('vista'));
  }
  const errorCarga = () => ponerEstado('error', 'No se ha podido descargar el escáner. Comprueba la conexión a internet y vuelve a probar.');

  async function escanearCamara() {
    if (!navigator.mediaDevices?.getUserMedia) { ponerEstado('error', 'Este navegador no deja usar la cámara. Prueba subiendo una foto.'); return; }
    ponerEstado('cargando', 'Preparando el escáner…');
    try { await cargarDetector(); } catch { errorCarga(); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }, audio: false });
    } catch {
      ponerEstado('error', 'No hay permiso para usar la cámara. Puedes darlo en los ajustes del navegador o subir una foto.'); return;
    }
    escaner.n = 0;
    ponerEstado('camara', 'Coloca la cara dentro del óvalo…');
    await new Promise(r => setTimeout(r, 1500)); // tiempo para colocarse
    const medidas = [];
    const limite = Date.now() + 10000;
    while (medidas.length < FOTOGRAMAS && Date.now() < limite && stream && enCuidado()) {
      const v = document.getElementById('cp-video');
      if (v && v.readyState >= 2 && v.videoWidth) {
        const r = detector.detect(v);
        if (r.faceLandmarks?.[0]) {
          medidas.push(medir(r.faceLandmarks[0], v.videoWidth, v.videoHeight));
          escaner.n = medidas.length;
          const t = document.getElementById('cp-escaner-txt');
          if (t) t.textContent = `Analizando proporciones… ${medidas.length}/${FOTOGRAMAS}`;
        }
      }
      await new Promise(r => setTimeout(r, 150));
    }
    pararCamara();
    if (!enCuidado()) { escaner = { estado: 'listo', texto: '', n: 0 }; return; }
    if (medidas.length < 3) { ponerEstado('error', 'No encuentro bien tu cara. Busca buena luz, ponte de frente y aparta el pelo de la frente.'); return; }
    guardarForma(clasificar(media(medidas)));
  }

  async function escanearFoto(archivo) {
    ponerEstado('analizando', 'Analizando la foto…');
    try { await cargarDetector(); } catch { errorCarga(); return; }
    const url = URL.createObjectURL(archivo);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const r = detector.detect(img);
      if (!r.faceLandmarks?.[0]) { ponerEstado('error', 'No encuentro ninguna cara en la foto. Usa una de frente, con buena luz y la frente despejada.'); return; }
      guardarForma(clasificar(medir(r.faceLandmarks[0], img.naturalWidth, img.naturalHeight)));
    } catch {
      ponerEstado('error', 'No se ha podido leer la foto.');
    } finally {
      URL.revokeObjectURL(url); // la foto no se guarda en ningún sitio
    }
  }

  function tarjetaEscaner() {
    const e = escaner.estado;
    const ocupado = e === 'cargando' || e === 'camara' || e === 'analizando';
    const ovalo = `
      <svg class="cp-ovalo" viewBox="0 0 140 180" fill="none" aria-hidden="true">
        <ellipse cx="70" cy="90" rx="50" ry="70" stroke="var(--acento)" stroke-width="2.5" stroke-dasharray="6 6"></ellipse>
      </svg>`;
    const texto = escaner.texto || 'Coloca la cara dentro del óvalo';
    return `
      <section class="tarjeta cp-escaner" id="cp-escaner">
        <div class="cp-visor ${e === 'camara' ? 'con-video' : ''}">
          ${e === 'camara' ? `<video id="cp-video" playsinline muted autoplay></video>` : `
            <svg class="cp-cara" viewBox="0 0 140 180" fill="none" aria-hidden="true">
              <circle cx="50" cy="78" r="3" fill="#3A4150"></circle><circle cx="90" cy="78" r="3" fill="#3A4150"></circle>
              <path d="M70 86v18M58 122q12 8 24 0" stroke="#3A4150" stroke-width="2.5" stroke-linecap="round"></path>
            </svg>`}
          ${ovalo}
        </div>
        <p class="cp-escaner-txt ${e === 'hecho' ? 'ok' : e === 'error' ? 'mal' : ''}" id="cp-escaner-txt" aria-live="polite">${U.esc(texto)}</p>
        ${e === 'camara' ? '<button class="btn btn-sec ancho" data-acc="cp-cancelar">Cancelar</button>' : `
          <div class="cp-escaner-botones">
            <button class="btn" data-acc="cp-camara" ${ocupado ? 'disabled' : ''}>${e === 'hecho' ? 'Volver a escanear' : 'Escanear cara'}</button>
            <label class="btn btn-sec ${ocupado ? 'deshabilitado' : ''}">Subir una foto
              <input type="file" accept="image/*" id="cp-foto" hidden ${ocupado ? 'disabled' : ''}>
            </label>
          </div>`}
        <p class="muted peq nota">Buena luz, cara de frente y pelo apartado de la frente. La foto se analiza en tu móvil y no se guarda ni se envía a ningún sitio.</p>
      </section>`;
  }

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

      ${tarjetaEscaner()}

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
      case 'cp-camara': escanearCamara(); return;
      case 'cp-cancelar': pararCamara(); escaner = { estado: 'listo', texto: '', n: 0 }; break;
      case 'cp-seccion': seccion = b.dataset.v; break;
      case 'cp-fav': alternarFavorito(seccion, datos.formas[c().forma][seccion][Number(b.dataset.i)]); break;
      case 'cp-quitar': c().favoritos = c().favoritos.filter(f => f.id !== b.dataset.id); Store.guardar(); break;
      default: return;
    }
    rerender();
  }

  // La foto subida se analiza al momento (y no se guarda).
  function alEscribir(e) {
    if (e.target.id !== 'cp-foto') return;
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) escanearFoto(f);
  }

  return { alEscribir, id: 'cuidado', nombre: 'Cuidado personal', icono: '🪞', render, alClic, tarjetaEstilo, asegurar };
})();
