#!/usr/bin/env python3
"""Generate WPC raw section catalog SVGs (bare + clad)."""
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'images', 'catalog')

PALETTE_BARE = {'core': '#c8ccd4', 'edge': '#9aa0a8', 'accent': '#6b7280', 'badge': '#047857'}
PALETTE_CLAD = {'core': '#b8c4d0', 'edge': '#7a8a9a', 'accent': '#155e94', 'wrap': '#d4a574', 'badge': '#0284c7'}


def header(w, h, clad):
    p = PALETTE_CLAD if clad else PALETTE_BARE
    badge = 'ملبس' if clad else 'عضم'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img">
  <defs>
    <linearGradient id="core" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="{p['core']}"/><stop offset="100%" stop-color="{p['edge']}"/>
    </linearGradient>
    <filter id="sh"><feDropShadow dx="4" dy="6" stdDeviation="5" flood-opacity="0.25"/></filter>
  </defs>
  <rect width="{w}" height="{h}" fill="#eef2f7"/>
  <rect x="12" y="12" width="76" height="18" rx="9" fill="{p['badge']}" opacity="0.92"/>
  <text x="50" y="25" text-anchor="middle" font-family="Segoe UI,Tahoma,sans-serif" font-size="10" font-weight="700" fill="#fff">{badge}</text>
'''


def footer():
    return '</svg>\n'


def leaf(clad):
    w, h = 200, 260
    p = PALETTE_CLAD if clad else PALETTE_BARE
    s = header(w, h, clad)
    s += '  <g filter="url(#sh)">\n'
    if clad:
        s += '    <rect x="48" y="36" width="104" height="188" rx="6" fill="#d4a574" stroke="#8b6914" stroke-width="2"/>\n'
    s += f'''    <rect x="56" y="44" width="88" height="172" rx="4" fill="url(#core)" stroke="{p['accent']}" stroke-width="2"/>
    <rect x="68" y="56" width="64" height="72" rx="2" fill="rgba(255,255,255,0.15)"/>
    <rect x="68" y="136" width="64" height="72" rx="2" fill="rgba(0,0,0,0.06)"/>
  </g>
  <text x="100" y="248" text-anchor="middle" font-family="Segoe UI,Tahoma,sans-serif" font-size="11" fill="#475569">ضلفة</text>
'''
    return s + footer()


def frame(clad):
    w, h = 200, 200
    p = PALETTE_CLAD if clad else PALETTE_BARE
    s = header(w, h, clad)
    s += '  <g filter="url(#sh)">\n'
    if clad:
        s += '    <path d="M42 48 L158 48 L158 168 L42 168 Z" fill="none" stroke="#d4a574" stroke-width="14" stroke-linejoin="round"/>\n'
    s += f'''    <path d="M50 56 L150 56 L150 160 L50 160 Z" fill="none" stroke="url(#core)" stroke-width="18" stroke-linejoin="round"/>
    <rect x="72" y="78" width="56" height="60" fill="#eef2f7" opacity="0.5"/>
  </g>
  <text x="100" y="188" text-anchor="middle" font-family="Segoe UI,Tahoma,sans-serif" font-size="11" fill="#475569">حلق</text>
'''
    return s + footer()


def decor(kind, clad):
    w, h = 200, 120
    s = header(w, h, clad)
    labels = {'jumbo': 'ديكور جامبو', 'normal': 'ديكور عادي', 'flat': 'ديكور فلات'}
    if kind == 'jumbo':
        profile = '    <rect x="30" y="42" width="140" height="36" rx="4" fill="url(#core)" stroke="#6b7280" stroke-width="2"/>\n    <rect x="38" y="50" width="124" height="8" rx="2" fill="rgba(255,255,255,0.35)"/>\n    <rect x="38" y="62" width="124" height="8" rx="2" fill="rgba(0,0,0,0.08)"/>'
    elif kind == 'normal':
        profile = '    <rect x="40" y="50" width="120" height="22" rx="3" fill="url(#core)" stroke="#6b7280" stroke-width="2"/>\n    <rect x="48" y="56" width="104" height="4" rx="1" fill="rgba(255,255,255,0.4)"/>'
    else:
        profile = '    <rect x="35" y="48" width="130" height="26" rx="2" fill="url(#core)" stroke="#6b7280" stroke-width="2"/>'
    if clad:
        profile = '    <rect x="28" y="38" width="144" height="44" rx="6" fill="#d4a574" opacity="0.35"/>\n' + profile
    s += f'  <g filter="url(#sh)">\n{profile}\n  </g>\n  <text x="100" y="108" text-anchor="middle" font-family="Segoe UI,Tahoma,sans-serif" font-size="10" fill="#475569">{labels[kind]}</text>\n'
    return s + footer()


def u_profile(clad):
    w, h = 200, 140
    s = header(w, h, clad)
    wrap = '    <path d="M58 44 L142 44 L142 100 L58 100 Z" fill="none" stroke="#d4a574" stroke-width="10"/>\n' if clad else ''
    s += f'''  <g filter="url(#sh)">
{wrap}    <path d="M64 50 L136 50 L136 94 L64 94 Z" fill="none" stroke="url(#core)" stroke-width="14" stroke-linejoin="round"/>
  </g>
  <text x="100" y="128" text-anchor="middle" font-family="Segoe UI,Tahoma,sans-serif" font-size="11" fill="#475569">يو بروفايل</text>
'''
    return s + footer()


def slice_img(clad):
    w, h = 200, 100
    s = header(w, h, clad)
    s += '''  <g filter="url(#sh)">
    <rect x="24" y="44" width="152" height="28" rx="4" fill="url(#core)" stroke="#6b7280" stroke-width="2"/>
    <rect x="32" y="52" width="136" height="4" rx="1" fill="rgba(255,255,255,0.35)"/>
  </g>
  <text x="100" y="92" text-anchor="middle" font-family="Segoe UI,Tahoma,sans-serif" font-size="11" fill="#475569">شريحة slice</text>
'''
    return s + footer()


def edge_band(clad):
    w, h = 200, 80
    s = header(w, h, clad)
    s += '''  <g filter="url(#sh)">
    <rect x="20" y="46" width="160" height="10" rx="3" fill="#e8b84a" stroke="#b8860b" stroke-width="1.5"/>
    <rect x="28" y="48" width="144" height="3" rx="1" fill="rgba(255,255,255,0.4)"/>
  </g>
  <text x="100" y="74" text-anchor="middle" font-family="Segoe UI,Tahoma,sans-serif" font-size="10" fill="#475569">شريط ايدج باند</text>
'''
    return s + footer()


def pvc_sheet(clad):
    w, h = 200, 160
    s = header(w, h, clad)
    s += '''  <g filter="url(#sh)">
    <rect x="40" y="40" width="120" height="100" rx="4" fill="rgba(200,225,245,0.75)" stroke="#5b8fb9" stroke-width="2"/>
    <line x1="52" y1="52" x2="148" y2="128" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
    <line x1="148" y1="52" x2="52" y2="128" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
  </g>
  <text x="100" y="152" text-anchor="middle" font-family="Segoe UI,Tahoma,sans-serif" font-size="11" fill="#475569">PVC SHEET</text>
'''
    return s + footer()


def mdf_sheet(clad):
    w, h = 200, 160
    s = header(w, h, clad)
    s += '''  <g filter="url(#sh)">
    <rect x="36" y="44" width="128" height="92" rx="3" fill="#c4a574" stroke="#8b6914" stroke-width="2"/>
    <line x1="48" y1="56" x2="152" y2="124" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
    <line x1="152" y1="56" x2="48" y2="124" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
  </g>
  <text x="100" y="152" text-anchor="middle" font-family="Segoe UI,Tahoma,sans-serif" font-size="10" fill="#475569">ام دى اف 5 ملى</text>
'''
    return s + footer()


def write_all(folder, clad):
    os.makedirs(folder, exist_ok=True)
    files = {
        'leaf.svg': leaf(clad),
        'frame.svg': frame(clad),
        'decor-jumbo.svg': decor('jumbo', clad),
        'decor-normal.svg': decor('normal', clad),
        'decor-flat.svg': decor('flat', clad),
        'u-profile.svg': u_profile(clad),
        'slice.svg': slice_img(clad),
        'edge-band.svg': edge_band(clad),
        'pvc-sheet.svg': pvc_sheet(clad),
        'mdf-sheet.svg': mdf_sheet(clad),
    }
    for name, content in files.items():
        with open(os.path.join(folder, name), 'w', encoding='utf-8') as f:
            f.write(content)
    print(folder, len(files), 'SVGs')


if __name__ == '__main__':
    write_all(os.path.join(BASE, 'wpc-raw-bare'), False)
    write_all(os.path.join(BASE, 'wpc-raw-clad'), True)
