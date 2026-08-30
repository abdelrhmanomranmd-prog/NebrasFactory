#!/usr/bin/env python3
"""Verify hrws311 — Lib / stainless shapes + same-material live transom."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch_text(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch_text('/')
    js = fetch_text('/js/nebras-platform.js?v=hrws311')
    door = fetch_text('/css/12-door-designer.css?v=hrws311')
    d3 = fetch_text('/js/nebras-door-3d.js')

    checks = {
        'deploy_hrws311': 'data-nebras-deploy="hrws311"' in html,
        'cache_311': "DOOR_PHOTO_PRESET_CACHE = '311'" in js,
        'live_transom_on_plain': "if (decor === 'transom' && DOOR_PHOTO_PRESET_MAP[plainKey])" in js,
        'transom_leaves': "data-door-leaves" in js,
        'transom_marks': 'wpc-door-live-transom-mark' in js,
        'same_face_posts': '.wpc-door-live-transom-post' in door and 'var(--door-face' in door,
        'no_dark_post_fallback': 'background-color: var(--door-dark, #6b7280)' not in door,
        'steel_mark': 'data-door-model="edge-steel"' in door,
        'lib_mark': 'data-door-model="lib-flat"' in door,
        '3d_same_leaf_panel': 'leafMat' in d3 and 'cladH' in d3,
        '3d_steel_strip': "model === 'edge-steel'" in d3,
        '3d_lib_grooves': "model === 'lib-flat'" in d3,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
