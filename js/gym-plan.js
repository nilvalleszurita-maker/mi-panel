// Planificación semanal del gym. Solo datos: edítala libremente sin tocar gym.js.
//
// - Un elemento por día, de lunes (primero) a domingo (último).
// - tipo: 'gym' (lista de ejercicios) o 'carrera' (distancia, tiempo y ritmo).
// - Cada ejercicio: nombre, series (número de filas), reps (rango objetivo) y nota opcional.
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
      { nombre: 'Sentadilla', series: 4, reps: '6–8' },
      { nombre: 'Prensa', series: 3, reps: '10–12' },
      { nombre: 'Sentadilla búlgara', series: 3, reps: '8–10', nota: 'por pierna' },
      { nombre: 'Extensión de cuádriceps', series: 3, reps: '12–15' },
      { nombre: 'Curl femoral sentado', series: 3, reps: '10–12' },
      { nombre: 'Gemelo de pie', series: 4, reps: '10–15' },
    ],
  },
  {
    sesion: 'Pecho + tríceps + hombro',
    tipo: 'gym',
    ejercicios: [
      { nombre: 'Press banca plano', series: 4, reps: '6–8' },
      { nombre: 'Fondos con lastre', series: 3, reps: '8–10', nota: 'torso inclinado' },
      { nombre: 'Press declinado o press plano con mancuernas', series: 3, reps: '8–10' },
      { nombre: 'Cruces en polea de arriba hacia abajo', series: 3, reps: '12–15' },
      { nombre: 'Squeeze press', series: 2, reps: '10–12' },
      { nombre: 'Press militar', series: 3, reps: '8–10' },
      { nombre: 'Elevaciones laterales', series: 3, reps: '12–15' },
      { nombre: 'Extensión de tríceps en polea', series: 3, reps: '10–12' },
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
      { nombre: 'Dominadas o jalón', series: 4, reps: '6–10' },
      { nombre: 'Remo con barra', series: 3, reps: '8–10' },
      { nombre: 'Remo en polea sentado', series: 3, reps: '10–12' },
      { nombre: 'Face pull', series: 3, reps: '12–15' },
      { nombre: 'Curl con barra', series: 3, reps: '8–10' },
      { nombre: 'Curl martillo', series: 3, reps: '10–12' },
    ],
  },
  {
    sesion: 'Pierna B (femoral y glúteo)',
    tipo: 'gym',
    ejercicios: [
      { nombre: 'Peso muerto rumano', series: 4, reps: '6–8' },
      { nombre: 'Hip thrust', series: 3, reps: '8–10' },
      { nombre: 'Hack squat o prensa', series: 3, reps: '10–12' },
      { nombre: 'Curl femoral tumbado', series: 3, reps: '10–12' },
      { nombre: 'Gemelo sentado', series: 4, reps: '12–15' },
      { nombre: 'Abdominales', series: 3, reps: '10–15' },
    ],
  },
  {
    sesion: 'Torso completo',
    tipo: 'gym',
    ejercicios: [
      { nombre: 'Press inclinado', series: 3, reps: '8–10', nota: 'máquina o barra' },
      { nombre: 'Jalón agarre neutro', series: 3, reps: '10–12' },
      { nombre: 'Press plano con mancuernas', series: 3, reps: '8–12' },
      { nombre: 'Remo con mancuerna', series: 3, reps: '10–12' },
      { nombre: 'Elevaciones laterales', series: 3, reps: '15' },
      { nombre: 'Curl inclinado + extensión de tríceps sobre la cabeza', series: 3, reps: '12', nota: 'superserie' },
    ],
  },
  {
    sesion: 'Carrera 10 km (suave)',
    tipo: 'carrera',
    km: 10,
    ritmo: 'suave',
  },
];
