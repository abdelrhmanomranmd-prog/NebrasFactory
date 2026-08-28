#!/usr/bin/env python3
"""Verify hrws297 live — curated showroom + aluminum sub-hubs + WPC raw SKU photos."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch('/')
    js = fetch('/js/nebras-platform.js?v=hrws297')
    seed = fetch('/js/nebras-profile-2026-seed.js?v=hrws297')

    checks = {
        'deploy_hrws297': 'data-nebras-deploy="hrws297"' in html,
        'platform_js_busted': 'nebras-platform.js?v=hrws297' in html,
        'seed_version_12': 'SHOWROOM_CATALOG_VERSION = 12' in seed,
        'alu_windows_sub': "id: 'alu-windows'" in js,
        'alu_facades_sub': "id: 'alu-facades'" in js,
        'alu_kitchens_sub': "id: 'alu-kitchens'" in js,
        'raw_sku_clean_images': "by-sku-clean/' + r[2] + '.png" in js,
        'door_room_apartment': "id: 'apartment'" in js,
        'wpc_raw_catalog_v7': 'WPC_RAW_CATALOG_VERSION = 7' in js,
        'alu_catalog_v4': 'ALUMINUM_CATALOG_VERSION = 4' in js,
        'showroom_alu_no_doors_intro': 'شبابيك · واجهات · مطابخ' in seed,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
