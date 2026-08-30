#!/usr/bin/env python3
"""Verify hrws313 — expanded aluminum shapes + product-pixel finish recolor."""
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
    js = fetch_text('/js/nebras-platform.js?v=hrws313')
    seed = fetch_text('/js/nebras-profile-2026-seed.js?v=hrws313')
    css = fetch_text('/css/16-storefront-premium.css?v=hrws313')

    checks = {
        'deploy_hrws313': 'data-nebras-deploy="hrws313"' in html,
        'catalog_v11': 'const ALUMINUM_CATALOG_VERSION = 11' in js,
        'showroom_v19': 'const SHOWROOM_CATALOG_VERSION = 19' in seed,
        'pixel_recolor': 'function recolorAluminumProductPixels' in js,
        'compose_finish': 'function composeAluminumProductFinish' in js,
        'no_css_filter_apply': 'buildAluminumFinishCssFilter' not in js,
        'kit_island': "aluSkuImg('ALU-KIT-ISD.png')" in js,
        'win_bay': "aluSkuImg('ALU-WIN-BAY.png')" in js,
        'dor_fld': "aluSkuImg('ALU-DOR-FLD.png')" in js,
        'fac_grid': "aluSkuImg('ALU-FAC-GRID.png')" in js,
        'alu_contain': 'object-fit: contain;' in css and '.nebras-store-sku-img--alu' in css,
        'no_overlay_after': '.nebras-store-sku-media.is-alu-finish-tinted::after' in css,
        'img_kit_isd': fetch_ok('/images/catalog/aluminum/by-sku/ALU-KIT-ISD.png'),
        'img_win_bay': fetch_ok('/images/catalog/aluminum/by-sku/ALU-WIN-BAY.png'),
        'img_dor_fld': fetch_ok('/images/catalog/aluminum/by-sku/ALU-DOR-FLD.png'),
        'img_fac_grid': fetch_ok('/images/catalog/aluminum/by-sku/ALU-FAC-GRID.png'),
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
