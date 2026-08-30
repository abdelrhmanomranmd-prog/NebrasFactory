#!/usr/bin/env python3
"""Verify hrws308 — header overlap gone, kitchen shapes, live tint."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch_text(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch_text('/')
    js = fetch_text('/js/nebras-platform.js?v=hrws309')
    ws = fetch_text('/css/09-nebras-workspace.css?v=hrws309')
    door = fetch_text('/css/17-header-door-showcase.css?v=hrws309')
    store = fetch_text('/css/16-storefront-premium.css?v=hrws309')

    checks = {
        'deploy_hrws309': 'data-nebras-deploy="hrws309"' in html,
        'keep_workspace_topbar': 'header:not(.workspace-topbar)' in ws,
        'hide_header_in_workspace': 'display: none !important' in door and 'nebras-official-verified-bar' in door,
        'workspace_hides_verified': 'nebras-official-verified-bar' in ws,
        'kitchen_peninsula': 'ALU-KIT-PEN' in js,
        'kitchen_galley': 'ALU-KIT-GAL' in js,
        'no_same_kitchen_wht': 'ALU-KIT-WHT' not in js,
        'catalog_v10': 'ALUMINUM_CATALOG_VERSION = 10' in js,
        'live_transom_kept': "mode: 'live-transom'" in js,
        'finish_tint_overlay': 'is-alu-finish-tinted' in js and 'is-alu-finish-tinted' in store,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
