#!/usr/bin/env python3
"""Verify hrws318 — transom panel fitted inside each door frame."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch_text(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch_text('/')
    js = fetch_text('/js/nebras-platform.js?v=hrws318')
    css = fetch_text('/css/12-door-designer.css?v=hrws318')

    checks = {
        'deploy_hrws318': 'data-nebras-deploy="hrws318"' in html,
        'cache_318': "DOOR_PHOTO_PRESET_CACHE = '318'" in js,
        'fitted_fn': 'function paintFittedTransomCap' in js,
        'lib_wide_fit': "'lib-flat': { top: 6.2, width: 71" in js,
        'panel_asset': 'transom-panel.png' in js,
        'baked_first': "DOOR_PHOTO_PRESET_MAP[transomKey]" in js.split('function resolveDoorDesignerPhotoPreset')[1][:900],
        'cover_fit': 'object-fit: cover' in css,
        'cap_absolute': '.wpc-door-photo-preset-transom-cap' in css and 'position: absolute' in css,
        'live_hidden': 'display: none !important' in css,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
