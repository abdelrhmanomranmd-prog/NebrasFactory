#!/usr/bin/env python3
"""Verify hrws298 live — visitor marketing copy + door-leaf-only roll compose."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch('/')
    js = fetch('/js/nebras-platform.js?v=hrws298')
    i18n = fetch('/js/nebras-platform-i18n.js?v=hrws298')
    seed = fetch('/js/nebras-profile-2026-seed.js?v=hrws298')

    checks = {
        'deploy_hrws298': 'data-nebras-deploy="hrws298"' in html,
        'roll_cache_272': "DOOR_PHOTO_PRESET_CACHE = '272'" in js,
        'roll_leaf_rect_mask': 'if (panelClip && useMask)' in js and 'buildWpcCatalogPanelRectMask' in js,
        'store_raster_compose': 'const isRaster = isPhoto' in js,
        'no_whole_img_filter_branch': 'buildWpcStoreRollCssFilter(roll.hex)' not in js.split('function applyWpcStoreSkuRollTint')[1].split('function getProductPhotoWatermarkSettings')[0],
        'visitor_marketing_section': 'بوابة نبراس الرقمية' in i18n,
        'no_admin_showroom_empty': 'إدارة المحتوى' not in i18n.split('showroomProductsEmpty')[1][:120] if 'showroomProductsEmpty' in i18n else False,
        'seed_profile_v10': 'PROFILE_2026_SEED_VERSION = 10' in seed,
        'dash_showroom_photo': "backgroundImage: 'images/profile-2026/doors/doors-03.jpg'" in js,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
