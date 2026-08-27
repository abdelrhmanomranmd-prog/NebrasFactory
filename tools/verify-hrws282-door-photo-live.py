#!/usr/bin/env python3
"""Live check: door designer photoreal factory-photo mode (hrws282)."""
import re
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasDoorPhoto/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch('/')
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    deploy = m.group(1) if m else 'unknown'
    print('deploy:', deploy)
    if deploy != 'hrws282':
        print('WARN: expected hrws282, got', deploy)

    pl = fetch('/js/nebras-platform.js?v=' + deploy)
    checks = [
        ('cache_282', "DOOR_PHOTO_PRESET_CACHE = '282'" in pl),
        ('studio_live', "designCanvasMode: 'studio-live'" in pl),
        ('photo_presets', 'DOOR_DESIGNER_LIVE_USE_PHOTO_PRESETS' in pl),
        ('surface_fallback', 'buildDoorPhotoPresetFromSurface' in pl),
        ('edge_steel_map', 'edge-band/edge-steel/outer-flat-plain.png' in pl),
        ('lib_flat_map', 'lib/lib-flat/outer-flat-plain.png' in pl),
        ('photo_size_scale', 'applyWpcSvgSize(stage, size, cfg)' in pl),
    ]
    ok = True
    for name, passed in checks:
        print(('PASS' if passed else 'FAIL') + ' — ' + name)
        if not passed:
            ok = False

    css = fetch('/css/12-door-designer.css?v=' + deploy)
    if 'wpc-door-stage--photo-preset .wpc-door-photo-preset-stack' in css and '--door-size-scale-x' in css:
        print('PASS — photo preset size scale CSS')
    else:
        print('FAIL — photo preset size scale CSS')
        ok = False

    if not ok:
        print('RESULT: FAILED')
        return 1
    print('RESULT: PASS — door photoreal hrws282 live')
    return 0


if __name__ == '__main__':
    sys.exit(main())
