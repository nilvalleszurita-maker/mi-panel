// Arranque: registra los módulos, pinta las pestañas y reparte los eventos.
// Para añadir una sección nueva (Comidas, Horario, Outfits…) basta con crear
// su archivo en js/, incluirlo en index.html y añadirlo a esta lista.
const MODULOS = [Finanzas, Entrenos];

const vista = document.getElementById('vista');
const tabs = document.getElementById('tabs');
let actual = MODULOS.find(m => m.id === location.hash.slice(1)) || MODULOS[0];

function pintar() {
  tabs.innerHTML = MODULOS.map(m => `
    <a href="#${m.id}" class="tab ${m === actual ? 'activa' : ''}" ${m === actual ? 'aria-current="page"' : ''}>
      <span class="tab-icono" aria-hidden="true">${m.icono}</span><span>${m.nombre}</span>
    </a>`).join('');
  actual.render(vista);
}

window.addEventListener('hashchange', () => {
  actual = MODULOS.find(m => m.id === location.hash.slice(1)) || MODULOS[0];
  pintar();
  window.scrollTo(0, 0);
});

const rerender = () => actual.render(vista);
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

// Copia de seguridad: exportar / importar todo el estado en JSON.
const dlg = document.getElementById('dlg-ajustes');
document.getElementById('btn-ajustes').onclick = () => dlg.showModal();
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
