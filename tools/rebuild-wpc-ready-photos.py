#!/usr/bin/env python3
"""Restore HQ WPC SKU photos from by-sku-clean (no PIL hacks) + bake watermark."""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / 'js' / 'nebras-platform.js'
CATALOG = ROOT / 'images' / 'catalog' / 'wpc-photos'
CLEAN = CATALOG / 'by-sku-clean'
OUT = CATALOG / 'by-sku'


def main() -> None:
    if not CLEAN.is_dir():
        raise SystemExit(f'Missing clean catalog: {CLEAN}')

    OUT.mkdir(parents=True, exist_ok=True)
    pngs = sorted(CLEAN.glob('*.png'))
    if not pngs:
        raise SystemExit(f'No PNG files in {CLEAN}')

    lines = []
    for src in pngs:
        sku = src.stem
        dest = OUT / src.name
        shutil.copy2(src, dest)
        lines.append(f"            '{sku}': 'images/catalog/wpc-photos/by-sku/{sku}.png',")

    new_map = '        const WPC_SKU_PHOTO_MAP = {\n' + '\n'.join(lines) + '\n        };'
    js = JS_PATH.read_text(encoding='utf-8')
    js = re.sub(r'        const WPC_SKU_PHOTO_MAP = \{.*?\n        \};', new_map, js, count=1, flags=re.S)
    JS_PATH.write_text(js, encoding='utf-8')
    print('restored', len(lines), 'SKU photos from by-sku-clean')

    wm = ROOT / 'tools' / 'apply-product-watermark.py'
    if wm.exists():
        subprocess.run([sys.executable, str(wm), '--size', '40', '--opacity', '0.82'], check=False)


if __name__ == '__main__':
    main()
