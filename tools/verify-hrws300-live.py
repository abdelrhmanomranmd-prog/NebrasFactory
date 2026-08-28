#!/usr/bin/env python3
"""Verify hrws300 — dedicated aluminum catalog images in showroom + store."""
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
    js = fetch('/js/nebras-platform.js?v=hrws300')
    seed = fetch('/js/nebras-profile-2026-seed.js?v=hrws300')

    alu_block = seed.split('SHOWROOM_ALUMINUM_CATALOG')[1].split('SHOWROOM_CNC_CATALOG')[0]

    checks = {
        'deploy_hrws300': 'data-nebras-deploy="hrws300"' in html,
        'showroom_catalog_v14': 'SHOWROOM_CATALOG_VERSION = 14' in seed,
        'alu_cat_helper': 'function aluCat(' in seed,
        'alu_8_items': alu_block.count('images/catalog/aluminum/') >= 8,
        'alu_no_cnc_folder': 'profile-2026/cnc' not in alu_block,
        'alu_catalog_v6': 'ALUMINUM_CATALOG_VERSION = 6' in js,
        'alu_catalog_root': "ALU_CATALOG_ROOT = 'images/catalog/aluminum/'" in js,
        'alu_store_banner': 'images/catalog/aluminum/alu-profiles-collection.webp' in js,
        'cloud_guard': 'codeVer > settingsVer' in js,
        'force_merge_helper': 'shouldForceShowroomCatalogMerge' in seed,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
