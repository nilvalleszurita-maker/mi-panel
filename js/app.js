// Arranque: registra los módulos, pinta las pestañas y reparte los eventos.
// Para añadir una sección nueva (Comidas, Horario, Outfits…) basta con crear
// su archivo en js/, incluirlo en index.html y añadirlo a esta lista.
// La primera es la pantalla de inicio.
const MODULOS = [Hoy, Finanzas, Gym, Estudio, Outfits];

// Iconos del menú (trazos del diseño). Si un módulo no tiene, se usa su emoji.
const trazo = d => `<svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONOS = {
  hoy: trazo('<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2"></path>'),
  finanzas: trazo('<rect x="3" y="6" width="18" height="13" rx="2"></rect><path d="M3 10h18"></path>'),
  gym: trazo('<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"></path>'),
  estudio: trazo('<path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3z"></path><path d="M8 9h6M8 13h4"></path>'),
  outfits: trazo('<path d="M10 6a2 2 0 1 1 3 1.7c-.6.4-1 1-1 1.7V10"></path><path d="M12 10l-8.6 6.4A1.4 1.4 0 0 0 4.2 19h15.6a1.4 1.4 0 0 0 .8-2.6z"></path>'),
};

const vista = document.getElementById('vista');
const tabs = document.getElementById('tabs');
const elegir = () => MODULOS.find(m => m.id === location.hash.slice(1)) || MODULOS[0];
let actual = elegir();

function pintar() {
  tabs.innerHTML = MODULOS.map(m => `
    <a href="#${m.id}" class="tab ${m === actual ? 'activa' : ''}" ${m === actual ? 'aria-current="page"' : ''}>
      ${ICONOS[m.id] || `<span aria-hidden="true">${m.icono}</span>`}<span>${m.nombre}</span>
    </a>`).join('');
  document.getElementById('titulo-pantalla').textContent = actual.nombre;
  document.body.classList.toggle('en-hoy', actual.id === 'hoy');
  document.title = actual.id === 'hoy' ? 'Mi Panel' : `${actual.nombre} · Mi Panel`;
  render();
}

window.addEventListener('hashchange', () => {
  actual = elegir();
  pintar();
  window.scrollTo(0, 0);
});

// Al repintar se oculta el tooltip, que si no se quedaría con datos viejos.
function render() {
  document.querySelector('.tip')?.setAttribute('hidden', '');
  vista.classList.remove('vista-hoy'); // Hoy la vuelve a poner (vista más ancha en escritorio)
  actual.render(vista);
}
const rerender = render;
vista.addEventListener('click', e => actual.alClic?.(e, rerender));
vista.addEventListener('submit', e => actual.alEnviar?.(e, rerender));
vista.addEventListener('input', e => actual.alEscribir?.(e, rerender));

// Tooltip compartido: cualquier elemento con data-tip-t / data-tip-v lo muestra
// al pasar el ratón o al tocarlo con el dedo.
const tip = Object.assign(document.createElement('div'), { className: 'tip', hidden: true });
document.body.append(tip);
function mostrarTip(e) {
  const t = e.target.closest?.('[data-tip-t]');
  if (!t) { tip.hidden = true; return; }
  tip.replaceChildren(
    Object.assign(document.createElement('div'), { className: 'muted peq', textContent: t.dataset.tipT }),
    Object.assign(document.createElement('strong'), { textContent: t.dataset.tipV }),
  );
  tip.hidden = false;
  const x = Math.max(8, Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8));
  const y = e.clientY - tip.offsetHeight - 14;
  tip.style.left = x + 'px';
  tip.style.top = (y < 8 ? e.clientY + 18 : y) + 'px';
}
vista.addEventListener('pointermove', mostrarTip);
vista.addEventListener('pointerdown', mostrarTip);
vista.addEventListener('pointerleave', () => { tip.hidden = true; });
window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

// Al cambiar el tamaño de la ventana solo se redibujan las gráficas
// (no toda la vista, para no cerrar el teclado del móvil mientras escribes).
let espera;
window.addEventListener('resize', () => {
  clearTimeout(espera);
  espera = setTimeout(() => actual.alRedimensionar?.(), 120);
});

// ---------- Estado del guardado ----------
// Pide al navegador que no borre los datos de la app aunque necesite espacio.
let persistente = null; // true / false / null (el navegador no lo indica)
navigator.storage?.persist?.().then(r => { persistente = r; }).catch(() => {});

const aviso = document.getElementById('aviso-guardado');
const mostrarAviso = ok => { aviso.hidden = ok; };
window.addEventListener('mi-panel:guardado', e => mostrarAviso(e.detail.ok));
mostrarAviso(Store.info().ok);

async function pintarEstado() {
  const { ok, ultimo } = Store.info();
  if (persistente === null) persistente = await navigator.storage?.persisted?.().catch(() => null) ?? null;
  const d = Store.get();
  const movs = d.finanzas.movimientos.length + d.finanzas.traspasos.length;
  const dias = Object.keys(d.gym.registros).length;
  const cuando = ultimo
    ? new Date(ultimo).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'nunca';
  const fila = (bien, texto) => `<li class="${bien ? 'pos' : 'neg'}"><span aria-hidden="true">${bien ? '✓' : '✗'}</span> ${texto}</li>`;
  document.getElementById('estado-guardado').innerHTML = [
    fila(ok, ok ? 'Este navegador guarda los datos' : 'Este navegador <strong>no</strong> está guardando los datos'),
    persistente === null ? '' : fila(persistente, persistente
      ? 'Protegidos: el navegador no los borrará para liberar espacio'
      : 'Sin protección: el navegador podría borrarlos si le falta espacio'),
    `<li class="muted">Último guardado: ${cuando}</li>`,
    `<li class="muted">Guardado ahora: ${movs} ${movs === 1 ? 'movimiento' : 'movimientos'} de finanzas · ${dias} ${dias === 1 ? 'día' : 'días'} de gym</li>`,
  ].join('');
  document.getElementById('consejos-guardado').hidden = ok;
}

// Copia de seguridad: exportar / importar todo el estado en JSON.
const dlg = document.getElementById('dlg-ajustes');
// Global: también la usa el menú «+» de la pantalla Hoy.
function abrirAjustes() { pintarEstado(); dlg.showModal(); }
document.getElementById('btn-ajustes').onclick = abrirAjustes;
document.getElementById('btn-ajustes-lateral').onclick = abrirAjustes;
document.getElementById('btn-aviso').onclick = abrirAjustes;
document.getElementById('btn-exportar').onclick = () => {
  const blob = new Blob([JSON.stringify(Store.get(), null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `mi-panel-${U.iso()}.json` });
  a.click();
  URL.revokeObjectURL(a.href);
};
document.getElementById('inp-importar').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const datos = JSON.parse(await file.text());
    if (!confirm('Esto reemplazará los datos actuales de este dispositivo. ¿Continuar?')) return;
    Store.reemplazar(datos);
    dlg.close();
    pintar();
  } catch {
    alert('El archivo no es una copia válida.');
  } finally {
    e.target.value = '';
  }
};

// Permite instalar la app y usarla sin conexión (solo funciona servida por http/https).
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js');
}

pintar();
