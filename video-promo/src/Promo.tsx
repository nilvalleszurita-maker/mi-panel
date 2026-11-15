import React from 'react';
import {
  AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { loadFont } from '@remotion/fonts';
import { CTA, ESCENAS, INTRO, TAMANOS, URL_APP, type Escena, type Punto } from './escenas';

// Fuentes de la app (Inter y Space Grotesk, licencia OFL) incluidas en public/fuentes,
// para no depender de internet al renderizar. El subconjunto latino ya tiene á, ñ, ¿, ¡…
const INTER = 'Inter', GROTESK = 'Space Grotesk';
for (const w of ['500', '600', '700']) loadFont({ family: INTER, url: staticFile(`fuentes/inter-latin-${w}-normal.woff2`), weight: w });
for (const w of ['600', '700']) loadFont({ family: GROTESK, url: staticFile(`fuentes/space-grotesk-latin-${w}-normal.woff2`), weight: w });

// Colores de la app.
const C = {
  fondo: '#0f1115', superficie: '#181b22', borde: '#252a34', texto: '#e8eaf0', muted: '#9aa3b2',
  acento: '#8fa8ff', verde: '#7dd3a8', naranja: '#f5a524',
};

// Pantalla del móvil: el ancho de la app (390 px) ocupa ANCHO_PANTALLA píxeles del vídeo.
const ANCHO_PANTALLA = 660;
const ALTO_PANTALLA = Math.round((ANCHO_PANTALLA * 844) / 390);
const BISEL = 16;
const ARRIBA_MOVIL = 150;
const ESCALA_APP = ANCHO_PANTALLA / 390;
const suave = Easing.bezier(0.45, 0, 0.2, 1);

// ---------- Fondo con luces que se mueven despacio ----------
const Fondo: React.FC = () => {
  const f = useCurrentFrame();
  const luz = (color: string, x: number, y: number, r: number) =>
    `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, transparent ${r}%)`;
  return (
    <AbsoluteFill style={{
      backgroundColor: C.fondo,
      backgroundImage: [
        luz('rgba(143,168,255,.28)', 20 + 10 * Math.sin(f / 70), 18 + 6 * Math.cos(f / 90), 45),
        luz('rgba(125,211,168,.16)', 85 + 6 * Math.cos(f / 60), 55 + 8 * Math.sin(f / 80), 40),
        luz('rgba(245,165,36,.14)', 30 + 8 * Math.cos(f / 75), 92, 38),
      ].join(','),
    }} />
  );
};

// ---------- Cámara: interpola entre los puntos clave ----------
function camara(puntos: Punto[], f: number) {
  const valor = (k: 'zoom' | 'y' | 'ox' | 'oy', defecto: number) => {
    const fs = puntos.map(p => p.f);
    const vs = puntos.map(p => p[k] ?? defecto);
    if (fs.length === 1) return vs[0];
    return interpolate(f, fs, vs, { easing: suave, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  };
  return { zoom: valor('zoom', 1), y: valor('y', 0), ox: valor('ox', 0.5), oy: valor('oy', 0.5) };
}

// ---------- Móvil con la captura dentro ----------
const Movil: React.FC<{ escena: Escena }> = ({ escena }) => {
  const f = useCurrentFrame();
  const { zoom, y, ox, oy } = camara(escena.camara, f);
  const t = TAMANOS[escena.captura];
  const altoImg = (ANCHO_PANTALLA * t.height) / t.width;
  const maxY = Math.max(0, altoImg - ALTO_PANTALLA);
  const desplazado = Math.min(y * ESCALA_APP, maxY);
  const barra = escena.larga ? escena.captura.replace('-larga', '') : null;
  return (
    <div style={{
      position: 'absolute', left: (1080 - ANCHO_PANTALLA) / 2 - BISEL, top: ARRIBA_MOVIL,
      width: ANCHO_PANTALLA + BISEL * 2, height: ALTO_PANTALLA + BISEL * 2,
      borderRadius: 78, background: '#05060a', padding: BISEL,
      boxShadow: `0 0 0 3px ${C.borde}, 0 40px 120px rgba(0,0,0,.65), 0 0 90px rgba(143,168,255,.18)`,
    }}>
      <div style={{ position: 'relative', width: ANCHO_PANTALLA, height: ALTO_PANTALLA, borderRadius: 62, overflow: 'hidden', background: C.fondo }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: `${ox * 100}% ${oy * 100}%` }}>
          <Img src={staticFile(`capturas/${escena.captura}.png`)}
            style={{ position: 'absolute', left: 0, top: -desplazado, width: ANCHO_PANTALLA, height: altoImg }} />
          {barra && (
            // La barra de navegación fija, sacada de la captura normal de esa sección.
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, height: 76 * ESCALA_APP,
              backgroundImage: `url(${staticFile(`capturas/${barra}.png`)})`,
              backgroundSize: `${ANCHO_PANTALLA}px ${ALTO_PANTALLA}px`, backgroundPosition: 'bottom',
            }} />
          )}
        </div>
        {/* Cámara frontal (agujero pequeño para no tapar la app) */}
        <div style={{ position: 'absolute', top: 12, left: '50%', width: 24, height: 24, marginLeft: -12, borderRadius: 12, background: '#05060a', boxShadow: '0 0 0 3px rgba(5,6,10,.5)' }} />
      </div>
    </div>
  );
};

// ---------- Etiqueta de la sección ----------
const Etiqueta: React.FC<{ texto: string; numero: number }> = ({ texto, numero }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 4, fps, config: { damping: 14 } });
  return (
    <div style={{
      position: 'absolute', top: 58, left: 0, right: 0, display: 'flex', justifyContent: 'center',
      opacity: s, transform: `translateY(${(1 - s) * -30}px)`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 26px', borderRadius: 999,
        background: 'rgba(24,27,34,.85)', border: `2px solid ${C.borde}`,
        fontFamily: GROTESK, fontSize: 34, fontWeight: 700, letterSpacing: 3, color: C.texto, textTransform: 'uppercase',
      }}>
        <span style={{ color: C.acento }}>{String(numero).padStart(2, '0')}</span>
        {texto}
      </div>
    </div>
  );
};

// ---------- Subtítulos palabra a palabra ----------
// Las palabras entre *asteriscos* son la clave: van juntas en un recuadro naranja.
type Trozo = { palabras: string[]; clave: boolean };
function trocear(texto: string): Trozo[] {
  return texto.split(/(\*[^*]+\*)/).filter(Boolean).map(t => t.startsWith('*')
    ? { palabras: t.slice(1, -1).trim().split(/\s+/), clave: true }
    : { palabras: t.trim().split(/\s+/).filter(Boolean), clave: false }).filter(t => t.palabras.length);
}
const CADA = 5; // fotogramas entre palabra y palabra

export const Subtitulo: React.FC<{ texto: string; desde?: number; abajo?: number; tamano?: number }> = ({ texto, desde = 8, abajo = 120, tamano = 70 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  let i = 0;
  const palabra = (p: string, n: number, clave: boolean) => {
    const s = spring({ frame: f - desde - n * CADA, fps, config: { damping: 12, stiffness: 180 } });
    return (
      <span key={n} style={{
        display: 'inline-block', opacity: Math.min(1, s * 1.4),
        transform: `translateY(${(1 - s) * 40}px) scale(${0.8 + 0.2 * s})`,
        color: clave ? '#1a1206' : C.texto,
        textShadow: clave ? 'none' : '0 4px 18px rgba(0,0,0,.6)',
      }}>{p}</span>
    );
  };
  return (
    <div style={{
      position: 'absolute', left: 60, right: 60, bottom: abajo, display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
      alignItems: 'center', columnGap: 18, rowGap: 14,
      fontFamily: INTER, fontWeight: 700, fontSize: tamano, lineHeight: 1.15, textAlign: 'center',
    }}>
      {trocear(texto).map((t, k) => {
        const primero = i;
        const spans = t.palabras.map(p => palabra(p, i++, t.clave));
        if (!t.clave) return <React.Fragment key={k}>{spans}</React.Fragment>;
        // Recuadro naranja: aparece con la primera palabra clave y crece de izquierda a derecha.
        const s = spring({ frame: f - desde - primero * CADA, fps, config: { damping: 13, stiffness: 160 } });
        return (
          <span key={k} style={{ position: 'relative', display: 'inline-flex', columnGap: 18, padding: '4px 22px 10px' }}>
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 18, background: C.naranja,
              transform: `scaleX(${s}) rotate(-1.5deg)`, transformOrigin: 'left center',
              boxShadow: '0 10px 30px rgba(245,165,36,.35)',
            }} />
            <span style={{ position: 'relative', display: 'inline-flex', columnGap: 18 }}>{spans}</span>
          </span>
        );
      })}
    </div>
  );
};

// ---------- Escena de una sección: entra deslizando desde la derecha y sale por la izquierda ----------
const ENTRA = 14, SALE = 10;
const EscenaSeccion: React.FC<{ escena: Escena; numero: number }> = ({ escena, numero }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: f, fps, config: { damping: 16, stiffness: 120 }, durationInFrames: ENTRA });
  const sale = interpolate(f, [escena.duracion - SALE, escena.duracion], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  const x = (1 - entra) * 1080 - sale * 1080;
  const giro = (1 - entra) * 6 - sale * 6;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateX(${x}px) rotate(${giro}deg)`, opacity: 1 - sale * 0.4 }}>
        <Movil escena={escena} />
      </AbsoluteFill>
      <Etiqueta texto={escena.etiqueta} numero={numero} />
      <div style={{ opacity: 1 - sale }}>
        <Subtitulo texto={escena.texto} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- Intro ----------
const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const icono = spring({ frame: f - 2, fps, config: { damping: 11 } });
  const titulo = spring({ frame: f - 12, fps, config: { damping: 14 } });
  const sale = interpolate(f, [INTRO.duracion - 10, INTRO.duracion], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Abanico de tres pantallas que suben desde abajo.
  const pantallas = ['finanzas', 'hoy', 'gym'];
  return (
    <AbsoluteFill style={{ opacity: 1 - sale, transform: `scale(${1 + sale * 0.15})` }}>
      {pantallas.map((p, i) => {
        const s = spring({ frame: f - 18 - i * 5, fps, config: { damping: 15 } });
        const giro = (i - 1) * 12;
        const ancho = 380;
        return (
          <Img key={p} src={staticFile(`capturas/${p}.png`)} style={{
            position: 'absolute', width: ancho, left: 540 - ancho / 2 + (i - 1) * 260, top: 1020 + (i === 1 ? -40 : 30),
            borderRadius: 40, border: `6px solid #05060a`, boxShadow: '0 30px 80px rgba(0,0,0,.6)',
            transform: `translateY(${(1 - s) * 900}px) rotate(${giro * s}deg)`, zIndex: i === 1 ? 2 : 1,
          }} />
        );
      })}
      <div style={{ position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 }}>
        <Img src={staticFile('icono.png')} style={{ width: 190, height: 190, borderRadius: 48, transform: `scale(${icono})`, boxShadow: '0 20px 70px rgba(143,168,255,.4)' }} />
        <div style={{
          fontFamily: GROTESK, fontWeight: 700, fontSize: 132, color: C.texto, letterSpacing: -2,
          opacity: titulo, transform: `translateY(${(1 - titulo) * 40}px)`,
        }}>Mi Panel</div>
      </div>
      <Subtitulo texto={INTRO.texto} desde={22} abajo={1060} tamano={76} />
    </AbsoluteFill>
  );
};

// ---------- Llamada a la acción ----------
const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: f, fps, config: { damping: 15 } });
  const boton = spring({ frame: f - 30, fps, config: { damping: 10 } });
  const latido = 1 + 0.045 * Math.max(0, Math.sin((f - 45) / 6)) * (f > 45 ? 1 : 0);
  const chips = ['Gratis', 'Sin anuncios', 'Funciona sin conexión'];
  return (
    <AbsoluteFill>
      {/* Móvil pequeño con la pantalla de Hoy */}
      <Img src={staticFile('capturas/hoy.png')} style={{
        position: 'absolute', width: 400, left: 340, top: 120, borderRadius: 46, border: '10px solid #05060a',
        boxShadow: '0 30px 100px rgba(0,0,0,.6), 0 0 80px rgba(143,168,255,.25)',
        transform: `translateY(${(1 - entra) * -400}px) scale(${0.9 + 0.1 * entra})`, opacity: entra,
      }} />
      <div style={{
        position: 'absolute', top: 1040, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34,
        opacity: entra, transform: `translateY(${(1 - entra) * 60}px)`,
      }}>
        <div style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: 96, color: C.texto, letterSpacing: -1 }}>Mi Panel</div>
        <div style={{ display: 'flex', gap: 14 }}>
          {chips.map((c, i) => {
            const s = spring({ frame: f - 12 - i * 5, fps, config: { damping: 14 } });
            return (
              <span key={c} style={{
                fontFamily: INTER, fontWeight: 600, fontSize: 30, color: C.verde, padding: '10px 22px', borderRadius: 999,
                border: '2px solid rgba(125,211,168,.4)', background: 'rgba(125,211,168,.08)', opacity: s, transform: `scale(${s})`,
              }}>✓ {c}</span>
            );
          })}
        </div>
        <div style={{
          marginTop: 10, padding: '30px 56px', borderRadius: 28, background: C.acento, color: C.fondo,
          fontFamily: INTER, fontWeight: 700, fontSize: 48, transform: `scale(${boton * latido})`,
          boxShadow: `0 20px ${60 * latido}px rgba(143,168,255,.45)`,
        }}>Ábrela ahora →</div>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 34, color: C.muted, opacity: boton }}>{URL_APP}</div>
      </div>
      <Subtitulo texto={CTA.texto} desde={50} abajo={110} tamano={62} />
    </AbsoluteFill>
  );
};

// ---------- Vídeo completo ----------
export const Promo: React.FC = () => {
  let inicio = INTRO.duracion;
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <Fondo />
      <Sequence durationInFrames={INTRO.duracion} name="Intro"><Intro /></Sequence>
      {ESCENAS.map((e, i) => {
        const desde = inicio;
        inicio += e.duracion;
        return (
          <Sequence key={e.id} from={desde} durationInFrames={e.duracion} name={e.etiqueta}>
            <EscenaSeccion escena={e} numero={i + 1} />
          </Sequence>
        );
      })}
      <Sequence from={inicio} durationInFrames={CTA.duracion} name="Llamada a la acción"><Cta /></Sequence>
    </AbsoluteFill>
  );
};
