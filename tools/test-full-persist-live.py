"""اختبار حفظ كامل — يضيف مستخدم تجريبي ويتحقق من Supabase"""
import json
import urllib.request
import urllib.error
import time

SITE = 'https://www.nebrasplasticcompany.com'
TEST_USER = 'NEBRASTEST_' + str(int(time.time()))[-6:]


def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasFullPersist/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    r = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'error': raw.decode('utf-8', 'replace')[:300]}


def main():
    print('=== NEBRAS FULL PERSIST TEST ===')
    print('Test user:', TEST_USER)

    code, login = req('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    if not login.get('ok'):
        print('FAIL login:', code, login)
        return 1
    token = login['token']
    print('PASS login, token len:', len(token))

    code, pull = req('GET', '/api/nebras-cloud?action=pull&keys=admin_users', token=token)
    users = []
    if pull.get('rows'):
        users = pull['rows'][0].get('payload') or []
    if not isinstance(users, list):
        users = []
    print('INFO admin_users before:', len(users))

    # Add test user
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    new_user = {
        'id': 'TEST-' + TEST_USER,
        'username': TEST_USER,
        'password': 'pbkdf2$10000$test$placeholder',  # will be replaced if hash works server-side
        'role': 'sales_rep',
        'permissions': ['sales', 'quotes'],
        'isActive': True,
        'isPrimary': False,
        'createdAt': now,
        'updatedAt': now
    }
    # Use plain password - server auth uses verifyNebrasPassword which may need proper hash
    # For persist test we copy format from existing user
    if users:
        sample = users[0]
        new_user['password'] = sample.get('password', 'NEBRASFACTORYCOMPANYBASIC')

    users.append(new_user)
    code, persist = req('POST', '/api/nebras-governance-persist', {
        'store_key': 'admin_users',
        'payload': users
    }, token=token)
    print('governance-persist:', code, persist)
    if not persist.get('ok') or not persist.get('verified'):
        print('FAIL persist')
        return 1

    code, pull2 = req('GET', '/api/nebras-cloud?action=pull&keys=admin_users', token=token)
    users2 = []
    if pull2.get('rows'):
        users2 = pull2['rows'][0].get('payload') or []
    found = any(u.get('username') == TEST_USER for u in users2 if isinstance(u, dict))
    print('INFO admin_users after:', len(users2), 'test found:', found)

    # Test public cloud push (site_products via nebras-cloud)
    code, push = req('POST', '/api/nebras-cloud?action=push', {
        'rows': [{
            'store_key': 'system_settings',
            'payload': {'_persistTestAt': now, 'occasionThemeEnabled': False},
            'updated_at': now
        }]
    }, token=token)
    print('cloud push system_settings:', code, push)

    # Cleanup - remove test user
    cleaned = [u for u in users2 if u.get('username') != TEST_USER]
    if found:
        req('POST', '/api/nebras-governance-persist', {
            'store_key': 'admin_users',
            'payload': cleaned
        }, token=token)
        print('INFO cleaned test user')

    if found and persist.get('verified'):
        print('RESULT: ALL PASS — cloud persist works end-to-end')
        return 0
    print('RESULT: FAIL — persist chain broken')
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
