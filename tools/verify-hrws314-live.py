#!/usr/bin/env python3
"""Verify hrws314 — more ALU shapes + metal-pixel recolor including light silver."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch_text(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def fetch_ok(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        body = r.read(32)
        return getattr(r, 'status', 200) == 200 and len(body) > 8


def main():
    html = fetch_text('/')
    js = fetch_text('/js/nebras-platform.js?v=hrws314')
    seed = fetch_text('/js/nebras-profile-2026-seed.js?v=hrws314')

    checks = {
        'deploy_hrws314': 'data-nebras-deploy="hrws314"' in html,
        'catalog_v12': 'const ALUMINUM_CATALOG_VERSION = 12' in js,
        'showroom_v20': 'const SHOWROOM_CATALOG_VERSION = 20' in seed,
        'bg_sample': 'function sampleAluminumStudioBackground' in js,
        'jpeg_recolor': "canvas.toDataURL('image/jpeg', 0.93)" in js,
        'kit_bar': "aluSkuImg('ALU-KIT-BAR.png')" in js,
        'kit_cur': "aluSkuImg('ALU-KIT-CUR.png')" in js,
        'win_arc': "aluSkuImg('ALU-WIN-ARC.png')" in js,
        'dor_hid': "aluSkuImg('ALU-DOR-HID.png')" in js,
        'fac_hex': "aluSkuImg('ALU-FAC-HEX.png')" in js,
        'img_kit_bar': fetch_ok('/images/catalog/aluminum/by-sku/ALU-KIT-BAR.png'),
        'img_dor_hid': fetch_ok('/images/catalog/aluminum/by-sku/ALU-DOR-HID.png'),
        'img_win_arc': fetch_ok('/images/catalog/aluminum/by-sku/ALU-WIN-ARC.png'),
        'img_fac_hex': fetch_ok('/images/catalog/aluminum/by-sku/ALU-FAC-HEX.png'),
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
