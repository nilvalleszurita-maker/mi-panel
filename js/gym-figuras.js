// Dibujos del gym (SVG propio, sin imágenes externas):
//   - GymDibujos.figura(id): personaje de líneas que hace el ejercicio, animado.
//   - GymDibujos.musculos(principales, secundarios): cuerpo de frente y de
//     espalda con los músculos trabajados resaltados.
// Qué figura y qué músculos lleva cada ejercicio se indica en js/gym-plan.js.
const GymDibujos = (() => {
  // ---------- Personajes ----------
  // Cada figura se dibuja en un lienzo de 100×100, de perfil y mirando a la
  // derecha (salvo las de frente). Se define la posición de cada punto al
  // inicio del movimiento (a) y los puntos que cambian al final (b); la
  // animación va de a a b y vuelve.
  // Puntos habituales: h cabeza, s hombro, e codo, m mano, c cadera,
  // r rodilla, t tobillo, p punta del pie.
  const CUERPO = [['s', 'c'], ['s', 'e'], ['e', 'm'], ['c', 'r'], ['r', 't'], ['t', 'p']];
  const suelo = y => `<line class="suelo" x1="4" x2="96" y1="${y}" y2="${y}"/>`;
  const rect = (x, y, w, h) => `<rect class="prop" x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5"/>`;
  const linea = (x1, y1, x2, y2) => `<line class="prop-linea" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const asiento = (x, y, w, sueloY) => rect(x, y, w, 4) + rect(x + w / 2 - 2, y + 4, 4, sueloY - y - 4);

  const FIGURAS = {
    sentadilla: {
      a: { h: [50, 13], s: [50, 23], e: [41, 29], m: [47, 21], c: [50, 49], r: [51, 69], t: [50, 90], p: [57, 90] },
      b: { h: [56, 32], s: [51, 41], e: [42, 47], m: [48, 39], c: [38, 64], r: [57, 70] },
      eq: [['disco', 'm']],
      props: suelo(90),
    },
    bulgara: {
      a: { h: [48, 13], s: [48, 22], e: [47, 35], m: [48, 47], c: [48, 48], r: [55, 68], t: [55, 90], p: [61, 90], r2: [38, 66], t2: [22, 72], p2: [16, 74] },
      b: { h: [47, 28], s: [46, 37], e: [45, 50], m: [46, 62], c: [44, 62], r: [61, 70], t: [57, 90], p: [63, 90], r2: [36, 82] },
      seg: [...CUERPO, ['c', 'r2'], ['r2', 't2'], ['t2', 'p2']],
      eq: [['mancuerna', 'm']],
      props: asiento(6, 74, 22, 90) + suelo(90),
    },
    prensa: {
      a: { h: [16, 47], s: [22, 54], e: [30, 66], m: [38, 72], c: [40, 74], r: [56, 59], t: [72, 44], q1: [66, 38], q2: [78, 50] },
      b: { r: [45, 55], t: [63, 49], q1: [57, 43], q2: [69, 55] },
      seg: [['s', 'c'], ['s', 'e'], ['e', 'm'], ['c', 'r'], ['r', 't'], ['q1', 'q2', 'plataforma']],
      props: `<polyline class="prop-trazo" points="12,46 36,78 56,78"/>` + linea(48, 78, 48, 90) + suelo(90),
    },
    'extension-cuadriceps': {
      a: { h: [41, 27], s: [42, 36], e: [45, 48], m: [50, 60], c: [44, 62], r: [64, 62], t: [66, 82], p: [71, 82] },
      b: { t: [83, 58], p: [84, 52] },
      eq: [['rodillo', 't']],
      props: rect(32, 30, 4, 38) + asiento(34, 64, 32, 90) + suelo(90),
    },
    'curl-femoral-sentado': {
      a: { h: [41, 27], s: [42, 36], e: [45, 48], m: [50, 60], c: [44, 62], r: [64, 62], t: [83, 62], p: [84, 56] },
      b: { t: [60, 81], p: [65, 83] },
      eq: [['rodillo', 't']],
      props: rect(32, 30, 4, 38) + asiento(34, 64, 32, 90) + suelo(90),
    },
    'curl-femoral-tumbado': {
      a: { h: [15, 60], s: [24, 62], e: [18, 72], m: [12, 66], c: [50, 62], r: [70, 62], t: [90, 62], p: [94, 66] },
      b: { t: [76, 43], p: [81, 40] },
      eq: [['rodillo', 't']],
      props: rect(10, 66, 70, 4) + rect(18, 70, 4, 20) + rect(70, 70, 4, 20) + suelo(90),
    },
    'gemelo-pie': {
      a: { h: [50, 19], s: [50, 28], e: [51, 41], m: [53, 52], c: [50, 54], r: [50, 74], t: [51, 93], p: [57, 90] },
      b: { h: [50, 11], s: [50, 20], e: [51, 33], m: [53, 44], c: [50, 46], r: [51, 66], t: [53, 85] },
      eq: [['mancuerna', 'm']],
      props: rect(54, 90, 22, 4) + suelo(94),
    },
    'gemelo-sentado': {
      a: { h: [40, 29], s: [40, 38], e: [46, 48], m: [54, 56], c: [40, 64], r: [60, 64], t: [60, 84], p: [66, 82] },
      b: { r: [60, 57], t: [61, 77] },
      eq: [['rodillo', 'r']],
      props: asiento(28, 66, 22, 90) + rect(62, 82, 12, 8) + suelo(90),
    },
    'press-banca': {
      a: { h: [16, 66], s: [26, 67], e: [27, 54], m: [28, 42], c: [52, 67], r: [69, 70], t: [70, 90], p: [76, 90] },
      b: { e: [19, 74], m: [28, 65] },
      eq: [['disco', 'm']],
      props: asiento(10, 71, 48, 90) + suelo(90),
    },
    'press-inclinado': {
      a: { h: [24, 45], s: [30, 52], e: [34, 40], m: [38, 28], c: [48, 72], r: [66, 70], t: [68, 90], p: [74, 90] },
      b: { e: [24, 61], m: [33, 52] },
      eq: [['disco', 'm']],
      props: `<polyline class="prop-trazo" points="22,47 44,76 60,76"/>` + linea(44, 76, 44, 90) + suelo(90),
    },
    fondos: {
      a: { h: [55, 17], s: [52, 26], e: [54, 38], m: [56, 50], c: [44, 51], r: [38, 68], t: [24, 82], p: [20, 86] },
      b: { h: [55, 29], s: [52, 38], e: [44, 47], c: [42, 63], r: [36, 80], t: [22, 90], p: [18, 94] },
      props: linea(38, 52, 74, 52) + linea(72, 52, 72, 96) + suelo(96),
    },
    'cruces-polea': {
      a: { h: [54, 15], s: [52, 24], e: [44, 18], m: [40, 8], c: [48, 50], r: [54, 70], t: [56, 90], p: [62, 90], r2: [42, 70], t2: [38, 90], p2: [44, 90] },
      b: { e: [60, 32], m: [66, 42] },
      seg: [...CUERPO, ['c', 'r2'], ['r2', 't2'], ['t2', 'p2']],
      eq: [['cable', [12, 4], 'm']],
      props: rect(9, 2, 4, 88) + suelo(90),
    },
    'press-militar': {
      a: { h: [50, 20], s: [50, 29], e: [57, 37], m: [55, 26], c: [50, 55], r: [50, 75], t: [50, 95], p: [57, 95] },
      b: { e: [53, 17], m: [52, 5] },
      eq: [['disco', 'm']],
      props: suelo(95),
    },
    // De frente, para que se vea el brazo subir hacia el lado.
    'elevaciones-laterales': {
      a: {
        h: [50, 14], n: [50, 23], s1: [42, 24], s2: [58, 24], cc: [50, 50], c1: [45, 50], c2: [55, 50],
        e1: [39, 37], m1: [38, 49], e2: [61, 37], m2: [62, 49],
        r1: [44, 70], t1: [44, 90], p1: [39, 90], r2: [56, 70], t2: [56, 90], p2: [61, 90],
      },
      b: { e1: [30, 26], m1: [18, 27], e2: [70, 26], m2: [82, 27] },
      seg: [['s1', 's2'], ['n', 'cc'], ['c1', 'c2'], ['s1', 'e1'], ['e1', 'm1'], ['s2', 'e2'], ['e2', 'm2'],
        ['c1', 'r1'], ['r1', 't1'], ['t1', 'p1'], ['c2', 'r2'], ['r2', 't2'], ['t2', 'p2']],
      eq: [['mancuerna', 'm1'], ['mancuerna', 'm2']],
      props: suelo(90),
    },
    'extension-triceps-polea': {
      a: { h: [51, 15], s: [50, 24], e: [52, 36], m: [62, 28], c: [48, 50], r: [49, 70], t: [48, 90], p: [55, 90] },
      b: { m: [56, 48] },
      eq: [['cable', [86, 4], 'm']],
      props: rect(84, 2, 4, 88) + suelo(90),
    },
    dominadas: {
      a: { h: [51, 30], s: [48, 38], e: [48, 26], m: [50, 14], c: [48, 64], r: [54, 80], t: [44, 94], p: [40, 92] },
      b: { h: [47, 11], s: [46, 20], e: [56, 23], c: [46, 46], r: [50, 64], t: [40, 78], p: [36, 76] },
      props: linea(28, 14, 72, 14),
    },
    'remo-barra': {
      a: { h: [67, 26], s: [60, 32], e: [60, 45], m: [60, 57], c: [38, 48], r: [44, 68], t: [42, 90], p: [49, 90] },
      b: { e: [48, 37], m: [50, 49] },
      eq: [['disco', 'm']],
      props: suelo(90),
    },
    'remo-polea': {
      a: { h: [34, 39], s: [34, 48], e: [46, 50], m: [58, 52], c: [34, 74], r: [52, 68], t: [68, 76], p: [70, 70] },
      b: { e: [25, 53], m: [37, 58] },
      eq: [['cable', [86, 56], 'm']],
      props: asiento(22, 76, 24, 90) + linea(74, 64, 74, 84) + rect(84, 40, 4, 50) + suelo(90),
    },
    'face-pull': {
      a: { h: [49, 15], s: [48, 24], e: [60, 24], m: [72, 22], c: [46, 50], r: [48, 70], t: [47, 90], p: [54, 90] },
      b: { e: [42, 16], m: [54, 17] },
      eq: [['cable', [88, 18], 'm']],
      props: rect(86, 2, 4, 88) + suelo(90),
    },
    'curl-barra': {
      a: { h: [50, 13], s: [50, 23], e: [51, 36], m: [53, 48], c: [50, 49], r: [50, 69], t: [50, 90], p: [57, 90] },
      b: { m: [58, 25] },
      eq: [['disco', 'm']],
      props: suelo(90),
    },
    'peso-muerto-rumano': {
      a: { h: [50, 13], s: [50, 23], e: [51, 36], m: [52, 48], c: [48, 49], r: [50, 69], t: [50, 90], p: [57, 90] },
      b: { h: [70, 32], s: [62, 36], e: [62, 49], m: [62, 61], c: [40, 48], r: [48, 68] },
      eq: [['disco', 'm']],
      props: suelo(90),
    },
    'hip-thrust': {
      a: { h: [18, 54], s: [24, 60], e: [30, 72], m: [40, 76], c: [42, 78], r: [59, 70], t: [68, 88], p: [74, 88] },
      b: { h: [15, 61], e: [34, 64], m: [46, 58], c: [49, 58], r: [64, 68] },
      eq: [['disco', 'c']],
      props: asiento(4, 62, 22, 88) + suelo(88),
    },
    abdominales: {
      a: { h: [11, 84], s: [20, 86], e: [28, 80], m: [36, 84], c: [44, 86], r: [58, 72], t: [70, 86], p: [76, 86] },
      b: { h: [16, 72], s: [24, 76], e: [32, 71], m: [38, 78] },
      props: suelo(90),
    },
    jalon: {
      a: { h: [46, 35], s: [46, 44], e: [48, 32], m: [50, 20], c: [46, 70], r: [64, 70], t: [66, 90], p: [72, 90] },
      b: { e: [40, 53], m: [48, 44] },
      eq: [['cable', [50, 2], 'm'], ['barra', 'm']],
      props: asiento(36, 72, 22, 90) + rect(58, 62, 12, 4) + suelo(90),
    },
  };

  // Variantes que solo cambian el material (mancuerna en vez de barra, máquina…).
  const variante = (base, eq) => ({ ...FIGURAS[base], eq });
  Object.assign(FIGURAS, {
    'sentadilla-maquina': variante('sentadilla', []),
    'press-banca-mancuernas': variante('press-banca', [['mancuerna', 'm']]),
    'remo-mancuerna': variante('remo-barra', [['mancuerna', 'm']]),
    'curl-mancuerna': variante('curl-barra', [['mancuerna', 'm']]),
  });

  const DURACION = 2.6; // segundos por repetición
  const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function figura(id, titulo) {
    const f = FIGURAS[id];
    if (!f) return '';
    const A = f.a, B = { ...f.a, ...f.b };
    const animar = !sinMovimiento();
    // Sin animación se muestra la posición final, que es la más reconocible.
    const P = animar ? A : B;
    const pt = k => (Array.isArray(k) ? k : null);
    const anim = (attr, va, vb) => !animar || va === vb ? '' :
      `<animate attributeName="${attr}" values="${va};${vb};${va}" keyTimes="0;0.5;1" dur="${DURACION}s"
        repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>`;
    // Línea entre dos puntos (nombre de punto o coordenadas fijas).
    const seg = (a, b, clase) => {
      const pa = pt(a) || P[a], pb = pt(b) || P[b];
      const aa = pt(a) || A[a], ab = pt(b) || A[b], ba = pt(a) || B[a], bb = pt(b) || B[b];
      return `<line class="${clase}" x1="${pa[0]}" y1="${pa[1]}" x2="${pb[0]}" y2="${pb[1]}">${
        anim('x1', aa[0], ba[0])}${anim('y1', aa[1], ba[1])}${anim('x2', ab[0], bb[0])}${anim('y2', ab[1], bb[1])}</line>`;
    };
    const circulo = (k, radio, clase) =>
      `<circle class="${clase}" cx="${P[k][0]}" cy="${P[k][1]}" r="${radio}">${anim('cx', A[k][0], B[k][0])}${anim('cy', A[k][1], B[k][1])}</circle>`;

    const material = (f.eq || []).map(([tipo, x, y]) => {
      if (tipo === 'cable') return seg(x, y, 'cable');
      if (tipo === 'disco') return circulo(x, 5, 'disco');
      if (tipo === 'mancuerna') return circulo(x, 3.2, 'pesa');
      if (tipo === 'rodillo') return circulo(x, 3.6, 'pesa');
      return circulo(x, 2.4, 'pesa'); // barra vista de lado
    });
    // El cable va detrás del cuerpo; el resto, delante.
    const cables = material.filter(s => s.includes('class="cable"')).join('');
    const resto = material.filter(s => !s.includes('class="cable"')).join('');

    return `
      <svg class="figura" viewBox="0 0 100 100" role="img" aria-label="${U.esc(titulo || '')}">
        ${f.props || ''}${cables}
        ${(f.seg || CUERPO).map(([a, b, clase]) => seg(a, b, clase || 'hueso')).join('')}
        ${circulo('h', 6, 'cabeza')}
        ${resto}
      </svg>`;
  }

  // ---------- Mapa de músculos ----------
  const NOMBRES = {
    pecho: 'pecho', hombros: 'hombros', biceps: 'bíceps', triceps: 'tríceps', antebrazos: 'antebrazos',
    abdominales: 'abdominales', trapecio: 'trapecio', dorsales: 'dorsales', lumbares: 'lumbares',
    gluteos: 'glúteos', cuadriceps: 'cuádriceps', femorales: 'femorales', gemelos: 'gemelos',
  };

  // Cuerpo en un lienzo de 100×200. Piezas: [músculo | null, forma SVG].
  const el = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
  const rr = (x, y, w, h, r) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
  const par = (musc, f) => [[musc, f(0)], [musc, f(1)]]; // izquierda y derecha simétricas
  const BASE = [
    `<circle cx="50" cy="16" r="10"/>`, rr(45, 24, 10, 8, 2), rr(34, 32, 32, 56, 10), rr(36, 82, 28, 22, 8),
    rr(23, 34, 10, 34, 5), rr(67, 34, 10, 34, 5), rr(20, 66, 9, 30, 4.5), rr(71, 66, 9, 30, 4.5),
    `<circle cx="24.5" cy="100" r="4.5"/>`, `<circle cx="75.5" cy="100" r="4.5"/>`,
    rr(34, 96, 15, 44, 7), rr(51, 96, 15, 44, 7), rr(36, 138, 11, 46, 5.5), rr(53, 138, 11, 46, 5.5),
    el(41, 190, 6, 4), el(59, 190, 6, 4),
  ];
  const FRENTE = [
    ...par('hombros', i => el(i ? 68 : 32, 40, 8, 8)),
    ...par('pecho', i => el(i ? 58 : 42, 46, 9, 8)),
    ...par('biceps', i => el(i ? 72 : 28, 58, 5, 10)),
    ...par('antebrazos', i => el(i ? 75.5 : 24.5, 80, 4.5, 12)),
    ['abdominales', rr(44, 56, 12, 30, 4)],
    ...par('abdominales', i => el(i ? 61 : 39, 70, 4, 11)),
    ...par('cuadriceps', i => el(i ? 58 : 42, 114, 8, 20)),
    ...par('gemelos', i => el(i ? 58.5 : 41.5, 158, 5, 15)),
  ];
  const ESPALDA = [
    ['trapecio', `<path d="M50 26 L36 36 L50 62 L64 36 Z"/>`],
    ...par('hombros', i => el(i ? 68 : 32, 40, 8, 8)),
    ['dorsales', `<path d="M38 44 Q33 62 43 78 L48 66 L46 46 Z"/>`],
    ['dorsales', `<path d="M62 44 Q67 62 57 78 L52 66 L54 46 Z"/>`],
    ...par('triceps', i => el(i ? 72 : 28, 58, 5, 10)),
    ...par('antebrazos', i => el(i ? 75.5 : 24.5, 80, 4.5, 12)),
    ['lumbares', rr(44, 66, 12, 20, 4)],
    ...par('gluteos', i => el(i ? 57 : 43, 95, 8, 9)),
    ...par('femorales', i => el(i ? 58 : 42, 120, 7.5, 17)),
    ...par('gemelos', i => el(i ? 58.5 : 41.5, 156, 6, 14)),
  ];

  function musculos(principales = [], secundarios = []) {
    const clase = m => principales.includes(m) ? 'musculo p' : secundarios.includes(m) ? 'musculo s' : 'musculo';
    const cuerpo = piezas => `<g class="cuerpo">${BASE.join('')}</g>` +
      piezas.map(([m, forma]) => forma.replace(/^<(\w+)/, `<$1 class="${clase(m)}"`)).join('');
    const nombres = l => l.map(m => NOMBRES[m] || m).join(', ');
    return `
      <svg class="mapa-musculos" viewBox="0 0 205 200" role="img"
        aria-label="Músculos principales: ${nombres(principales)}${secundarios.length ? `. Secundarios: ${nombres(secundarios)}` : ''}">
        <g>${cuerpo(FRENTE)}</g>
        <g transform="translate(105 0)">${cuerpo(ESPALDA)}</g>
      </svg>`;
  }

  const nombre = m => NOMBRES[m] || m;

  return { figura, musculos, nombre, ids: () => Object.keys(FIGURAS) };
})();
