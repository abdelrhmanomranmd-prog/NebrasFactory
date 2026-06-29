#!/usr/bin/env python3
"""WPC supply-only door SVGs — ضلفة فقط · توريد · بدون اكسسوار."""
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'images', 'catalog', 'wpc-ready-supply')
os.makedirs(OUT, exist_ok=True)

PALETTE = {
    'frame': ('#5a6269', '#3a4046'),
    'leaf_light': '#e8eaee',
    'leaf_mid': '#c8ccd4',
    'leaf_dark': '#9aa0a8',
    'glass': ('rgba(200,225,245,0.85)', 'rgba(120,160,190,0.55)'),
}

W, H, FX, FY, FW, FH = 360, 640, 48, 24, 264, 580
BADGE = '''  <g>
    <rect x="24" y="548" width="312" height="40" rx="8" fill="#0d4a6e" opacity="0.93"/>
    <text x="180" y="574" text-anchor="middle" font-family="Segoe UI,Tahoma,sans-serif" font-size="12" font-weight="700" fill="#fff">توريد فقط · استلام المصنع · بدون اكسسوار</text>
  </g>'''


def svg_header():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img">
  <defs>
    <linearGradient id="frameG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{PALETTE['frame'][0]}"/><stop offset="100%" stop-color="{PALETTE['frame'][1]}"/>
    </linearGradient>
    <linearGradient id="leafG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="{PALETTE['leaf_light']}"/>
      <stop offset="50%" stop-color="{PALETTE['leaf_mid']}"/>
      <stop offset="100%" stop-color="{PALETTE['leaf_dark']}"/>
    </linearGradient>
    <linearGradient id="glassG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{PALETTE['glass'][0]}"/>
      <stop offset="100%" stop-color="{PALETTE['glass'][1]}"/>
    </linearGradient>
    <filter id="sh"><feDropShadow dx="6" dy="10" stdDeviation="8" flood-opacity="0.35"/></filter>
  </defs>
  <rect width="{W}" height="{H}" fill="#f0f3f7"/>
'''


def frame(arch=False):
    if arch:
        return f'    <path d="M{FX},{FY+FH} L{FX},{FY+FH*0.12} Q{FX+FW//2},{FY-FH*0.08} {FX+FW},{FY+FH*0.12} L{FX+FW},{FY+FH} Z" fill="url(#frameG)" stroke="#2e3338" stroke-width="2"/>'
    return f'    <rect x="{FX}" y="{FY}" width="{FW}" height="{FH}" rx="4" fill="url(#frameG)" stroke="#2e3338" stroke-width="2"/>'


def leaf_l(fx, fy, fw, fh, panels=0, grooves=False, strip=False):
    lx, ly, lw, lh = fx + 14, fy + 14, fw - 28, fh - 28
    p = [f'    <rect x="{lx}" y="{ly}" width="{lw}" height="{lh}" rx="3" fill="url(#leafG)" stroke="rgba(0,0,0,0.12)"/>']
    if strip:
        p.append(f'    <rect x="{lx+lw-18}" y="{ly+20}" width="8" height="{lh-40}" rx="2" fill="#a8b0b8"/>')
    if panels >= 4:
        pw, ph = lw // 2 - 8, lh // 2 - 8
        for px, py in [(lx+6, ly+6), (lx+lw//2+2, ly+6), (lx+6, ly+lh//2+2), (lx+lw//2+2, ly+lh//2+2)]:
            p.append(f'    <rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="2" fill="rgba(0,0,0,0.04)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>')
    elif panels == 2:
        pw, ph = lw - 12, (lh - 18) // 2
        p.append(f'    <rect x="{lx+6}" y="{ly+6}" width="{pw}" height="{ph}" rx="2" fill="rgba(0,0,0,0.04)" stroke="rgba(255,255,255,0.2)"/>')
        p.append(f'    <rect x="{lx+6}" y="{ly+ph+12}" width="{pw}" height="{ph}" rx="2" fill="rgba(0,0,0,0.04)" stroke="rgba(255,255,255,0.2)"/>')
    if grooves:
        for gy in [ly + lh * 0.32, ly + lh * 0.52, ly + lh * 0.72]:
            p.append(f'    <rect x="{lx+4}" y="{int(gy)}" width="{lw-8}" height="5" rx="2" fill="rgba(0,0,0,0.15)"/>')
    return '\n'.join(p)


def steel(fx, fy, fw, fh):
    lx, ly, lw, lh = fx + 14, fy + 14, fw - 28, fh - 28
    return f'''    <rect x="{lx+lw//2-40}" y="{ly+30}" width="80" height="{lh-60}" rx="4" fill="url(#frameG)" stroke="#8a929a" stroke-width="2"/>
    <line x1="{lx+lw//2}" y1="{ly+40}" x2="{lx+lw//2}" y2="{ly+lh-40}" stroke="#c0c8d0" stroke-width="2"/>'''


def glass(fx, fy, fw, fh):
    lx, ly, lw, lh = fx + 14, fy + 14, fw - 28, fh - 28
    gw, gh = lw - 40, int(lh * 0.38)
    return f'''    <rect x="{lx+20}" y="{ly+40}" width="{gw}" height="{gh}" rx="6" fill="url(#glassG)" stroke="#5a6269" stroke-width="3" stroke-dasharray="6 4"/>
    <text x="{lx+lw//2}" y="{ly+40+gh//2+4}" text-anchor="middle" font-size="11" fill="#5a6269" font-family="sans-serif">بدون زجاج</text>'''


def classic(fx, fy, fw, fh):
    lx, ly, lw, lh = fx + 14, fy + 14, fw - 28, fh - 28
    return f'''    <rect x="{lx+12}" y="{ly+12}" width="{lw-24}" height="{lh-24}" rx="3" fill="none" stroke="#a89060" stroke-width="3"/>
    <rect x="{lx+28}" y="{ly+28}" width="{lw-56}" height="{lh-56}" rx="2" fill="none" stroke="#a89060" stroke-width="2"/>'''


def build(name, arch=False, panels=0, grooves=False, strip=False, steel_d=False, glass_d=False, classic_d=False, double=False, sliding=False, sidelight=False):
    parts = [svg_header(), '  <g filter="url(#sh)">', frame(arch)]
    if double:
        hw = FW // 2 - 4
        parts.append(leaf_l(FX, FY, hw, FH, panels, grooves, strip))
        parts.append(leaf_l(FX + hw + 8, FY, hw, FH, panels, grooves, strip))
    elif sliding:
        parts.append(leaf_l(FX, FY, int(FW * 0.55), FH, panels, grooves, strip))
        parts.append(leaf_l(FX + int(FW * 0.42), FY, int(FW * 0.55), FH, panels, grooves, strip))
        parts.append(f'    <line x1="{FX+FW//2}" y1="{FY+10}" x2="{FX+FW//2}" y2="{FY+FH-10}" stroke="#4a5056" stroke-width="3" stroke-dasharray="8 6"/>')
    else:
        parts.append(leaf_l(FX, FY, FW, FH, panels, grooves, strip))
        if steel_d:
            parts.append(steel(FX, FY, FW, FH))
        if glass_d:
            parts.append(glass(FX, FY, FW, FH))
        if classic_d:
            parts.append(classic(FX, FY, FW, FH))
    if sidelight:
        parts.append(f'    <rect x="{FX+FW+6}" y="{FY+20}" width="70" height="{FH-40}" rx="2" fill="url(#glassG)" stroke="#5a6269" stroke-width="2"/>')
    parts.append(f'    <rect x="{FX-4}" y="{FY+FH-6}" width="{FW+8}" height="10" rx="2" fill="#3a4046"/>')
    parts.append(BADGE)
    parts.append('  </g></svg>')
    path = os.path.join(OUT, name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))
    print('wrote', path)


SPECS = [
    ('flat-plain.svg', dict(strip=True)),
    ('flat-steel.svg', dict(steel_d=True)),
    ('flat-glass.svg', dict(glass_d=True)),
    ('flat-classic.svg', dict(classic_d=True)),
    ('u-plain.svg', dict(arch=True, panels=4)),
    ('u-steel.svg', dict(arch=True, panels=4, steel_d=True)),
    ('u-classic.svg', dict(arch=True, panels=4, classic_d=True)),
    ('u60-plain.svg', dict(arch=True, panels=4, grooves=True)),
    ('u60-steel.svg', dict(arch=True, panels=4, steel_d=True, grooves=True)),
    ('u60-classic.svg', dict(arch=True, panels=4, classic_d=True, grooves=True)),
    ('u60-glass.svg', dict(arch=True, glass_d=True, grooves=True)),
    ('lib-plain.svg', dict(panels=2)),
    ('lib-steel.svg', dict(panels=2, steel_d=True)),
    ('lib-glass.svg', dict(panels=2, glass_d=True)),
    ('lib-classic.svg', dict(panels=2, classic_d=True)),
    ('leaf-quarter-flat.svg', dict(double=True, sidelight=True)),
    ('leaf-quarter-u.svg', dict(arch=True, double=True, sidelight=True, panels=4)),
    ('leaf-quarter-lib.svg', dict(double=True, sidelight=True, panels=2)),
    ('sliding-flat.svg', dict(sliding=True)),
    ('sliding-u.svg', dict(arch=True, sliding=True, panels=4)),
    ('sliding-lib.svg', dict(sliding=True, panels=2)),
]

for fname, opts in SPECS:
    build(fname, **opts)

print('Done:', len(SPECS), 'images')
