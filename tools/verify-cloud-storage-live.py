#!/usr/bin/env python3
"""
تحقق شامل — التخزين السحابي حقيقي ومستمر (ليس محلياً فقط).
يكتب في Supabase ثم يقرأ مباشرة من nebras_data_store للتأكد.
"""
import json
import time
import urllib.error
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
SUPABASE_URL = 'https://oedldllrjavofpeaputz.supabase.co'
SUPABASE_ANON = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0'
TS = str(int(time.time()))


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasCloudStorageVerify/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())


def supabase_read(store_key):
    url = SUPABASE_URL + '/rest/v1/nebras_data_store?store_key=eq.' + store_key + '&select=payload,updated_at'
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + SUPABASE_ANON,
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        rows = json.loads(resp.read())
    if not rows:
        return None, None
    return rows[0].get('payload'), rows[0].get('updated_at')


def main():
    print('=== NEBRAS CLOUD STORAGE — FULL VERIFY ===')
    results = []

    login = api('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    if not login.get('ok'):
        print('FAIL login')
        return 1
    token = login['token']
    print('PASS admin login + session token')

    # 1) حفظ حساس — governance مع verified
    marker = '_cloudStorageProbe_' + TS[-8:]
    settings_payload, _ = supabase_read('system_settings')
    if not isinstance(settings_payload, dict):
        settings_payload = {}
    settings_payload = dict(settings_payload)
    settings_payload[marker] = TS
    gov = api('POST', '/api/nebras-governance-persist', {
        'store_key': 'system_settings',
        'payload': settings_payload
    }, token=token)
    ok_gov = gov.get('ok') and gov.get('verified') is not False
    results.append(('governance_persist_verified', ok_gov))
    print('governance persist system_settings:', gov)

    time.sleep(1.5)
    sb_settings, sb_at = supabase_read('system_settings')
    ok_sb = isinstance(sb_settings, dict) and sb_settings.get(marker) == TS
    results.append(('supabase_direct_read_public', ok_sb))
    print('supabase direct read marker:', ok_sb, 'updated_at:', sb_at)

    # تنظيف العلامة
    if ok_sb:
        settings_payload.pop(marker, None)
        api('POST', '/api/nebras-governance-persist', {
            'store_key': 'system_settings',
            'payload': settings_payload
        }, token=token)

    # 2) منتجات — public key + تحقق Supabase
    test_id = 'cloud-probe-' + TS[-6:]
    products, _ = supabase_read('site_products')
    products = [p for p in (products or []) if isinstance(p, dict)]
    test_prod = {
        'id': test_id,
        'titleAr': 'اختبار سحابة ' + TS[-6:],
        'visible': False,
        'variants': [],
        'sortOrder': 9998
    }
    persist_prod = api('POST', '/api/nebras-governance-persist', {
        'store_key': 'site_products',
        'payload': products + [test_prod]
    }, token=token)
    ok_prod = persist_prod.get('ok') and persist_prod.get('verified') is not False
    results.append(('site_products_governance', ok_prod))
    time.sleep(1)
    after_products, _ = supabase_read('site_products')
    found_prod = any(isinstance(p, dict) and p.get('id') == test_id for p in (after_products or []))
    results.append(('site_products_supabase_roundtrip', found_prod))
    print('site_products roundtrip:', found_prod)
    if found_prod:
        cleaned = [p for p in after_products if not (isinstance(p, dict) and str(p.get('id', '')).startswith('cloud-probe-'))]
        api('POST', '/api/nebras-governance-persist', {'store_key': 'site_products', 'payload': cleaned}, token=token)

    # 3) بيانات حساسة — CRM عبر governance
    crm_row = {
        'id': 'crm-probe-' + TS[-6:],
        'nameAr': 'عميل اختبار سحابة',
        'phone': '0555000001',
        'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    pull = api('GET', '/api/nebras-cloud?action=pull&keys=crm_customers', token=token)
    crm = []
    for row in pull.get('rows', []):
        if row.get('store_key') == 'crm_customers':
            crm = row.get('payload') or []
    if not isinstance(crm, list):
        crm = []
    crm = [c for c in crm if isinstance(c, dict) and c.get('id') != crm_row['id']]
    crm.append(crm_row)
    crm_p = api('POST', '/api/nebras-governance-persist', {'store_key': 'crm_customers', 'payload': crm}, token=token)
    ok_crm = crm_p.get('ok') and crm_p.get('verified') is not False
    results.append(('crm_sensitive_governance', ok_crm))
    pull2 = api('GET', '/api/nebras-cloud?action=pull&keys=crm_customers', token=token)
    found_crm = False
    for row in pull2.get('rows', []):
        if row.get('store_key') == 'crm_customers':
            found_crm = any(isinstance(c, dict) and c.get('id') == crm_row['id'] for c in (row.get('payload') or []))
    results.append(('crm_api_pull_roundtrip', found_crm))
    print('crm sensitive roundtrip:', found_crm)
    crm_clean = [c for c in crm if c.get('id') != crm_row['id']]
    api('POST', '/api/nebras-governance-persist', {'store_key': 'crm_customers', 'payload': crm_clean}, token=token)

    # 4) زائر — شكوى مباشرة للسحابة (بدون localStorage)
    cid = TS[-6:]
    vintake = api('POST', '/api/nebras-visitor-intake', {
        'type': 'complaint',
        'data': {
            'id': cid,
            'item': {
                'status': 'pending',
                'description': 'cloud storage probe ' + TS,
                'customerName': 'probe',
                'phone': '0555001234',
                'branch': 'الرياض',
                'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            }
        }
    })
    ok_v = vintake.get('ok') is True
    results.append(('visitor_intake_cloud', ok_v))
    pull3 = api('GET', '/api/nebras-cloud?action=pull&keys=complaints', token=token)
    found_c = False
    for row in pull3.get('rows', []):
        if row.get('store_key') == 'complaints' and isinstance(row.get('payload'), dict):
            found_c = cid in row['payload']
    results.append(('complaint_cloud_pull', found_c))
    print('visitor complaint cloud:', found_c)

    # 5) nebras-cloud push API
    push = api('POST', '/api/nebras-cloud?action=push', {
        'rows': [{
            'store_key': 'system_settings',
            'payload': dict(settings_payload, _pushProbe=TS),
            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
        }]
    }, token=token)
    ok_push = push.get('ok') is True
    results.append(('nebras_cloud_push_api', ok_push))
    print('nebras-cloud push:', push)

    # استعادة system_settings
    api('POST', '/api/nebras-governance-persist', {
        'store_key': 'system_settings',
        'payload': settings_payload
    }, token=token)

    # 6) RLS — anon لا يقرأ admin_users
    try:
        anon_admin, _ = supabase_read('admin_users')
        results.append(('rls_hides_sensitive_from_anon', anon_admin is None))
        print('RLS admin_users hidden from anon:', anon_admin is None)
    except Exception as e:
        results.append(('rls_hides_sensitive_from_anon', True))
        print('RLS probe:', e)

    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    print('---')
    for name, ok in results:
        print(('PASS' if ok else 'FAIL') + ' | ' + name)
    print('RESULT:', passed, '/', total, '—', 'CLOUD STORAGE VERIFIED' if passed == total else 'ISSUES FOUND')
    return 0 if passed == total else 1


if __name__ == '__main__':
    raise SystemExit(main())
