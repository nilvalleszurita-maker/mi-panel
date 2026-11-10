# Mi Panel

Web app personal (móvil y ordenador) para controlar finanzas y entrenos. Diseño oscuro, sin dependencias ni instalación.

## Secciones

- **Finanzas**:
  - Gráfica de anillo con dónde tienes el dinero (Robo advisor, Dinero, Efectivo, S&P 500, Cuenta remunerada… y las que añadas). Los saldos se calculan solos: los **ingresos se suman a Dinero**, los **gastos se restan de Dinero** y con **⇄ Mover** pasas dinero entre categorías sin cambiar el total. Con «Editar» puedes corregir un saldo para que cuadre con tu banco.
  - Gráfica de línea con el gasto acumulado del mes: empieza en 0 € y sube en escalón con cada gasto (en el mes actual, hasta hoy).
  - Resumen mensual (ingresos, gastos y balance), gasto por categoría y lista de movimientos y traspasos (borrarlos deshace su efecto en los saldos).
- **Gym**: registro diario de la planificación semanal.
  - Vista **Semana**: los 7 días con su sesión (se abre el de hoy). Cada ejercicio tiene casilla de hecho, una fila de kg y reps por serie, el objetivo de repeticiones, lo que hiciste la última vez (en gris) y botones para añadir o quitar series. Los días de carrera tienen distancia, tiempo (`52` o `52:30`) y el ritmo calculado en min/km. Notas por día. Todo se guarda al escribir.
  - Vista **Calendario**: días de gym en azul, de carrera en naranja y con las dos cosas partidos en diagonal. Pulsar un día lo abre en la vista Semana. Resumen del mes: días de gym, días de carrera y km.
  - Cada ejercicio muestra un personaje animado haciéndolo y un mapa del cuerpo (frente y espalda) con los músculos principales y secundarios.
  - La planificación está en `js/gym-plan.js`: cambia ejercicios, series o reps ahí sin tocar la lógica.
- **Outfits**: armario y outfits a partir de `outfits-para-code/armario.json`.
  - Vista **Outfits**: filtros por clima y situación; cada outfit en cuadrícula (pantalón a la izquierda; base, medio, abrigo y calzado a la derecha; accesorios debajo). Tocando una prenda se cambia por otra del mismo tipo y se guarda como outfit nuevo o sustituyendo el original. Botón para crear outfits desde cero.
  - Vista **Outfit de hoy**: tiempo de Terrassa (Open-Meteo; la ciudad se cambia en `LUGAR`, en `js/outfits-datos.js`) → clima por temperatura máxima (< 8 mucho frío, 8–15 frío, 15–22 templado, > 22 calor), situación del día, «Otro» y «Me lo pongo» (historial; evita lo usado en los 3 días anteriores).
  - Vista **Armario**: prendas con filtros por tipo y color, ficha con los outfits donde aparece, y añadir, editar o borrar prendas (al borrarla se quita de sus outfits). Las fotos subidas desde la app se guardan en el dispositivo (IndexedDB) y no van en la copia de seguridad JSON.
  - Datos en tablas `prendas`, `outfits`, `outfit_prendas` y `outfit_historial` (ver `js/outfits-datos.js`). Una prenda existe una sola vez.
  - Fotos: guarda cada una en `outfits-para-code/fotos/<id>.png`. `scripts/preparar-armario.py` las convierte a WebP de 600 px al publicar. Si falta una foto se ve una tarjeta gris con el nombre.
- *Próximamente*: comidas, horario diario y outfits.

## Cómo usarla

- **En local**: abre `index.html` en el navegador.
- **Publicada**: https://mi-paneldiario.nilvalleszurita.workers.dev (Cloudflare). En el móvil, ábrela con Chrome y usa «Instalar aplicación». Funciona sin conexión.

Los datos se guardan **solo en el navegador de cada dispositivo** (`localStorage`). Usa el botón `⋯` para ver el estado del guardado y para exportar o importar una copia en JSON (respaldo o paso de datos entre móvil y ordenador).

## Publicar una versión nueva

La app se publica como un Worker de Cloudflare (`mi-paneldiario`) que lleva dentro todos los archivos:

```bash
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… ./publicar.sh
```

`publicar.sh` copia a `dist/` solo los archivos de la app tal como están en el último commit, genera `dist/worker.js` con `scripts/construir-worker.mjs` y lo sube con Wrangler. Sube también la versión de caché de `sw.js` cuando cambien los archivos, para que la app instalada se actualice.

## Estructura

```
index.html            Estructura de la página
css/styles.css        Diseño (los colores están en variables al principio)
js/store.js           Guardado de datos
js/utils.js           Utilidades (fechas, formato de euros…)
js/finanzas.js        Módulo de finanzas
js/gym-plan.js        Planificación del gym (solo datos, editable)
js/gym-figuras.js     Dibujos del gym: personajes animados y mapa de músculos
js/gym.js             Módulo de gym
js/outfits-datos.js   Datos y reglas de Outfits
js/outfits.js         Módulo de Outfits
outfits-para-code/    Fuente del armario (armario.json y fotos)
js/app.js             Pestañas, eventos y copia de seguridad
sw.js, manifest…      Instalación como app y uso sin conexión
publicar.sh           Publica la app en Cloudflare
wrangler.jsonc        Configuración de Cloudflare
scripts/              Generador del Worker que sirve la app
```

### Añadir una sección nueva

1. Crea `js/<seccion>.js` siguiendo el patrón de `finanzas.js` (devuelve `{ id, nombre, icono, render, alClic }`).
2. Añade su espacio de datos en `porDefecto()` de `js/store.js`.
3. Inclúyelo en `index.html`, en la lista `MODULOS` de `js/app.js` y en `ARCHIVOS` de `sw.js`.
