// Guion del vídeo: 30 s a 30 fps = 900 fotogramas.
//
// Subtítulos: la palabra clave va entre *asteriscos* (pueden ser varias palabras
// seguidas) y sale en un recuadro naranja.
// Cámara: puntos clave (en fotogramas desde el inicio de la escena) con
//   zoom    → 1 = pantalla entera
//   y       → desplazamiento de la página en píxeles de la app (solo capturas «-larga»)
//   ox, oy  → punto hacia el que se hace el zoom (0–1 dentro de la pantalla)
import tamanos from '../public/capturas/capturas.json';

export const FPS = 30;
export const URL_APP = 'mi-paneldiario.nilvalleszurita.workers.dev';

export type Punto = { f: number; zoom: number; y?: number; ox?: number; oy?: number };
export type Escena = {
  id: string;
  etiqueta: string;
  duracion: number;
  captura: string;          // nombre en public/capturas sin .png
  larga?: boolean;          // la captura es la página entera y se desliza
  texto: string;
  camara: Punto[];
};

export const INTRO = { duracion: 90, texto: 'Toda tu vida en *una sola app*' };
export const CTA = { duracion: 120, texto: 'Pruébala *gratis* desde el móvil' };

export const ESCENAS: Escena[] = [
  {
    id: 'hoy', etiqueta: 'Hoy', duracion: 105, captura: 'hoy-larga', larga: true,
    texto: 'Empieza el día con todo de un *vistazo*',
    camara: [
      { f: 0, zoom: 1, y: 0, oy: 0.1 },
      { f: 30, zoom: 1.35, y: 0, ox: 0.5, oy: 0.12 },
      { f: 55, zoom: 1, y: 0, oy: 0.12 },
      { f: 100, zoom: 1, y: 560 },
    ],
  },
  {
    id: 'finanzas', etiqueta: 'Finanzas', duracion: 90, captura: 'finanzas-larga', larga: true,
    texto: 'Controla tu *dinero* sin hojas de cálculo',
    camara: [
      { f: 0, zoom: 1.3, y: 0, ox: 0.5, oy: 0.2 },
      { f: 40, zoom: 1, y: 0, oy: 0.2 },
      { f: 86, zoom: 1, y: 420 },
    ],
  },
  {
    id: 'gym', etiqueta: 'Gym', duracion: 90, captura: 'gym',
    texto: 'Apunta cada serie y *supera tu marca*',
    camara: [
      { f: 0, zoom: 1, ox: 0.5, oy: 0.5 },
      { f: 80, zoom: 1.4, ox: 0.5, oy: 0.72 },
    ],
  },
  {
    id: 'comidas', etiqueta: 'Comidas', duracion: 90, captura: 'comidas-larga', larga: true,
    texto: 'Tus kcal y tu *proteína* sin pensar',
    camara: [
      { f: 0, zoom: 1, y: 0, oy: 0.25 },
      { f: 35, zoom: 1.25, y: 0, ox: 0.5, oy: 0.27 },
      { f: 55, zoom: 1, y: 0, oy: 0.27 },
      { f: 86, zoom: 1, y: 380 },
    ],
  },
  {
    id: 'estudio', etiqueta: 'Estudio', duracion: 90, captura: 'estudio-larga', larga: true,
    texto: 'Cuenta atrás y la *nota que necesitas*',
    camara: [
      { f: 0, zoom: 1.3, y: 0, ox: 0.3, oy: 0.22 },
      { f: 40, zoom: 1, y: 0, oy: 0.22 },
      { f: 86, zoom: 1, y: 520 },
    ],
  },
  {
    id: 'trabajo', etiqueta: 'Trabajo', duracion: 75, captura: 'trabajo',
    texto: 'Sabe cuánto *cobras* de cada día',
    camara: [
      { f: 0, zoom: 1, oy: 0.3 },
      { f: 70, zoom: 1.35, ox: 0.5, oy: 0.3 },
    ],
  },
  {
    id: 'outfits', etiqueta: 'Outfits', duracion: 75, captura: 'outfits',
    texto: 'Qué ponerte según el *tiempo*',
    camara: [
      { f: 0, zoom: 1.3, ox: 0.5, oy: 0.15 },
      { f: 70, zoom: 1.3, ox: 0.5, oy: 0.85 },
    ],
  },
  {
    id: 'habitos', etiqueta: 'Hábitos', duracion: 75, captura: 'habitos',
    texto: 'Rachas que te *enganchan*',
    camara: [
      { f: 0, zoom: 1, oy: 0.2 },
      { f: 70, zoom: 1.4, ox: 0.25, oy: 0.3 },
    ],
  },
];

export const DURACION = INTRO.duracion + ESCENAS.reduce((s, e) => s + e.duracion, 0) + CTA.duracion;

// Tamaño (en píxeles de la captura) de cada imagen, de capturas.json.
export const TAMANOS = tamanos as Record<string, { width: number; height: number }>;
