// Genera dist/worker.js: un Worker de Cloudflare que lleva dentro todos los
// archivos de la app (copiados antes en dist/app por publicar.sh) y los sirve.
// Así la publicación solo necesita subir este archivo con la clave de la API.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const RAIZ = new URL('../dist/app/', import.meta.url).pathname;
const SALIDA = new URL('../dist/worker.js', import.meta.url).pathname;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function listar(dir) {
  return readdirSync(dir).flatMap(n => {
    const ruta = join(dir, n);
    return statSync(ruta).isDirectory() ? listar(ruta) : [ruta];
  });
}

const archivos = {};
for (const ruta of listar(RAIZ)) {
  const tipo = TIPOS[extname(ruta)];
  if (!tipo) throw new Error(`Tipo de archivo sin configurar: ${ruta}`);
  archivos['/' + relative(RAIZ, ruta)] = { tipo, b64: readFileSync(ruta).toString('base64') };
}

const codigo = `// Generado por scripts/construir-worker.mjs — no editar a mano.
const ARCHIVOS = ${JSON.stringify(archivos)};

// Se decodifican una sola vez, al arrancar el Worker.
const CONTENIDO = {};
for (const [ruta, { tipo, b64 }] of Object.entries(ARCHIVOS)) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  CONTENIDO[ruta] = { tipo, bytes };
}

export default {
  async fetch(peticion) {
    if (peticion.method !== 'GET' && peticion.method !== 'HEAD') {
      return new Response('Método no permitido', { status: 405 });
    }
    let ruta = new URL(peticion.url).pathname;
    if (ruta.endsWith('/')) ruta += 'index.html';
    const archivo = CONTENIDO[ruta];
    if (!archivo) return new Response('No encontrado', { status: 404 });
    return new Response(peticion.method === 'HEAD' ? null : archivo.bytes, {
      headers: {
        'content-type': archivo.tipo,
        // Siempre se comprueba si hay versión nueva: las actualizaciones llegan enseguida.
        'cache-control': 'no-cache',
      },
    });
  },
};
`;

writeFileSync(SALIDA, codigo);
console.log(`Worker generado con ${Object.keys(archivos).length} archivos (${(codigo.length / 1024).toFixed(0)} KB).`);
