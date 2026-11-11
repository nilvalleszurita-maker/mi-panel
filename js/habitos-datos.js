// Datos y cálculos de Hábitos (solo se muestran en la pantalla Hoy).
//
// Store.get().habitos:
//   registro  { 'AAAA-MM-DD': { paginas, movil (horas), buena (texto), practica ('minimo'|'completo') } }
//   habilidad { indice (posición en data/habilidades.json), inicio (lunes AAAA-MM-DD de su semana),
//               resultados { id: { aprendida: true|false, fecha } } }
// Las rachas no se guardan: se calculan siempre a partir del registro.
const HabitosDatos = (() => {
  const h = () => Store.get().habitos;
  const sumarDias = (f, n) => { const d = U.deIso(f); d.setDate(d.getDate() + n); return U.iso(d); };
  const diasEntre = (a, b) => Math.round((U.deIso(b) - U.deIso(a)) / 864e5);

  // ---------- Registro diario ----------
  const dia = f => h().registro[f] || {};
  function poner(f, campo, valor) {
    const r = h().registro;
    if (valor === null || valor === undefined || valor === '') {
      if (r[f]) { delete r[f][campo]; if (!Object.keys(r[f]).length) delete r[f]; }
    } else {
      (r[f] ||= {})[campo] = valor;
    }
    Store.guardar();
  }
  const ponerPaginas = (f, n) => poner(f, 'paginas', n);
  const ponerMovil = (f, horas) => poner(f, 'movil', horas);
  const ponerBuena = (f, texto) => poner(f, 'buena', (texto || '').trim() || null);
  const ponerPractica = (f, nivel) => poner(f, 'practica', nivel);

  // Nivel de un hábito en una fecha: 0 sin hacer, 1 mínimo, 2 completo.
  function nivel(id, f) {
    const r = dia(f);
    switch (id) {
      case 'leer': return r.paginas == null ? 0 : r.paginas >= 10 ? 2 : r.paginas >= 1 ? 1 : 0;
      case 'movil': return r.movil == null ? 0 : r.movil < 3 ? 2 : r.movil < 4 ? 1 : 0;
      case 'buena': return r.buena && r.buena.trim() ? 2 : 0;
      case 'habilidad': return r.practica === 'completo' ? 2 : r.practica === 'minimo' ? 1 : 0;
    }
    return 0;
  }

  // Racha actual: días seguidos con al menos el mínimo. Si hoy aún no está hecho,
  // cuenta hasta ayer (no se rompe hasta que pasa un día entero sin cumplir).
  function rachas(id, hoy = U.iso()) {
    let f = nivel(id, hoy) >= 1 ? hoy : sumarDias(hoy, -1);
    let actual = 0;
    while (nivel(id, f) >= 1) { actual++; f = sumarDias(f, -1); }
    const fechas = Object.keys(h().registro).filter(x => x <= hoy && nivel(id, x) >= 1).sort();
    let mejor = 0, seguidos = 0, previa = null;
    for (const x of fechas) {
      seguidos = previa && diasEntre(previa, x) === 1 ? seguidos + 1 : 1;
      mejor = Math.max(mejor, seguidos);
      previa = x;
    }
    return { actual, mejor: Math.max(mejor, actual) };
  }

  // Todas las cosas buenas, de la más reciente a la más antigua.
  const cosasBuenas = () => Object.entries(h().registro)
    .filter(([, r]) => r.buena && r.buena.trim())
    .map(([fecha, r]) => ({ fecha, texto: r.buena }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  // ---------- Habilidad de la semana ----------
  let lista = null, cargando = null;
  function asegurar() {
    if (lista) return Promise.resolve(true);
    if (cargando) return cargando;
    cargando = fetch('data/habilidades.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(json => { lista = json; return true; })
      .catch(() => false)
      .finally(() => { cargando = null; });
    return cargando;
  }
  const habilidades = () => lista;

  // Estado de la habilidad actual. La primera empieza la semana en que se instala esto.
  function habilidad(hoy = U.iso()) {
    if (!lista) return null;
    const s = h().habilidad;
    if (!s.inicio) { s.inicio = U.iso(U.lunes(U.deIso(hoy))); Store.guardar(); }
    const aprendidas = lista.filter(x => s.resultados[x.id]?.aprendida).length;
    if (s.indice >= lista.length) return { terminado: true, total: lista.length, aprendidas, resultados: s.resultados };
    const fin = sumarDias(s.inicio, 6);
    const dias = Array.from({ length: 7 }, (_, i) => { const f = sumarDias(s.inicio, i); return { fecha: f, nivel: nivel('habilidad', f) }; });
    return {
      actual: lista[s.indice], numero: s.indice + 1, total: lista.length, inicio: s.inicio, fin,
      empezada: hoy >= s.inicio, preguntar: hoy >= fin, dias, practicados: dias.filter(d => d.nivel >= 1).length, aprendidas,
    };
  }
  // Guarda Sí/No y pasa a la siguiente. Si se contesta el domingo, la siguiente empieza
  // el lunes; si se contesta más tarde, empieza en la semana en curso. Nunca se salta ninguna.
  function responder(aprendida, hoy = U.iso()) {
    const s = h().habilidad;
    const actual = lista?.[s.indice];
    if (!actual) return;
    const fin = sumarDias(s.inicio, 6);
    s.resultados[actual.id] = { aprendida, fecha: hoy };
    s.indice++;
    s.inicio = hoy <= fin ? sumarDias(s.inicio, 7) : U.iso(U.lunes(U.deIso(hoy)));
    Store.guardar();
  }

  return {
    dia, nivel, rachas, ponerPaginas, ponerMovil, ponerBuena, ponerPractica, cosasBuenas,
    asegurar, habilidades, habilidad, responder,
  };
})();
