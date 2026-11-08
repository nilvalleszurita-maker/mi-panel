// Almacenamiento: todo el estado de la app vive en un único objeto
// guardado en localStorage (solo en este dispositivo).
const Store = (() => {
  const KEY = 'mi-panel:v1';

  const porDefecto = () => ({
    finanzas: {
      movimientos: [],
      // Dónde está el dinero. "color" es un hueco fijo de la paleta (1–8),
      // así cada categoría conserva su color aunque se borren otras.
      cuentas: ['Robo advisor', 'Dinero', 'Efectivo', 'S&P 500', 'Cuenta remunerada']
        .map((nombre, i) => ({ id: 'c' + i, nombre, saldo: 0, color: i + 1 })),
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
    return base;
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
