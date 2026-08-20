#!/usr/bin/env python3
"""Normalize WPC catalog photos to consistent e-commerce studio canvas."""
import os
import shutil
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'images', 'catalog', 'wpc-photos')
ASSETS = os.path.join(os.path.dirname(ROOT), 'assets')
if not os.path.isdir(ASSETS):
    ASSETS = os.path.join(ROOT, '.cursor', 'projects', 'c-Users-abdel-OneDrive-Desktop-NebrasFactory', 'assets')

CANVAS = (800, 1000)
BG = (248, 250, 252)

NEW_MAP = {
    '11-u-plain-door.png': '11-u-plain-door.png',
    '12-lib-plain-door.png': '12-lib-plain-door.png',
    '15-leaf-quarter-u.png': '15-leaf-quarter-u.png',
    '16-leaf-quarter-lib.png': '16-leaf-quarter-lib.png',
    '17-flat-steel-decor.png': '17-flat-steel-decor.png',
    '18-sliding-flat.png': '18-sliding-flat.png',
    '19-sliding-u.png': '19-sliding-u.png',
    '20-raw-u-profile.png': '20-raw-u-profile.png',
    '21-raw-frame-profile.png': '21-raw-frame-profile.png',
    '22-raw-decor-profile.png': '22-raw-decor-profile.png',
    '23-raw-slice.png': '23-raw-slice.png',
    '24-raw-pvc-sheet.png': '24-raw-pvc-sheet.png',
    '25-raw-edge-band.png': '25-raw-edge-band.png',
    '26-raw-clad-leaf.png': '26-raw-clad-leaf.png',
}


def normalize(path, out_path):
    im = Image.open(path).convert('RGBA')
    canvas = Image.new('RGBA', CANVAS, BG + (255,))
    scale = min(CANVAS[0] * 0.94 / im.width, CANVAS[1] * 0.94 / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    im = ImageEnhance.Sharpness(im).enhance(1.08)
    x, y = (CANVAS[0] - nw) // 2, (CANVAS[1] - nh) // 2
    canvas.paste(im, (x, y), im)
    canvas.convert('RGB').save(out_path, 'PNG', optimize=True, compress_level=9)
    return os.path.getsize(out_path)


def main():
    os.makedirs(OUT, exist_ok=True)
    for src_name, dst_name in NEW_MAP.items():
        src = os.path.join(ASSETS, src_name)
        if not os.path.exists(src):
            print('SKIP missing', src_name)
            continue
        dst = os.path.join(OUT, dst_name)
        size = normalize(src, dst)
        print('OK', dst_name, round(size / 1024), 'KB')
    # Re-normalize existing 01-10 for consistent framing
    for i in range(1, 11):
        fname = sorted(f for f in os.listdir(OUT) if f.startswith(f'{i:02d}-') and f.endswith('.png'))
        if not fname:
            continue
        path = os.path.join(OUT, fname[0])
        size = normalize(path, path)
        print('REFIT', fname[0], round(size / 1024), 'KB')


if __name__ == '__main__':
    main()
