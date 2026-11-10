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

  // ---------- Fotos subidas desde la app ----------
  // Se guardan en IndexedDB (localStorage se quedaría pequeño), una por prenda:
  // { blob, fondo }. Tienen prioridad sobre la de data/fotos/. Más adelante irían
  // a Supabase Storage.
  const BD = (() => {
    let db = null;
    const abrir = () => db ? Promise.resolve(db) : new Promise((ok, mal) => {
      const r = indexedDB.open('mi-panel-fotos', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('fotos');
      r.onsuccess = () => ok(db = r.result);
      r.onerror = () => mal(r.error);
    });
    const escribir = fn => abrir().then(d => new Promise((ok, mal) => {
      const t = d.transaction('fotos', 'readwrite');
      fn(t.objectStore('fotos'));
      t.oncomplete = () => ok();
      t.onerror = () => mal(t.error);
    }));
    const todas = () => abrir().then(d => new Promise((ok, mal) => {
      const res = {};
      const c = d.transaction('fotos').objectStore('fotos').openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { res[cur.key] = cur.value; cur.continue(); } else ok(res); };
      c.onerror = () => mal(c.error);
    }));
    return { poner: (k, v) => escribir(s => s.put(v, k)), quitar: k => escribir(s => s.delete(k)), todas };
  })();
  const locales = {};       // id → { url, fondo }
  const localesListas = (typeof indexedDB === 'undefined' ? Promise.resolve({}) : BD.todas().catch(() => ({})))
    .then(todas => { for (const [id, v] of Object.entries(todas)) locales[id] = { url: URL.createObjectURL(v.blob), fondo: v.fondo }; });

  // Reduce una imagen elegida en el móvil a 600 px (JPEG) y calcula su color de borde.
  async function procesarFoto(archivo) {
    const bmp = await createImageBitmap(archivo);
    const k = Math.min(1, 600 / Math.max(bmp.width, bmp.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(bmp.width * k); lienzo.height = Math.round(bmp.height * k);
    const ctx = lienzo.getContext('2d');
    ctx.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    const { width: w, height: h } = lienzo;
    const borde = [ctx.getImageData(0, 0, w, 3), ctx.getImageData(0, h - 3, w, 3), ctx.getImageData(0, 0, 3, h), ctx.getImageData(w - 3, 0, 3, h)];
    let r = 0, g = 0, b = 0, n = 0;
    for (const { data } of borde) for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    const hex = v => Math.round(v / n).toString(16).padStart(2, '0');
    const blob = await new Promise(ok => lienzo.toBlob(ok, 'image/jpeg', 0.82));
    return { blob, fondo: `#${hex(r)}${hex(g)}${hex(b)}` };
  }
  async function guardarFoto(id, foto) {
    await BD.poner(id, foto);
    if (locales[id]) URL.revokeObjectURL(locales[id].url);
    locales[id] = { url: URL.createObjectURL(foto.blob), fondo: foto.fondo };
  }
  async function quitarFoto(id) {
    await BD.quitar(id).catch(() => {});
    if (locales[id]) { URL.revokeObjectURL(locales[id].url); delete locales[id]; }
  }
  const tieneFotoSubida = id => !!locales[id];

  // Carga el armario de data/armario.json la primera vez. Devuelve una promesa.
  function asegurar() {
    if (a().sembrado) return Promise.all([fondosListos, localesListas]).then(() => true);
    if (cargando) return cargando;
    cargando = fetch('data/armario.json')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(importar)
      .then(ok => Promise.all([fondosListos, localesListas]).then(() => ok))
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
  const foto = id => locales[id]?.url || `data/fotos/${encodeURIComponent(id)}.webp`;
  const fondo = id => locales[id]?.fondo || fondos[id] || null;

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

  // ---------- Prendas ----------
  const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Crea (sin id) o actualiza una prenda. El id no cambia al editar: los outfits la siguen encontrando.
  function guardarPrenda(datos, id = null) {
    const t = a();
    if (id) {
      const i = t.prendas.findIndex(p => p.id === id);
      t.prendas[i] = { ...t.prendas[i], ...datos, id };
    } else {
      id = `${slug(datos.nombre) || 'prenda'}-${Store.id().slice(-4)}`;
      t.prendas.unshift({ ...datos, id });
    }
    Store.guardar();
    return id;
  }
  // Borra la prenda y la quita de los outfits que la usan. Devuelve cuántos outfits la tenían.
  function borrarPrenda(id) {
    const t = a();
    const afectados = outfitsCon(id).length;
    t.prendas = t.prendas.filter(p => p.id !== id);
    t.outfit_prendas = t.outfit_prendas.filter(r => r.prenda_id !== id);
    Store.guardar();
    quitarFoto(id);
    return afectados;
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

  // ---------- Tiempo del día (Open-Meteo, sin clave) ----------
  // Se pide una vez al día y se guarda aparte (no son datos tuyos ni van a Supabase).
  // Para cambiar de ciudad, basta con cambiar LUGAR.
  const LUGAR = { nombre: 'Terrassa', lat: 41.5633, lon: 2.0089 };
  const URL_TIEMPO = `https://api.open-meteo.com/v1/forecast?latitude=${LUGAR.lat}&longitude=${LUGAR.lon}`
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
  // Solo vale el guardado si es de hoy y de este lugar.
  try { const t = JSON.parse(localStorage.getItem(CLAVE_TIEMPO)); if (t?.fecha === U.iso() && t.lugar === LUGAR.nombre) tiempoHoy = t; } catch { /* sin acceso */ }

  // Devuelve una promesa con { fecha, max, min, codigo, cielo, clima, lluvia } o null si no hay conexión.
  function tiempo() {
    if (tiempoHoy) return Promise.resolve(tiempoHoy);
    return fetch(URL_TIEMPO)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(j => {
        const max = j.daily.temperature_2m_max[0], min = j.daily.temperature_2m_min[0], codigo = j.daily.weather_code[0];
        tiempoHoy = { fecha: U.iso(), lugar: LUGAR.nombre, max, min, codigo, cielo: cielo(codigo), clima: climaDe(max), lluvia: lluvioso(codigo) };
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
    LUGAR, tiempo, tiempoGuardado, climaDe, propuestas, ponerHoy, quitarHoy, puestoEl, historial,
    asegurar, prendas, prenda, outfits, outfit, foto, fondo, capasDe, idsDe, outfitsCon,
    valoracion, candidatas, guardarOutfit, borrarOutfit, colorBase,
    guardarPrenda, borrarPrenda, procesarFoto, guardarFoto, quitarFoto, tieneFotoSubida,
  };
})();
