#!/usr/bin/env python3
"""Populate door designer with real WPC factory door photos + leaf mask."""
from pathlib import Path
import shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SKU = ROOT / 'images' / 'catalog' / 'wpc-photos' / 'by-sku'
PRESETS = ROOT / 'images' / 'doors' / 'presets'

PRESET_MAP = {
    'edge-band/edge-1/outer-flat-plain.png': 'WPC-RDY-FLAT-45-STD.png',
    'edge-band/edge-1/outer-curve-plain.png': 'WPC-RDY-LQ-FLAT.png',
    'edge-band/edge-1/decor-transom.png': 'WPC-RDY-FLAT-45-N110.png',
    'edge-band/edge-2/outer-flat-plain.png': 'WPC-RDY-FLAT-45-STD.png',
    'edge-band/edge-2/outer-curve-plain.png': 'WPC-RDY-LQ-FLAT.png',
    'edge-band/edge-2/outer-flat-transom.png': 'WPC-RDY-FLAT-45-N110.png',
    'edge-band/edge-2/outer-curve-transom.png': 'WPC-RDY-FLAT-45-N110.png',
    'u-channel/u-plain/outer-flat-plain.png': 'WPC-RDY-U45-STD.png',
    'u-channel/u-plain/outer-curve-plain.png': 'WPC-RDY-LQ-U.png',
    'u-channel/u-slats/outer-flat-plain.png': 'WPC-RDY-U45-STD.png',
    'u-channel/u-slats/outer-curve-plain.png': 'WPC-RDY-LQ-U.png',
    'u-channel/u-classic/outer-flat-plain.png': 'WPC-RDY-U45-CLS.png',
    'u-channel/u-classic/outer-curve-plain.png': 'WPC-RDY-U45-CLS.png',
    'u-channel/u-glass/outer-flat-plain.png': 'WPC-RDY-U60-GLASS.png',
    'u-channel/u-glass/outer-curve-plain.png': 'WPC-RDY-U60-GLASS.png',
    'sliding/slide-1/outer-flat-transom.png': 'WPC-RDY-SLD-FLAT.png',
    'sliding/slide-1/outer-curve-transom.png': 'WPC-RDY-SLD-U.png',
    'sliding/slide-1/outer-flat-plain.png': 'WPC-RDY-SLD-FLAT.png',
    'sliding/slide-1/outer-curve-plain.png': 'WPC-RDY-SLD-U.png',
    'sliding/slide-2/outer-flat-transom.png': 'WPC-RDY-SLD-FLAT.png',
    'sliding/slide-2/outer-curve-transom.png': 'WPC-RDY-SLD-U.png',
    'sliding/slide-2/outer-flat-plain.png': 'WPC-RDY-SLD-FLAT.png',
    'sliding/slide-2/outer-curve-plain.png': 'WPC-RDY-SLD-U.png',
    'u-channel/_shared/transom-cladding-flat.png': 'WPC-RDY-FLAT-45-N110.png',
    'u-channel/_shared/transom-cladding-curve.png': 'WPC-RDY-LQ-FLAT.png',
}


def make_leaf_mask(out_path: Path, w: int = 960, h: int = 1200) -> None:
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    mx = int(w * 0.20)
    my = int(h * 0.10)
    draw.rounded_rectangle(
        [mx, my, w - mx, h - my - int(h * 0.08)],
        radius=max(6, w // 120),
        fill=(255, 255, 255, 255),
    )
    img.save(out_path, optimize=True)


def main():
    base_src = SKU / 'WPC-RDY-FLAT-45-STD.png'
    if not base_src.is_file():
        raise SystemExit(f'Missing source photo: {base_src}')

    shutil.copy2(base_src, ROOT / 'images' / 'wpc-door-real-base.png')
    print('wpc-door-real-base.png')

    make_leaf_mask(ROOT / 'images' / 'wpc-door-leaf-mask.png')
    print('wpc-door-leaf-mask.png')

    n = 0
    for rel, sku in PRESET_MAP.items():
        src = SKU / sku
        dst = PRESETS / rel
        if not src.is_file():
            print(f'SKIP missing sku {sku} for {rel}')
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        n += 1
    print(f'{n} preset photos in {PRESETS}')


if __name__ == '__main__':
    main()
