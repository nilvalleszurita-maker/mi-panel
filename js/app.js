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
