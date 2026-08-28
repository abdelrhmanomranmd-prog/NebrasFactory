#!/usr/bin/env python3
"""Verify hrws296 live — no CSS roll layers on catalog photos."""
import re
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch('/')
    js = fetch('/js/nebras-platform.js?v=hrws296')
    css = fetch('/css/16-storefront-premium.css?v=hrws296')

    checks = {
        'deploy_hrws296': 'data-nebras-deploy="hrws296"' in html,
        'showroom_css_busted': '14-showroom-hub.css?v=hrws296' in html,
        'seed_js_busted': 'nebras-profile-2026-seed.js?v=hrws296' in html,
        'roll_cache_271': "DOOR_PHOTO_PRESET_CACHE = '271'" in js,
        'no_panel_color_photo': 'isPhoto ? \'<div class="nebras-store-sku-door-panel-color' not in js,
        'photo_no_css_layers': 'nebras-store-sku-door-stack--photo.has-door-roll-tint::after' in css and 'display: none !important' in css,
        'composite_no_filter': '.nebras-store-sku-img--wpc.has-roll-composite' in css and 'filter: none !important' in css,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
