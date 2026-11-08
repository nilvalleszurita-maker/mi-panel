// Planificación semanal del gym. Solo datos: edítala libremente sin tocar gym.js.
//
// - Un elemento por día, de lunes (primero) a domingo (último).
// - tipo: 'gym' (lista de ejercicios) o 'carrera' (distancia, tiempo y ritmo).
// - Cada ejercicio: nombre, series (número de filas), reps (rango objetivo) y nota opcional.
// - Dibujos (opcionales): figura = personaje animado (ver los nombres en
//   js/gym-figuras.js), musculos = principales y secundarios = los que ayudan.
//   Músculos posibles: pecho, hombros, biceps, triceps, antebrazos, abdominales,
//   trapecio, dorsales, lumbares, gluteos, cuadriceps, femorales, gemelos.
// - El historial de "la última vez" se enlaza por el nombre del ejercicio, así
//   que si un ejercicio se repite en varios días (p. ej. Elevaciones laterales)
//   comparte la referencia. Si le cambias el nombre y quieres conservar su
//   historial, añádele `id` con el valor anterior (el nombre en minúsculas y
//   con guiones, p. ej. id: 'press-banca-plano').
const GYM_PLAN = [
  {
    sesion: 'Pierna A (cuádriceps)',
    tipo: 'gym',
    ejercicios: [
      { nombre: 'Sentadilla', series: 4, reps: '6–8',
        figura: 'sentadilla', musculos: ['cuadriceps', 'gluteos'], secundarios: ['femorales', 'lumbares'] },
      { nombre: 'Prensa', series: 3, reps: '10–12',
        figura: 'prensa', musculos: ['cuadriceps', 'gluteos'], secundarios: ['femorales'] },
      { nombre: 'Sentadilla búlgara', series: 3, reps: '8–10', nota: 'por pierna',
        figura: 'bulgara', musculos: ['cuadriceps', 'gluteos'], secundarios: ['femorales'] },
      { nombre: 'Extensión de cuádriceps', series: 3, reps: '12–15',
        figura: 'extension-cuadriceps', musculos: ['cuadriceps'], secundarios: [] },
      { nombre: 'Curl femoral sentado', series: 3, reps: '10–12',
        figura: 'curl-femoral-sentado', musculos: ['femorales'], secundarios: ['gemelos'] },
      { nombre: 'Gemelo de pie', series: 4, reps: '10–15',
        figura: 'gemelo-pie', musculos: ['gemelos'], secundarios: [] },
    ],
  },
  {
    sesion: 'Pecho + tríceps + hombro',
    tipo: 'gym',
    ejercicios: [
      { nombre: 'Press banca plano', series: 4, reps: '6–8',
        figura: 'press-banca', musculos: ['pecho'], secundarios: ['hombros', 'triceps'] },
      { nombre: 'Fondos con lastre', series: 3, reps: '8–10', nota: 'torso inclinado',
        figura: 'fondos', musculos: ['pecho', 'triceps'], secundarios: ['hombros'] },
      { nombre: 'Press declinado o press plano con mancuernas', series: 3, reps: '8–10',
        figura: 'press-banca-mancuernas', musculos: ['pecho'], secundarios: ['triceps', 'hombros'] },
      { nombre: 'Cruces en polea de arriba hacia abajo', series: 3, reps: '12–15',
        figura: 'cruces-polea', musculos: ['pecho'], secundarios: ['hombros'] },
      { nombre: 'Squeeze press', series: 2, reps: '10–12',
        figura: 'press-banca-mancuernas', musculos: ['pecho'], secundarios: ['triceps'] },
      { nombre: 'Press militar', series: 3, reps: '8–10',
        figura: 'press-militar', musculos: ['hombros'], secundarios: ['triceps', 'trapecio'] },
      { nombre: 'Elevaciones laterales', series: 3, reps: '12–15',
        figura: 'elevaciones-laterales', musculos: ['hombros'], secundarios: ['trapecio'] },
      { nombre: 'Extensión de tríceps en polea', series: 3, reps: '10–12',
        figura: 'extension-triceps-polea', musculos: ['triceps'], secundarios: [] },
    ],
  },
  {
    sesion: 'Carrera 10 km (ritmo medio)',
    tipo: 'carrera',
    km: 10,
    ritmo: 'ritmo medio',
  },
  {
    sesion: 'Espalda + bíceps',
    tipo: 'gym',
    ejercicios: [
      { nombre: 'Dominadas o jalón', series: 4, reps: '6–10',
        figura: 'dominadas', musculos: ['dorsales'], secundarios: ['biceps', 'antebrazos'] },
      { nombre: 'Remo con barra', series: 3, reps: '8–10',
        figura: 'remo-barra', musculos: ['dorsales', 'trapecio'], secundarios: ['biceps', 'lumbares', 'hombros'] },
      { nombre: 'Remo en polea sentado', series: 3, reps: '10–12',
        figura: 'remo-polea', musculos: ['dorsales', 'trapecio'], secundarios: ['biceps'] },
      { nombre: 'Face pull', series: 3, reps: '12–15',
        figura: 'face-pull', musculos: ['hombros', 'trapecio'], secundarios: [] },
      { nombre: 'Curl con barra', series: 3, reps: '8–10',
        figura: 'curl-barra', musculos: ['biceps'], secundarios: ['antebrazos'] },
      { nombre: 'Curl martillo', series: 3, reps: '10–12',
        figura: 'curl-mancuerna', musculos: ['biceps', 'antebrazos'], secundarios: [] },
    ],
  },
  {
    sesion: 'Pierna B (femoral y glúteo)',
    tipo: 'gym',
    ejercicios: [
      { nombre: 'Peso muerto rumano', series: 4, reps: '6–8',
        figura: 'peso-muerto-rumano', musculos: ['femorales', 'gluteos'], secundarios: ['lumbares'] },
      { nombre: 'Hip thrust', series: 3, reps: '8–10',
        figura: 'hip-thrust', musculos: ['gluteos'], secundarios: ['femorales'] },
      { nombre: 'Hack squat o prensa', series: 3, reps: '10–12',
        figura: 'sentadilla-maquina', musculos: ['cuadriceps', 'gluteos'], secundarios: ['femorales'] },
      { nombre: 'Curl femoral tumbado', series: 3, reps: '10–12',
        figura: 'curl-femoral-tumbado', musculos: ['femorales'], secundarios: ['gemelos'] },
      { nombre: 'Gemelo sentado', series: 4, reps: '12–15',
        figura: 'gemelo-sentado', musculos: ['gemelos'], secundarios: [] },
      { nombre: 'Abdominales', series: 3, reps: '10–15',
        figura: 'abdominales', musculos: ['abdominales'], secundarios: [] },
    ],
  },
  {
    sesion: 'Torso completo',
    tipo: 'gym',
    ejercicios: [
      { nombre: 'Press inclinado', series: 3, reps: '8–10', nota: 'máquina o barra',
        figura: 'press-inclinado', musculos: ['pecho'], secundarios: ['hombros', 'triceps'] },
      { nombre: 'Jalón agarre neutro', series: 3, reps: '10–12',
        figura: 'jalon', musculos: ['dorsales'], secundarios: ['biceps'] },
      { nombre: 'Press plano con mancuernas', series: 3, reps: '8–12',
        figura: 'press-banca-mancuernas', musculos: ['pecho'], secundarios: ['triceps', 'hombros'] },
      { nombre: 'Remo con mancuerna', series: 3, reps: '10–12',
        figura: 'remo-mancuerna', musculos: ['dorsales'], secundarios: ['biceps', 'trapecio'] },
      { nombre: 'Elevaciones laterales', series: 3, reps: '15',
        figura: 'elevaciones-laterales', musculos: ['hombros'], secundarios: ['trapecio'] },
      { nombre: 'Curl inclinado + extensión de tríceps sobre la cabeza', series: 3, reps: '12', nota: 'superserie',
        figura: 'curl-mancuerna', musculos: ['biceps', 'triceps'], secundarios: [] },
    ],
  },
  {
    sesion: 'Carrera 10 km (suave)',
    tipo: 'carrera',
    km: 10,
    ritmo: 'suave',
  },
];
