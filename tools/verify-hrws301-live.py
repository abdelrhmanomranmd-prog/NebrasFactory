#!/usr/bin/env python3
"""Verify hrws301 — per-SKU aluminum catalog photos + doors subcategory."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch('/')
    js = fetch('/js/nebras-platform.js?v=hrws301')
    seed = fetch('/js/nebras-profile-2026-seed.js?v=hrws301')

    alu_block = seed.split('SHOWROOM_ALUMINUM_CATALOG')[1].split('SHOWROOM_CNC_CATALOG')[0]

    checks = {
        'deploy_hrws301': 'data-nebras-deploy="hrws301"' in html,
        'showroom_catalog_v15': 'SHOWROOM_CATALOG_VERSION = 15' in seed,
        'alu_by_sku_helper': 'function aluSku(' in seed,
        'alu_showroom_14_items': alu_block.count("aluSku('") >= 14,
        'alu_catalog_v7': 'ALUMINUM_CATALOG_VERSION = 7' in js,
        'alu_by_sku_root': "by-sku/'" in js,
        'alu_doors_sub': "id: 'alu-doors'" in js,
        'alu_dor_sld_sku': 'ALU-DOR-SLD' in js,
        'unique_sku_images': 'ALU-PROF-U.png' in js and 'ALU-KIT-FRT.png' in js,
        'cloud_guard': 'codeVer > settingsVer' in js,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)

    img = fetch('/images/catalog/aluminum/by-sku/ALU-PROF-U.png')
    img_ok = len(img) > 10000
    print(('PASS' if img_ok else 'FAIL'), 'alu_prof_u_image_live')
    return 0 if ok and img_ok else 1


if __name__ == '__main__':
    sys.exit(main())
