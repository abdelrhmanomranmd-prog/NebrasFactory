#!/usr/bin/env python3
"""Verify hrws307 — live MDF transom follows door model and roll color."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch_text(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch_text('/')
    js = fetch_text('/js/nebras-platform.js?v=hrws307')
    css = fetch_text('/css/12-door-designer.css?v=hrws307')
    d3 = fetch_text('/js/nebras-door-3d.js?v=hrws307')

    checks = {
        'deploy_hrws307': 'data-nebras-deploy="hrws307"' in html,
        'live_transom_mode': "mode: 'live-transom'" in js,
        'no_png_composite': "mode: 'composite-transom'" not in js,
        'paint_live': 'function paintLiveTransom' in js,
        'live_dom': 'wpc-door-live-transom' in js,
        'live_css': '.wpc-door-live-transom-panel' in css,
        'model_classic': 'data-door-model="u-classic"' in css,
        'model_slats': 'data-door-model="u-slats"' in css,
        '3d_solid_mdf': 'لوحة + قوائم جانبية' in d3 and 'transomGlass' not in d3,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
