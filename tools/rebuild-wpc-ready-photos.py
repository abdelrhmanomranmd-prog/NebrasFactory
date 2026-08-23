#!/usr/bin/env python3
"""Rebuild distinct WPC SKU photos — one accurate image per product variant."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / 'js' / 'nebras-platform.js'
CATALOG = ROOT / 'images' / 'catalog' / 'wpc-photos'
OUT = CATALOG / 'by-sku'
CANVAS = (960, 1200)
BG = (248, 250, 252)

# Per-SKU catalog source — each product gets its own visual identity
SKU_SOURCE: dict[str, str] = {
    # Flat plain
    'WPC-RDY-FLAT-45-STD': 'types/rdy-flat-plain.png',
    'WPC-SUP-FLAT-45-STD': 'types/sup-flat-plain.png',
    'WPC-RDY-FLAT-45-N110': 'types/rdy-flat-plain.png',
    'WPC-SUP-FLAT-45-N110': 'types/sup-flat-plain.png',
    # Flat decor
    'WPC-RDY-FLAT-STEEL': '17-flat-steel-decor.png',
    'WPC-SUP-FLAT-STEEL': '17-flat-steel-decor.png',
    'WPC-RDY-FLAT-GLASS': '27-flat-glass.png',
    'WPC-SUP-FLAT-GLASS': '27-flat-glass.png',
    'WPC-RDY-FLAT-CLS': '07-classic-panel.png',
    'WPC-SUP-FLAT-CLS': '07-classic-panel.png',
    # U45
    'WPC-RDY-U45-STD': 'types/rdy-u-plain.png',
    'WPC-SUP-U45-STD': 'types/sup-u-plain.png',
    'WPC-RDY-U45-CLS': '28-u-classic.png',
    'WPC-SUP-U45-CLS': '28-u-classic.png',
    'WPC-RDY-U45-STEEL': '29-u-steel.png',
    'WPC-SUP-U45-STEEL': '29-u-steel.png',
    # U60 — thicker frame look
    'WPC-RDY-U60-STD': '11-u-plain-door.png',
    'WPC-SUP-U60-STD': '11-u-plain-door.png',
    'WPC-RDY-U60-CLS': '28-u-classic.png',
    'WPC-SUP-U60-CLS': '28-u-classic.png',
    'WPC-RDY-U60-STEEL': '29-u-steel.png',
    'WPC-SUP-U60-STEEL': '29-u-steel.png',
    'WPC-RDY-U60-GLASS': '30-u60-glass.png',
    'WPC-SUP-U60-GLASS': '30-u60-glass.png',
    # Lib
    'WPC-RDY-LIB40-STD': 'types/rdy-lib-plain.png',
    'WPC-SUP-LIB40-STD': 'types/sup-lib-plain.png',
    'WPC-RDY-LIB40-STEEL': '31-lib-steel.png',
    'WPC-SUP-LIB40-STEEL': '31-lib-steel.png',
    'WPC-RDY-LIB40-GLASS': '32-lib-glass.png',
    'WPC-SUP-LIB40-GLASS': '32-lib-glass.png',
    'WPC-RDY-LIB40-CLS': '33-lib-classic.png',
    'WPC-SUP-LIB40-CLS': '33-lib-classic.png',
    # Leaf & quarter
    'WPC-RDY-LQ-FLAT': '05-leaf-quarter-flat.png',
    'WPC-SUP-LQ-FLAT': '05-leaf-quarter-flat.png',
    'WPC-RDY-LQ-U': '15-leaf-quarter-u.png',
    'WPC-SUP-LQ-U': '15-leaf-quarter-u.png',
    'WPC-RDY-LQ-LIB': '16-leaf-quarter-lib.png',
    'WPC-SUP-LQ-LIB': '16-leaf-quarter-lib.png',
    # Sliding
    'WPC-RDY-SLD-FLAT': '18-sliding-flat.png',
    'WPC-SUP-SLD-FLAT': '18-sliding-flat.png',
    'WPC-RDY-SLD-U': '19-sliding-u.png',
    'WPC-SUP-SLD-U': '19-sliding-u.png',
    'WPC-RDY-SLD-LIB': '34-sliding-lib.png',
    'WPC-SUP-SLD-LIB': '34-sliding-lib.png',
}

RAW_SOURCE = {
    'leaf-bare': '10-leaf-section.png',
    'leaf-clad': '26-raw-clad-leaf.png',
    'slice': '23-raw-slice.png',
    'frame': '21-raw-frame-profile.png',
    'decor': '22-raw-decor-profile.png',
    'u-profile': '20-raw-u-profile.png',
    'edge': '25-raw-edge-band.png',
    'pvc': '24-raw-pvc-sheet.png',
    'mdf': '09-mdf.png',
    'bone': '08-bone-profile.png',
}

JS = JS_PATH.read_text(encoding='utf-8')


def sample_wood(im: Image.Image, x: int, y: int) -> tuple:
    x = max(0, min(im.width - 1, x))
    y = max(0, min(im.height - 1, y))
    px = im.convert('RGB').getpixel((x, y))
    return px + (255,)


def strip_accessories_for_supply(im: Image.Image) -> Image.Image:
    out = im.convert('RGBA')
    w, h = out.size
    wood = sample_wood(out, int(w * 0.52), int(h * 0.48))
    draw = ImageDraw.Draw(out)
    draw.rectangle([int(w * 0.05), int(h * 0.36), int(w * 0.24), int(h * 0.54)], fill=wood)
    for hy in (0.22, 0.42, 0.62):
        draw.rectangle([int(w * 0.88), int(h * hy), w, int(h * (hy + 0.06))], fill=wood)
    return ImageEnhance.Color(out).enhance(0.96)


def thicken_u60_frame(im: Image.Image) -> Image.Image:
    """Visually distinguish U60 (60mm) from U45 (45mm)."""
    out = im.convert('RGBA')
    w, h = out.size
    draw = ImageDraw.Draw(out)
    wood = sample_wood(out, int(w * 0.5), int(h * 0.45))
    edge = tuple(max(0, c - 28) for c in wood[:3]) + (255,)
    band = max(8, int(w * 0.028))
    draw.rectangle([0, int(h * 0.08), band, int(h * 0.92)], fill=edge)
    draw.rectangle([w - band, int(h * 0.08), w, int(h * 0.92)], fill=edge)
    draw.rectangle([0, int(h * 0.08), w, int(h * 0.08) + band], fill=edge)
    return out


def scale_wide(im: Image.Image, factor: float = 1.1) -> Image.Image:
    w, h = im.size
    nw = int(w * factor)
    scaled = im.resize((nw, h), Image.Resampling.LANCZOS)
    left = (nw - w) // 2
    return scaled.crop((left, 0, left + w, h))


def normalize_to_canvas(im: Image.Image, wide: bool = False) -> Image.Image:
    canvas = Image.new('RGBA', CANVAS, BG + (255,))
    scale = min(CANVAS[0] * 0.92 / im.width, CANVAS[1] * 0.92 / im.height)
    if wide:
        scale *= 1.08
    nw = max(1, int(im.width * scale))
    nh = max(1, int(im.height * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    resized = ImageEnhance.Sharpness(resized).enhance(1.1)
    x = (CANVAS[0] - nw) // 2
    y = (CANVAS[1] - nh) // 2
    canvas.paste(resized, (x, y), resized if resized.mode == 'RGBA' else None)
    return canvas.convert('RGB')


def extract_variants(const_name: str):
    m = re.search(rf'{re.escape(const_name)} = \[(.*?)\n        \];', JS, re.S)
    if not m:
        return []
    rows = []
    for row in re.finditer(
        r"\{ id: '([^']+)', sku: '([^']+)', subCategoryId: '([^']+)'.*?typeAr: '([^']+)'",
        m.group(1),
        re.S,
    ):
        rows.append({'sku': row.group(2), 'sub': row.group(3), 'typeAr': row.group(4)})
    return rows


def extract_raw_rows(name: str):
    m = re.search(rf'{name} = \[(.*?)\];', JS, re.S)
    if not m:
        return []
    out = []
    for row in re.finditer(r"\['([^']*)', '([^']+)', '(WPC-RAW-[^']+)', '([^']+)'", m.group(1)):
        out.append({'sub': 'wpc-raw-bare' if 'BARE' in name else 'wpc-raw-clad', 'sku': row.group(3), 'typeAr': row.group(4)})
    return out


def raw_key(v):
    sku = v['sku'].upper()
    t = v['typeAr']
    clad = v['sub'] == 'wpc-raw-clad'
    if 'MDF' in sku:
        return 'mdf'
    if 'PVC' in sku:
        return 'pvc'
    if 'EDGE' in sku:
        return 'edge'
    if re.search(r'[-_]L\d|ضلف', sku + t):
        return 'leaf-clad' if clad else 'leaf-bare'
    if 'SL' in sku or 'slice' in t or 'شريحة' in t:
        return 'slice'
    if re.search(r'[-_]F\d|حلق', sku + t):
        return 'frame'
    if re.search(r'[-_]U|يو', sku + t):
        return 'u-profile'
    if 'D' in sku or 'ديكور' in t:
        return 'decor'
    return 'leaf-clad' if clad else 'bone'


def build_ready_photo(v) -> Image.Image:
    sku = v['sku']
    is_sup = v['sub'] == 'wpc-ready-supply'
    rel = SKU_SOURCE.get(sku, 'types/sup-flat-plain.png' if is_sup else 'types/rdy-flat-plain.png')
    src = CATALOG / rel
    if not src.exists():
        src = CATALOG / ('01-no-accessory.png' if is_sup else '02-with-accessory.png')
    im = Image.open(src).convert('RGBA')
    if 'U60' in sku.upper():
        im = thicken_u60_frame(im)
    if 'N110' in sku.upper():
        im = scale_wide(im, 1.12)
    if is_sup and not rel.startswith('types/sup'):
        im = strip_accessories_for_supply(im)
    wide = 'N110' in sku.upper()
    return normalize_to_canvas(im, wide=wide)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    lines = []
    ready = extract_variants('DEFAULT_WPC_READY_INSTALL_VARIANTS') + extract_variants(
        'DEFAULT_WPC_READY_SUPPLY_VARIANTS'
    )
    for v in ready:
        sku = v['sku']
        build_ready_photo(v).save(OUT / f'{sku}.png', 'PNG', optimize=True, compress_level=6)
        lines.append(f"            '{sku}': 'images/catalog/wpc-photos/by-sku/{sku}.png',")

    raw = extract_raw_rows('WPC_RAW_BARE_ROWS') + extract_raw_rows('WPC_RAW_CLAD_ROWS')
    for v in raw:
        rel = RAW_SOURCE.get(raw_key(v), '08-bone-profile.png')
        src = CATALOG / rel
        sku = v['sku']
        if src.exists():
            normalize_to_canvas(Image.open(src).convert('RGBA')).save(
                OUT / f'{sku}.png', 'PNG', optimize=True, compress_level=6
            )
        lines.append(f"            '{sku}': 'images/catalog/wpc-photos/by-sku/{sku}.png',")

    new_map = '        const WPC_SKU_PHOTO_MAP = {\n' + '\n'.join(lines) + '\n        };'
    js = JS_PATH.read_text(encoding='utf-8')
    js = re.sub(r'        const WPC_SKU_PHOTO_MAP = \{.*?\n        \};', new_map, js, count=1, flags=re.S)
    JS_PATH.write_text(js, encoding='utf-8')
    print('rebuilt', len(lines), 'SKU photos')

    wm = ROOT / 'tools' / 'apply-product-watermark.py'
    if wm.exists():
        subprocess.run([sys.executable, str(wm), '--size', '44', '--opacity', '0.88'], check=False)


if __name__ == '__main__':
    main()
