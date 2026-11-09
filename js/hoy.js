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

  // Cifras redondas para las tarjetas: «64 €», «25.000 €».
  const euros0 = n => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' }).format(n) + ' €';
  const pctBarra = (v, max) => Math.max(0, Math.min(100, max ? (v / max) * 100 : 0));

  // ---------- Tarjetas resumen ----------
  function tarjetas() {
    const a = ajustes();
    const lunes = U.lunes(), domingo = new Date(lunes); domingo.setDate(domingo.getDate() + 6);
    const gasto = Finanzas.gastoEntre(U.iso(lunes), U.iso(domingo));
    const pasado = gasto > a.presupuestoSemanal;
    const gym = Gym.resumenSemana(lunes);
    const prot = HoyDatos.totalesComidas(U.iso()).proteina_g;
    const ahorro = Finanzas.dineroTotal();

    const barra = (v, max, color) => `
      <div class="kpi-barra" role="presentation"><div style="width:${pctBarra(v, max)}%;background:${color}"></div></div>`;

    return `
      <section class="kpis" aria-label="Resumen">
        <article class="kpi">
          <span class="kpi-titulo"><span class="solo-movil">Gasto semana</span><span class="solo-escritorio">Gasto esta semana</span></span>
          <span class="kpi-valor ${pasado ? 'neg' : ''}">${euros0(gasto)} <span class="kpi-de solo-escritorio">/ ${euros0(a.presupuestoSemanal)}</span></span>
          ${barra(gasto, a.presupuestoSemanal, pasado ? 'var(--neg)' : 'var(--acento)')}
          <span class="kpi-pie solo-movil">${pasado ? `${euros0(gasto - a.presupuestoSemanal)} de más` : `de ${euros0(a.presupuestoSemanal)}`}</span>
        </article>

        <article class="kpi solo-escritorio">
          <span class="kpi-titulo">Ahorro hacia ${U.esc(a.metaAhorro.nombre)}</span>
          <span class="kpi-valor">${euros0(ahorro)} <span class="kpi-de">/ ${euros0(a.metaAhorro.objetivo)}</span></span>
          ${barra(ahorro, a.metaAhorro.objetivo, 'var(--verde)')}
        </article>

        <article class="kpi">
          <span class="kpi-titulo"><span class="solo-movil">Racha gym</span><span class="solo-escritorio">Entrenos esta semana</span></span>
          <span class="kpi-valor"><span class="solo-movil">${gym.gym} ${gym.gym === 1 ? 'día' : 'días'}</span><span class="solo-escritorio">${gym.gym} <span class="kpi-de">/ ${gym.planGym} gym · ${gym.carreras} / ${gym.planCarreras} carreras</span></span></span>
          <div class="kpi-segmentos solo-movil" role="presentation">
            ${Array.from({ length: gym.planGym }, (_, i) => `<div class="${i < gym.gym ? 'on' : ''}"></div>`).join('')}
          </div>
          <div class="solo-escritorio">${barra(gym.gym, gym.planGym, 'var(--ambar)')}</div>
          <span class="kpi-pie solo-movil">${gym.gym} de ${gym.planGym} esta semana</span>
        </article>

        <article class="kpi">
          <span class="kpi-titulo"><span class="solo-movil">Proteína</span><span class="solo-escritorio">Proteína hoy</span></span>
          <span class="kpi-valor">${prot} g <span class="kpi-de solo-escritorio">/ ${a.objetivoProteina} g</span></span>
          ${barra(prot, a.objetivoProteina, 'var(--acento)')}
          <span class="kpi-pie solo-movil">de ${a.objetivoProteina} g</span>
        </article>
      </section>`;
  }

  function render(el) {
    HoyDatos.asegurar();
    el.classList.add('vista-hoy');
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
            <span class="solo-escritorio">Añadir rápido</span>
          </button>
          ${menuAbierto ? `
            <div class="menu-rapido" role="menu">
              ${RAPIDO.map(r => `
                <button role="menuitem" data-acc="rapido" data-que="${r.id}">
                  <span class="menu-icono" aria-hidden="true">${r.icono}</span>${r.texto}
                </button>`).join('')}
            </div>` : ''}
        </div>
      </header>
      ${tarjetas()}`;
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
