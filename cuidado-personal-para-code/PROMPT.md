# Apartado "Cuidado personal" — instrucciones para Claude Code

Vista previa interactiva: https://claude.ai/artifact/ASiEN5Pah88i4vmmcoNtxK
(artboard "Más · Cuidado personal").

## Prompt para pegar en Claude Code

```
Quiero añadir un apartado "Cuidado personal" a mi app (dentro del menú "Más").
Todo está en la carpeta cuidado-personal-para-code/:

- diseno/Cuidado.dc.html → mockup de referencia. Está en un formato especial
  (<x-dc>, {{variables}}, <sc-for>): NO lo copies tal cual; úsalo como
  referencia de layout y comportamiento y rehazlo con el stack y estilo de mi app.
- datos/recomendaciones.json → recomendaciones por forma de cara (pelo, cejas,
  barba, gafas), consejos por tipo de piel, rutina base, recordatorios y las
  reglas para detectar la forma de la cara.

Antes de escribir código, revisa la app y explícame un plan corto. Espera mi OK.

1. ESCÁNER DE FORMA DE CARA (todo en el móvil, sin servidor)
   - Usa MediaPipe Face Landmarker (@mediapipe/tasks-vision, modelo
     face_landmarker.task) en el navegador con la cámara frontal
     (getUserMedia) o subiendo una foto.
   - Muestra un óvalo guía para colocar la cara. Pide buena luz, cara de frente,
     pelo apartado de la frente.
   - Calcula las medidas y aplica las reglas de "deteccion_forma" del JSON.
     Haz la media de unos 10 fotogramas para que sea estable.
   - La imagen NO se guarda ni se envía a ningún sitio; solo se guarda la forma
     resultante. Muéstralo en la pantalla.
   - Resultado: "Forma detectada: X (aprox.)" y chips para corregirla a mano.
   - Nada de notas, puntuaciones ni "defectos": solo forma y recomendaciones.

2. RECOMENDACIONES
   - Pestañas Pelo / Cejas / Barba / Gafas con los consejos de la forma elegida.
   - Botón para guardar un corte o estilo como favorito (y que aparezca en
     Outfits si es fácil).

3. CUIDADO DE LA PIEL
   - Test corto de 2 preguntas (está en piel.test) para elegir tipo de piel;
     también se puede elegir a mano.
   - Consejos según el tipo y rutina de mañana y noche como checklist diario.
   - La rutina se integra con mis Hábitos (racha incluida) en vez de duplicarse.

4. RECORDATORIOS
   - Corte de pelo, barba, entrecejo y foto de progreso del gym, cada X días
     (editable). Botón "Hecho hoy" que reinicia el contador.
   - Los que tocan en ≤ 3 días aparecen en la pantalla "Hoy".

5. FOTOS DE PROGRESO DEL GYM (opcional, en la pestaña Gym)
   - Guardar una foto cada 3 semanas con la misma pose; solo en el móvil
     (IndexedDB), nunca en el servidor. Vista "antes / ahora".

Guarda los datos igual que el resto de la app. Modo oscuro, responsive.
Ve por partes y enséñame cada una.
```
