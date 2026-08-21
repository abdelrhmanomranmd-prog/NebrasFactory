#!/usr/bin/env python3
"""Generate WPC_SKU_PHOTO_MAP entries from platform.js variant definitions."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT / 'js' / 'nebras-platform.js').read_text(encoding='utf-8')

PHOTOS = {
    'noAccessory': '01-no-accessory.png',
    'withAccessory': '02-with-accessory.png',
    'glassFlat': '27-flat-glass.png',
    'glassLeafQuarter': '03-glass-leaf-quarter.png',
    'classicPanel': '07-classic-panel.png',
    'flatSteel': '17-flat-steel-decor.png',
    'uPlain': '11-u-plain-door.png',
    'uClassic': '28-u-classic.png',
    'uSteel': '29-u-steel.png',
    'uGlass': '30-u60-glass.png',
    'libPlain': '12-lib-plain-door.png',
    'libSteel': '31-lib-steel.png',
    'libGlass': '32-lib-glass.png',
    'libClassic': '33-lib-classic.png',
    'leafQuarterFlat': '05-leaf-quarter-flat.png',
    'leafQuarterU': '15-leaf-quarter-u.png',
    'leafQuarterLib': '16-leaf-quarter-lib.png',
    'slidingFlat': '18-sliding-flat.png',
    'slidingU': '19-sliding-u.png',
    'slidingLib': '34-sliding-lib.png',
    'mdf': '09-mdf.png',
    'leafSection': '10-leaf-section.png',
    'rawCladLeaf': '26-raw-clad-leaf.png',
    'boneProfile': '08-bone-profile.png',
    'rawFrame': '21-raw-frame-profile.png',
    'rawUProfile': '20-raw-u-profile.png',
    'rawDecor': '22-raw-decor-profile.png',
    'rawSlice': '23-raw-slice.png',
    'rawPvc': '24-raw-pvc-sheet.png',
    'rawEdgeBand': '25-raw-edge-band.png',
}

INSTALL_PLAIN = {'withAccessory'}
SUPPLY_PLAIN = {'noAccessory'}


def extract_variants(const_name):
    m = re.search(rf'{re.escape(const_name)} = \[(.*?)\n        \];', JS, re.S)
    if not m:
        return []
    block = m.group(1)
    out = []
    for row in re.finditer(
        r"\{ id: '([^']+)', sku: '([^']+)', subCategoryId: '([^']+)'.*?typeAr: '([^']+)'",
        block,
        re.S,
    ):
        out.append({'id': row.group(1), 'sku': row.group(2), 'sub': row.group(3), 'typeAr': row.group(4)})
    return out


def has_u_family(sku, t):
    return bool(re.search(r'(?:^WPC-(?:SUP|RDY)-U\d|[-_]U45|[-_]U60|LQ-U|SLD-U)', sku)) or t.startswith('باب U')


def has_lib_family(sku, t):
    return bool(re.search(r'LIB40|LQ-LIB|SLD-LIB', sku)) or 'Lib' in t


def ready_photo_key(v):
    sku = v['sku'].upper()
    sub = v['sub']
    t = v['typeAr']
    supply = sub == 'wpc-ready-supply'
    if 'LQ-U' in sku or ('ضلفة ورب' in t and '— U' in t):
        return 'leafQuarterU'
    if 'LQ-LIB' in sku or ('ضلفة ورب' in t and 'Lib' in t):
        return 'leafQuarterLib'
    if 'LQ' in sku or 'ضلفة ورب' in t or 'وربع' in t:
        return 'leafQuarterFlat'
    if 'SLD-U' in sku or ('سحاب' in t and ' U' in t and 'Lib' not in t and 'فلات' not in t):
        return 'slidingU'
    if 'SLD-LIB' in sku or ('سحاب' in t and 'Lib' in t):
        return 'slidingLib'
    if 'SLD' in sku or 'سحاب' in t or 'سحب' in t:
        return 'slidingFlat'
    if 'GLASS' in sku or 'زجاج' in t:
        if has_u_family(sku, t):
            return 'uGlass'
        if has_lib_family(sku, t):
            return 'libGlass'
        return 'glassFlat'
    if 'CLS' in sku or 'كلاسيك' in t:
        if has_u_family(sku, t):
            return 'uClassic'
        if has_lib_family(sku, t):
            return 'libClassic'
        return 'classicPanel'
    if 'STEEL' in sku or 'استيل' in t or 'ستان' in t:
        if has_u_family(sku, t):
            return 'uSteel'
        if has_lib_family(sku, t):
            return 'libSteel'
        return 'flatSteel'
    if has_u_family(sku, t):
        return 'uPlain'
    if has_lib_family(sku, t):
        return 'libPlain'
    return 'noAccessory' if supply else 'withAccessory'


def extract_raw_rows(name):
    m = re.search(rf'{name} = \[(.*?)\];', JS, re.S)
    if not m:
        return []
    out = []
    for row in re.finditer(r"\['([^']*)', '([^']+)', '(WPC-RAW-[^']+)', '([^']+)'", m.group(1)):
        out.append({'sub': 'wpc-raw-bare' if 'BARE' in name else 'wpc-raw-clad', 'id': row.group(2), 'sku': row.group(3), 'typeAr': row.group(4)})
    return out


def raw_photo_key(v):
    sku = v['sku'].upper()
    t = v['typeAr']
    clad = v['sub'] == 'wpc-raw-clad'
    if 'MDF' in sku:
        return 'mdf'
    if 'PVC' in sku:
        return 'rawPvc'
    if 'EDGE' in sku:
        return 'rawEdgeBand'
    if re.search(r'[-_]L\d|ضلف', sku + t):
        return 'rawCladLeaf' if clad else 'leafSection'
    if 'SL' in sku or 'slice' in t or 'شريحة' in t:
        return 'rawSlice'
    if re.search(r'[-_]F\d|حلق', sku + t):
        return 'rawFrame'
    if re.search(r'[-_]U|يو', sku + t):
        return 'rawUProfile'
    if 'D' in sku or 'ديكور' in t:
        return 'rawDecor'
    return 'rawCladLeaf' if clad else 'boneProfile'


def main():
    ready = extract_variants('DEFAULT_WPC_READY_INSTALL_VARIANTS') + extract_variants(
        'DEFAULT_WPC_READY_SUPPLY_VARIANTS'
    )
    raw = extract_raw_rows('WPC_RAW_BARE_ROWS') + extract_raw_rows('WPC_RAW_CLAD_ROWS')

    lines = []
    used = {}
    for v in ready:
        key = ready_photo_key(v)
        used.setdefault(key, set()).add(v['sku'])
        lines.append(f"            '{v['sku']}': WPC_CATALOG_PHOTOS.{key},")

    for v in raw:
        key = raw_photo_key(v)
        used.setdefault(key, set()).add(v['sku'])
        lines.append(f"            '{v['sku']}': WPC_CATALOG_PHOTOS.{key},")

    out = ROOT / 'tools' / '_wpc_sku_map_snippet.js'
    body = 'const WPC_SKU_PHOTO_MAP = {\n' + '\n'.join(lines) + '\n        };'
    out.write_text(body, encoding='utf-8')
    print('Wrote', out, 'keys', len(used), 'skus', len(lines))


if __name__ == '__main__':
    main()
