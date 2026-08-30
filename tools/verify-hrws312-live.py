#!/usr/bin/env python3
"""Verify hrws312 — Lib/stainless switching + cladding overlay on the door."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch_text(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch_text('/')
    js = fetch_text('/js/nebras-platform.js?v=hrws312')
    door = fetch_text('/css/12-door-designer.css?v=hrws312')

    checks = {
        'deploy_hrws312': 'data-nebras-deploy="hrws312"' in html,
        'cache_312': "DOOR_PHOTO_PRESET_CACHE = '312'" in js,
        'pick_visible': ':not(.is-hidden)' in js and 'getDoorDesignerPick' in js,
        'force_src': 'data-door-preset-key' in js,
        'transom_in_stack': 'stack.appendChild(node)' in js,
        'overlay_transom': '.wpc-door-live-transom {\n    display: none;\n    position: absolute;' in door
            or '.wpc-door-live-transom {\r\n    display: none;\r\n    position: absolute;' in door,
        'lib_glass_map': 'lib/lib-glass/outer-flat-plain.png' in js,
        'steel_map': 'edge-band/edge-steel/outer-flat-plain.png' in js,
        'live_transom_on_plain': "if (decor === 'transom' && DOOR_PHOTO_PRESET_MAP[plainKey])" in js,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
