#!/usr/bin/env python3
"""Prepara los datos de Outfits para la app.

Lee outfits-para-code/ (la fuente: armario.json y fotos/<id>.jpg o .png) y escribe en
<destino>/data/:
  - armario.json  sin los campos que son solo para el autor
                  (imagen_canva, prompt_imagen_pendiente).
  - fotos/<id>.webp  cada foto reducida a 600 px de lado mayor, sin recortar
                  (los PNG originales pesan ~700 KB; así quedan en ~30-50 KB).

Uso:  python3 scripts/preparar-armario.py <destino> [origen]
      origen: carpeta con armario.json y fotos/ (por defecto, outfits-para-code/).
      publicar.sh lo llama con dist/app y la copia de git; para probar en local, con «.».
Las fotos que aún no existen se ignoran: la app muestra una tarjeta gris.
"""
import json
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN_POR_DEFECTO = RAIZ / 'outfits-para-code'
LADO = 600
SOLO_AUTOR = ('imagen_canva', 'prompt_imagen_pendiente')


def fondo(im: Image.Image) -> str:
    """Color medio del borde de la foto (una franja de 3 px por cada lado), que es
    justo lo que toca la tarjeta cuando la foto no la llena."""
    w, h = im.size
    m = 3
    px = [im.getpixel((x, y)) for x in range(0, w, 4) for y in list(range(m)) + list(range(h - m, h))]
    px += [im.getpixel((x, y)) for y in range(0, h, 4) for x in list(range(m)) + list(range(w - m, w))]
    return '#' + ''.join(f'{sum(c[i] for c in px) // len(px):02x}' for i in range(3))


def main(destino: Path, ORIGEN: Path = ORIGEN_POR_DEFECTO) -> None:
    salida = destino / 'data'
    fotos = salida / 'fotos'
    fotos.mkdir(parents=True, exist_ok=True)

    datos = json.loads((ORIGEN / 'armario.json').read_text(encoding='utf-8'))
    for p in datos['prendas']:
        for campo in SOLO_AUTOR:
            p.pop(campo, None)
    (salida / 'armario.json').write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding='utf-8')

    # Primera versión del armario (la que cargaron los móviles antes de que la app
    # sincronizara): sirve para saber qué ha editado o borrado cada uno desde entonces.
    v1 = json.loads((RAIZ / 'scripts' / 'armario-v1.json').read_text(encoding='utf-8'))
    for p in v1['prendas']:
        for campo in SOLO_AUTOR:
            p.pop(campo, None)
    (salida / 'armario-v1.json').write_text(json.dumps({'prendas': v1['prendas'], 'outfits': v1['outfits']}, ensure_ascii=False), encoding='utf-8')

    hechas = 0
    fondos = {}
    # Fotos en JPG o PNG (si hubiera las dos de una prenda, se usa la última por orden).
    EXTENSIONES = {'.jpg', '.jpeg', '.png'}
    for png in sorted(f for f in (ORIGEN / 'fotos').iterdir() if f.suffix.lower() in EXTENSIONES):
        with Image.open(png) as im:
            im = im.convert('RGB')
            im.thumbnail((LADO, LADO), Image.LANCZOS)
            im.save(fotos / f'{png.stem}.webp', 'WEBP', quality=80, method=6)
            fondos[png.stem] = fondo(im)
        hechas += 1
    # Gris de fondo de cada foto: la tarjeta lo usa para que la foto, sin recortar,
    # se funda con ella.
    (fotos / 'fondos.json').write_text(json.dumps(fondos, indent=1), encoding='utf-8')
    peso = sum(f.stat().st_size for f in fotos.glob('*.webp')) / 1024
    print(f'Armario: {len(datos["prendas"])} prendas, {len(datos["outfits"])} outfits · '
          f'{hechas} fotos ({peso:.0f} KB en total)')


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3):
        sys.exit('Uso: python3 scripts/preparar-armario.py <destino> [origen]')
    main(Path(sys.argv[1]).resolve(), *(Path(a).resolve() for a in sys.argv[2:]))
