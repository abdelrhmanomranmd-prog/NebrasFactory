#!/usr/bin/env python3
"""Copy header-showcase door photos into preset paths for extra models."""
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOWCASE = os.path.join(ROOT, 'images', 'doors', 'header-showcase')
PRESETS = os.path.join(ROOT, 'images', 'doors', 'presets')

MAPPINGS = [
    ('door-02.png', 'edge-band/edge-steel/outer-flat-plain.png'),
    ('door-02.png', 'edge-band/edge-steel/outer-curve-plain.png'),
    ('door-03.png', 'edge-band/edge-classic/outer-flat-plain.png'),
    ('door-03.png', 'edge-band/edge-classic/outer-curve-plain.png'),
    ('door-04.png', 'lib/lib-flat/outer-flat-plain.png'),
    ('door-04.png', 'lib/lib-flat/outer-curve-plain.png'),
    ('door-05.png', 'lib/lib-steel/outer-flat-plain.png'),
    ('door-05.png', 'lib/lib-steel/outer-curve-plain.png'),
    ('door-06.png', 'lib/lib-glass/outer-flat-plain.png'),
    ('door-06.png', 'lib/lib-glass/outer-curve-plain.png'),
    ('door-01.png', 'edge-band/edge-glass/outer-flat-plain.png'),
    ('door-01.png', 'edge-band/edge-glass/outer-curve-plain.png'),
]

def main():
    ok = 0
    for src_name, rel in MAPPINGS:
        src = os.path.join(SHOWCASE, src_name)
        dst = os.path.join(PRESETS, rel.replace('/', os.sep))
        if not os.path.isfile(src):
            print('SKIP missing', src_name)
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        ok += 1
        print('OK', rel)
    print('Done:', ok, 'files')

if __name__ == '__main__':
    main()
