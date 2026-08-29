#!/usr/bin/env python3
"""Verify hrws304 — CSS roll tint store, aluminum finish picker, studio-live door designer."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch('/')
    js = fetch('/js/nebras-platform.js?v=hrws304')
    css = fetch('/css/16-storefront-premium.css?v=hrws304')

    checks = {
        'deploy_hrws304': 'data-nebras-deploy="hrws304"' in html,
        'css_roll_clip_panel': 'has-door-roll-tint--clip-panel .nebras-store-sku-door-panel-color' in css,
        'store_css_roll_tint': 'has-door-roll-tint--clip-panel' in js and 'buildWpcStoreRollCssFilterForPhoto' in js,
        'no_store_canvas_compose_path': 'applyComposedRollToStoreSkuImg(img, stack, baseSrc, rollState, variant)' not in js.split('function applyWpcStoreSkuRollTint')[1].split('function getProductPhotoWatermarkSettings')[0],
        'door_preset_css_roll': 'buildWpcStoreRollCssFilterForPhoto(hex' in js.split('function applyPhotoPresetRollTexture')[1].split('function applyDoorDesignerPhotoPreset')[0],
        'alu_finish_picker': 'ALUMINUM_FINISH_COLORS' in js and 'pickAluminumStoreSkuFinish' in js,
        'alu_finish_swatches': 'ALU-SLV' in js and 'ALU-BRZ' in js,
        'door_studio_live': "designCanvasMode: 'studio-live'" in js,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)

    img = fetch('/images/catalog/wpc-photos/by-sku-clean/WPC-RDY-FLAT-45-STD.png')
    print(('PASS' if len(img) > 10000 else 'FAIL'), 'wpc_door_image_live')
    alu = fetch('/images/catalog/aluminum/by-sku/ALU-DOR-GLASS.png')
    print(('PASS' if len(alu) > 5000 else 'FAIL'), 'alu_door_image_live')
    return 0 if ok and len(img) > 10000 and len(alu) > 5000 else 1


if __name__ == '__main__':
    sys.exit(main())
