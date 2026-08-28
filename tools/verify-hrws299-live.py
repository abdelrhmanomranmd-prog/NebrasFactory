#!/usr/bin/env python3
"""Verify hrws299 — honest showroom image placement (aluminum vs CNC/cabinets)."""
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
    js = fetch('/js/nebras-platform.js?v=hrws299')
    seed = fetch('/js/nebras-profile-2026-seed.js?v=hrws299')

    checks = {
        'deploy_hrws299': 'data-nebras-deploy="hrws299"' in html,
        'showroom_catalog_v13': 'SHOWROOM_CATALOG_VERSION = 13' in seed,
        'alu_placeholder_store': 'ALU_CATALOG_PLACEHOLDER' in js,
        'alu_catalog_v5': 'ALUMINUM_CATALOG_VERSION = 5' in js,
        'cloud_guard': 'codeVer > settingsVer' in js,
        'aluminum_no_cnc01': 'cnc-01' not in seed.split('SHOWROOM_ALUMINUM_CATALOG')[1].split('SHOWROOM_CNC_CATALOG')[0],
        'doors_has_cnc01': "img('cnc', 1)" in seed.split('SHOWROOM_DOORS_CATALOG')[1].split('SHOWROOM_CABINETS_CATALOG')[0],
        'cnc_has_panel_06': "img('cnc', 6)" in seed.split('SHOWROOM_CNC_CATALOG')[1].split('function persist')[0],
        'force_merge_helper': 'shouldForceShowroomCatalogMerge' in seed,
        'global_showroom_version': 'NEBRAS_SHOWROOM_CATALOG_VERSION' in seed,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
