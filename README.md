# Mi Panel

Web app personal (móvil y ordenador) para controlar finanzas, gym, estudio, trabajo, comidas y outfits. Diseño oscuro, sin dependencias ni instalación.

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
  - Sincronización: cada vez que se abre, la app compara con `armario.json` y añade las prendas y outfits nuevos, y actualiza lo que cambie en el JSON si no lo has editado en la app (lo que borras en la app no vuelve). `scripts/armario-v1.json` es la primera versión, que sirve de referencia a los móviles que la cargaron antes de existir la sincronización.
  - Fotos: guarda cada una en `outfits-para-code/fotos/<id>.jpg` (también vale `.png`). `scripts/preparar-armario.py` las convierte a WebP de 600 px al publicar. Si falta una foto se ve una tarjeta gris con el nombre.
- **Estudio**: cuenta atrás de exámenes y calculadora de notas a partir de `estudio-y-trabajo-para-code/datos/asignaturas.json`.
  - Próximo examen en grande con los días que faltan; el resto en lista (en naranja si quedan 14 días o menos). Las fechas aproximadas se pueden fijar.
  - Por asignatura: escribe las notas que tengas y ves lo asegurado y la nota que necesitas en lo que falta para aprobar (con reconducciones y partes con media). Editor de evaluaciones con aviso si los pesos no suman 100.
  - El próximo examen aparece también en Hoy.
- **Trabajo**: días de agencia.
  - Cada día con lugar, horas (vale el turno de noche) e importe **por hora o fijo por día**, y si es **bruto o neto**: el bruto se pasa a neto con la retención (`neto = bruto × 398,02/435`, se cambia abajo con «Cambiar»); el neto se suma tal cual. Al escribir un lugar ya usado se rellenan sus horas e importe.
  - Resumen del mes en neto y bruto, cobrado/pendiente, días y horas, con selector de mes.
  - Tocar un día lo marca como cobrado y crea el ingreso «Agencia» en Finanzas (se suma a Dinero); desmarcarlo o borrar ese ingreso lo deja pendiente. Aviso si hay días sin cobrar de hace más de 30 días.
- **Comidas**: plan de comidas semanal a partir de `data/menu-comidas.json` (alimentos, platos, menú y objetivos: 3.100 kcal y 140 g de proteína). Solo texto.
  - Vista **Hoy**: barras de kcal y proteína de lo marcado como comido; las 5 comidas con su plato, ingredientes, kcal y proteína, y el check «Comido»; check «Creatina tomada» (hasta el 31/01/2027); interruptor «Hoy corro», que propone subir el arroz o la pasta de la comida a 160 g solo ese día.
  - Vista **Semana**: los 7 días con sus platos y el total de kcal y proteína; hoy resaltado y, en los días pasados, cuántas comidas marcaste (4/5).
  - Tocando un plato se edita: cantidades, quitar o añadir ingredientes, cambiarlo por otro plato, crear uno nuevo y añadir alimentos al catálogo. Al guardar eliges «Solo hoy» (cambio de esa fecha) o «Cambiar en el menú semanal».
  - Las kcal y la proteína se calculan siempre con los ingredientes. Se guardan aparte el menú base y el registro de cada día (ver `js/comidas-datos.js`). La proteína de la pantalla Hoy sale de aquí.
- **Hábitos** (solo en Hoy, al final): Leer 10 páginas, Menos de 3 h de móvil, Cosa buena del día y Habilidad de la semana.
  - Cada tarjeta muestra si hoy está sin hacer, mínimo ✓ o completo ✓✓, la 🔥 racha actual y la mejor. Si hoy aún no lo has hecho, la racha cuenta hasta ayer.
  - Leer: completo 10 páginas, mínimo 1. Móvil: completo < 3 h, mínimo < 4 h. Cosa buena: haber escrito algo. Habilidad: 15 min completo, 5 min mínimo.
  - Habilidad de la semana: las 60 de `data/habilidades.json`, una por semana desde la semana en que se instaló. Desde el domingo pregunta «¿La has aprendido?» (Sí/No) y pasa a la siguiente; si no contestas, sigue preguntando y no se salta ninguna.
  - **Cosas buenas** (menú ⋯ de arriba, menú «+» de Hoy o lateral del ordenador): todas las que has escrito por meses, con editar, borrar y «Recuerdo aleatorio».
  - Se guarda por fecha (páginas, horas de móvil, texto y práctica) más el índice de la habilidad, el inicio de su semana y el Sí/No de cada una. Las rachas se calculan del historial (ver `js/habitos-datos.js`).
- **Cuidado personal** (en «Más»), con los datos de `cuidado-personal-para-code/datos/recomendaciones.json`:
  - Escáner de la forma de la cara con MediaPipe Face Landmarker, con la cámara frontal (media de 10 fotogramas) o con una foto. Se analiza en el móvil y la imagen no se guarda ni se envía; MediaPipe se descarga de internet al escanear. La forma se puede corregir a mano.
  - Recomendaciones de pelo, cejas, barba y gafas según la forma; ☆ para guardar favoritos, que también salen en Outfits → Outfit de hoy.
  - Tipo de piel (test de 2 preguntas o a mano), consejos y rutina de mañana y noche, que es también el hábito «Rutina de piel» de Hoy.
  - Recordatorios (corte, barba, entrecejo, foto de progreso) cada X días con «Hecho hoy»; los que tocan en ≤ 3 días salen en Hoy.
- **Gym → Fotos**: fotos de progreso guardadas solo en el dispositivo (IndexedDB, base `mi-panel-progreso`), con vista antes / ahora, descargar y borrar. No van en la copia JSON.
- En el móvil la barra es Hoy · Finanzas · Gym · Estudio · Trabajo · **Más** (Comidas, Outfits y Ajustes).

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
js/gym-fotos.js       Fotos de progreso del gym (IndexedDB)
js/outfits-datos.js   Datos y reglas de Outfits
js/outfits.js         Módulo de Outfits
js/estudio-datos.js   Datos y cálculos de Estudio
js/estudio.js         Módulo de Estudio
js/trabajo.js         Módulo de Trabajo
js/comidas-datos.js   Datos y cálculos de Comidas
js/comidas.js         Módulo de Comidas
data/menu-comidas.json  Menú inicial de Comidas
js/habitos-datos.js   Datos y rachas de Hábitos
js/habitos.js         Tarjetas de Hábitos (en Hoy) y página Cosas buenas
data/habilidades.json Las 60 habilidades de la semana
js/cuidado.js         Cuidado personal (escáner, recomendaciones, piel, recordatorios)
cuidado-personal-para-code/  Datos y diseño de Cuidado personal
estudio-y-trabajo-para-code/  Fuente de asignaturas y diseños
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
