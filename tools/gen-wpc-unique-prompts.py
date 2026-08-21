#!/usr/bin/env python3
"""Per-SKU unique WPC door photo prompts — one distinct image per product."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT / 'js' / 'nebras-platform.js').read_text(encoding='utf-8')
OUT = ROOT / 'tools' / 'wpc-sku-photo-prompts.json'


def extract(block):
    m = re.search(rf'{block} = \[(.*?)\n        \];', JS, re.S)
    if not m:
        return []
    rows = []
    for row in re.finditer(
        r"sku: '([^']+)'.*?typeAr: '([^']+)'.*?sizeAr: '([^']+)'.*?colorAr: '([^']+)'",
        m.group(1),
        re.S,
    ):
        rows.append({'sku': row.group(1), 'typeAr': row.group(2), 'sizeAr': row.group(3), 'colorAr': row.group(4)})
    return rows


def accessory_line(color_ar, sku):
    if 'SUP' in sku or 'بدون' in color_ar:
        return 'NO handle, NO lock, NO hinges visible, factory bare door for supply only'
    return 'WITH modern black handle, lock and hinges installed, complete accessories'


def build_prompt(v):
    sku = v['sku']
    acc = accessory_line(v['colorAr'], sku)
    base = (
        'Professional WPC wood-plastic composite interior door, e-commerce product photo, '
        'light gray studio background, photorealistic 3D render, slight 3/4 angle, soft shadow, '
        'no text, no watermark, no logo. '
    )
    # SKU-specific visual identity
    specs = {
        'WPC-RDY-FLAT-45-STD': 'Flat flush door 45mm, plain wood grain panel, subtle edge strip, standard width 115cm look',
        'WPC-SUP-FLAT-45-STD': 'Flat flush door 45mm plain wood grain, subtle strip, standard width, bare factory door',
        'WPC-RDY-FLAT-45-N110': 'Flat flush door 45mm plain wood grain, visibly WIDER panel net-110 style, wider than standard',
        'WPC-SUP-FLAT-45-N110': 'Flat flush 45mm plain wood, WIDER net-110 door panel, bare no hardware',
        'WPC-RDY-FLAT-STEEL': 'Flat door with ONE vertical brushed stainless steel decorative strip on right side, wood left',
        'WPC-SUP-FLAT-STEEL': 'Flat door one-side stainless vertical strip decor, bare no handle',
        'WPC-RDY-FLAT-GLASS': 'Flat door with large frosted glass rectangular window center, glass installed',
        'WPC-SUP-FLAT-GLASS': 'Flat door glass opening frame only, NO glass inserted, empty glass slot',
        'WPC-RDY-FLAT-CLS': 'Flat door classic decor two arched recessed panels stacked vertically, warm walnut tone',
        'WPC-SUP-FLAT-CLS': 'Flat classic two arched panels decor, walnut wood, bare door',
        'WPC-RDY-U45-STD': 'U-profile door SLIM 45mm frame depth, plain oak wood grain, U-shaped frame visible',
        'WPC-SUP-U45-STD': 'U-profile SLIM 45mm plain oak, bare factory, no hardware',
        'WPC-RDY-U45-STEEL': 'U-profile SLIM 45mm frame, single narrow vertical stainless inlay on door face',
        'WPC-SUP-U45-STEEL': 'U-profile slim 45mm, stainless strip decor one side, no handle',
        'WPC-RDY-U45-CLS': 'U-profile slim 45mm, two small classic arched panel inserts, medium oak',
        'WPC-SUP-U45-CLS': 'U-profile slim 45mm classic arched panels, bare door',
        'WPC-RDY-U60-STD': 'U-profile THICK 60mm deep frame, plain wood grain, visibly thicker frame than 45mm',
        'WPC-SUP-U60-STD': 'U-profile THICK 60mm deep frame plain wood, bare no accessories',
        'WPC-RDY-U60-STEEL': 'U-profile THICK 60mm frame, WIDE brushed stainless vertical band decor, distinct from slim U45',
        'WPC-SUP-U60-STEEL': 'U-profile thick 60mm stainless band decor, bare factory door',
        'WPC-RDY-U60-CLS': 'U-profile thick 60mm, THREE large classic arched panels, rich dark wood',
        'WPC-SUP-U60-CLS': 'U-profile thick 60mm three arched classic panels, bare door',
        'WPC-RDY-U60-GLASS': 'U-profile thick 60mm, tall frosted glass panel upper two-thirds, glass included',
        'WPC-SUP-U60-GLASS': 'U-profile thick 60mm, empty glass frame cutout without glass, bare',
        'WPC-RDY-LIB40-STD': 'Lib slim 40mm minimalist frame, very thin profile plain wood door',
        'WPC-SUP-LIB40-STD': 'Lib 40mm slim plain wood door bare factory',
        'WPC-RDY-LIB40-STEEL': 'Lib 40mm slim frame, horizontal stainless accent line mid-height',
        'WPC-SUP-LIB40-STEEL': 'Lib 40mm horizontal stainless decor line, bare door',
        'WPC-RDY-LIB40-GLASS': 'Lib 40mm slim, small square glass window center, glass installed',
        'WPC-SUP-LIB40-GLASS': 'Lib 40mm empty square glass opening no glass, bare',
        'WPC-RDY-LIB40-CLS': 'Lib 40mm slim, single oval classic panel center, elegant',
        'WPC-SUP-LIB40-CLS': 'Lib 40mm oval classic panel decor bare door',
        'WPC-RDY-LQ-FLAT': 'Double unit: main flat door plus narrow quarter side panel attached, wide entrance',
        'WPC-SUP-LQ-FLAT': 'Leaf and quarter flat double unit wide, bare no hardware',
        'WPC-RDY-LQ-U': 'Leaf and quarter U-profile: main U door plus narrow U quarter panel, wide',
        'WPC-SUP-LQ-U': 'Leaf quarter U-style wide double unit bare factory',
        'WPC-RDY-LQ-LIB': 'Leaf and quarter Lib slim profile double door unit wide',
        'WPC-SUP-LQ-LIB': 'Leaf quarter Lib wide unit bare no accessories',
        'WPC-RDY-SLD-FLAT': 'Sliding pocket flat door on visible top aluminum track, sliding hardware',
        'WPC-SUP-SLD-FLAT': 'Sliding flat door on track bare no handle',
        'WPC-RDY-SLD-U': 'Sliding U-profile door on track, U frame visible, sliding system',
        'WPC-SUP-SLD-U': 'Sliding U door on rail bare factory',
        'WPC-RDY-SLD-LIB': 'Sliding Lib slim door on track, minimalist sliding',
        'WPC-SUP-SLD-LIB': 'Sliding Lib door on track bare no accessories',
    }
    visual = specs.get(sku, v['typeAr'])
    return base + visual + '. ' + acc + '.'


def main():
    variants = extract('DEFAULT_WPC_READY_INSTALL_VARIANTS') + extract('DEFAULT_WPC_READY_SUPPLY_VARIANTS')
    data = [{'sku': v['sku'], 'typeAr': v['typeAr'], 'prompt': build_prompt(v)} for v in variants]
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(len(data), 'prompts ->', OUT)


if __name__ == '__main__':
    main()
