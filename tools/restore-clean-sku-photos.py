#!/usr/bin/env python3
"""Restore clean SKU photos (no baked watermark) from by-sku-clean archive."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
CLEAN = ROOT / 'images' / 'catalog' / 'wpc-photos' / 'by-sku-clean'
SKU = ROOT / 'images' / 'catalog' / 'wpc-photos' / 'by-sku'

def main():
    if not CLEAN.is_dir():
        raise SystemExit(f'Missing archive: {CLEAN}')
    SKU.mkdir(parents=True, exist_ok=True)
    n = 0
    for src in sorted(CLEAN.glob('*.png')):
        shutil.copy2(src, SKU / src.name)
        n += 1
    print(f'Restored {n} clean photos to {SKU}')

if __name__ == '__main__':
    main()
