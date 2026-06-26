#!/usr/bin/env python3
"""Verify SCM honest cloud persist — markers live + site_products round-trip."""
import json
import re
import time
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
TS = str(int(time.time()))


def get(path):
    with urllib.request.urlopen(SITE + path, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasScmPersistVerify/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())


def main():
    print('=== SCM CONTENT PERSIST LIVE ===')
    html = get('/')
    deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
    v = deploy.group(1) if deploy else 'hrws131'
    print('deploy:', v)

    js = get('/js/nebras-platform.js?v=' + v)
    css = get('/css/29-scm-professional.css?v=' + v)
    results = []

    marker_checks = [
        ('persistScmContentHonest', 'persistScmContentHonest' in js and 'window.persistScmContentHonest' in js),
        ('renderScmCloudSaveStatus', 'renderScmCloudSaveStatus' in js and 'window.renderScmCloudSaveStatus' in js),
        ('SCM_CONTENT_CLOUD_KEYS', 'SCM_CONTENT_CLOUD_KEYS' in js and "'site_products'" in js),
        ('scm-cloud-save-bar html', 'scm-cloud-save-bar' in html),
        ('scm-cloud-save css', '.scm-cloud-save-bar' in css),
        ('saveScmCatalogNow', 'window.saveScmCatalogNow' in js),
    ]
    for name, ok in marker_checks:
        print(name + ':', 'OK' if ok else 'FAIL')
        results.append((name, ok))

    test_id = 'scm-test-' + TS
    try:
        login = api('POST', '/api/nebras-auth?action=login', {
            'username': 'NEBRASFACTORY',
            'password': 'NEBRASFACTORYCOMPANYBASIC'
        })
        token = login['token']
        pull = api('GET', '/api/nebras-cloud?action=pull&keys=site_products', token=token)
        products = []
        for row in pull.get('rows', []):
            if row.get('store_key') == 'site_products':
                products = row.get('payload') or []
        if not isinstance(products, list):
            products = list(products.values()) if isinstance(products, dict) else []

        test_product = {
            'id': test_id,
            'titleAr': 'اختبار حفظ SCM ' + TS[-6:],
            'titleEn': 'SCM persist test',
            'textAr': 'منتج اختبار — يُحذف تلقائياً',
            'visible': False,
            'variants': [],
            'sortOrder': 9999,
            'cssClass': 'card-other',
            'legacyKey': 'other'
        }
        updated = [test_product] + [p for p in products if isinstance(p, dict) and p.get('id') != test_id]
        persist = api('POST', '/api/nebras-governance-persist', {
            'store_key': 'site_products',
            'payload': updated
        }, token=token)
        p_ok = persist.get('ok') and persist.get('verified') is not False
        results.append(('site_products_persist', p_ok))
        print('site_products_persist:', p_ok, persist)

        pull2 = api('GET', '/api/nebras-cloud?action=pull&keys=site_products', token=token)
        products2 = []
        for row in pull2.get('rows', []):
            if row.get('store_key') == 'site_products':
                products2 = row.get('payload') or []
        found = any(isinstance(p, dict) and p.get('id') == test_id for p in products2)
        results.append(('site_products_pull_verify', found))
        print('site_products_pull_verify:', found)

        cleaned = [p for p in products2 if not (isinstance(p, dict) and str(p.get('id', '')).startswith('scm-test-'))]
        if len(cleaned) != len(products2):
            api('POST', '/api/nebras-governance-persist', {
                'store_key': 'site_products',
                'payload': cleaned
            }, token=token)
            print('scm_test_cleaned')
    except Exception as e:
        results.append(('site_products_cloud', False))
        print('site_products_cloud FAIL:', e)

    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    print('---')
    for name, ok in results:
        print(('PASS' if ok else 'FAIL') + ' | ' + name)
    print('RESULT:', passed, '/', total, 'PASS' if passed == total else 'FAIL')
    return 0 if passed == total else 1


if __name__ == '__main__':
    raise SystemExit(main())
