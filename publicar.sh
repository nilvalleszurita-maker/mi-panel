#!/usr/bin/env bash
# Publica la app en Cloudflare (Worker «mi-paneldiario»).
# 1. Copia a dist/app solo los archivos de la app, tal como están en el último
#    commit (lo que no esté guardado en git no se publica).
# 2. Genera dist/worker.js, que los lleva dentro y los sirve.
# 3. Lo sube con Wrangler.
# Necesita CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID en el entorno.
set -euo pipefail
cd "$(dirname "$0")"

ARCHIVOS=(index.html manifest.webmanifest sw.js css icons js)

rm -rf dist
mkdir -p dist/app
git archive HEAD "${ARCHIVOS[@]}" | tar -x -C dist/app
# Armario de Outfits: armario.json y fotos optimizadas desde outfits-para-code/.
git archive HEAD outfits-para-code | tar -x -C dist
python3 scripts/preparar-armario.py dist/app dist/outfits-para-code
# Asignaturas de Estudio.
git show HEAD:estudio-y-trabajo-para-code/datos/asignaturas.json > dist/app/data/asignaturas.json
node scripts/construir-worker.mjs

npx --yes wrangler@4 deploy "$@"
