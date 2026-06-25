#!/usr/bin/env python3
"""اختبار حي — كل مسار حفظ حقيقي (شكاوى · اتصال · إدارة)."""
import json
import time
import urllib.error
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
TS = str(int(time.time()))


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasRealPersistTest/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())


def main():
    print('=== REAL PERSIST LIVE TEST ===')
    results = []

    # 1) شكوى زائر — API مباشر (بدون تسجيل دخول)
    complaint_id = TS[-6:]
    try:
        c_res = api('POST', '/api/nebras-visitor-intake', {
            'type': 'complaint',
            'data': {
                'id': complaint_id,
                'item': {
                    'status': 'pending',
                    'description': 'اختبار حفظ حقيقي ' + TS,
                    'customerName': 'عميل اختبار',
                    'phone': '0500000999',
                    'branch': 'الرياض',
                    'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                    'sessionId': 'test-' + TS
                }
            }
        })
        ok = c_res.get('ok') and c_res.get('id') == complaint_id
        results.append(('visitor_complaint_api', ok, c_res))
        print('complaint_api:', ok, c_res)
    except Exception as e:
        results.append(('visitor_complaint_api', False, str(e)))
        print('complaint_api FAIL:', e)

    # 2) نبراس يتصل بك — API مباشر
    lead_id = 'cb-test-' + TS
    try:
        l_res = api('POST', '/api/nebras-visitor-intake', {
            'type': 'callback_lead',
            'data': {
                'id': lead_id,
                'customerName': 'زائر اختبار',
                'phone': '0555000999',
                'city': 'جدة',
                'branchId': 7,
                'need': 'اختبار حفظ حقيقي',
                'createdAt': int(time.time()) * 1000,
                'sessionId': 'test-' + TS
            }
        })
        ok = l_res.get('ok') and l_res.get('id') == lead_id
        results.append(('visitor_callback_api', ok, l_res))
        print('callback_api:', ok, l_res)
    except Exception as e:
        results.append(('visitor_callback_api', False, str(e)))
        print('callback_api FAIL:', e)

    # 3) دخول الإدارة + سحب والتحقق
    try:
        login = api('POST', '/api/nebras-auth?action=login', {
            'username': 'NEBRASFACTORY',
            'password': 'NEBRASFACTORYCOMPANYBASIC'
        })
        token = login['token']
        pull = api('GET', '/api/nebras-cloud?action=pull&keys=complaints,callback_leads,crm_customers', token=token)

        complaints = {}
        leads = []
        crm = []
        for row in pull.get('rows', []):
            if row['store_key'] == 'complaints':
                complaints = row.get('payload') or {}
            elif row['store_key'] == 'callback_leads':
                leads = row.get('payload') or []
            elif row['store_key'] == 'crm_customers':
                crm = row.get('payload') or []

        c_found = complaint_id in complaints
        l_found = any(l and l.get('id') == lead_id for l in leads)
        results.append(('admin_pull_complaint', c_found, complaint_id in complaints))
        results.append(('admin_pull_callback', l_found, lead_id))
        print('admin_sees_complaint:', c_found)
        print('admin_sees_callback:', l_found)

        # 4) إدارة تضيف عميل CRM — حفظ سحابي
        test_customer = {
            'id': 'crm-test-' + TS,
            'name': 'شركة اختبار الحفظ',
            'phone': '0501111999',
            'email': 'test@nebras.test',
            'status': 'lead',
            'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        new_crm = [test_customer] + [x for x in crm if isinstance(x, dict)]
        persist = api('POST', '/api/nebras-governance-persist', {
            'store_key': 'crm_customers',
            'payload': new_crm
        }, token=token)
        p_ok = persist.get('ok') and persist.get('verified') is not False
        results.append(('admin_crm_persist', p_ok, persist))
        print('crm_persist:', p_ok, persist)

        pull2 = api('GET', '/api/nebras-cloud?action=pull&keys=crm_customers', token=token)
        crm2 = []
        for row in pull2.get('rows', []):
            if row['store_key'] == 'crm_customers':
                crm2 = row.get('payload') or []
        crm_found = any(x and x.get('id') == test_customer['id'] for x in crm2)
        results.append(('admin_crm_pull_verify', crm_found, test_customer['id']))
        print('crm_pull_verify:', crm_found)

        # تنظيف عميل الاختبار
        cleaned = [x for x in crm2 if not (isinstance(x, dict) and str(x.get('id', '')).startswith('crm-test-'))]
        if len(cleaned) != len(crm2):
            api('POST', '/api/nebras-governance-persist', {
                'store_key': 'crm_customers',
                'payload': cleaned
            }, token=token)
            print('crm_test_cleaned')

    except Exception as e:
        results.append(('admin_flow', False, str(e)))
        print('admin_flow FAIL:', e)

    passed = sum(1 for r in results if r[1])
    total = len(results)
    print('---')
    for name, ok, detail in results:
        print(('PASS' if ok else 'FAIL') + ' | ' + name)
    print('RESULT:', passed, '/', total, 'PASS' if passed == total else 'FAIL')
    return 0 if passed == total else 1


if __name__ == '__main__':
    raise SystemExit(main())
