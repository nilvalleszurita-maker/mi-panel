// Utilidades compartidas por todos los módulos.
const U = {
  // Evita que el texto escrito por el usuario se interprete como HTML.
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  euros: n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n),
  // Fecha local en formato AAAA-MM-DD (sin desfases de zona horaria).
  iso(d = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },
  deIso: s => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); },
  MESES: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  DIAS: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  // Lunes de la semana de una fecha dada.
  lunes(d = new Date()) {
    const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
    return r;
  },
  // Índice del día con lunes = 0.
  diaSemana: (d = new Date()) => (d.getDay() + 6) % 7,
};
