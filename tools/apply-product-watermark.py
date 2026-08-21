#!/usr/bin/env python3
"""Bake Nebras logo watermark into WPC product PNGs (images/catalog/wpc-photos/by-sku/)."""
from __future__ import annotations

import argparse
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit('Install Pillow: pip install pillow') from exc

ROOT = Path(__file__).resolve().parents[1]
SKU_DIR = ROOT / 'images' / 'catalog' / 'wpc-photos' / 'by-sku'
DEFAULT_LOGO = ROOT / 'images' / 'logo-nebras-mark.png'
FALLBACK_LOGO = ROOT / 'images' / 'logo-white.svg'


def load_logo(path: Path) -> Image.Image:
    if not path.exists():
        path = FALLBACK_LOGO if FALLBACK_LOGO.exists() else DEFAULT_LOGO
    logo = Image.open(path).convert('RGBA')
    return logo


def watermark_image(img_path: Path, logo: Image.Image, size_px: int, opacity: float, margin: int) -> bool:
    base = Image.open(img_path).convert('RGBA')
    w, h = base.size
    target_w = max(24, min(size_px, int(w * 0.22)))
    ratio = target_w / logo.width
    target_h = max(24, int(logo.height * ratio))
    mark = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
    if opacity < 1:
        alpha = mark.split()[3]
        alpha = alpha.point(lambda p: int(p * opacity))
        mark.putalpha(alpha)
    x = w - target_w - margin
    y = margin
    base.alpha_composite(mark, (x, y))
    base.convert('RGB').save(img_path, optimize=True)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description='Apply Nebras watermark to product SKU photos')
    parser.add_argument('--logo', type=Path, default=DEFAULT_LOGO)
    parser.add_argument('--size', type=int, default=52)
    parser.add_argument('--opacity', type=float, default=0.92)
    parser.add_argument('--margin', type=int, default=10)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    if not SKU_DIR.is_dir():
        print(f'SKU directory missing: {SKU_DIR}')
        return

    logo = load_logo(args.logo)
    pngs = sorted(SKU_DIR.glob('*.png'))
    if not pngs:
        print(f'No PNG files in {SKU_DIR}')
        return

    count = 0
    for png in pngs:
        if args.dry_run:
            print(f'Would watermark: {png.name}')
            count += 1
            continue
        watermark_image(png, logo, args.size, args.opacity, args.margin)
        count += 1
        print(f'Watermarked: {png.name}')

    print(f'Done — {count} images')


if __name__ == '__main__':
    main()
