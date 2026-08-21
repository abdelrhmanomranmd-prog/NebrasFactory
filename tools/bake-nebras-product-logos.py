#!/usr/bin/env python3
"""Create navy product badge and bake into all WPC SKU photos (by-sku/*.png)."""
from __future__ import annotations

import argparse
import re
import urllib.request
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError as exc:
    raise SystemExit('Install Pillow: pip install pillow') from exc

ROOT = Path(__file__).resolve().parents[1]
SKU_DIR = ROOT / 'images' / 'catalog' / 'wpc-photos' / 'by-sku'
SOURCE_LOGO = ROOT / 'images' / 'logo.png'
BADGE_OUT = ROOT / 'images' / 'logo-nebras-product-badge.png'
LIVE = 'https://www.nebrasplasticcompany.com'
NAVY = (10, 61, 98, 255)


def make_product_badge(out_path: Path, badge_px: int = 132) -> Image.Image:
    src = Image.open(SOURCE_LOGO).convert('RGBA')
    w, h = src.size
    icon = src.crop((int(w * 0.12), 0, int(w * 0.88), int(h * 0.36)))
    badge = Image.new('RGBA', (badge_px, badge_px), NAVY)
    draw = ImageDraw.Draw(badge)
    radius = int(badge_px * 0.14)
    draw.rounded_rectangle((0, 0, badge_px - 1, badge_px - 1), radius=radius, fill=NAVY)
    pad = int(badge_px * 0.16)
    inner = badge_px - pad * 2
    iw, ih = icon.size
    scale = min(inner / iw, inner / ih)
    nw, nh = max(1, int(iw * scale)), max(1, int(ih * scale))
    icon_r = icon.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (badge_px - nw) // 2
    oy = pad + (inner - nh) // 3
    badge.alpha_composite(icon_r, (ox, oy))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    badge.save(out_path, optimize=True)
    return badge


def list_skus_from_platform_js() -> list[str]:
    js = (ROOT / 'js' / 'nebras-platform.js').read_text(encoding='utf-8', errors='replace')
    return sorted(set(re.findall(r'by-sku/([A-Z0-9-]+)\.png', js)))


def download_sku(sku: str) -> bool:
    dest = SKU_DIR / f'{sku}.png'
    if dest.exists() and dest.stat().st_size > 5000:
        return True
    url = f'{LIVE}/images/catalog/wpc-photos/by-sku/{sku}.png'
    try:
        SKU_DIR.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, dest)
        return dest.exists() and dest.stat().st_size > 1000
    except Exception:
        return False


def bake_logo(img_path: Path, badge: Image.Image, margin: int, width_pct: float) -> None:
    base = Image.open(img_path).convert('RGBA')
    w, h = base.size
    target_w = max(36, min(int(w * width_pct), 160))
    ratio = target_w / badge.width
    target_h = max(36, int(badge.height * ratio))
    mark = badge.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = w - target_w - margin
    y = margin
    base.alpha_composite(mark, (x, y))
    base.convert('RGB').save(img_path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--margin', type=int, default=14)
    parser.add_argument('--width-pct', type=float, default=0.13)
    parser.add_argument('--skip-download', action='store_true')
    args = parser.parse_args()

    if not SOURCE_LOGO.exists():
        urllib.request.urlretrieve(f'{LIVE}/images/logo.png', SOURCE_LOGO)

    badge = make_product_badge(BADGE_OUT)
    print('Badge:', BADGE_OUT)

    skus = list_skus_from_platform_js()
    print('SKUs:', len(skus))

    if not args.skip_download:
        ok = 0
        for sku in skus:
            if download_sku(sku):
                ok += 1
        print('Downloaded/verified:', ok, '/', len(skus))

    baked = 0
    for sku in skus:
        path = SKU_DIR / f'{sku}.png'
        if not path.exists():
            print('MISSING', sku)
            continue
        bake_logo(path, badge, args.margin, args.width_pct)
        baked += 1
        print('Baked', sku)

    print('Done — baked', baked, 'images')


if __name__ == '__main__':
    main()
