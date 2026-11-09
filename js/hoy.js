// Módulo Hoy: pantalla de inicio con el resumen del día.
// Lee los datos de Finanzas y Gym a través de sus funciones públicas, y los de
// comidas, hábitos, tareas y agenda de js/hoy-datos.js.
const Hoy = (() => {
  let menuAbierto = false; // menú del botón «+»

  const ajustes = () => Store.get().ajustes;

  // «Lunes, 9 de noviembre»
  function fechaLarga(d = new Date()) {
    const t = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // Acciones del botón «+».
  const RAPIDO = [
    { id: 'gasto', texto: 'Añadir gasto', icono: '−' },
    { id: 'ingreso', texto: 'Añadir ingreso', icono: '+' },
    { id: 'entreno', texto: 'Registrar entreno', icono: '🏋️' },
    { id: 'ajustes', texto: 'Ajustes y copia', icono: '⋯' },
  ];

  function render(el) {
    el.innerHTML = `
      <header class="hoy-cab">
        <div class="hoy-saludo">
          <span class="hoy-fecha">${fechaLarga()}</span>
          <h1>Hola, ${U.esc(ajustes().nombre)}</h1>
        </div>
        <div class="rapido">
          <button class="btn-mas" data-acc="menu" aria-label="Añadir algo rápido"
            aria-expanded="${menuAbierto}" aria-haspopup="menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
          </button>
          ${menuAbierto ? `
            <div class="menu-rapido" role="menu">
              ${RAPIDO.map(r => `
                <button role="menuitem" data-acc="rapido" data-que="${r.id}">
                  <span class="menu-icono" aria-hidden="true">${r.icono}</span>${r.texto}
                </button>`).join('')}
            </div>` : ''}
        </div>
      </header>`;
  }

  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    // Un clic fuera del menú lo cierra.
    if (menuAbierto && !e.target.closest('.rapido')) { menuAbierto = false; rerender(); return; }
    if (!b) return;
    const acc = b.dataset.acc;

    if (acc === 'menu') menuAbierto = !menuAbierto;
    else if (acc === 'rapido') {
      menuAbierto = false;
      const que = b.dataset.que;
      if (que === 'gasto' || que === 'ingreso') { Finanzas.abrirFormulario(que); location.hash = '#finanzas'; return; }
      if (que === 'entreno') { Gym.irAHoy(); location.hash = '#gym'; return; }
      if (que === 'ajustes') { rerender(); abrirAjustes(); return; }
    } else return;
    rerender();
  }

  return { id: 'hoy', nombre: 'Hoy', icono: '☀️', render, alClic };
})();
