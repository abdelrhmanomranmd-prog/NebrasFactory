#!/usr/bin/env python3
"""Verify hrws305 — extra door shapes, 360 drag-only, aluminum exhibition."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def fetch_text(path):
    return fetch(path).decode('utf-8', 'replace')


def main():
    html = fetch_text('/')
    js = fetch_text('/js/nebras-platform.js?v=hrws305')
    css = fetch_text('/css/12-door-designer.css?v=hrws305')

    turn = js.split('function bindDoorDesignerTurntable')[1].split('function prepareDoorDesignerPure3dStage')[0]

    checks = {
        'deploy_hrws305': 'data-nebras-deploy="hrws305"' in html,
        'door_lib_type': "id: 'lib'" in js and "id: 'edge-lq'" in js and "id: 'edge-groove'" in js,
        'door_preset_lq': 'edge-band|edge-lq|outer-flat|plain' in js,
        'drag_360_wrap': 'function wrapRot' in turn,
        'no_autospin': 'autoSpin' not in turn and 'startSpinLoop' not in turn,
        'isolated_stage': 'wpc-door-stage--photo-preset .wpc-door-room-scene' in css,
        'alu_catalog_v9': 'ALUMINUM_CATALOG_VERSION = 9' in js,
        'alu_new_doors': 'ALU-DOR-VIL-BLK' in js and 'ALU-DOR-PIV' in js,
        'alu_new_kitchens': 'ALU-KIT-WHT' in js and 'ALU-KIT-GLS' in js,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)

    imgs = [
        '/images/doors/presets/edge-band/edge-lq/outer-flat-plain.png',
        '/images/doors/presets/edge-band/edge-groove/outer-flat-plain.png',
        '/images/catalog/aluminum/by-sku/ALU-DOR-VIL-BLK.png',
        '/images/catalog/aluminum/by-sku/ALU-KIT-WHT.png',
    ]
    img_ok = True
    for path in imgs:
        data = fetch(path)
        good = len(data) > 20000
        print(('PASS' if good else 'FAIL'), 'img_' + path.rsplit('/', 1)[-1], len(data))
        if not good:
            img_ok = False
    return 0 if ok and img_ok else 1


if __name__ == '__main__':
    sys.exit(main())
