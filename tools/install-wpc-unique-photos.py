#!/usr/bin/env python3
"""Copy generated unique SKU photos from assets to by-sku folder, normalized."""
import json
import re
from pathlib import Path
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path(r'C:\Users\abdel\.cursor\projects\c-Users-abdel-OneDrive-Desktop-NebrasFactory\assets')
OUT = ROOT / 'images' / 'catalog' / 'wpc-photos' / 'by-sku'
PROMPTS = ROOT / 'tools' / 'wpc-sku-photo-prompts.json'
JS_PATH = ROOT / 'js' / 'nebras-platform.js'
CANVAS = (960, 1200)
BG = (248, 250, 252)


def normalize(src, dst):
    im = Image.open(src).convert('RGBA')
    canvas = Image.new('RGBA', CANVAS, BG + (255,))
    scale = min(CANVAS[0] * 0.94 / im.width, CANVAS[1] * 0.94 / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    im = ImageEnhance.Sharpness(im).enhance(1.06)
    x, y = (CANVAS[0] - nw) // 2, (CANVAS[1] - nh) // 2
    canvas.paste(im, (x, y), im)
    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert('RGB').save(dst, 'PNG', optimize=True, compress_level=5)


def main():
    prompts = json.loads(PROMPTS.read_text(encoding='utf-8'))
    ok, miss = 0, []
    for item in prompts:
        sku = item['sku']
        src = ASSETS / f'{sku}.png'
        dst = OUT / f'{sku}.png'
        if src.exists():
            normalize(src, dst)
            ok += 1
        else:
            miss.append(sku)
    lines = [
        f"            '{item['sku']}': 'images/catalog/wpc-photos/by-sku/{item['sku']}.png',"
        for item in prompts
    ]
    js = JS_PATH.read_text(encoding='utf-8')
    # Only update ready door SKUs in map; keep raw SKUs from existing map
    ready_skus = {item['sku'] for item in prompts}
    m = re.search(r'        const WPC_SKU_PHOTO_MAP = \{(.*?)\n        \};', js, re.S)
    if m:
        existing = {}
        for row in re.finditer(r"'([^']+)': '([^']+)'", m.group(1)):
            existing[row.group(1)] = row.group(2)
        for sku in ready_skus:
            existing[sku] = f'images/catalog/wpc-photos/by-sku/{sku}.png'
        new_map = '        const WPC_SKU_PHOTO_MAP = {\n' + '\n'.join(
            f"            '{k}': '{v}'," for k, v in sorted(existing.items())
        ) + '\n        };'
        js = re.sub(r'        const WPC_SKU_PHOTO_MAP = \{.*?\n        \};', new_map, js, count=1, flags=re.S)
        JS_PATH.write_text(js, encoding='utf-8')
    print('normalized', ok, 'missing', miss)


if __name__ == '__main__':
    main()
