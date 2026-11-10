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
    const lunes = U.lunes();
    // Gasto del mes en curso sin los gastos fijos (curso, gym…), frente al presupuesto.
    const hoy = new Date();
    const primero = U.iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const ultimo = U.iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
    const gasto = Finanzas.gastoEntre(primero, ultimo, { sinFijos: true });
    const presupuesto = a.presupuestoMensual;
    const pasado = gasto > presupuesto;
    const gym = Gym.resumenSemana(lunes);
    const prot = HoyDatos.totalesComidas(U.iso()).proteina_g;
    const ahorro = Finanzas.dineroTotal();

    const barra = (v, max, color) => `
      <div class="kpi-barra" role="presentation"><div style="width:${pctBarra(v, max)}%;background:${color}"></div></div>`;

    return `
      <section class="kpis" aria-label="Resumen">
        <article class="kpi">
          <span class="kpi-titulo">Gasto mensual</span>
          <span class="kpi-valor ${pasado ? 'neg' : ''}">${euros0(gasto)} <span class="kpi-de solo-escritorio">/ ${euros0(presupuesto)}</span></span>
          ${barra(gasto, presupuesto, pasado ? 'var(--neg)' : 'var(--acento)')}
          <span class="kpi-pie solo-movil">${pasado ? `${euros0(gasto - presupuesto)} de más` : `de ${euros0(presupuesto)}`}</span>
        </article>

        <article class="kpi solo-escritorio">
          <span class="kpi-titulo">Ahorro hacia ${U.esc(a.metaAhorro.nombre)}</span>
          <span class="kpi-valor">${euros0(ahorro)} <span class="kpi-de">/ ${euros0(a.metaAhorro.objetivo)}</span></span>
          ${barra(ahorro, a.metaAhorro.objetivo, 'var(--verde)')}
        </article>

        <article class="kpi">
          <span class="kpi-titulo"><span class="solo-movil">Racha gym</span><span class="solo-escritorio">Entrenos esta semana</span></span>
          <span class="kpi-valor"><span class="solo-movil">${gym.dias} ${gym.dias === 1 ? 'día' : 'días'}</span><span class="solo-escritorio">${gym.dias} <span class="kpi-de">/ 7 días</span></span></span>
          <div class="kpi-segmentos solo-movil" role="presentation">
            ${Array.from({ length: 7 }, (_, i) => `<div class="${i < gym.dias ? 'on' : ''}"></div>`).join('')}
          </div>
          <div class="solo-escritorio">${barra(gym.dias, 7, 'var(--ambar)')}</div>
          <span class="kpi-pie solo-movil">${gym.dias} de 7 esta semana</span>
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
      ${tarjetas()}
      <div class="hoy-grid">
        <div class="hoy-col">
          ${entreno()}
          ${examen()}
        </div>
      </div>`;
  }

  // ---------- Próximo examen (de la pestaña Estudio) ----------
  function examen() {
    const x = Estudio.proximoExamen();
    if (!x) {
      // La primera vez, las asignaturas aún no están cargadas: se cargan y se repinta.
      EstudioDatos.asegurar().then(ok => { if (ok && Estudio.proximoExamen() && location.hash.replace('#', '') in { '': 1, hoy: 1 }) document.getElementById('vista') && Hoy.render(document.getElementById('vista')); });
      return '';
    }
    const cuando = x.aprox && x.fecha_texto ? x.fecha_texto : Estudio.fechaTxt(x.fecha);
    return `
      <a class="examen-hoy" href="#estudio">
        <div class="crece">
          <span class="muted peq">Próximo examen</span>
          <strong>${U.esc(x.nombre)}</strong>
          <span class="muted peq">${U.esc(x.asignatura)} · ${U.esc(cuando)}</span>
        </div>
        <span class="examen-hoy-dias ${x.dias <= 14 ? 'cerca' : ''}">${x.dias === 0 ? 'Hoy' : `${x.dias} ${x.dias === 1 ? 'día' : 'días'}`}</span>
      </a>`;
  }

  // ---------- Entreno de hoy ----------
  // La rutina que toca hoy según js/gym-plan.js, con el último peso de cada ejercicio.
  const VISIBLES = 3; // ejercicios que se listan; el resto se resume en «+ N más»

  function entreno() {
    const s = Gym.sesionDe(U.iso());
    // Hora del entreno, si la agenda de hoy lo tiene.
    const hora = HoyDatos.agendaDe(U.iso()).find(e => e.categoria === 'gym')?.hora;
    const pastilla = hora && s.tipo === 'gym' ? `<span class="pastilla">${hora}</span>` : '';

    let cuerpo, boton;
    if (s.tipo === 'carrera') {
      const c = s.carrera;
      const hecha = c && (c.hecho || U.numero(c.km) > 0);
      cuerpo = `
        <div class="entreno-lista">
          <div class="entreno-fila"><span>Objetivo</span><span>${s.km} km · ${U.esc(s.ritmo)}</span></div>
          ${hecha ? `<div class="entreno-fila hecho"><span>✓ Hecha</span><span>${U.esc(String(c.km || '–'))} km${c.min ? ` · ${U.esc(String(c.min))} min` : ''}</span></div>` : ''}
        </div>`;
      boton = hecha ? 'Ver carrera' : 'Registrar carrera';
    } else {
      const lista = s.ejercicios;
      const hechos = lista.filter(e => e.hecho).length;
      const fila = e => `
        <div class="entreno-fila ${e.hecho ? 'hecho' : ''}">
          <span>${e.hecho ? '✓ ' : ''}${U.esc(e.nombre)}</span>
          <span>${e.series} × ${U.esc(e.reps)}${e.ultimoKg != null ? ` · última ${String(e.ultimoKg).replace('.', ',')} kg` : ''}</span>
        </div>`;
      const resto = lista.length - VISIBLES;
      cuerpo = `
        ${hechos ? `<span class="entreno-progreso">${hechos} de ${lista.length} hechos</span>` : ''}
        <div class="entreno-lista">
          ${lista.slice(0, VISIBLES).map(fila).join('')}
          ${resto > 0 ? `<span class="entreno-mas">+ ${resto} ${resto === 1 ? 'ejercicio' : 'ejercicios'} más</span>` : ''}
        </div>`;
      boton = hechos === lista.length ? 'Ver entreno' : hechos ? 'Seguir entreno' : 'Empezar entreno';
    }

    return `
      <section class="entreno-hoy" aria-labelledby="titulo-entreno">
        <div class="entreno-cab">
          <div>
            <span class="entreno-etq">Entreno de hoy</span>
            <h2 id="titulo-entreno">${U.esc(s.sesion)}</h2>
          </div>
          ${pastilla}
        </div>
        ${cuerpo}
        <button class="btn btn-entreno" data-acc="empezar">${boton}</button>
      </section>`;
  }

  function alClic(e, rerender) {
    const b = e.target.closest('[data-acc]');
    // Un clic fuera del menú lo cierra.
    if (menuAbierto && !e.target.closest('.rapido')) { menuAbierto = false; rerender(); return; }
    if (!b) return;
    const acc = b.dataset.acc;

    if (acc === 'menu') menuAbierto = !menuAbierto;
    else if (acc === 'empezar') { Gym.irAHoy(); location.hash = '#gym'; return; }
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
