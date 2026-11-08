# Mi Panel

Web app personal (móvil y ordenador) para controlar finanzas y entrenos. Diseño oscuro, sin dependencias ni instalación.

## Secciones

- **Finanzas**:
  - Gráfica de anillo con dónde tienes el dinero (Robo advisor, Dinero, Efectivo, S&P 500, Cuenta remunerada… y las que añadas). Los saldos se calculan solos: los **ingresos se suman a Dinero**, los **gastos se restan de Dinero** y con **⇄ Mover** pasas dinero entre categorías sin cambiar el total. Con «Editar» puedes corregir un saldo para que cuadre con tu banco.
  - Gráfica de línea con el gasto de los últimos 12 meses.
  - Resumen mensual (ingresos, gastos y balance), gasto por categoría y lista de movimientos y traspasos (borrarlos deshace su efecto en los saldos).
- **Entrenos**: plan semanal (qué toca cada día, con ejercicios, series, repeticiones y peso) y registro de los días hechos en cada semana.
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
js/app.js             Pestañas, eventos y copia de seguridad
sw.js, manifest…      Instalación como app y uso sin conexión
```

### Añadir una sección nueva

1. Crea `js/<seccion>.js` siguiendo el patrón de `finanzas.js` (devuelve `{ id, nombre, icono, render, alClic }`).
2. Añade su espacio de datos en `porDefecto()` de `js/store.js`.
3. Inclúyelo en `index.html`, en la lista `MODULOS` de `js/app.js` y en `ARCHIVOS` de `sw.js`.
