# Pestaña Outfits — instrucciones para Claude Code

## Antes de empezar
1. Copia la carpeta `outfits-para-code/` dentro de la carpeta de tu app.
2. Descarga las fotos ya generadas siguiendo `fotos/LEEME.md`.
3. Abre Claude Code en la carpeta de tu app y pega el prompt de abajo.

---

## Prompt para pegar en Claude Code

```
Quiero añadir una pestaña "Outfits" a mi app. Todo lo que necesitas está en la
carpeta outfits-para-code/:

- armario.json → mis prendas ("prendas") y outfits ya montados ("outfits").
  Lee también "_como_funciona": explica las reglas.
- fotos/ → una imagen por prenda, llamada <id>.png. Faltan algunas (están en
  fotos/LEEME.md como pendientes): si falta la imagen, muestra una tarjeta gris
  con el nombre de la prenda. Cuando añada la foto más tarde debe aparecer sola.
- diseno/opcion1-cuadricula.png → referencia visual de cómo se ve un outfit.

Antes de escribir código:
1. Revisa cómo está hecha la app (framework, estilos, cómo guardo los datos en
   Finanzas y Gym) y usa el mismo stack y estilo visual.
2. Explícame en un plan corto qué archivos vas a crear o tocar. Espera mi OK.

La pestaña tiene 3 vistas:

1. OUTFIT DE HOY
   - Elige un outfit según el tiempo de Barcelona (API gratuita Open-Meteo, sin
     clave) y el tipo de día.
   - Clima por temperatura máxima del día: mucho_frio < 8 °C, frio 8–15,
     templado 15–22, calor > 22.
   - Selector de situación: clase, gym, tomar_algo, fiesta.
   - Botón "Otro" para ver otro outfit que cumpla lo mismo.
   - Botón "Me lo pongo" que registra el outfit en un historial con la fecha.
     Al elegir, evita los outfits usados en los últimos 3 días si hay otros.

2. OUTFITS
   - Filtros por clima y por situación (los mismos 8 apartados del JSON).
   - Cada outfit se muestra en CUADRÍCULA (como diseno/opcion1-cuadricula.png):
     · "abajo" (pantalón) en una columna alta a la izquierda.
     · A la derecha, en tarjetas: base, medio, abrigo y calzado (solo las capas
       que tenga el outfit).
     · Debajo, una fila de tarjetas pequeñas con los accesorios.
     · Cada foto va con su fondo gris tal cual, sin recortar, en tarjetas con
       esquinas redondeadas.
     · Si a un outfit le falta calzado, una tarjeta "+ Añadir calzado".
   - Tocando una prenda del outfit puedo cambiarla por otra del MISMO tipo de mi
     armario, y guardarlo como outfit nuevo o sustituir el original.
   - Botón para crear un outfit desde cero eligiendo prendas.
   - Muestra la "nota" del outfit si tiene.

3. ARMARIO
   - Todas las prendas con filtros por tipo (parte_arriba, parte_abajo, abrigo,
     calzado, accesorio) y por color.
   - Al tocar una prenda: su ficha (nombre, marca, abriga, formalidad, clima,
     ocasiones, notas) y la lista de outfits en los que aparece.
   - Poder añadir, editar y borrar prendas.

Importante:
- Una prenda existe UNA sola vez; los outfits solo guardan ids. Si edito o
  cambio la foto de una prenda, cambia en todos los outfits.
- Guarda los datos igual que guardo Finanzas y Gym, de forma que sea fácil
  pasarlo a Supabase más adelante (tablas prendas, outfits, outfit_prendas).
- Ignora los campos "imagen_canva" y "prompt_imagen_pendiente": son para mí.
- Modo oscuro, responsive (lo uso mucho en el móvil).
- Ve por partes y enséñame el resultado después de cada vista.
```

---

## Cuando lleguen las fotos que faltan
Guarda cada una en `fotos/` con su nombre (`<id>.png`). La app la mostrará sin
tocar nada más.
