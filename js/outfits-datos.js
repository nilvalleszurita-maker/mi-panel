// Datos de Outfits: armario de prendas y outfits.
//
// Se guardan en Store.get().armario como tablas (listas de filas con id), para
// pasarlas a Supabase casi tal cual:
//
//   prendas           id, nombre, tipo, subtipo, color_principal, colores_secundarios,
//                     estampado, cuello, corte, lavado, detalles, tejido, marca,
//                     abriga (0-5), formalidad (0-5), clima [], capa, ocasiones [], notas
//   outfits           id, nombre, clima [], ocasiones [], nota
//   outfit_prendas    id, outfit_id, prenda_id, capa, orden
//                     capa: 'abajo' | 'base' | 'medio' | 'abrigo' | 'calzado' | 'accesorio'
//   outfit_historial  id, fecha, outfit_id          (lo que me he puesto cada día)
//
// Una prenda existe UNA sola vez: los outfits solo guardan su id. Su foto es
// data/fotos/<id>.webp (generada desde outfits-para-code/fotos/<id>.png).
// La primera vez se carga data/armario.json; después mandan los cambios hechos en la app.
const OutfitsDatos = (() => {
  const CLIMAS = ['mucho_frio', 'frio', 'templado', 'calor'];
  const SITUACIONES = ['clase', 'gym', 'tomar_algo', 'fiesta'];
  const NOMBRES = {
    mucho_frio: 'Mucho frío', frio: 'Frío', templado: 'Templado', calor: 'Calor',
    clase: 'Clase', gym: 'Gym', tomar_algo: 'Tomar algo', fiesta: 'Fiesta', casa: 'Casa',
    parte_arriba: 'Parte de arriba', parte_abajo: 'Parte de abajo', abrigo: 'Abrigo',
    calzado: 'Calzado', accesorio: 'Accesorio',
    base: 'Base', medio: 'Capa media', abajo: 'Pantalón',
  };
  // Capas de un outfit en el orden de la cuadrícula y el tipo de prenda que admite cada una.
  const CAPAS = ['abajo', 'base', 'medio', 'abrigo', 'calzado', 'accesorio'];
  const TIPO_DE_CAPA = { abajo: 'parte_abajo', base: 'parte_arriba', medio: 'parte_arriba', abrigo: 'abrigo', calzado: 'calzado', accesorio: 'accesorio' };
  const CAPAS_ARRIBA = ['base', 'medio', 'abrigo'];

  const a = () => Store.get().armario;
  let cargando = null;
  let fondos = {};          // id → gris de fondo de su foto (data/fotos/fondos.json)
  const fondosListos = fetch('data/fotos/fondos.json').then(r => r.ok ? r.json() : {}).then(f => { fondos = f; }).catch(() => {});

  // Carga el armario de data/armario.json la primera vez. Devuelve una promesa.
  function asegurar() {
    if (a().sembrado) return fondosListos.then(() => true);
    if (cargando) return cargando;
    cargando = fetch('data/armario.json')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(importar)
      .then(ok => fondosListos.then(() => ok))
      .catch(() => false)
      .finally(() => { cargando = null; });
    return cargando;
  }

  // Convierte el formato de armario.json ({prendas, outfits con capas}) en tablas.
  function importar(json) {
    const t = a();
    t.prendas = json.prendas.map(({ imagen_canva, prompt_imagen_pendiente, foto, ...p }) => p);
    t.outfits = [];
    t.outfit_prendas = [];
    for (const o of json.outfits) {
      t.outfits.push({ id: o.id, nombre: o.nombre, clima: o.clima || [], ocasiones: o.ocasiones || [], nota: o.nota || '' });
      for (const [capa, valor] of Object.entries(o.capas || {})) {
        const lista = Array.isArray(valor) ? valor : [valor];
        lista.forEach((prenda_id, orden) => t.outfit_prendas.push({
          id: Store.id(), outfit_id: o.id, prenda_id, capa: capa === 'accesorios' ? 'accesorio' : capa, orden,
        }));
      }
    }
    t.sembrado = true;
    Store.guardar();
    return true;
  }

  // ---------- Consultas ----------
  const prendas = () => a().prendas;
  const prenda = id => a().prendas.find(p => p.id === id) || null;
  const outfits = () => a().outfits;
  const outfit = id => a().outfits.find(o => o.id === id) || null;
  const foto = id => `data/fotos/${encodeURIComponent(id)}.webp`;
  const fondo = id => fondos[id] || null;

  // Capas de un outfit: { abajo, base, medio, abrigo, calzado: id|null, accesorio: [ids] }
  function capasDe(outfitId) {
    const c = { abajo: null, base: null, medio: null, abrigo: null, calzado: null, accesorio: [] };
    a().outfit_prendas.filter(r => r.outfit_id === outfitId)
      .sort((x, y) => x.orden - y.orden)
      .forEach(r => { if (r.capa === 'accesorio') c.accesorio.push(r.prenda_id); else c[r.capa] = r.prenda_id; });
    return c;
  }
  const idsDe = c => [c.abajo, c.base, c.medio, c.abrigo, c.calzado, ...c.accesorio].filter(Boolean);
  const outfitsCon = prendaId => [...new Set(a().outfit_prendas.filter(r => r.prenda_id === prendaId).map(r => r.outfit_id))]
    .map(outfit).filter(Boolean);

  // «Abriga» = la prenda de arriba que más abriga; «formalidad» = media de todas.
  function valoracion(c) {
    const arriba = CAPAS_ARRIBA.map(k => prenda(c[k])).filter(Boolean);
    const todas = idsDe(c).map(prenda).filter(Boolean);
    return {
      abriga: arriba.length ? Math.max(...arriba.map(p => p.abriga || 0)) : 0,
      formalidad: todas.length ? Math.round(todas.reduce((s, p) => s + (p.formalidad || 0), 0) / todas.length) : 0,
    };
  }

  // Prendas que se pueden poner en una capa (mismo tipo de prenda).
  const candidatas = capa => a().prendas.filter(p => p.tipo === TIPO_DE_CAPA[capa]);

  // ---------- Guardar outfits ----------
  // borrador: { nombre, clima, ocasiones, nota, capas }. Si «idSustituir» se
  // reescribe ese outfit; si no, se crea uno nuevo. Devuelve el id.
  function guardarOutfit(b, idSustituir = null) {
    const t = a();
    const id = idSustituir || `outfit-${Store.id()}`;
    const fila = { id, nombre: b.nombre.trim() || 'Outfit sin nombre', clima: b.clima, ocasiones: b.ocasiones, nota: b.nota.trim() };
    const i = t.outfits.findIndex(o => o.id === id);
    if (i >= 0) t.outfits[i] = fila; else t.outfits.unshift(fila);
    t.outfit_prendas = t.outfit_prendas.filter(r => r.outfit_id !== id);
    for (const capa of CAPAS) {
      const v = b.capas[capa];
      (Array.isArray(v) ? v : [v]).filter(Boolean).forEach((prenda_id, orden) =>
        t.outfit_prendas.push({ id: Store.id(), outfit_id: id, prenda_id, capa, orden }));
    }
    Store.guardar();
    return id;
  }

  function borrarOutfit(id) {
    const t = a();
    t.outfits = t.outfits.filter(o => o.id !== id);
    t.outfit_prendas = t.outfit_prendas.filter(r => r.outfit_id !== id);
    Store.guardar();
  }

  // Agrupa color_principal (texto libre) en colores básicos para filtrar.
  function colorBase(p) {
    const t = (p.color_principal || '').toLowerCase();
    if (/azulgrana|multicolor/.test(t) || / y /.test(t.replace(/\(.*\)/, ''))) return 'multicolor';
    for (const c of ['blanco', 'negro', 'gris', 'azul', 'rosa', 'verde', 'rojo', 'beige', 'marrón', 'plata']) if (t.startsWith(c)) return c;
    return 'otro';
  }

  // ---------- Tiempo de Barcelona (Open-Meteo, sin clave) ----------
  // Se pide una vez al día y se guarda aparte (no son datos tuyos ni van a Supabase).
  const URL_TIEMPO = 'https://api.open-meteo.com/v1/forecast?latitude=41.3874&longitude=2.1686'
    + '&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe%2FMadrid&forecast_days=1';
  const CLAVE_TIEMPO = 'mi-panel:tiempo';

  // Clima por temperatura máxima: < 8 mucho frío, 8–15 frío, 15–22 templado, > 22 calor.
  const climaDe = max => max < 8 ? 'mucho_frio' : max < 15 ? 'frio' : max <= 22 ? 'templado' : 'calor';

  // Códigos WMO del tiempo → texto.
  function cielo(c) {
    if (c === 0) return 'Despejado';
    if (c <= 2) return 'Poco nuboso';
    if (c === 3) return 'Nublado';
    if (c <= 48) return 'Niebla';
    if (c <= 57) return 'Llovizna';
    if (c <= 67) return 'Lluvia';
    if (c <= 77) return 'Nieve';
    if (c <= 82) return 'Chubascos';
    return 'Tormenta';
  }
  const lluvioso = c => c >= 51 && c <= 99 && !(c >= 71 && c <= 77);

  let tiempoHoy = null;
  try { const t = JSON.parse(localStorage.getItem(CLAVE_TIEMPO)); if (t?.fecha === U.iso()) tiempoHoy = t; } catch { /* sin acceso */ }

  // Devuelve una promesa con { fecha, max, min, codigo, cielo, clima, lluvia } o null si no hay conexión.
  function tiempo() {
    if (tiempoHoy) return Promise.resolve(tiempoHoy);
    return fetch(URL_TIEMPO)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(j => {
        const max = j.daily.temperature_2m_max[0], min = j.daily.temperature_2m_min[0], codigo = j.daily.weather_code[0];
        tiempoHoy = { fecha: U.iso(), max, min, codigo, cielo: cielo(codigo), clima: climaDe(max), lluvia: lluvioso(codigo) };
        try { localStorage.setItem(CLAVE_TIEMPO, JSON.stringify(tiempoHoy)); } catch { /* da igual */ }
        return tiempoHoy;
      })
      .catch(() => null);
  }
  const tiempoGuardado = () => tiempoHoy;

  // ---------- Outfit de hoy ----------
  const masDias = (n, desde = U.iso()) => { const d = U.deIso(desde); d.setDate(d.getDate() + n); return U.iso(d); };
  // Outfits puestos en los 3 días anteriores a hoy.
  const usadosRecientes = (hoy = U.iso()) => new Set(a().outfit_historial
    .filter(h => h.fecha >= masDias(-3, hoy) && h.fecha < hoy).map(h => h.outfit_id));
  const puestoEl = (fecha = U.iso()) => a().outfit_historial.find(h => h.fecha === fecha) || null;

  // Climas parecidos, por si no hay outfits del clima exacto.
  const VECINOS = { mucho_frio: ['frio'], frio: ['mucho_frio', 'templado'], templado: ['frio', 'calor'], calor: ['templado'] };

  // Lista ordenada de propuestas para un clima y una situación. El orden es estable
  // durante el día (para que recargar no cambie la propuesta) y deja al final los
  // outfits usados en los últimos 3 días. «aviso» explica si se ha tenido que relajar algo.
  function propuestas(clima, situacion, hoy = U.iso()) {
    const con = (climas, sit) => a().outfits.filter(o => climas.some(c => o.clima.includes(c)) && (!sit || o.ocasiones.includes(sit)));
    let lista = con([clima], situacion), aviso = '';
    if (!lista.length) { lista = con(VECINOS[clima], situacion); aviso = lista.length ? `No hay outfits de ${N(situacion)} para ${N(clima).toLowerCase()}: te propongo los de clima parecido.` : ''; }
    if (!lista.length) { lista = con([clima], null); aviso = lista.length ? `No hay outfits de ${N(situacion)} para ${N(clima).toLowerCase()}: te propongo otros para este clima.` : ''; }
    if (!lista.length) return { lista: [], aviso: 'No hay ningún outfit para este clima. Crea uno en la vista Outfits.' };
    // Barajado estable por día + clima + situación.
    const semilla = s => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    lista = [...lista].sort((x, y) => semilla(hoy + clima + situacion + x.id) - semilla(hoy + clima + situacion + y.id));
    const usados = usadosRecientes(hoy);
    const frescos = lista.filter(o => !usados.has(o.id));
    if (frescos.length) lista = [...frescos, ...lista.filter(o => usados.has(o.id))];
    return { lista, aviso, todosUsados: !frescos.length };
  }
  const N = k => NOMBRES[k] || k;

  // «Me lo pongo»: una fila por día (si se cambia de idea, se sustituye).
  function ponerHoy(outfitId, fecha = U.iso()) {
    const t = a();
    t.outfit_historial = t.outfit_historial.filter(h => h.fecha !== fecha);
    t.outfit_historial.push({ id: Store.id(), fecha, outfit_id: outfitId });
    Store.guardar();
  }
  function quitarHoy(fecha = U.iso()) {
    const t = a();
    t.outfit_historial = t.outfit_historial.filter(h => h.fecha !== fecha);
    Store.guardar();
  }
  const historial = (n = 7) => [...a().outfit_historial].sort((x, y) => y.fecha.localeCompare(x.fecha)).slice(0, n);

  return {
    CLIMAS, SITUACIONES, NOMBRES, CAPAS, TIPO_DE_CAPA,
    tiempo, tiempoGuardado, climaDe, propuestas, ponerHoy, quitarHoy, puestoEl, historial,
    asegurar, prendas, prenda, outfits, outfit, foto, fondo, capasDe, idsDe, outfitsCon,
    valoracion, candidatas, guardarOutfit, borrarOutfit, colorBase,
  };
})();
