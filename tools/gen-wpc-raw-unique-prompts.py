#!/usr/bin/env python3
"""Unique photo prompts for all 42 WPC raw profile SKUs."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT / 'js' / 'nebras-platform.js').read_text(encoding='utf-8')
OUT = ROOT / 'tools' / 'wpc-raw-photo-prompts.json'

BASE = (
    'Professional WPC factory product photo, light gray studio, photorealistic 3D, '
    'slight angle, soft shadow, no text, no watermark. '
)


def rows(name, clad):
    m = re.search(rf'{name} = \[(.*?)\];', JS, re.S)
    out = []
    for r in re.finditer(r"\['([^']*)', '([^']+)', '(WPC-RAW-[^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', ([\d.]+)\]", m.group(1)):
        out.append({
            'sku': r.group(3),
            'typeAr': r.group(4),
            'typeEn': r.group(5),
            'sizeAr': r.group(6),
            'clad': clad,
        })
    return out


def prompt(v):
    sku = v['sku']
    clad = v['clad']
    finish = (
        'CLAD with visible colored laminate roll wrap/film on surface, finished clad profile'
        if clad
        else 'BARE raw bone-gray WPC core, NO laminate, NO cladding, unfinished raw profile'
    )
    specs = {
        'WPC-RAW-B-L90': 'WPC door leaf slab bare bone profile 90cm wide',
        'WPC-RAW-C-L90': 'WPC door leaf slab CLAD laminate wrapped 90cm wide oak tone',
        'WPC-RAW-B-L105': 'WPC leaf slab bare 105cm wide thick',
        'WPC-RAW-C-L105': 'WPC leaf slab clad laminate 105cm wide walnut tone',
        'WPC-RAW-B-L80': 'WPC leaf slab bare narrow 80cm width',
        'WPC-RAW-C-L80': 'WPC leaf slab clad laminate narrow 80cm beige',
        'WPC-RAW-B-L100': 'WPC leaf slab bare 100cm width standard',
        'WPC-RAW-C-L100': 'WPC leaf slab clad laminate 100cm gray wood',
        'WPC-RAW-B-SL25': 'WPC slice profile strip cross-section 25cm',
        'WPC-RAW-C-SL25': 'WPC clad slice profile strip with laminate wrap 25cm',
        'WPC-RAW-B-F21': 'WPC flat door frame profile bare 21cm width extrusion',
        'WPC-RAW-C-F21': 'WPC flat frame profile clad laminate 21cm width',
        'WPC-RAW-B-F16': 'WPC flat frame bare 16cm width slim',
        'WPC-RAW-C-F16': 'WPC flat frame clad 16cm laminate wrap',
        'WPC-RAW-B-F10': 'WPC frame profile bare 10cm narrow',
        'WPC-RAW-C-F10': 'WPC frame profile clad 10cm laminate',
        'WPC-RAW-B-DJ260': 'WPC jumbo decor molding profile bare chunky 260cm length look',
        'WPC-RAW-C-DJ260': 'WPC jumbo decor molding clad laminate gold-oak 260cm',
        'WPC-RAW-B-DJ350': 'WPC jumbo decor profile bare long 350cm style',
        'WPC-RAW-C-DJ350': 'WPC jumbo decor clad laminate long profile',
        'WPC-RAW-B-DN260': 'WPC standard decor strip bare thin 260cm',
        'WPC-RAW-C-DN260': 'WPC standard decor strip clad laminate 260cm',
        'WPC-RAW-B-DN350': 'WPC standard decor bare long 350cm strip',
        'WPC-RAW-C-DN350': 'WPC standard decor clad laminate 350cm',
        'WPC-RAW-B-DF8260': 'WPC flat decor profile bare wide 8cm face 260cm',
        'WPC-RAW-C-DF8260': 'WPC flat decor clad wide laminate profile',
        'WPC-RAW-B-DF6260': 'WPC flat decor bare 6cm face profile',
        'WPC-RAW-C-DF6260': 'WPC flat decor clad 6cm laminate profile',
        'WPC-RAW-B-DF3260': 'WPC flat decor bare slim 3cm face',
        'WPC-RAW-C-DF3260': 'WPC flat decor clad slim laminate profile',
        'WPC-RAW-B-U45': 'WPC U-channel profile bare 45mm cross section extrusion',
        'WPC-RAW-C-U45': 'WPC U-channel clad laminate wrapped 45mm profile',
        'WPC-RAW-B-U6': 'WPC U profile bare 6cm wide channel',
        'WPC-RAW-C-U6': 'WPC U profile clad laminate 6cm channel',
        'WPC-RAW-B-UT': 'WPC U-T combination profile bare small T shape',
        'WPC-RAW-C-UT': 'WPC U-T profile clad laminate wrap',
        'WPC-RAW-B-EDGE': 'WPC edge band tape roll product bare white tape roll',
        'WPC-RAW-C-EDGE': 'WPC edge band tape roll clad colored woodgrain tape',
        'WPC-RAW-B-PVC': 'PVC sheet panel bare white smooth sheet',
        'WPC-RAW-C-PVC': 'PVC sheet with laminate overlay clad finish',
        'WPC-RAW-B-MDF': 'MDF 5mm sheet bare brown raw board',
        'WPC-RAW-C-MDF': 'MDF sheet clad laminated surface finish board',
    }
    visual = specs.get(sku, v['typeAr'] + ' ' + v['sizeAr'])
    return BASE + visual + '. ' + finish + '.'


def main():
    items = rows('WPC_RAW_BARE_ROWS', False) + rows('WPC_RAW_CLAD_ROWS', True)
    data = [{'sku': x['sku'], 'typeAr': x['typeAr'], 'prompt': prompt(x)} for x in items]
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(len(data), 'raw prompts')


if __name__ == '__main__':
    main()
