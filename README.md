# Mi Panel

Web app personal (móvil y ordenador) para controlar finanzas y entrenos. Diseño oscuro, sin dependencias ni instalación.

## Secciones

- **Finanzas**:
  - Gráfica de anillo con dónde tienes el dinero (Robo advisor, Dinero, Efectivo, S&P 500, Cuenta remunerada… y las que añadas). Los saldos se calculan solos: los **ingresos se suman a Dinero**, los **gastos se restan de Dinero** y con **⇄ Mover** pasas dinero entre categorías sin cambiar el total. Con «Editar» puedes corregir un saldo para que cuadre con tu banco.
  - Gráfica de línea con el gasto acumulado del mes: empieza en 0 € y sube en escalón con cada gasto (en el mes actual, hasta hoy).
  - Resumen mensual (ingresos, gastos y balance), gasto por categoría y lista de movimientos y traspasos (borrarlos deshace su efecto en los saldos).
- **Entrenos**: plan semanal (qué toca cada día, con ejercicios, series, repeticiones y peso) y registro de los días hechos en cada semana.
- **Gym**: registro diario de la planificación semanal.
  - Vista **Semana**: los 7 días con su sesión (se abre el de hoy). Cada ejercicio tiene casilla de hecho, una fila de kg y reps por serie, el objetivo de repeticiones, lo que hiciste la última vez (en gris) y botones para añadir o quitar series. Los días de carrera tienen distancia, tiempo (`52` o `52:30`) y el ritmo calculado en min/km. Notas por día. Todo se guarda al escribir.
  - Vista **Calendario**: días de gym en azul, de carrera en naranja y con las dos cosas partidos en diagonal. Pulsar un día lo abre en la vista Semana. Resumen del mes: días de gym, días de carrera y km.
  - Cada ejercicio muestra un personaje animado haciéndolo y un mapa del cuerpo (frente y espalda) con los músculos principales y secundarios.
  - La planificación está en `js/gym-plan.js`: cambia ejercicios, series o reps ahí sin tocar la lógica.
- *Próximamente*: comidas, horario diario y outfits.

## Cómo usarla

- **En local**: abre `index.html` en el navegador.
- **En el móvil**: publícala con GitHub Pages (Settings → Pages → rama `main`, carpeta `/`), abre la URL y usa «Añadir a pantalla de inicio». Funciona sin conexión.

Los datos se guardan **solo en el navegador de cada dispositivo** (`localStorage`). Usa el botón `⋯` para exportar o importar una copia en JSON (respaldo o paso de datos entre móvil y ordenador).

## Estructura

```
index.html            Estructura de la página
css/styles.css        Diseño (los colores están en variables al principio)
js/store.js           Guardado de datos
js/utils.js           Utilidades (fechas, formato de euros…)
js/finanzas.js        Módulo de finanzas
js/entrenos.js        Módulo de entrenos
js/gym-plan.js        Planificación del gym (solo datos, editable)
js/gym-figuras.js     Dibujos del gym: personajes animados y mapa de músculos
js/gym.js             Módulo de gym
js/app.js             Pestañas, eventos y copia de seguridad
sw.js, manifest…      Instalación como app y uso sin conexión
```

### Añadir una sección nueva

1. Crea `js/<seccion>.js` siguiendo el patrón de `finanzas.js` (devuelve `{ id, nombre, icono, render, alClic }`).
2. Añade su espacio de datos en `porDefecto()` de `js/store.js`.
3. Inclúyelo en `index.html`, en la lista `MODULOS` de `js/app.js` y en `ARCHIVOS` de `sw.js`.
