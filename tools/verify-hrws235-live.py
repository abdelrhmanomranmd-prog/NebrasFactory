#!/usr/bin/env python3
"""Verify hrws235 live: branches, watermark settings, deploy tag."""
import json
import re
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'NebrasVerify/hrws235'
    })
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    report = {'ok': True, 'checks': []}

    def check(name, passed, detail=''):
        report['checks'].append({'name': name, 'ok': bool(passed), 'detail': detail})
        if not passed:
            report['ok'] = False

    try:
        html = fetch('/index.html')
        m = re.search(r'data-nebras-deploy="([^"]+)"', html)
        deploy = m.group(1) if m else 'none'
        check('deploy_tag', deploy == 'hrws236', deploy)

        check('watermark_admin_ui', 'setting-product-watermark-enabled' in html, 'settings panel')
        check('branch_images_refs', 'branch-dammam' in html or 'branch-dammam.jpg' in html, 'dammam image ref')

        plat = fetch('/js/nebras-platform.js')
        check('watermark_fn', 'buildProductPhotoWatermarkHtml' in plat, 'watermark builder')
        check('branches_migration', 'migrateBranchesCatalogV2' in plat, 'branch migration')
        check('dammam_branch', 'branch-dammam.jpg' in plat, 'dammam default')
        check('jizan_branch', 'branch-jizan.jpg' in plat, 'jizan default')
        check('ahsa_phone', "salesPhone: '0508833231'" in plat and 'id: 4' in plat, 'ahsa shared number')
        check('watermark_settings', 'productPhotoWatermark' in plat, 'admin settings object')

        css = fetch('/css/16-storefront-premium.css')
        check('watermark_css', '.nebras-product-photo-watermark' in css, 'watermark styles')

        for img in ('/images/branch-dammam.jpg', '/images/branch-jizan.jpg'):
            try:
                req = urllib.request.Request(SITE + img, method='HEAD', headers={'User-Agent': 'NebrasVerify/hrws235'})
                with urllib.request.urlopen(req, timeout=30) as r:
                    check('image_' + img.split('/')[-1], r.status == 200, str(r.status))
            except Exception as e:
                check('image_' + img.split('/')[-1], False, str(e))

        try:
            health = json.loads(fetch('/api/health'))
            check('health_upgrade', health.get('upgrade') == 'hrws235', str(health.get('upgrade')))
        except Exception as e:
            check('health_api', False, str(e))

    except Exception as e:
        check('fetch_error', False, str(e))

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
