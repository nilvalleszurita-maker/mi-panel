# Pestañas Estudio y Trabajo — instrucciones para Claude Code

Vista previa interactiva: https://claude.ai/artifact/ASiEN5Pah88i4vmmcoNtxK
(artboards "Estudio · Calculadora de notas" y "Trabajo · Días de agencia").

## Prompt para pegar en Claude Code

```
Quiero añadir dos pestañas nuevas a mi app: "Estudio" y "Trabajo".
Todo está en la carpeta estudio-y-trabajo-para-code/:

- diseno/Notas.dc.html y diseno/Agencia.dc.html → mockups de referencia.
  Están en un formato especial (<x-dc>, {{variables}}, <sc-for>): NO los copies
  tal cual. Úsalos como referencia de layout, colores y comportamiento, y
  rehazlos con el mismo stack y estilo que ya usa mi app. La lógica de cálculo
  está en el <script> de cada archivo: puedes reutilizar las fórmulas.
- datos/asignaturas.json → mis asignaturas con los pesos REALES de cada
  evaluación, sus reglas (reconducción, re-evaluación) y las fechas de exámenes.

Antes de escribir código:
1. Revisa cómo está hecha la app y cómo guardo los datos de Finanzas.
2. Explícame en un plan corto qué archivos vas a crear o tocar. Espera mi OK.

PESTAÑA ESTUDIO (exámenes + calculadora de notas)
- Arriba, CUENTA ATRÁS: una tarjeta grande con el examen más cercano (días que
  faltan, nombre, asignatura, fecha) y debajo la lista del resto de exámenes con
  los días que quedan a cada uno (en naranja si faltan ≤ 14 días). Los exámenes
  ya pasados desaparecen. Si la fecha es aproximada (fecha_aprox), muestra el
  texto de fecha_texto y deja editar la fecha cuando sea segura.
- El examen más cercano también aparece en la pantalla "Hoy".
- Selector de asignatura arriba (chips).
- Tarjeta grande con la nota que NECESITO de media en lo que queda para llegar
  al objetivo: necesaria = (objetivo − Σ nota·peso/100) / (pesos pendientes/100).
  · Si ≤ 0 → "Ya tienes el objetivo asegurado" (verde).
  · Si > 10 → "Imposible" (rojo). Si > 7 → naranja.
  · Si no queda nada por evaluar → muestra la nota final y si llega o no.
- Barra con lo ya asegurado (sobre 10) y % pendiente.
- Lista de evaluaciones: nombre, peso, fecha, y campo para poner la nota
  (vacío = pendiente). Se recalcula al escribir.
- Reglas especiales del JSON:
  · Fluids: la RECONDUCCIÓN se puntúa sobre 5 y sustituye al 1r parcial si es
    mayor (nota efectiva del 1r parcial = max(parcial, reconducción)).
  · Informàtica: "Controles" (20 %) = media de Control 1 y Control 2. Muestra
    los dos por separado (cada uno equivale a un 10 %) y la media calculada.
    Control 1 ya tiene nota: 7,5.
  · Re-evaluación (Sistemes y Fluids): muestra la regla como texto informativo;
    si se usa, la nota final máxima es 5.
- Poder editar asignaturas, objetivos, evaluaciones, pesos y fechas. Avisar si
  los pesos no suman 100 %.
- Resumen de todas las asignaturas abajo.
- Las evaluaciones con fecha aparecen en la pantalla "Hoy" como próximo examen.

PESTAÑA TRABAJO (días de agencia)
- Botón "+" para añadir un día: fecha, lugar, hora inicio y fin, notas.
- Ajuste de tarifa €/h (y opción de importe fijo por día si un trabajo es así).
- BRUTO Y NETO: la tarifa es en bruto. Neto = bruto × 398,02 / 435.
  Muestra siempre los dos: el neto en grande y el bruto al lado (en el resumen
  del mes y en cada jornada). Guarda el factor 398,02/435 en ajustes para poder
  cambiarlo si cambia la retención.
- Resumen del mes: ganado (neto y bruto), cobrado, pendiente (barra verde/naranja), días y horas.
- Lista de jornadas; tocando una se marca como cobrada.
- IMPORTANTE: al marcar una jornada como cobrada, crea automáticamente un
  ingreso en Finanzas por el importe NETO (categoría "Agencia") con la fecha de cobro; al desmarcarla,
  bórralo. Así no lo apunto dos veces.
- Aviso si hay días pendientes de cobrar desde hace más de 30 días.
- Selector de mes para ver meses anteriores.

En la barra de navegación del móvil: Hoy · Finanzas · Gym · Estudio · Trabajo
(los Outfits y el resto pueden ir en un menú "Más" si no caben).

Guarda los datos igual que en Finanzas y Gym, fácil de pasar a Supabase
(tablas asignaturas, evaluaciones, jornadas_trabajo). Modo oscuro, responsive.
Ve por partes y enséñame cada pestaña antes de pasar a la siguiente.
```
