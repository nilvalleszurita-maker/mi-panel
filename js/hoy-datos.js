// Datos de la pantalla Hoy que todavía no tienen pantalla propia: comidas,
// hábitos, tareas/exámenes y agenda.
//
// Se guardan en Store.get().hoy como listas de filas, igual que tablas, para
// pasarlas a Supabase casi tal cual. Fechas en 'AAAA-MM-DD', horas en 'HH:MM'.
//
//   comidas           id, fecha, momento ('desayuno'|'comida'|'merienda'|'cena'),
//                     plato, kcal, proteina_g, hecha (bool), ejemplo (bool)
//   habitos           id, nombre, orden, activo (bool)
//   habitos_registro  id, fecha, habito_id           (una fila = hábito hecho ese día)
//   tareas            id, tipo ('tarea'|'examen'), titulo, materia,
//                     fecha_limite, hecha (bool), ejemplo (bool)
//   agenda            id, dias_semana ([0..6], 0 = lunes) o fecha, hora,
//                     titulo, detalle, categoria ('clase'|'estudio'|'gym'|'comida'|'otro'),
//                     ejemplo (bool)
//
// SQL equivalente (orientativo) en el README.
const HoyDatos = (() => {
  const MOMENTOS = ['desayuno', 'comida', 'merienda', 'cena'];
  const NOMBRE_MOMENTO = { desayuno: 'Desayuno', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };

  const t = () => Store.get().hoy;
  const masDias = (n, d = new Date()) => { const r = new Date(d); r.setDate(r.getDate() + n); return U.iso(r); };
  // Próximo día de la semana (0 = lunes) a partir de hoy, incluido.
  const proximo = dia => masDias((dia - U.diaSemana() + 7) % 7);

  // Crea los datos de ejemplo la primera vez (y nunca más).
  function asegurar() {
    const h = t();
    if (h.sembrado) return;
    const hoy = U.iso();
    const fila = o => ({ id: Store.id(), ...o });

    h.comidas.push(
      fila({ fecha: hoy, momento: 'desayuno', plato: 'Avena con plátano', kcal: 520, proteina_g: 25, hecha: true, ejemplo: true }),
      fila({ fecha: hoy, momento: 'comida', plato: 'Pasta con atún', kcal: 850, proteina_g: 45, hecha: true, ejemplo: true }),
      fila({ fecha: hoy, momento: 'merienda', plato: 'Yogur + frutos secos', kcal: 480, proteina_g: 26, hecha: true, ejemplo: true }),
      fila({ fecha: hoy, momento: 'cena', plato: 'Pollo con arroz', kcal: 700, proteina_g: 50, hecha: false, ejemplo: true }),
    );
    if (!h.habitos.length) {
      ['Creatina', '2 L de agua', '2 h de estudio', 'Dormir 8 h']
        .forEach((nombre, orden) => h.habitos.push(fila({ nombre, orden, activo: true })));
    }
    h.tareas.push(
      fila({ tipo: 'tarea', titulo: 'Práctica de Informàtica', materia: 'Informàtica', fecha_limite: proximo(4), hecha: false, ejemplo: true }),
      fila({ tipo: 'tarea', titulo: 'Repasar problemas de Fluids', materia: 'Mecànica de Fluids', fecha_limite: proximo(6), hecha: false, ejemplo: true }),
      fila({ tipo: 'tarea', titulo: 'Comprar pollo y arroz', materia: 'Compra', fecha_limite: hoy, hecha: false, ejemplo: true }),
      fila({ tipo: 'examen', titulo: 'Reconducción Mecànica de Fluids', materia: 'Mecànica de Fluids', fecha_limite: masDias(12), hecha: false, ejemplo: true }),
    );
    // Agenda semanal de ejemplo (se repite cada semana).
    h.agenda.push(
      fila({ dias_semana: [0, 2], hora: '09:00', titulo: 'Sistemes Mecànics', detalle: 'Clase · UPC', categoria: 'clase', ejemplo: true }),
      fila({ dias_semana: [0, 1, 3], hora: '11:00', titulo: 'Mètodes Matemàtics', detalle: 'Clase · UPC', categoria: 'clase', ejemplo: true }),
      fila({ dias_semana: [0, 1, 2, 3], hora: '16:00', titulo: 'Estudiar Fluids', detalle: 'Bloque de estudio · 2 h', categoria: 'estudio', ejemplo: true }),
      fila({ dias_semana: [0, 1, 3, 4, 5], hora: '19:00', titulo: 'Gym', detalle: 'Según el plan del día', categoria: 'gym', ejemplo: true }),
      fila({ dias_semana: [0, 1, 2, 3, 4, 5, 6], hora: '21:30', titulo: 'Cena', detalle: '', categoria: 'comida', ejemplo: true }),
    );
    h.sembrado = true;
    Store.guardar();
  }

  // ---------- Consultas ----------
  const comidasDe = fecha => MOMENTOS.map(m => t().comidas.find(c => c.fecha === fecha && c.momento === m) || { momento: m, fecha });
  function totalesComidas(fecha) {
    const hechas = t().comidas.filter(c => c.fecha === fecha && c.hecha);
    return { kcal: hechas.reduce((s, c) => s + (c.kcal || 0), 0), proteina_g: hechas.reduce((s, c) => s + (c.proteina_g || 0), 0) };
  }
  const habitos = () => t().habitos.filter(x => x.activo).sort((a, b) => a.orden - b.orden);
  const habitoHecho = (fecha, id) => t().habitos_registro.some(r => r.fecha === fecha && r.habito_id === id);
  function alternarHabito(fecha, id) {
    const h = t();
    const i = h.habitos_registro.findIndex(r => r.fecha === fecha && r.habito_id === id);
    if (i >= 0) h.habitos_registro.splice(i, 1);
    else h.habitos_registro.push({ id: Store.id(), fecha, habito_id: id });
    Store.guardar();
  }
  const tareasPendientes = () => t().tareas.filter(x => x.tipo === 'tarea' && !x.hecha)
    .sort((a, b) => (a.fecha_limite || '9999').localeCompare(b.fecha_limite || '9999'));
  const proximoExamen = () => t().tareas.filter(x => x.tipo === 'examen' && !x.hecha && x.fecha_limite >= U.iso())
    .sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite))[0] || null;
  function alternarTarea(id) {
    const x = t().tareas.find(r => r.id === id);
    if (x) { x.hecha = !x.hecha; Store.guardar(); }
  }
  const agendaDe = fecha => t().agenda
    .filter(e => e.fecha ? e.fecha === fecha : (e.dias_semana || []).includes(U.diaSemana(U.deIso(fecha))))
    .sort((a, b) => a.hora.localeCompare(b.hora));

  return {
    MOMENTOS, NOMBRE_MOMENTO, asegurar,
    comidasDe, totalesComidas, habitos, habitoHecho, alternarHabito,
    tareasPendientes, proximoExamen, alternarTarea, agendaDe,
  };
})();
