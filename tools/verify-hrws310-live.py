#!/usr/bin/env python3
"""Verify hrws310 — roll color on the door image, no tint layers."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch_text(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch_text('/')
    js = fetch_text('/js/nebras-platform.js?v=hrws310')
    door = fetch_text('/css/12-door-designer.css?v=hrws310')
    store = fetch_text('/css/16-storefront-premium.css?v=hrws310')

    checks = {
        'deploy_hrws310': 'data-nebras-deploy="hrws310"' in html,
        'no_stack_tint_class': "stack.classList.add('has-door-roll-tint'" not in js,
        'photo_hides_keybab': '.wpc-door-stage--photo-preset .wpc-door-keybab-textures' in door,
        'no_preset_tint_after': '.wpc-door-photo-preset-stack.has-door-roll-tint::after' in door and 'display: none !important' in door,
        'no_store_panel': '.nebras-store-sku-door-panel-color {\n    display: none !important;' in store or '.nebras-store-sku-door-panel-color {\r\n    display: none !important;' in store,
        'no_alu_overlay': '.nebras-store-sku-media.is-alu-finish-tinted::after' in store and 'display: none !important' in store,
        'topbar_kept': 'header:not(.workspace-topbar)' in fetch_text('/css/09-nebras-workspace.css?v=hrws310'),
        'kitchen_shapes': 'ALU-KIT-PEN' in js and 'ALU-KIT-GAL' in js,
        'live_transom_kept': "mode: 'live-transom'" in js,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
