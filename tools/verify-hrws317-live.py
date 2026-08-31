#!/usr/bin/env python3
"""Verify hrws317 — photoreal transom photos, no CSS overlay, cap flush with door."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch_text(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch_text('/')
    js = fetch_text('/js/nebras-platform.js?v=hrws317')
    css = fetch_text('/css/12-door-designer.css?v=hrws317')

    transom_resolve = js.split('function resolveDoorDesignerPhotoPreset')[1].split('function clearDoorDesignerPhotoPreset')[0]

    checks = {
        'deploy_hrws317': 'data-nebras-deploy="hrws317"' in html,
        'cache_317': "DOOR_PHOTO_PRESET_CACHE = '317'" in js,
        'baked_transom_first': transom_resolve.find("DOOR_PHOTO_PRESET_MAP[transomKey]") < transom_resolve.find("mode: 'composite-transom'"),
        'composite_mode': "mode: 'composite-transom'" in js,
        'photoreal_cap': 'transom-cap-flat.png' in js,
        'no_live_pref': "mode: 'live-transom'" not in transom_resolve,
        'live_hidden': '.wpc-door-live-transom' in css and 'display: none !important' in css,
        'cap_shown': '.wpc-door-photo-preset-wrap.is-composite-transom .wpc-door-photo-preset-transom-cap:not([hidden])' in css,
        'stack_flush': 'margin-top: 0;' in css.split('.wpc-door-photo-preset-wrap.is-composite-transom .wpc-door-photo-preset-stack')[1][:120],
        'decor_transom_map': 'edge-band/edge-1/decor-transom.png' in js,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
