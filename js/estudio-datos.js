// Datos y cálculos de Estudio: asignaturas, evaluaciones, nota necesaria y exámenes.
//
// Se guardan en Store.get().estudio como tablas, para pasarlas a Supabase casi tal cual:
//   asignaturas   id, nombre, corto, objetivo, objetivo_motivo, reglas [texto], orden
//   evaluaciones  id, asignatura_id, nombre, peso (%), nota (0-10 o null = pendiente),
//                 fecha ('AAAA-MM-DD' o null), fecha_aprox, fecha_texto, nota_extra,
//                 nombre_examen, orden,
//                 tipo: 'normal' | 'media' (su nota es la media de sus partes) |
//                       'parte' (de una «media», padre_id) |
//                       'reconduccion' (sobre nota_maxima; sustituye a sustituye_id si es mayor)
// La primera vez se carga data/asignaturas.json; después se sincroniza con él sin
// pisar tus notas ni lo que edites en la app.
const EstudioDatos = (() => {
  const e = () => Store.get().estudio;
  let cargando = null, sincronizado = false;

  const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
  const corto = n => {
    const par = n.match(/\(([^)]+)\)/);
    if (par) return par[1];
    const palabras = n.split(/\s+/);
    return palabras.length >= 3 ? palabras.at(-1) : n;
  };

  // ---------- Del JSON a tablas ----------
  function filasDe(json) {
    const examenes = json.examenes || [];
    const asignaturas = [], evaluaciones = [];
    json.asignaturas.forEach((a, orden) => {
      const nombre = id => a.evaluaciones.find(x => x.id === id)?.nombre || id;
      const reglas = [];
      if (a.reconduccion) reglas.push(`Reconducción (${a.reconduccion.requisito}): ${a.reconduccion.regla}`);
      if (a.reevaluacion) {
        reglas.push(`Re-evaluación: sustituye ${a.reevaluacion.sustituye.map(nombre).join(', ')}`
          + (a.reevaluacion.mantiene?.length ? ` y mantiene ${a.reevaluacion.mantiene.map(nombre).join(', ')}` : '')
          + `. ${a.reevaluacion.regla} Si se usa, la nota final máxima es 5.`);
      }
      asignaturas.push({ id: a.id, nombre: a.nombre, corto: corto(a.nombre), objetivo: a.objetivo,
        objetivo_motivo: a.objetivo_motivo || '', reglas, orden });

      let o = 0;
      const fila = x => evaluaciones.push({
        asignatura_id: a.id, nota: null, fecha: null, fecha_aprox: false, fecha_texto: '', nota_extra: '',
        nombre_examen: '', tipo: 'normal', padre_id: null, sustituye_id: null, nota_maxima: 10, ...x, orden: o++,
      });
      for (const ev of a.evaluaciones) {
        const base = {
          id: ev.id, nombre: ev.nombre, peso: ev.peso, nota: num(ev.nota), fecha: ev.fecha || null,
          fecha_aprox: !!ev.fecha_aprox, fecha_texto: ev.fecha_texto || '', nota_extra: ev.nota_extra || ev.regla || '',
        };
        if (ev.subnotas?.length) {
          fila({ ...base, tipo: 'media', nota: null });
          ev.subnotas.forEach((s, i) => fila({
            id: `${ev.id}-${i + 1}`, nombre: s.nombre, peso: ev.peso / ev.subnotas.length, nota: num(s.nota),
            fecha: s.fecha || null, fecha_aprox: !!s.fecha_aprox, fecha_texto: s.fecha_texto || '',
            tipo: 'parte', padre_id: ev.id,
          }));
        } else fila(base);
        if (a.reconduccion?.sustituye === ev.id) {
          fila({
            id: a.reconduccion.id, nombre: `Reconducción ${ev.nombre}`, peso: 0, fecha: a.reconduccion.fecha || null,
            tipo: 'reconduccion', sustituye_id: ev.id, nota_maxima: a.reconduccion.nota_maxima || 5,
            nota_extra: `Sobre ${a.reconduccion.nota_maxima || 5}; sustituye al ${ev.nombre} si es mayor (${a.reconduccion.requisito})`,
          });
        }
      }
    });
    // Nombre de examen de tu lista (p. ej. «2n parcial + test de prácticas»).
    for (const x of examenes) {
      const ev = evaluaciones.find(v => v.asignatura_id === x.asignatura && v.fecha === x.fecha);
      if (ev) ev.nombre_examen = x.nombre;
    }
    return { asignaturas, evaluaciones };
  }

  // ---------- Sincronización con el JSON ----------
  // Huella sin la nota: así un cambio de fecha o de peso en el JSON se aplica aunque
  // hayas puesto la nota; la nota va aparte y solo se toma del JSON si no la tocaste.
  const huella = ({ nota, ...resto }) => JSON.stringify(Object.keys(resto).sort().map(k => [k, resto[k]]));

  function sincronizar(json) {
    const t = e();
    const { asignaturas, evaluaciones } = filasDe(json);
    t.curso = json.curso || t.curso || '';
    t.origen = t.origen || { asignaturas: {}, evaluaciones: {}, notas: {} };
    const mezclar = (tabla, nuevas, clave, conNota) => {
      for (const n of nuevas) {
        const i = t[tabla].findIndex(x => x.id === n.id);
        const hn = huella(n);
        if (i < 0) {
          if (t.origen[clave][n.id] === undefined) {
            t[tabla].push(n); t.origen[clave][n.id] = hn;
            if (conNota) t.origen.notas[n.id] = n.nota;
          }
          continue; // ya importada y no está: la borraste
        }
        const local = t[tabla][i];
        if (hn !== t.origen[clave][n.id] && huella(local) === t.origen[clave][n.id]) {
          t[tabla][i] = { ...n, nota: local.nota }; t.origen[clave][n.id] = hn;
        }
        if (conNota && n.nota !== t.origen.notas[n.id] && t[tabla][i].nota === t.origen.notas[n.id]) {
          t[tabla][i].nota = n.nota; t.origen.notas[n.id] = n.nota;
        }
      }
    };
    mezclar('asignaturas', asignaturas, 'asignaturas', false);
    mezclar('evaluaciones', evaluaciones, 'evaluaciones', true);
    t.sembrado = true;
    Store.guardar();
  }

  function asegurar() {
    if (sincronizado) return Promise.resolve(true);
    if (cargando) return cargando;
    cargando = fetch('data/asignaturas.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(json => { sincronizar(json); sincronizado = true; return true; })
      .catch(() => e().sembrado)
      .finally(() => { cargando = null; });
    return cargando;
  }

  // ---------- Consultas ----------
  const asignaturas = () => [...e().asignaturas].sort((x, y) => x.orden - y.orden);
  const asignatura = id => e().asignaturas.find(x => x.id === id) || null;
  const evaluacionesDe = id => e().evaluaciones.filter(x => x.asignatura_id === id).sort((x, y) => x.orden - y.orden);
  const evaluacion = id => e().evaluaciones.find(x => x.id === id) || null;

  // Nota media de una evaluación «media» (con sus partes), o null si falta alguna.
  function mediaDe(padre) {
    const partes = e().evaluaciones.filter(x => x.padre_id === padre.id);
    const notas = partes.map(p => p.nota).filter(n => n !== null);
    return { media: notas.length === partes.length && partes.length ? notas.reduce((s, n) => s + n, 0) / partes.length : null,
      parcial: notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null };
  }

  // Cálculo de la nota (fórmulas del diseño):
  //   asegurado = Σ nota·peso/100;  pendiente = Σ pesos sin nota
  //   necesaria = (objetivo − asegurado) / (pendiente/100)
  // Reconducción: la nota efectiva de la evaluación sustituida es max(nota, reconducción).
  // «Media»: cuentan sus partes (cada una con su peso); la media solo se muestra.
  function calculo(asigId) {
    const a = asignatura(asigId);
    const evs = evaluacionesDe(asigId);
    const efectiva = ev => {
      const rec = evs.find(x => x.tipo === 'reconduccion' && x.sustituye_id === ev.id && x.nota !== null);
      if (!rec) return ev.nota;
      return ev.nota === null ? rec.nota : Math.max(ev.nota, rec.nota);
    };
    let asegurado = 0, pendiente = 0, total = 0;
    for (const ev of evs) {
      if (ev.tipo === 'reconduccion' || ev.tipo === 'media') continue;
      total += ev.peso;
      const v = efectiva(ev);
      if (v !== null) asegurado += v * ev.peso / 100; else pendiente += ev.peso;
    }
    const redondear = n => Math.round(n * 1000) / 1000;
    return {
      asegurado: redondear(asegurado), pendiente: redondear(pendiente), totalPesos: redondear(total),
      necesaria: pendiente > 0 ? redondear((a.objetivo - asegurado) / (pendiente / 100)) : null,
      efectiva,
    };
  }

  // Estado de la nota necesaria para mostrar (texto, etiqueta y tono).
  function veredicto(asigId) {
    const a = asignatura(asigId), c = calculo(asigId);
    if (c.necesaria === null) {
      const ok = c.asegurado >= a.objetivo;
      return { c, valor: c.asegurado, etiqueta: ok ? 'nota final · ¡objetivo cumplido!' : 'nota final · no llega al objetivo', tono: ok ? 'ok' : 'mal', corto: ok ? 'Aprobada' : 'No llega' };
    }
    if (c.necesaria <= 0) return { c, valor: null, etiqueta: 'Ya tienes el objetivo asegurado', tono: 'ok', corto: 'Asegurado' };
    if (c.necesaria > 10) return { c, valor: c.necesaria, etiqueta: 'necesitas de media · imposible', tono: 'mal', corto: 'Imposible' };
    return { c, valor: c.necesaria, etiqueta: 'necesitas de media en lo que falta', tono: c.necesaria > 7 ? 'aviso' : 'normal', corto: null };
  }

  // Próximos exámenes: evaluaciones con fecha de hoy en adelante, agrupadas por
  // asignatura y día (p. ej. 2n parcial + test el mismo día). Ordenados por fecha.
  function examenes(desde = U.iso()) {
    const grupos = new Map();
    for (const ev of e().evaluaciones) {
      if (!ev.fecha || ev.fecha < desde || ev.tipo === 'media') continue;
      const k = `${ev.asignatura_id}|${ev.fecha}`;
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(ev);
    }
    const hoy = U.deIso(desde);
    return [...grupos.values()].map(evs => {
      evs.sort((x, y) => x.orden - y.orden);
      const a = asignatura(evs[0].asignatura_id);
      return {
        ids: evs.map(x => x.id), fecha: evs[0].fecha, aprox: evs.some(x => x.fecha_aprox),
        fecha_texto: evs.find(x => x.fecha_aprox && x.fecha_texto)?.fecha_texto || '',
        nombre: evs.find(x => x.nombre_examen)?.nombre_examen || evs.map(x => x.nombre).join(' + '),
        asignatura: a?.corto || '', asignatura_id: a?.id,
        dias: Math.round((U.deIso(evs[0].fecha) - hoy) / 864e5),
      };
    }).sort((x, y) => x.fecha.localeCompare(y.fecha));
  }

  // ---------- Cambios ----------
  function ponerNota(id, valor) {
    const ev = evaluacion(id);
    if (!ev) return;
    ev.nota = valor === null ? null : Math.max(0, Math.min(ev.nota_maxima || 10, valor));
    Store.guardar();
  }
  function fijarFecha(ids, fecha) {
    for (const id of ids) { const ev = evaluacion(id); if (ev) { ev.fecha = fecha || null; ev.fecha_aprox = false; } }
    Store.guardar();
  }
  function guardarAsignatura(datos, id = null) {
    const t = e();
    if (id) Object.assign(asignatura(id), datos);
    else {
      id = `asig-${Store.id()}`;
      t.asignaturas.push({ id, reglas: [], objetivo_motivo: '', orden: t.asignaturas.length, ...datos });
    }
    Store.guardar();
    return id;
  }
  function borrarAsignatura(id) {
    const t = e();
    t.asignaturas = t.asignaturas.filter(x => x.id !== id);
    t.evaluaciones = t.evaluaciones.filter(x => x.asignatura_id !== id);
    Store.guardar();
  }
  function nuevaEvaluacion(asigId) {
    const t = e();
    const orden = Math.max(-1, ...evaluacionesDe(asigId).map(x => x.orden)) + 1;
    const ev = { id: `ev-${Store.id()}`, asignatura_id: asigId, nombre: 'Nueva evaluación', peso: 0, nota: null, fecha: null,
      fecha_aprox: false, fecha_texto: '', nota_extra: '', nombre_examen: '', tipo: 'normal', padre_id: null, sustituye_id: null, nota_maxima: 10, orden };
    t.evaluaciones.push(ev);
    Store.guardar();
    return ev.id;
  }
  function borrarEvaluacion(id) {
    const t = e();
    t.evaluaciones = t.evaluaciones.filter(x => x.id !== id && x.padre_id !== id && x.sustituye_id !== id);
    Store.guardar();
  }

  return {
    asegurar, estaSincronizado: () => sincronizado, curso: () => e().curso || '', asignaturas, asignatura, evaluacionesDe, evaluacion,
    mediaDe, calculo, veredicto, examenes, ponerNota, fijarFecha,
    guardarAsignatura, borrarAsignatura, nuevaEvaluacion, borrarEvaluacion,
  };
})();
