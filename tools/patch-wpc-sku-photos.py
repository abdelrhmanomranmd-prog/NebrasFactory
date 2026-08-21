#!/usr/bin/env python3
"""Normalize type photos, build per-SKU images, patch WPC_SKU_PHOTO_MAP in platform.js."""
import re
import shutil
from pathlib import Path
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / 'js' / 'nebras-platform.js'
ASSETS = Path(r'C:\Users\abdel\.cursor\projects\c-Users-abdel-OneDrive-Desktop-NebrasFactory\assets')
CATALOG = ROOT / 'images' / 'catalog' / 'wpc-photos'
TYPES = CATALOG / 'types'
OUT = CATALOG / 'by-sku'
CANVAS = (900, 1125)
BG = (248, 250, 252)

SOURCE = {
    ('sup', 'flat-plain'): 'types/sup-flat-plain.png',
    ('rdy', 'flat-plain'): 'types/rdy-flat-plain.png',
    ('sup', 'flat-steel'): '17-flat-steel-decor.png',
    ('rdy', 'flat-steel'): '17-flat-steel-decor.png',
    ('sup', 'flat-glass'): '27-flat-glass.png',
    ('rdy', 'flat-glass'): '27-flat-glass.png',
    ('sup', 'flat-classic'): '07-classic-panel.png',
    ('rdy', 'flat-classic'): '07-classic-panel.png',
    ('sup', 'u-plain'): 'types/sup-u-plain.png',
    ('rdy', 'u-plain'): 'types/rdy-u-plain.png',
    ('sup', 'u-classic'): '28-u-classic.png',
    ('rdy', 'u-classic'): '28-u-classic.png',
    ('sup', 'u-steel'): '29-u-steel.png',
    ('rdy', 'u-steel'): '29-u-steel.png',
    ('sup', 'u-glass'): '30-u60-glass.png',
    ('rdy', 'u-glass'): '30-u60-glass.png',
    ('sup', 'lib-plain'): 'types/sup-lib-plain.png',
    ('rdy', 'lib-plain'): 'types/rdy-lib-plain.png',
    ('sup', 'lib-steel'): '31-lib-steel.png',
    ('rdy', 'lib-steel'): '31-lib-steel.png',
    ('sup', 'lib-glass'): '32-lib-glass.png',
    ('rdy', 'lib-glass'): '32-lib-glass.png',
    ('sup', 'lib-classic'): '33-lib-classic.png',
    ('rdy', 'lib-classic'): '33-lib-classic.png',
    ('sup', 'lq-flat'): 'types/sup-lq-flat.png',
    ('rdy', 'lq-flat'): 'types/rdy-lq-flat.png',
    ('sup', 'lq-u'): '15-leaf-quarter-u.png',
    ('rdy', 'lq-u'): '15-leaf-quarter-u.png',
    ('sup', 'lq-lib'): '16-leaf-quarter-lib.png',
    ('rdy', 'lq-lib'): '16-leaf-quarter-lib.png',
    ('sup', 'sld-flat'): '18-sliding-flat.png',
    ('rdy', 'sld-flat'): '18-sliding-flat.png',
    ('sup', 'sld-u'): '19-sliding-u.png',
    ('rdy', 'sld-u'): '19-sliding-u.png',
    ('sup', 'sld-lib'): '34-sliding-lib.png',
    ('rdy', 'sld-lib'): '34-sliding-lib.png',
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


def normalize(src, dst):
    im = Image.open(src).convert('RGBA')
    canvas = Image.new('RGBA', CANVAS, BG + (255,))
    scale = min(CANVAS[0] * 0.96 / im.width, CANVAS[1] * 0.96 / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    im = ImageEnhance.Sharpness(im).enhance(1.04)
    x, y = (CANVAS[0] - nw) // 2, (CANVAS[1] - nh) // 2
    canvas.paste(im, (x, y), im)
    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert('RGB').save(dst, 'PNG', optimize=True, compress_level=6)


def extract_variants(const_name):
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


def extract_raw_rows(name):
    m = re.search(rf'{name} = \[(.*?)\];', JS, re.S)
    if not m:
        return []
    out = []
    for row in re.finditer(r"\['([^']*)', '([^']+)', '(WPC-RAW-[^']+)', '([^']+)'", m.group(1)):
        out.append({'sub': 'wpc-raw-bare' if 'BARE' in name else 'wpc-raw-clad', 'sku': row.group(3), 'typeAr': row.group(4)})
    return out


def ready_key(v):
    sku = v['sku'].upper()
    mode = 'sup' if v['sub'] == 'wpc-ready-supply' else 'rdy'
    if 'LQ-U' in sku:
        return mode, 'lq-u'
    if 'LQ-LIB' in sku:
        return mode, 'lq-lib'
    if 'LQ' in sku or 'ضلفة ورب' in v['typeAr']:
        return mode, 'lq-flat'
    if 'SLD-U' in sku:
        return mode, 'sld-u'
    if 'SLD-LIB' in sku:
        return mode, 'sld-lib'
    if 'SLD' in sku or 'سحاب' in v['typeAr']:
        return mode, 'sld-flat'
    if 'GLASS' in sku or 'زجاج' in v['typeAr']:
        if re.search(r'U45|U60|^WPC-(SUP|RDY)-U', sku):
            return mode, 'u-glass'
        if 'LIB' in sku:
            return mode, 'lib-glass'
        return mode, 'flat-glass'
    if 'CLS' in sku or 'كلاسيك' in v['typeAr']:
        if re.search(r'U45|U60|^WPC-(SUP|RDY)-U', sku):
            return mode, 'u-classic'
        if 'LIB' in sku:
            return mode, 'lib-classic'
        return mode, 'flat-classic'
    if 'STEEL' in sku or 'استيل' in v['typeAr'] or 'ستان' in v['typeAr']:
        if re.search(r'U45|U60|^WPC-(SUP|RDY)-U', sku):
            return mode, 'u-steel'
        if 'LIB' in sku:
            return mode, 'lib-steel'
        return mode, 'flat-steel'
    if re.search(r'^WPC-(SUP|RDY)-U|U45|U60', sku) or v['typeAr'].startswith('باب U'):
        return mode, 'u-plain'
    if 'LIB' in sku or 'Lib' in v['typeAr']:
        return mode, 'lib-plain'
    return mode, 'flat-plain'


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


def main():
    TYPES.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for name in [
        'sup-flat-plain.png', 'rdy-flat-plain.png', 'sup-u-plain.png', 'rdy-u-plain.png',
        'sup-lib-plain.png', 'rdy-lib-plain.png', 'sup-lq-flat.png', 'rdy-lq-flat.png',
    ]:
        src = ASSETS / name
        if src.exists():
            normalize(src, TYPES / name)
            print('normalized', name)

    lines = []
    ready = extract_variants('DEFAULT_WPC_READY_INSTALL_VARIANTS') + extract_variants(
        'DEFAULT_WPC_READY_SUPPLY_VARIANTS'
    )
    for v in ready:
        mode, key = ready_key(v)
        rel = SOURCE.get((mode, key), SOURCE.get((mode, 'flat-plain')))
        src = CATALOG / rel
        sku = v['sku']
        dest = OUT / f'{sku}.png'
        if src.exists():
            shutil.copy2(src, dest)
        lines.append(f"            '{sku}': 'images/catalog/wpc-photos/by-sku/{sku}.png',")

    raw = extract_raw_rows('WPC_RAW_BARE_ROWS') + extract_raw_rows('WPC_RAW_CLAD_ROWS')
    for v in raw:
        rel = RAW_SOURCE.get(raw_key(v), '08-bone-profile.png')
        sku = v['sku']
        src = CATALOG / rel
        dest = OUT / f'{sku}.png'
        if src.exists():
            shutil.copy2(src, dest)
        lines.append(f"            '{sku}': 'images/catalog/wpc-photos/by-sku/{sku}.png',")

    new_map = '        const WPC_SKU_PHOTO_MAP = {\n' + '\n'.join(lines) + '\n        };'
    js = JS_PATH.read_text(encoding='utf-8')
    js = re.sub(r'        const WPC_SKU_PHOTO_MAP = \{.*?\n        \};', new_map, js, count=1, flags=re.S)
    JS_PATH.write_text(js, encoding='utf-8')
    print('OK', len(lines), 'SKU photos -> by-sku/')


if __name__ == '__main__':
    main()
