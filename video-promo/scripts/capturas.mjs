// Hace las capturas de cada sección de Mi Panel para el vídeo.
//
//   node scripts/capturas.mjs [URL]
//
// Por defecto usa la app publicada. Rellena la app con datos de demostración
// (no son datos reales), fija la fecha y el tiempo de Terrassa para que las
// capturas salgan siempre iguales, y guarda en public/capturas/:
//   <seccion>.png          lo que se ve en la pantalla del móvil (390×844 a 3×)
//   <seccion>-larga.png    la página entera, para los deslizamientos
//   capturas.json          tamaño de cada imagen
// Necesita Playwright con Chromium (npx playwright install chromium). Si el
// navegador está en otra ruta, indícala con CHROMIUM_PATH.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_APP = (process.argv[2] || 'https://mi-paneldiario.nilvalleszurita.workers.dev/').replace(/#.*$/, '');
const SALIDA = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'capturas');
const ESCALA = 3;
const FECHA = new Date('2026-11-12T18:30:00'); // jueves: día de «Espalda + bíceps»
mkdirSync(SALIDA, { recursive: true });
// require (y no import) para que también sirva un Playwright instalado de forma global.
const { chromium } = createRequire(import.meta.url)('playwright');

// ---------- Datos de demostración ----------
function sembrar() {
  const d = Store.get();
  const mov = (tipo, importe, categoria, fecha, nota = '', extra = {}) =>
    d.finanzas.movimientos.push({ id: Store.id(), tipo, importe, categoria, fecha, nota, creado: Date.now(), ...extra });

  // Finanzas: saldos de partida y movimientos de octubre y noviembre.
  const base = { 'Robo advisor': 4200, Dinero: 850, Efectivo: 160, 'S&P 500': 3150, 'Cuenta remunerada': 2600 };
  for (const c of d.finanzas.cuentas) c.base = base[c.nombre] ?? 0;
  mov('ingreso', 1100, 'Nómina', '2026-11-01', 'Prácticas');
  [['Comida', 23.5, '2026-11-02'], ['Transporte', 12, '2026-11-04'], ['Ocio', 18, '2026-11-06'], ['Comida', 9.8, '2026-11-08'],
    ['Ropa', 14.9, '2026-11-10'], ['Comida', 6.4, '2026-11-11']].forEach(([c, i, f]) => mov('gasto', i, c, f));
  [['Comida', 31, '2026-10-03'], ['Ocio', 25, '2026-10-10'], ['Transporte', 12, '2026-10-15'], ['Comida', 18, '2026-10-22']]
    .forEach(([c, i, f]) => mov('gasto', i, c, f));
  for (const f of d.finanzas.fijos.slice(0, 2)) mov('gasto', f.importe, 'Gastos fijos', '2026-11-01', f.nombre, { fijo_id: f.id });

  // Gym: lunes, martes y miércoles hechos; hoy, dos ejercicios.
  const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sesion = (fecha, dia, hechos, kg) => {
    const ej = {};
    GYM_PLAN[dia].ejercicios.forEach((e, i) => {
      if (i >= hechos) return;
      ej[e.id || slug(e.nombre)] = { nombre: e.nombre, hecho: true, series: Array.from({ length: e.series }, () => ({ kg: String(kg + i * 5), reps: '10' })) };
    });
    d.gym.registros[fecha] = { ej, carrera: null, notas: '' };
  };
  sesion('2026-11-09', 0, 9, 40); sesion('2026-11-10', 1, 9, 30); sesion('2026-11-12', 3, 2, 35);
  d.gym.registros['2026-11-11'] = { ej: {}, carrera: { hecho: true, km: '10', min: '52:30' }, notas: '' };
  sesion('2026-11-02', 0, 9, 37.5); sesion('2026-11-03', 1, 9, 27.5); sesion('2026-11-06', 4, 9, 50);

  // Trabajo: tres días de agencia, uno cobrado.
  const j = (id, fecha, lugar, ini, fin, importe, tipo) =>
    d.trabajo.jornadas.push({ id, fecha, lugar, hora_inicio: ini, hora_fin: fin, notas: '', modo: 'hora', importe, tipo, creado: Date.now() });
  j('j1', '2026-11-01', 'Almacén', '08:00', '14:00', 9, 'bruto');
  j('j2', '2026-11-07', 'Evento · Fira', '16:00', '23:00', 10, 'bruto');
  j('j3', '2026-11-08', 'Almacén', '08:00', '14:00', 9, 'bruto');
  mov('ingreso', 49.41, 'Agencia', '2026-11-05', 'Almacén · 1 nov', { jornada_id: 'j1' });

  // Comidas: desayuno, media mañana y comida hechos; creatina tomada.
  d.comidas.registro['2026-11-12'] = { comidas: { desayuno: true, mediaManana: true, comida: true }, cambios: {}, creatina: true, corro: false };
  for (const f of ['2026-11-09', '2026-11-10', '2026-11-11']) d.comidas.registro[f] = { comidas: { desayuno: true, mediaManana: true, comida: true, merienda: true, cena: true }, cambios: {} };

  // Hábitos: dos semanas de historial.
  const buenas = ['Aprobé el control de Fluids', 'Cena con los de clase', 'Primer 10 km por debajo de 53 min', 'Me han renovado en la agencia'];
  for (let i = 1; i <= 13; i++) {
    const f = new Date(2026, 10, 12 - i);
    const iso = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
    d.habitos.registro[iso] = { paginas: 8 + (i % 6), movil: 2 + (i % 3) * 0.5, ...(i <= 4 ? { buena: buenas[i - 1] } : {}), ...(i <= 3 ? { practica: 'completo' } : {}) };
  }
  d.habitos.registro['2026-11-12'] = { paginas: 12, movil: 2.5, practica: 'minimo', buena: 'He hecho el vídeo de mi app' };
  d.habitos.habilidad.inicio = '2026-11-09';
  Store.guardar();
}

const navegador = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: ESCALA, locale: 'es-ES' });
// Tiempo de Terrassa fijo (y sin depender de la conexión).
await ctx.route(/api\.open-meteo\.com/, r => r.fulfill({
  contentType: 'application/json',
  body: JSON.stringify({ daily: { temperature_2m_max: [17.5], temperature_2m_min: [9.5], weather_code: [1] } }),
}));
const p = await ctx.newPage();
await p.clock.setFixedTime(FECHA);
const errores = [];
p.on('pageerror', e => errores.push(e.message));

// Cargar una vez cada sección (descarga sus datos iniciales) y sembrar la demo.
await p.goto(URL_APP);
await p.evaluate(() => { localStorage.clear(); });
await p.reload();
for (const s of ['estudio', 'comidas', 'outfits', 'hoy']) { await p.goto(`${URL_APP}#${s}`); await p.waitForTimeout(1200); }
await p.evaluate(sembrar);

const tamanos = {};
const ir = async (seccion, preparar) => {
  await p.goto(`${URL_APP}#${seccion}`);
  await p.reload();
  await p.waitForTimeout(1500);
  if (preparar) { await preparar(); await p.waitForTimeout(500); }
  await p.evaluate(() => scrollTo(0, 0));
};
const guardar = async (nombre, opciones = {}) => {
  const ruta = join(SALIDA, `${nombre}.png`);
  await p.screenshot({ path: ruta, ...opciones });
  const { w, h } = await p.evaluate(({ larga }) => ({
    w: innerWidth, h: larga ? document.documentElement.scrollHeight : innerHeight,
  }), { larga: !!opciones.fullPage });
  tamanos[nombre] = { width: w * ESCALA, height: h * ESCALA };
  console.log('✓', nombre);
};
// Para la página entera: sin la barra fija de abajo y con la cabecera en su sitio.
const larga = async nombre => {
  await p.addStyleTag({ content: '.nav{display:none!important}.topbar{position:static!important}.vista{padding-bottom:24px!important}' });
  await guardar(`${nombre}-larga`, { fullPage: true });
};

// Hoy
await ir('hoy');
await guardar('hoy');
await larga('hoy');
// Finanzas
await ir('finanzas'); await guardar('finanzas'); await larga('finanzas');
// Gym (vista Semana con el día de hoy abierto)
await ir('gym', async () => { await p.evaluate(() => document.querySelector('.gym-dia.abierto')?.scrollIntoView({ block: 'start' })); });
await guardar('gym');
await ir('gym'); await larga('gym');
// Comidas
await ir('comidas'); await guardar('comidas'); await larga('comidas');
// Estudio
await ir('estudio'); await guardar('estudio'); await larga('estudio');
// Trabajo
await ir('trabajo'); await guardar('trabajo');
// Outfits (outfit de hoy)
await ir('outfits'); await guardar('outfits');
// Hábitos (al final de Hoy)
await ir('hoy', async () => { await p.evaluate(() => scrollTo(0, document.querySelector('.habitos').offsetTop - 16)); });
await p.evaluate(() => scrollTo(0, document.querySelector('.habitos').offsetTop - 16));
await guardar('habitos');

writeFileSync(join(SALIDA, 'capturas.json'), JSON.stringify(tamanos, null, 2));
if (errores.length) console.log('Errores de la página:', errores);
await navegador.close();
