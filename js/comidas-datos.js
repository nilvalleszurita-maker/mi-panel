// Datos y cálculos de Comidas.
//
// Store.get().comidas guarda dos cosas por separado:
//   menu      → el menú base (se crea con data/menu-comidas.json la primera vez):
//               alimentos { id: { nombre, base ('100g'|'100ml'|'unidad'), kcal, proteina } }
//               platos    { id: { nombre, tipo, ingredientes: [{ alimento, cantidad, unidad }] } }
//               semana    { lunes…domingo: { desayuno…cena: [ids de plato] } }
//               objetivos, ordenComidas, etiquetasComidas, recordatorioCreatina
//   registro  → lo de cada día, por fecha AAAA-MM-DD:
//               { comidas: { franja: true }, cambios: { franja: [platos completos] },
//                 creatina, corro, corroAplicado, corroPrevio }
// Un cambio «solo hoy» guarda en cambios[franja] la lista entera de platos de esa
// franja para esa fecha; el menú base no se toca. Las kcal y la proteína se calculan
// siempre con los ingredientes y el catálogo (kcalAprox/proteinaAprox no se usan).
const ComidasDatos = (() => {
  const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const ORDEN = ['desayuno', 'mediaManana', 'comida', 'merienda', 'cena'];
  const CARBOS = ['arroz', 'pasta', 'fideos'];
  const c = () => Store.get().comidas;
  const m = () => c().menu;
  const clon = o => JSON.parse(JSON.stringify(o));
  let cargando = null, sincronizado = false;

  // ---------- Carga del menú inicial ----------
  // La primera vez copia el JSON entero. Después solo añade alimentos y platos nuevos
  // que aparezcan en el JSON, sin tocar lo que hayas cambiado en la app.
  function sembrar(json) {
    const t = c();
    if (!t.menu) { t.menu = clon(json); Store.guardar(); return; }
    let cambio = false;
    for (const k of ['alimentos', 'platos']) {
      for (const [id, v] of Object.entries(json[k] || {})) {
        if (!t.menu[k][id]) { t.menu[k][id] = clon(v); cambio = true; }
      }
    }
    if (cambio) Store.guardar();
  }
  function asegurar() {
    if (sincronizado) return Promise.resolve(true);
    if (cargando) return cargando;
    cargando = fetch('data/menu-comidas.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(json => { sembrar(json); sincronizado = true; return true; })
      .catch(() => !!m())
      .finally(() => { cargando = null; });
    return cargando;
  }
  const listo = () => !!m();
  const estaSincronizado = () => sincronizado;

  // ---------- Consultas del menú ----------
  const objetivos = () => m()?.objetivos || { kcalDia: 3100, proteinaDia: 140 };
  const orden = () => m()?.ordenComidas || ORDEN;
  const etiqueta = f => m()?.etiquetasComidas?.[f] || f;
  const alimento = id => m().alimentos[id] || null;
  const alimentos = () => Object.entries(m().alimentos).map(([id, a]) => ({ id, ...a }))
    .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));
  const platos = () => Object.entries(m().platos).map(([id, p]) => ({ id, ...p }))
    .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));
  const plato = id => (m().platos[id] ? { id, ...clon(m().platos[id]) } : null);
  const unidadDe = id => ({ unidad: 'ud', '100ml': 'ml', '100g': 'g' }[alimento(id)?.base] || 'g');
  const diaClave = fecha => DIAS[U.diaSemana(U.deIso(fecha))];

  // ---------- Cálculos ----------
  function nutri(ing) {
    const a = alimento(ing.alimento);
    if (!a) return { kcal: 0, proteina: 0 };
    const f = a.base === 'unidad' ? ing.cantidad : ing.cantidad / 100;
    return { kcal: a.kcal * f, proteina: a.proteina * f };
  }
  const sumar = lista => lista.reduce((s, x) => ({ kcal: s.kcal + x.kcal, proteina: s.proteina + x.proteina }), { kcal: 0, proteina: 0 });
  const totalPlato = p => sumar((p?.ingredientes || []).map(nutri));

  // ---------- Registro diario ----------
  function reg(fecha, crear = false) {
    const r = c().registro;
    if (!r[fecha] && crear) r[fecha] = { comidas: {}, cambios: {}, creatina: false, corro: false };
    return r[fecha] || null;
  }
  // Platos de una franja en una fecha: el cambio del día si existe; si no, el menú base.
  function platosBase(fecha, franja) {
    return (m().semana[diaClave(fecha)]?.[franja] || []).map(plato).filter(Boolean);
  }
  function platosDe(fecha, franja) {
    const cambio = reg(fecha)?.cambios?.[franja];
    return cambio ? clon(cambio) : platosBase(fecha, franja);
  }
  const esCambio = (fecha, franja) => !!reg(fecha)?.cambios?.[franja];
  const totalFranja = (fecha, franja) => sumar(platosDe(fecha, franja).map(totalPlato));
  const totalDia = fecha => sumar(orden().map(f => totalFranja(fecha, f)));
  // Solo lo marcado como comido.
  const totalComido = fecha => listo()
    ? sumar(orden().filter(f => comido(fecha, f)).map(f => totalFranja(fecha, f)))
    : { kcal: 0, proteina: 0 };
  const comido = (fecha, franja) => !!reg(fecha)?.comidas?.[franja];
  const contarComidas = fecha => orden().filter(f => comido(fecha, f)).length;
  function alternarComido(fecha, franja) {
    const r = reg(fecha, true);
    if (r.comidas[franja]) delete r.comidas[franja]; else r.comidas[franja] = true;
    Store.guardar();
  }

  // ---------- Creatina ----------
  const creatina = () => m()?.recordatorioCreatina || { activo: false };
  const creatinaActiva = fecha => !!creatina().activo && (!creatina().fin || fecha <= creatina().fin);
  const creatinaTomada = fecha => !!reg(fecha)?.creatina;
  function alternarCreatina(fecha) { const r = reg(fecha, true); r.creatina = !r.creatina; Store.guardar(); }

  // ---------- Hoy corro: arroz o pasta de la comida a 160 g ----------
  const esCarbo = id => CARBOS.includes(id) || /^(arroz|pasta|fideos|macarr|espagu)/i.test(alimento(id)?.nombre || '');
  // Ingredientes de la comida que cambiarían: [{ nombre, cantidad }].
  const carbosComida = fecha => platosDe(fecha, 'comida').flatMap(p => p.ingredientes)
    .filter(i => esCarbo(i.alimento)).map(i => ({ nombre: alimento(i.alimento)?.nombre || i.alimento, cantidad: i.cantidad }));
  const corro = fecha => !!reg(fecha)?.corro;
  const corroAplicado = fecha => !!reg(fecha)?.corroAplicado;
  function ponerCorro(fecha, si) {
    const r = reg(fecha, true);
    if (!si && r.corroAplicado) deshacerCorro(fecha);
    r.corro = si;
    Store.guardar();
  }
  function aplicarCorro(fecha) {
    const r = reg(fecha, true);
    r.corroPrevio = r.cambios.comida ? clon(r.cambios.comida) : null;
    const lista = platosDe(fecha, 'comida');
    for (const p of lista) for (const i of p.ingredientes) if (esCarbo(i.alimento)) i.cantidad = 160;
    r.cambios.comida = lista;
    r.corroAplicado = true;
    Store.guardar();
  }
  function deshacerCorro(fecha) {
    const r = reg(fecha, true);
    if (r.corroPrevio) r.cambios.comida = r.corroPrevio; else delete r.cambios.comida;
    delete r.corroPrevio;
    r.corroAplicado = false;
    Store.guardar();
  }

  // ---------- Editar ----------
  function nuevoId(nombre, tabla) {
    const base = (nombre || 'nuevo').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'nuevo';
    let id = base, n = 2;
    while (tabla[id]) id = `${base}-${n++}`;
    return id;
  }
  function nuevoAlimento({ nombre, base, kcal, proteina }) {
    const id = nuevoId(nombre, m().alimentos);
    m().alimentos[id] = { nombre, base, kcal, proteina };
    Store.guardar();
    return id;
  }
  // Guarda el plato editado en la posición idx de una franja.
  // modo 'dia': cambio puntual de esa fecha. modo 'semana': cambia el menú base.
  function guardarPlato({ fecha, franja, idx, plato: p, modo }) {
    const menu = m();
    let id = p.id;
    if (!id || !menu.platos[id]) {
      id = nuevoId(p.nombre, menu.platos);
      menu.platos[id] = { nombre: p.nombre, tipo: franja, ingredientes: clon(p.ingredientes) };
    }
    const foto = { id, nombre: p.nombre, tipo: menu.platos[id].tipo, ingredientes: clon(p.ingredientes) };
    const r = reg(fecha, true);
    if (modo === 'dia') {
      const lista = platosDe(fecha, franja);
      lista[idx] = foto;
      r.cambios[franja] = lista;
    } else {
      menu.platos[id] = { ...menu.platos[id], nombre: p.nombre, ingredientes: clon(p.ingredientes) };
      const dia = menu.semana[diaClave(fecha)] ||= {};
      (dia[franja] ||= [])[idx] = id;
      // Si ese día ya tenía un cambio en la franja, se actualiza; y si ya coincide
      // con el menú base, se quita.
      if (r.cambios[franja]) {
        r.cambios[franja][idx] = foto;
        if (JSON.stringify(r.cambios[franja]) === JSON.stringify(platosBase(fecha, franja))) delete r.cambios[franja];
      }
    }
    Store.guardar();
    return id;
  }

  return {
    asegurar, listo, estaSincronizado, objetivos, orden, etiqueta, alimento, alimentos, platos, plato, unidadDe,
    nutri, totalPlato, platosDe, esCambio, totalFranja, totalDia, totalComido, comido, contarComidas, alternarComido,
    creatina, creatinaActiva, creatinaTomada, alternarCreatina,
    carbosComida, corro, corroAplicado, ponerCorro, aplicarCorro, deshacerCorro,
    nuevoAlimento, guardarPlato,
  };
})();
