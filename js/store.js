// Almacenamiento: todo el estado de la app vive en un único objeto
// guardado en localStorage (solo en este dispositivo).
const Store = (() => {
  const KEY = 'mi-panel:v1';
  const VERSION_FINANZAS = 2;

  const porDefecto = () => ({
    finanzas: {
      version: VERSION_FINANZAS,
      movimientos: [],
      // Dónde está el dinero. "base" es el saldo de partida: el saldo real se
      // calcula sumando ingresos, gastos y traspasos (ver Finanzas.saldos).
      // "color" es un hueco fijo de la paleta (1–8), así cada categoría
      // conserva su color aunque se borren otras. La principal recibe
      // los ingresos y paga los gastos, y no se puede borrar.
      cuentas: ['Robo advisor', 'Dinero', 'Efectivo', 'S&P 500', 'Cuenta remunerada']
        .map((nombre, i) => ({ id: 'c' + i, nombre, base: 0, color: i + 1, principal: nombre === 'Dinero' })),
      // Movimientos de dinero entre categorías: { id, de, a, importe, fecha, creado }
      traspasos: [],
      // Gastos fijos de cada mes: { id, nombre, importe, activo }. Al marcar uno como
      // pagado se crea un movimiento de gasto con «fijo_id» (resta de Dinero como
      // cualquier gasto, pero no cuenta en el presupuesto mensual de Hoy).
      fijos: [
        { id: 'fijo-curso', nombre: 'Curso', importe: 167, activo: true },
        { id: 'fijo-gym', nombre: 'Gym', importe: 27, activo: true },
        { id: 'fijo-claude', nombre: 'Claude Pro', importe: 20, activo: true },
      ],
    },
    entrenos: { plan: {}, hechos: {} },
    // Registro del gym por fecha (AAAA-MM-DD). Ver la estructura en js/gym.js.
    gym: { registros: {} },
    // Preferencias de la pantalla Hoy (nombre del saludo y objetivos).
    ajustes: {
      nombre: 'Nil', presupuestoMensual: 100, objetivoProteina: 150, objetivoKcal: 3000,
      metaAhorro: { nombre: 'el piso', objetivo: 25000 },
      // Trabajo: neto = bruto × factorNeto (retención actual: 398,02 / 435).
      factorNeto: 398.02 / 435,
    },
    // Datos de la pantalla Hoy que aún no tienen pantalla propia (comidas, hábitos,
    // tareas, agenda). Estructura de tablas: ver js/hoy-datos.js.
    hoy: { sembrado: false, comidas: [], habitos: [], habitos_registro: [], tareas: [], agenda: [] },
    // Días de agencia (tabla jornadas_trabajo: ver js/trabajo.js).
    trabajo: { jornadas: [] },
    // Asignaturas y evaluaciones (tablas: ver js/estudio-datos.js).
    estudio: { sembrado: false, curso: '', asignaturas: [], evaluaciones: [] },
    // Comidas: menú base y registro diario por fecha (ver js/comidas-datos.js).
    comidas: { menu: null, registro: {} },
    // Armario y outfits (tablas: ver js/outfits-datos.js).
    armario: { sembrado: false, prendas: [], outfits: [], outfit_prendas: [], outfit_historial: [] },
  });

  function cargar() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? fusionar(JSON.parse(raw)) : porDefecto();
    } catch {
      return porDefecto();
    }
  }

  // Garantiza que existen todas las secciones aunque el JSON sea antiguo.
  function fusionar(datos) {
    const base = porDefecto();
    for (const k of Object.keys(base)) base[k] = { ...base[k], ...(datos[k] || {}) };
    migrarFinanzas(base.finanzas, datos.finanzas || {});
    return base;
  }

  // Datos de versiones anteriores: antes los saldos se escribían a mano y los
  // movimientos no los tocaban. Se conserva el saldo que se veía (los
  // movimientos antiguos no se vuelven a sumar) y se marca la categoría principal.
  function migrarFinanzas(f, original) {
    if ((original.version || 1) >= VERSION_FINANZAS) return;
    for (const c of f.cuentas) {
      if (c.base === undefined) c.base = c.saldo || 0;
      delete c.saldo;
    }
    if (!f.cuentas.some(c => c.principal)) {
      let p = f.cuentas.find(c => c.nombre.trim().toLowerCase() === 'dinero');
      if (!p) {
        p = { id: 'principal', nombre: 'Dinero', base: 0, color: 0 };
        f.cuentas.unshift(p);
      }
      p.principal = true;
    }
    const p = f.cuentas.find(c => c.principal);
    for (const m of f.movimientos) p.base -= m.tipo === 'ingreso' ? m.importe : -m.importe;
    p.base = Math.round(p.base * 100) / 100;
    f.version = VERSION_FINANZAS;
  }

  // ¿Deja el navegador guardar de verdad? (Puede impedirlo el modo secreto o
  // tener bloqueados los datos de sitios.) Se prueba escribiendo y leyendo.
  function funciona() {
    try {
      const k = KEY + ':prueba';
      localStorage.setItem(k, '1');
      const ok = localStorage.getItem(k) === '1';
      localStorage.removeItem(k);
      return ok;
    } catch {
      return false;
    }
  }

  let estado = cargar();
  let ok = funciona();

  // Si no se puede guardar, se avisa (evento) en vez de fallar en silencio.
  function escribir() {
    try {
      localStorage.setItem(KEY, JSON.stringify(estado));
      localStorage.setItem(KEY + ':guardado', String(Date.now()));
      ok = true;
    } catch {
      ok = false;
    }
    window.dispatchEvent(new CustomEvent('mi-panel:guardado', { detail: { ok } }));
  }

  return {
    get: () => estado,
    guardar: escribir,
    reemplazar(datos) {
      estado = fusionar(datos);
      escribir();
    },
    // Estado del guardado, para mostrarlo al usuario.
    info() {
      let ultimo = null;
      try { ultimo = Number(localStorage.getItem(KEY + ':guardado')) || null; } catch { /* sin acceso */ }
      return { ok, ultimo };
    },
    id: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
  };
})();
