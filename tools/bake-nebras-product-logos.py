#!/usr/bin/env python3
"""Bake a crisp semi-transparent Nebras watermark into WPC SKU photos."""
from __future__ import annotations

import argparse
import re
import shutil
import urllib.request
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError as exc:
    raise SystemExit('Install Pillow: pip install pillow') from exc

ROOT = Path(__file__).resolve().parents[1]
SKU_DIR = ROOT / 'images' / 'catalog' / 'wpc-photos' / 'by-sku'
CLEAN_DIR = ROOT / 'images' / 'catalog' / 'wpc-photos' / 'by-sku-clean'
SOURCE_LOGO = ROOT / 'images' / 'logo.png'
BADGE_OUT = ROOT / 'images' / 'logo-nebras-product-badge.png'
LIVE = 'https://www.nebrasplasticcompany.com'
NAVY = (10, 61, 98, 255)


def make_product_badge(out_path: Path, badge_px: int = 512) -> Image.Image:
    """High-res navy badge with white icon — source for supersampled watermark."""
    src = Image.open(SOURCE_LOGO).convert('RGBA')
    w, h = src.size
    icon = src.crop((int(w * 0.10), int(h * 0.02), int(w * 0.90), int(h * 0.34)))
    badge = Image.new('RGBA', (badge_px, badge_px), (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)
    radius = int(badge_px * 0.16)
    draw.rounded_rectangle((0, 0, badge_px - 1, badge_px - 1), radius=radius, fill=NAVY)
    pad = int(badge_px * 0.18)
    inner = badge_px - pad * 2
    iw, ih = icon.size
    scale = min(inner / iw, inner / ih) * 0.92
    nw, nh = max(1, int(iw * scale)), max(1, int(ih * scale))
    icon_r = icon.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (badge_px - nw) // 2
    oy = pad + max(0, (inner - nh) // 4)
    badge.alpha_composite(icon_r, (ox, oy))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    badge.save(out_path, optimize=True)
    return badge


def list_skus_from_platform_js() -> list[str]:
    js = (ROOT / 'js' / 'nebras-platform.js').read_text(encoding='utf-8', errors='replace')
    return sorted(set(re.findall(r'by-sku/([A-Z0-9-]+)\.png', js)))


def archive_clean_copy(sku: str) -> Path:
    CLEAN_DIR.mkdir(parents=True, exist_ok=True)
    src = SKU_DIR / f'{sku}.png'
    dest = CLEAN_DIR / f'{sku}.png'
    if not dest.exists() and src.exists():
        shutil.copy2(src, dest)
    return dest if dest.exists() else src


def build_watermark_mark(badge: Image.Image, mark_w: int, opacity: float) -> Image.Image:
    """Supersample 2x then downscale for crisp edges."""
    hi = max(mark_w * 2, 64)
    ratio = hi / badge.width
    hi_h = max(int(badge.height * ratio), 32)
    big = badge.resize((hi, hi_h), Image.Resampling.LANCZOS)
    mark = big.resize((mark_w, int(badge.height * mark_w / badge.width)), Image.Resampling.LANCZOS)
    r, g, b, a = mark.split()
    a = a.point(lambda p: int(p * opacity))
    return Image.merge('RGBA', (r, g, b, a))


def bake_watermark(img_path: Path, clean_path: Path, badge: Image.Image, margin: int, width_pct: float, opacity: float) -> None:
    source = clean_path if clean_path.exists() else img_path
    base = Image.open(source).convert('RGBA')
    w, h = base.size
    mark_w = max(44, min(int(w * width_pct), 140))
    mark = build_watermark_mark(badge, mark_w, opacity)
    mark_h = mark.height
    x = w - mark_w - margin
    y = margin

    shadow = Image.new('RGBA', (mark_w + 10, mark_h + 10), (0, 0, 0, 0))
    shadow_mask = mark.split()[3].point(lambda p: int(p * 0.35))
    shadow.paste((0, 0, 0, 0), (0, 0, mark_w + 10, mark_h + 10))
    shadow_layer = Image.new('RGBA', mark.size, (8, 30, 50, 0))
    shadow_layer.putalpha(shadow_mask)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=2))
    base.alpha_composite(shadow_layer, (x + 2, y + 3))
    base.alpha_composite(mark, (x, y))
    base.convert('RGB').save(img_path, optimize=True, quality=92)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--margin', type=int, default=16)
    parser.add_argument('--width-pct', type=float, default=0.095)
    parser.add_argument('--opacity', type=float, default=0.82)
    args = parser.parse_args()

    if not SOURCE_LOGO.exists():
        urllib.request.urlretrieve(f'{LIVE}/images/logo.png', SOURCE_LOGO)

    badge = make_product_badge(BADGE_OUT, badge_px=512)
    print('Badge:', BADGE_OUT, badge.size)

    skus = list_skus_from_platform_js()
    print('SKUs:', len(skus))

    baked = 0
    for sku in skus:
        path = SKU_DIR / f'{sku}.png'
        if not path.exists():
            print('MISSING', sku)
            continue
        clean = archive_clean_copy(sku)
        bake_watermark(path, clean, badge, args.margin, args.width_pct, args.opacity)
        baked += 1
        print('Watermarked', sku)

    print('Done —', baked, 'images (clean archive:', CLEAN_DIR, ')')


if __name__ == '__main__':
    main()
