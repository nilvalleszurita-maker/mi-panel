# Vídeo promocional de Mi Panel

Vídeo vertical de 30 s (1080×1920, 30 fps) hecho con [Remotion](https://www.remotion.dev/).
Es independiente de la app: no se publica con ella.

## Guion

| Tiempo | Escena | Subtítulo (clave en naranja) |
|---|---|---|
| 0–3 s | Intro: icono, «Mi Panel» y tres pantallas en abanico | Toda tu vida en **una sola app** |
| 3–6,5 s | Hoy: zoom a las tarjetas y deslizamiento | Empieza el día con todo de un **vistazo** |
| 6,5–9,5 s | Finanzas: zoom al anillo y deslizamiento | Controla tu **dinero** sin hojas de cálculo |
| 9,5–12,5 s | Gym: zoom al ejercicio de hoy | Apunta cada serie y **supera tu marca** |
| 12,5–15,5 s | Comidas: zoom a las barras y deslizamiento | Tus kcal y tu **proteína** sin pensar |
| 15,5–18,5 s | Estudio: zoom a la cuenta atrás y deslizamiento | Cuenta atrás y la **nota que necesitas** |
| 18,5–21 s | Trabajo | Sabe cuánto **cobras** de cada día |
| 21–23,5 s | Outfits: recorrido de arriba abajo | Qué ponerte según el **tiempo** |
| 23,5–26 s | Hábitos: zoom a las rachas | Rachas que te **enganchan** |
| 26–30 s | Llamada a la acción con la URL | Pruébala **gratis** desde el móvil |

Los textos, las duraciones y los movimientos de cámara están en `src/escenas.ts`.
La palabra clave de cada subtítulo va entre `*asteriscos*`.

## Uso

```bash
npm install
```

```bash
npm run capturas
```

```bash
npm run studio
```

```bash
npm run render
```

- `capturas`: abre la app publicada con Playwright, la rellena con **datos de demostración**
  (no son datos reales), fija la fecha (jueves 12 nov 2026) y el tiempo de Terrassa, y guarda
  las capturas en `public/capturas/`. Para usar otra URL: `node scripts/capturas.mjs https://…`.
  Necesita Playwright con Chromium (`npm i -g playwright` y `npx playwright install chromium`);
  para otro navegador, `CHROMIUM_PATH=/ruta/al/navegador`.
- `studio`: vista previa interactiva para retocar el vídeo.
- `render`: genera `out/promo.mp4`. Si Remotion no puede descargar su navegador, indica uno con
  `REMOTION_BROWSER=/ruta` o `--browser-executable=/ruta`.

Las fuentes (Inter y Space Grotesk, licencia OFL) van en `public/fuentes/` para no depender de
internet al renderizar.
