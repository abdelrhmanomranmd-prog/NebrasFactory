#!/usr/bin/env python3
"""Generate realistic WPC door catalog SVG images for Nebras store."""
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'images', 'catalog', 'wpc-ready-install')
os.makedirs(OUT, exist_ok=True)

PALETTE = {
    'frame': ('#5a6269', '#3a4046'),
    'leaf_light': '#e8eaee',
    'leaf_mid': '#c8ccd4',
    'leaf_dark': '#9aa0a8',
    'steel': ('#b8c0c8', '#6a727a'),
    'glass': ('rgba(200,225,245,0.85)', 'rgba(120,160,190,0.55)'),
    'gold': ('#d4af37', '#8b6914'),
    'wood': ('#c4a574', '#8b6914'),
}


def svg_header(w, h):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img">
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
  <rect width="{w}" height="{h}" fill="#eef1f5"/>
'''


def frame(w, h, fx, fy, fw, fh, arch=False):
    parts = [f'  <g filter="url(#sh)">']
    if arch:
        parts.append(f'    <path d="M{fx},{fy+fh} L{fx},{fy+fh*0.12} Q{fx+fw//2},{fy-fh*0.08} {fx+fw},{fy+fh*0.12} L{fx+fw},{fy+fh} Z" fill="url(#frameG)" stroke="#2e3338" stroke-width="2"/>')
    else:
        parts.append(f'    <rect x="{fx}" y="{fy}" width="{fw}" height="{fh}" rx="4" fill="url(#frameG)" stroke="#2e3338" stroke-width="2"/>')
    return '\n'.join(parts)


def leaf(fx, fy, fw, fh, panels=0, grooves=False, strip=False):
    lx, ly, lw, lh = fx + 14, fy + 14, fw - 28, fh - 28
    parts = [f'    <rect x="{lx}" y="{ly}" width="{lw}" height="{lh}" rx="3" fill="url(#leafG)" stroke="rgba(0,0,0,0.12)"/>']
    if strip:
        parts.append(f'    <rect x="{lx+lw-18}" y="{ly+20}" width="8" height="{lh-40}" rx="2" fill="#a8b0b8"/>')
    if panels >= 4:
        pw, ph = lw // 2 - 8, lh // 2 - 8
        for i, (px, py) in enumerate([(lx+6, ly+6), (lx+lw//2+2, ly+6), (lx+6, ly+lh//2+2), (lx+lw//2+2, ly+lh//2+2)]):
            parts.append(f'    <rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="2" fill="rgba(0,0,0,0.04)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>')
    elif panels == 2:
        pw, ph = lw - 12, (lh - 18) // 2
        parts.append(f'    <rect x="{lx+6}" y="{ly+6}" width="{pw}" height="{ph}" rx="2" fill="rgba(0,0,0,0.04)" stroke="rgba(255,255,255,0.2)"/>')
        parts.append(f'    <rect x="{lx+6}" y="{ly+ph+12}" width="{pw}" height="{ph}" rx="2" fill="rgba(0,0,0,0.04)" stroke="rgba(255,255,255,0.2)"/>')
    if grooves:
        for gy in [ly + lh * 0.32, ly + lh * 0.52, ly + lh * 0.72]:
            parts.append(f'    <rect x="{lx+4}" y="{int(gy)}" width="{lw-8}" height="5" rx="2" fill="rgba(0,0,0,0.15)"/>')
    return '\n'.join(parts)


def handle(fx, fy, fw, fh, side='right'):
    hx = fx + fw - 42 if side == 'right' else fx + 24
    hy = fy + fh // 2 - 20
    return f'''    <g transform="translate({hx},{hy})">
      <rect x="0" y="0" width="10" height="40" rx="3" fill="#2a2a2a"/>
      <rect x="-8" y="16" width="26" height="8" rx="3" fill="#333"/>
    </g>'''


def steel_decor(fx, fy, fw, fh):
    lx, ly, lw, lh = fx + 14, fy + 14, fw - 28, fh - 28
    return f'''    <rect x="{lx+lw//2-40}" y="{ly+30}" width="80" height="{lh-60}" rx="4" fill="url(#frameG)" stroke="#8a929a" stroke-width="2"/>
    <line x1="{lx+lw//2}" y1="{ly+40}" x2="{lx+lw//2}" y2="{ly+lh-40}" stroke="#c0c8d0" stroke-width="2"/>'''


def glass_panel(fx, fy, fw, fh):
    lx, ly, lw, lh = fx + 14, fy + 14, fw - 28, fh - 28
    gw, gh = lw - 40, int(lh * 0.38)
    gx, gy = lx + 20, ly + 40
    return f'''    <rect x="{gx}" y="{gy}" width="{gw}" height="{gh}" rx="6" fill="url(#glassG)" stroke="#5a6269" stroke-width="3"/>
    <line x1="{gx+20}" y1="{gy+15}" x2="{gx+gw-20}" y2="{gy+gh-15}" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>'''


def classic_decor(fx, fy, fw, fh):
    lx, ly, lw, lh = fx + 14, fy + 14, fw - 28, fh - 28
    return f'''    <rect x="{lx+12}" y="{ly+12}" width="{lw-24}" height="{lh-24}" rx="3" fill="none" stroke="#a89060" stroke-width="3"/>
    <rect x="{lx+28}" y="{ly+28}" width="{lw-56}" height="{lh-56}" rx="2" fill="none" stroke="#a89060" stroke-width="2"/>
    <circle cx="{lx+lw//2}" cy="{ly+lh//2}" r="28" fill="none" stroke="#a89060" stroke-width="2"/>'''


def hinges(fx, fy, fh):
    parts = []
    for hy in [fy + 80, fy + fh // 2, fy + fh - 100]:
        parts.append(f'    <rect x="{fx+8}" y="{hy}" width="8" height="28" rx="2" fill="#8a929a"/>')
    return '\n'.join(parts)


def threshold(fx, fy, fw, fh):
    return f'    <rect x="{fx-4}" y="{fy+fh-6}" width="{fw+8}" height="10" rx="2" fill="#3a4046"/>'


def badge(text, w):
    return f'  <text x="{w//2}" y="{w//2}" text-anchor="middle" font-family="Segoe UI,Tahoma,sans-serif" font-size="11" fill="#6a727a" opacity="0">{text}</text>'


def compose(name, w, h, fx, fy, fw, fh, arch=False, panels=0, grooves=False, strip=False,
            steel=False, glass=False, classic=False, double=False, sliding=False, sidelight=False):
    parts = [svg_header(w, h), frame(w, h, fx, fy, fw, fh, arch)]
    if double:
        hw = fw // 2 - 4
        parts.append(leaf(fx, fy, hw, fh, panels, grooves, strip))
        parts.append(leaf(fx + hw + 8, fy, hw, fh, panels, grooves, strip))
        parts.append(handle(fx, fy, hw, fh))
        parts.append(handle(fx + hw + 8, fy, hw, fh, 'left'))
    elif sliding:
        parts.append(leaf(fx, fy, int(fw * 0.55), fh, panels, grooves, strip))
        parts.append(leaf(fx + int(fw * 0.42), fy, int(fw * 0.55), fh, panels, grooves, strip))
        parts.append(f'    <line x1="{fx+fw//2}" y1="{fy+10}" x2="{fx+fw//2}" y2="{fy+fh-10}" stroke="#4a5056" stroke-width="3" stroke-dasharray="8 6"/>')
    else:
        parts.append(leaf(fx, fy, fw, fh, panels, grooves, strip))
        if steel:
            parts.append(steel_decor(fx, fy, fw, fh))
        if glass:
            parts.append(glass_panel(fx, fy, fw, fh))
        if classic:
            parts.append(classic_decor(fx, fy, fw, fh))
        parts.append(handle(fx, fy, fw, fh))
        parts.append(hinges(fx, fy, fh))
    if sidelight:
        sw = 70
        parts.append(f'    <rect x="{fx+fw+6}" y="{fy+20}" width="{sw}" height="{fh-40}" rx="2" fill="url(#glassG)" stroke="#5a6269" stroke-width="2"/>')
    parts.append(threshold(fx, fy, fw, fh))
    parts.append('  </g>')
    parts.append(badge(name, w))
    parts.append('</svg>')
    path = os.path.join(OUT, name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))
    print('wrote', path)


SPECS = [
    ('flat-plain.svg', dict(panels=0, strip=True)),
    ('flat-steel.svg', dict(steel=True)),
    ('flat-glass.svg', dict(glass=True)),
    ('flat-classic.svg', dict(classic=True)),
    ('u-plain.svg', dict(arch=True, panels=4)),
    ('u-steel.svg', dict(arch=True, panels=4, steel=True)),
    ('u-classic.svg', dict(arch=True, panels=4, classic=True)),
    ('u60-plain.svg', dict(arch=True, panels=4, grooves=True)),
    ('u60-steel.svg', dict(arch=True, panels=4, steel=True, grooves=True)),
    ('u60-classic.svg', dict(arch=True, panels=4, classic=True, grooves=True)),
    ('u60-glass.svg', dict(arch=True, glass=True, grooves=True)),
    ('lib-plain.svg', dict(panels=2)),
    ('lib-steel.svg', dict(panels=2, steel=True)),
    ('lib-glass.svg', dict(panels=2, glass=True)),
    ('lib-classic.svg', dict(panels=2, classic=True)),
    ('leaf-quarter-flat.svg', dict(double=True, sidelight=True)),
    ('leaf-quarter-u.svg', dict(arch=True, double=True, sidelight=True, panels=4)),
    ('leaf-quarter-lib.svg', dict(double=True, sidelight=True, panels=2)),
    ('sliding-flat.svg', dict(sliding=True)),
    ('sliding-u.svg', dict(arch=True, sliding=True, panels=4)),
    ('sliding-lib.svg', dict(sliding=True, panels=2)),
]

W, H = 360, 640
FX, FY, FW, FH = 48, 24, 264, 580

for fname, opts in SPECS:
    compose(fname, W, H, FX, FY, FW, FH, **opts)

print('Done:', len(SPECS), 'images in', OUT)
