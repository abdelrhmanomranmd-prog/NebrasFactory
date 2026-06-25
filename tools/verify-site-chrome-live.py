#!/usr/bin/env python3
"""تحقق حي من شركاؤنا والأيقونات بعد hrws121."""
import json
import re
import urllib.request

BASE = 'https://www.nebrasplasticcompany.com'


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    print('=== SITE CHROME LIVE CHECK ===')
    html = get('/')
    deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
    print('deploy:', deploy.group(1) if deploy else 'MISSING')
    print('partners_html:', 'partners-public' in html or 'nebras-partners' in html)

    js_v = re.search(r'nebras-platform\.js\?v=([^"]+)', html)
    v = js_v.group(1) if js_v else 'hrws121'
    plat = get('/js/nebras-platform.js?v=' + v)
    checks = [
        ('ensureSiteChromeDefaults', 'function ensureSiteChromeDefaults()' in plat),
        ('shouldSeedSiteChrome_always', 'function shouldSeedSiteChrome()' in plat and 'return true;' in plat),
        ('branches_hub_handler', "openHandler: 'branches-hub'" in plat),
        ('showroom_hub_handler', "openHandler: 'showroom-hub'" in plat),
        ('partners_seed', 'partner-amana-qassim' in plat),
        ('ignore_empty_cloud_chrome', "storeKey === 'site_partners'" in plat),
    ]
    for name, ok in checks:
        print(name + ':', 'OK' if ok else 'FAIL')

    login = json.dumps({'username': 'NEBRASFACTORY', 'password': 'NEBRASFACTORYCOMPANYBASIC'}).encode()
    req = urllib.request.Request(
        BASE + '/api/nebras-auth?action=login', data=login,
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        token = json.loads(r.read()).get('token', '')

    persist = json.dumps({
        'action': 'batch',
        'rows': [
            {'store_key': 'site_partners', 'payload': '__probe__'},
        ]
    }).encode()
    # governance persist batch with probe won't work - use login token to read via governance if available
    # Try direct supabase isn't available - check partners images exist
    for img in [
        '/images/partners/partner-aramco.png',
        '/images/partners/partner-amana-qassim.png',
    ]:
        try:
            with urllib.request.urlopen(BASE + img, timeout=30) as r:
                print('image', img, ':', r.status)
        except Exception as e:
            print('image', img, ': FAIL', e)

    print('DONE')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
