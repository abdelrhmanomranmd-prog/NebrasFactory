#!/usr/bin/env python3
"""Verify hrws303 — door designer studio-live, store roll compose, fast admin boot."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch('/')
    js = fetch('/js/nebras-platform.js?v=hrws303')
    css = fetch('/css/16-storefront-premium.css?v=hrws303')

    checks = {
        'deploy_hrws303': 'data-nebras-deploy="hrws303"' in html,
        'door_studio_live': "designCanvasMode: 'studio-live'" in js,
        'door_photo_presets': 'DOOR_PHOTO_PRESET_CACHE = \'303\'' in js,
        'compose_max_dim': 'DOOR_PHOTO_COMPOSE_MAX_DIM' in js,
        'roll_css_fallback': 'applyWpcStoreRollCssPanelFallback' in js,
        'cross_origin_fix': 'isCrossOriginMediaUrl' in js,
        'admin_fast_boot': 'withPortal: false, withErp: false' in js,
        'css_roll_fallback': 'has-roll-css-fallback' in css,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)

    img = fetch('/images/catalog/wpc-photos/by-sku-clean/WPC-RDY-FLAT-45-STD.png')
    print(('PASS' if len(img) > 10000 else 'FAIL'), 'wpc_flat_std_image_live')
    return 0 if ok and len(img) > 10000 else 1


if __name__ == '__main__':
    sys.exit(main())
