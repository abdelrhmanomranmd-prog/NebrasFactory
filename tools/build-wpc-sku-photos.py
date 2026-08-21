#!/usr/bin/env python3
"""Build per-SKU WPC door photos + JS map snippet (sup vs rdy distinct)."""
import os
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT / 'js' / 'nebras-platform.js').read_text(encoding='utf-8')
OUT_DIR = ROOT / 'images' / 'catalog' / 'wpc-photos' / 'by-sku'
CATALOG = ROOT / 'images' / 'catalog' / 'wpc-photos'

# Best existing asset per logical door key (sup = no accessories visible)
SOURCE = {
    ('sup', 'flat-plain'): '01-no-accessory.png',
    ('rdy', 'flat-plain'): '02-with-accessory.png',
    ('sup', 'flat-steel'): '17-flat-steel-decor.png',
    ('rdy', 'flat-steel'): '17-flat-steel-decor.png',
    ('sup', 'flat-glass'): '27-flat-glass.png',
    ('rdy', 'flat-glass'): '27-flat-glass.png',
    ('sup', 'flat-classic'): '07-classic-panel.png',
    ('rdy', 'flat-classic'): '07-classic-panel.png',
    ('sup', 'u-plain'): '11-u-plain-door.png',
    ('rdy', 'u-plain'): '11-u-plain-door.png',
    ('sup', 'u-classic'): '28-u-classic.png',
    ('rdy', 'u-classic'): '28-u-classic.png',
    ('sup', 'u-steel'): '29-u-steel.png',
    ('rdy', 'u-steel'): '29-u-steel.png',
    ('sup', 'u-glass'): '30-u60-glass.png',
    ('rdy', 'u-glass'): '30-u60-glass.png',
    ('sup', 'lib-plain'): '12-lib-plain-door.png',
    ('rdy', 'lib-plain'): '12-lib-plain-door.png',
    ('sup', 'lib-steel'): '31-lib-steel.png',
    ('rdy', 'lib-steel'): '31-lib-steel.png',
    ('sup', 'lib-glass'): '32-lib-glass.png',
    ('rdy', 'lib-glass'): '32-lib-glass.png',
    ('sup', 'lib-classic'): '33-lib-classic.png',
    ('rdy', 'lib-classic'): '33-lib-classic.png',
    ('sup', 'lq-flat'): '05-leaf-quarter-flat.png',
    ('rdy', 'lq-flat'): '05-leaf-quarter-flat.png',
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
        rows.append({'id': row.group(1), 'sku': row.group(2), 'sub': row.group(3), 'typeAr': row.group(4)})
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
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ready = extract_variants('DEFAULT_WPC_READY_INSTALL_VARIANTS') + extract_variants(
        'DEFAULT_WPC_READY_SUPPLY_VARIANTS'
    )
    raw = extract_raw_rows('WPC_RAW_BARE_ROWS') + extract_raw_rows('WPC_RAW_CLAD_ROWS')

    map_lines = []
    used_sources = {}

    for v in ready:
        mode, key = ready_key(v)
        src_name = SOURCE.get((mode, key), SOURCE.get((mode, 'flat-plain'), '01-no-accessory.png'))
        sku = v['sku']
        dest = OUT_DIR / f'{sku}.png'
        src = CATALOG / src_name
        if src.exists():
            shutil.copy2(src, dest)
        used_sources[sku] = (mode, key, src_name)
        rel = 'images/catalog/wpc-photos/by-sku/' + sku + '.png'
        map_lines.append(f"            '{sku}': '{rel}',")

    for v in raw:
        key = raw_key(v)
        src_name = RAW_SOURCE.get(key, '08-bone-profile.png')
        sku = v['sku']
        dest = OUT_DIR / f'{sku}.png'
        src = CATALOG / src_name
        if src.exists():
            shutil.copy2(src, dest)
        rel = 'images/catalog/wpc-photos/by-sku/' + sku + '.png'
        map_lines.append(f"            '{sku}': '{rel}',")

    snippet = ROOT / 'tools' / '_wpc_sku_photo_map_paths.js'
    snippet.write_text('const WPC_SKU_PHOTO_MAP = {\n' + '\n'.join(map_lines) + '\n        };', encoding='utf-8')
    print('SKUs', len(map_lines), 'out', OUT_DIR)
    dup = {}
    for sku, (mode, key, src) in used_sources.items():
        dup.setdefault((mode, key, src), []).append(sku)
    shared = [k for k, v in dup.items() if len(v) > 1]
    print('shared source groups', len(shared), '(need unique gen for sup vs rdy)')


if __name__ == '__main__':
    main()
