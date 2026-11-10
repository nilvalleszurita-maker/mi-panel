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
- datos/asignaturas.json → mis asignaturas con su objetivo de nota.

Antes de escribir código:
1. Revisa cómo está hecha la app y cómo guardo los datos de Finanzas.
2. Explícame en un plan corto qué archivos vas a crear o tocar. Espera mi OK.

PESTAÑA ESTUDIO (calculadora de notas)
- Selector de asignatura arriba (chips).
- Tarjeta grande con la nota que NECESITO de media en lo que queda para llegar
  al objetivo: necesaria = (objetivo − Σ nota·peso/100) / (pesos pendientes/100).
  · Si ≤ 0 → "Ya tienes el objetivo asegurado" (verde).
  · Si > 10 → "Imposible" (rojo). Si > 7 → naranja.
  · Si no queda nada por evaluar → muestra la nota final y si llega o no.
- Barra con lo ya asegurado (sobre 10) y % pendiente.
- Lista de evaluaciones: nombre, peso, fecha, y campo para poner la nota
  (vacío = pendiente). Se recalcula al escribir.
- Poder editar asignaturas, objetivos, evaluaciones y pesos (los del JSON son de
  ejemplo). Avisar si los pesos no suman 100 %.
- Resumen de todas las asignaturas abajo.
- Las evaluaciones con fecha aparecen en la pantalla "Hoy" como próximo examen.

PESTAÑA TRABAJO (días de agencia)
- Botón "+" para añadir un día: fecha, lugar, hora inicio y fin, notas.
- Ajuste de tarifa €/h (y opción de importe fijo por día si un trabajo es así).
- Resumen del mes: ganado, cobrado, pendiente (barra verde/naranja), días y horas.
- Lista de jornadas; tocando una se marca como cobrada.
- IMPORTANTE: al marcar una jornada como cobrada, crea automáticamente un
  ingreso en Finanzas (categoría "Agencia") con la fecha de cobro; al desmarcarla,
  bórralo. Así no lo apunto dos veces.
- Aviso si hay días pendientes de cobrar desde hace más de 30 días.
- Selector de mes para ver meses anteriores.

En la barra de navegación del móvil: Hoy · Finanzas · Gym · Estudio · Trabajo
(los Outfits y el resto pueden ir en un menú "Más" si no caben).

Guarda los datos igual que en Finanzas y Gym, fácil de pasar a Supabase
(tablas asignaturas, evaluaciones, jornadas_trabajo). Modo oscuro, responsive.
Ve por partes y enséñame cada pestaña antes de pasar a la siguiente.
```
