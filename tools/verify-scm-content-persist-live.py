#!/usr/bin/env python3
"""Verify SCM honest cloud persist — markers live + site_products round-trip."""
import json
import re
import time
import urllib.error
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
SUPABASE_URL = 'https://oedldllrjavofpeaputz.supabase.co'
SUPABASE_ANON = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0'
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


def supabase_read_site_products():
    url = SUPABASE_URL + '/rest/v1/nebras_data_store?store_key=eq.site_products&select=payload'
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + SUPABASE_ANON
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        rows = json.loads(resp.read())
    if not rows:
        return []
    payload = rows[0].get('payload') or []
    return payload if isinstance(payload, list) else list(payload.values())


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
    baseline = []
    try:
        login = api('POST', '/api/nebras-auth?action=login', {
            'username': 'NEBRASFACTORY',
            'password': 'NEBRASFACTORYCOMPANYBASIC'
        })
        token = login['token']
        baseline = supabase_read_site_products()
        baseline = [p for p in baseline if isinstance(p, dict)]
        print('baseline_products:', len(baseline))

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
        updated = baseline + [test_product]
        persist = api('POST', '/api/nebras-governance-persist', {
            'store_key': 'site_products',
            'payload': updated
        }, token=token)
        p_ok = persist.get('ok') and persist.get('verified') is not False
        results.append(('site_products_persist', p_ok))
        print('site_products_persist:', p_ok, persist)

        after = supabase_read_site_products()
        found = any(isinstance(p, dict) and p.get('id') == test_id for p in after)
        results.append(('site_products_supabase_verify', found))
        print('site_products_supabase_verify:', found)

        if found:
            restored = [p for p in after if not (isinstance(p, dict) and str(p.get('id', '')).startswith('scm-test-'))]
            cleanup = api('POST', '/api/nebras-governance-persist', {
                'store_key': 'site_products',
                'payload': restored
            }, token=token)
            print('scm_test_cleaned:', cleanup.get('ok'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', 'replace') if e.fp else ''
        results.append(('site_products_cloud', False))
        print('site_products_cloud FAIL:', e.code, body[:200])
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
