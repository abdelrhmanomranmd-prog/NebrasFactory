#!/usr/bin/env python3
"""Verify hrws315 — same flat-door transom cladding on every door model."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch_text(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch_text('/')
    js = fetch_text('/js/nebras-platform.js?v=hrws315')
    css = fetch_text('/css/12-door-designer.css?v=hrws315')

    checks = {
        'deploy_hrws315': 'data-nebras-deploy="hrws315"' in html,
        'cache_315': "DOOR_PHOTO_PRESET_CACHE = '315'" in js,
        'fit_map': 'const LIVE_TRANSOM_FIT' in js,
        'fit_fn': 'function getLiveTransomFit' in js,
        'lib_fit': "'lib-flat': { top: 8.2" in js,
        'edge1_kept': "'edge-1': { top: 10.6, width: 48, height: 13.4" in js,
        'no_lib_marks': '.wpc-door-live-transom[data-door-model="lib-flat"] .wpc-door-live-transom-mark' not in css,
        'no_steel_mark': '.wpc-door-live-transom[data-door-model="edge-steel"] .wpc-door-live-transom-mark--a' not in css,
        'marks_hidden': '.wpc-door-live-transom-mark' in css and 'display: none !important' in css,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
