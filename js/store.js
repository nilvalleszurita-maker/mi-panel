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
    },
    entrenos: { plan: {}, hechos: {} },
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

  let estado = cargar();

  return {
    get: () => estado,
    guardar: () => localStorage.setItem(KEY, JSON.stringify(estado)),
    reemplazar(datos) {
      estado = fusionar(datos);
      localStorage.setItem(KEY, JSON.stringify(estado));
    },
    id: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
  };
})();
