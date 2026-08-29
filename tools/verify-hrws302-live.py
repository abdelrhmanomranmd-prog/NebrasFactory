#!/usr/bin/env python3
"""Verify hrws302 — aluminum SKU-first images, no stale wrong photos."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch('/')
    js = fetch('/js/nebras-platform.js?v=hrws302')
    seed = fetch('/js/nebras-profile-2026-seed.js?v=hrws302')

    checks = {
        'deploy_hrws302': 'data-nebras-deploy="hrws302"' in html,
        'alu_catalog_v8': 'ALUMINUM_CATALOG_VERSION = 8' in js,
        'sku_first_image': 'getAluminumSkuImageByCode' in js and 'ALUMINUM_SKU_IMAGES' in js,
        'purge_stale_variants': 'aluminumCatalogNeedsRepair' in js,
        'alu_frm_dor': 'ALU-FRM-DOR' in js,
        'alu_accessories': "id: 'alu-accessories'" in js,
        'alu_acc_set': 'ALU-ACC-SET' in js,
        'showroom_v16': 'SHOWROOM_CATALOG_VERSION = 16' in seed,
        'showroom_frm_dor': "aluSku('ALU-FRM-DOR.png')" in seed,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)

    img = fetch('/images/catalog/aluminum/by-sku/ALU-FRM-DOR.png')
    print(('PASS' if len(img) > 10000 else 'FAIL'), 'alu_frm_dor_image_live')
    return 0 if ok and len(img) > 10000 else 1


if __name__ == '__main__':
    sys.exit(main())
