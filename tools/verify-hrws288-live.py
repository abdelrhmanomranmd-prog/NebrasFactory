#!/usr/bin/env python3
"""Verify hrws288 store fixes: prices, roll tint, lightbox."""
import re
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
TARGET = 'hrws288'


def get(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify288/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = get('/')
    deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
    js_v = re.search(r'nebras-platform\.js\?v=([^"]+)', html)
    ver = js_v.group(1) if js_v else TARGET
    print('deploy:', deploy.group(1) if deploy else 'MISSING')
    print('js_version:', ver)

    css16 = get('/css/16-storefront-premium.css?v=' + ver)
    css65 = get('/css/65-nebras-store-product-cards.css?v=' + ver)
    plat = get('/js/nebras-platform.js?v=' + ver)

    checks = [
        ('deploy_tag', (deploy.group(1) if deploy else '') == TARGET),
        ('panel_color_css', '.nebras-store-sku-door-panel-color' in css16 and 'display: none !important' not in css16.split('.nebras-store-sku-door-panel-color')[1].split('}')[0]),
        ('roll_tint_after', 'has-door-roll-tint::after' in css16 and 'mix-blend-mode: color' in css16),
        ('price_block_js', 'formatVariantPriceBlock(v.price, lang)' in plat),
        ('catalog_lightbox', 'nebras-clickable-media" src="' in plat and 'buildStoreCatalogCardHtml' in plat),
        ('roll_tint_fn', 'panelLayer.style.filter = rollFilter' in plat),
        ('panel_color_html', 'nebras-store-sku-door-panel-color' in plat),
        ('init_roll_index0', 'applyWpcStoreSkuRollTint(card, isNaN(startIdx) ? 0 : startIdx)' in plat),
        ('price_css', '.nebras-store-card-price-block .variant-price-ex' in css65),
        ('zoom_hint_css', 'nebras-store-card-media:has(img.nebras-clickable-media)::after' in css65),
    ]
    ok = True
    for name, passed in checks:
        print(f'{name}:', 'OK' if passed else 'FAIL')
        if not passed:
            ok = False
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
