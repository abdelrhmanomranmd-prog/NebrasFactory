#!/usr/bin/env python3
"""اختبار حي — كل مسار فعلي: شكاوى · نبراس يتصل بك · حفظ إدارة · قراءة سحابة."""
import json
import time
import urllib.error
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
TS = str(int(time.time()))[-8:]


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasRealVerify/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())


def main():
    print('=== NEBRAS REAL STORAGE E2E ===')
    ok = True

    # 1) شكوى زائر — API مباشر للسحابة
    cid = TS[-6:]
    try:
        cres = api('POST', '/api/nebras-visitor-intake', {
            'type': 'complaint',
            'data': {
                'id': cid,
                'item': {
                    'status': 'pending',
                    'description': 'اختبار حي — شكوى فعلية ' + TS,
                    'customerName': 'عميل اختبار',
                    'phone': '0555001234',
                    'branch': 'الرياض',
                    'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                }
            }
        })
        print('complaint_intake:', cres)
        if not cres.get('ok'):
            ok = False
    except Exception as e:
        print('complaint_intake FAIL:', e)
        ok = False

    # 2) نبراس يتصل بك — API مباشر للسحابة
    lid = 'cb-test-' + TS
    try:
        lres = api('POST', '/api/nebras-visitor-intake', {
            'type': 'callback_lead',
            'data': {
                'id': lid,
                'customerName': 'زائر اختبار',
                'phone': '0555111222',
                'city': 'جدة',
                'need': 'اختبار حي callback ' + TS,
                'createdAt': int(time.time() * 1000)
            }
        })
        print('callback_intake:', lres)
        if not lres.get('ok'):
            ok = False
    except Exception as e:
        print('callback_intake FAIL:', e)
        ok = False

    # 3) دخول إدارة + سحب من السحابة
    login = api('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    token = login['token']
    pull = api('GET', '/api/nebras-cloud?action=pull&keys=complaints,callback_leads,admin_users', token=token)

    found_c = False
    found_l = False
    for row in pull.get('rows', []):
        k = row.get('store_key')
        p = row.get('payload')
        if k == 'complaints' and isinstance(p, dict):
            print('complaints_in_cloud:', len(p), 'keys sample:', list(p.keys())[:5])
            found_c = cid in p
            if found_c:
                print('  -> test complaint FOUND in cloud')
            else:
                print('  -> test complaint NOT in cloud yet')
                ok = False
        if k == 'callback_leads' and isinstance(p, list):
            print('callback_leads_in_cloud:', len(p))
            found_l = any(x and x.get('id') == lid for x in p)
            if found_l:
                print('  -> test callback FOUND in cloud')
            else:
                print('  -> test callback NOT in cloud')
                ok = False

    # 4) حفظ إدارة — مستخدم تجريبي ثم تحقق
    test_user = {
        'id': 'test-admin-' + TS,
        'username': 'TESTUSER' + TS,
        'password': 'TestPass123!',
        'role': 'sales_manager',
        'isActive': True,
        'assignedBranchCity': 'الرياض',
        'permissions': ['sales', 'quotes']
    }
    users_row = next((r for r in pull.get('rows', []) if r.get('store_key') == 'admin_users'), None)
    users = (users_row.get('payload') if users_row else None) or []
    if not isinstance(users, list):
        users = []
    users = [u for u in users if u and u.get('id') != test_user['id']]
    users.append(test_user)
    pres = api('POST', '/api/nebras-governance-persist', {
        'store_key': 'admin_users',
        'payload': users
    }, token=token)
    print('admin_persist:', pres.get('ok'), pres.get('verified'))
    if not pres.get('ok'):
        ok = False

    pull2 = api('GET', '/api/nebras-cloud?action=pull&keys=admin_users', token=token)
    for row in pull2.get('rows', []):
        if row.get('store_key') == 'admin_users':
            names = [u.get('username') for u in (row.get('payload') or []) if isinstance(u, dict)]
            if test_user['username'] in names:
                print('admin_user_roundtrip: OK')
            else:
                print('admin_user_roundtrip: FAIL')
                ok = False

    # 5) تنظيف مستخدم الاختبار
    users_clean = [u for u in users if u.get('id') != test_user['id']]
    api('POST', '/api/nebras-governance-persist', {'store_key': 'admin_users', 'payload': users_clean}, token=token)
    print('cleanup_test_user: done')

    print('RESULT:', 'PASS — كل المسارات فعلية' if ok else 'FAIL — يوجد مسار غير مكتمل')
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
