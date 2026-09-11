# -*- coding: utf-8 -*-
"""Prove hrws346: batched pull speed + HQ create user live + deploy."""
import json, re, time, urllib.request, urllib.error, urllib.parse

SITE = 'https://www.nebrasplasticcompany.com'
NEBRAS_PW_HASH_PREFIX = 'nbh1:'
TEST_USER = 'NEBRASTESTREP346'
TEST_PASS = 'NebrasTestRep346!'
TEST_ID = 'prove-dyn-rep-346'

def hash_nebras_password(pw):
    h1 = 5381
    h2 = 0
    s = str(pw) + '|NEBRAS_FACTORY_SALT_v1'
    for ch in s:
        c = ord(ch)
        h1 = ((h1 << 5) + h1 + c) & 0xFFFFFFFF
        h2 = (h2 * 31 + c) & 0xFFFFFFFF
    return NEBRAS_PW_HASH_PREFIX + format(h1, 'x') + format(h2, 'x')

def api(method, path, body=None, token=None, timeout=120):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasProve346/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else {}, (time.time() - t0) * 1000
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw), (time.time() - t0) * 1000
        except Exception:
            return e.code, {'error': raw[:200].decode('utf-8', 'replace')}, (time.time() - t0) * 1000

checks = []
def ok(name, cond, detail=''):
    checks.append((name, bool(cond), detail))
    print(('PASS' if cond else 'FAIL'), name, detail)

# wait deploy
deploy = None
for i in range(30):
    try:
        st, html, ms = api('GET', '/?cb=' + str(int(time.time())))
        # GET without body via urllib differently
    except Exception:
        pass
    req = urllib.request.Request(SITE + '/?cb=' + str(int(time.time())), headers={'User-Agent': 'NebrasProve346/1', 'Cache-Control': 'no-cache'})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=40) as r:
        html = r.read().decode('utf-8', 'replace')
        home_ms = (time.time() - t0) * 1000
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    deploy = m.group(1) if m else None
    print('poll', i, 'deploy', deploy, 'home_ms', round(home_ms))
    if deploy == 'hrws346':
        break
    time.sleep(10)

ok('deploy_hrws346', deploy == 'hrws346', deploy or '?')

code, login, lms = api('POST', '/api/nebras-auth?action=login', {
    'username': 'NEBRASFACTORY', 'password': 'NEBRASFACTORYCOMPANYBASIC'
})
tok = login.get('token')
ok('login_ok', code == 200 and bool(tok), 'ms=' + str(round(lms)))
ok('login_under_3s', lms < 3000, str(round(lms)))

keys26 = [
    'admin_users','dashboard_tiles','system_settings','products','categories','branches','audit_log',
    'sales_quotes','wpc_models','wpc_estimates','wpc_cut_jobs','aluminum_estimates','aluminum_cut_jobs',
    'site_content','complaints','customers','orders','inventory','warehouse','hr_employees','legal_docs',
    'payment_methods','bank_accounts','occasion','showroom','media_library'
]
code, pulled, pms = api('GET', '/api/nebras-cloud?' + urllib.parse.urlencode({'action': 'pull', 'keys': ','.join(keys26)}), token=tok)
ok('pull26_ok', code == 200 and pulled.get('ok'), 'ms=' + str(round(pms)))
ok('pull26_batched', pulled.get('batched') is True, str(pulled.get('batched')))
ok('pull26_under_3s', pms < 3000, str(round(pms)))
ok('pull26_rows', len(pulled.get('rows') or []) >= 1, str(len(pulled.get('rows') or [])))

# asset markers
req = urllib.request.Request(SITE + '/js/nebras-platform.js?v=hrws346', headers={'User-Agent': 'NebrasProve346/1'})
with urllib.request.urlopen(req, timeout=60) as r:
    plat = r.read().decode('utf-8', 'replace')
ok('priority_hydrate', 'hydrate_priority_ok' in plat and 'isNebrasHydratePriorityReady' in plat)
ok('timeout_8s', 'timeout-8s' in plat)

req = urllib.request.Request(SITE + '/api/nebras-cloud.js', headers={'User-Agent': 'NebrasProve346/1'})
# API file not public as static - skip

# create user live
code, users_pull, _ = api('GET', '/api/nebras-cloud?' + urllib.parse.urlencode({'action': 'pull', 'keys': 'admin_users'}), token=tok)
users = None
for row in (users_pull.get('rows') or []):
    if row and row.get('store_key') == 'admin_users':
        users = row.get('payload')
if not isinstance(users, list):
    users = []
# remove leftover test user
users = [u for u in users if not (u and str(u.get('username','')).upper() == TEST_USER)]
new_user = {
    'id': TEST_ID,
    'username': TEST_USER,
    'password': hash_nebras_password(TEST_PASS),
    'role': 'sales_rep',
    'isActive': True,
    'permissions': ['sales', 'quotes', 'orders'],
    'phone': '0500000346'
}
users.append(new_user)
code, pushed, push_ms = api('POST', '/api/nebras-cloud?action=push', {
    'rows': [{'store_key': 'admin_users', 'payload': users}]
}, token=tok)
ok('push_user', code == 200 and pushed.get('ok'), 'ms=' + str(round(push_ms)))

# verify pull contains user
code, verify, _ = api('GET', '/api/nebras-cloud?' + urllib.parse.urlencode({'action': 'pull', 'keys': 'admin_users'}), token=tok)
found = False
cloud_users = []
for row in (verify.get('rows') or []):
    if row and row.get('store_key') == 'admin_users' and isinstance(row.get('payload'), list):
        cloud_users = row['payload']
        found = any(u and str(u.get('username','')).upper() == TEST_USER for u in cloud_users)
ok('user_in_cloud', found)

# login as new user
code, ulogin, ulms = api('POST', '/api/nebras-auth?action=login', {
    'username': TEST_USER, 'password': TEST_PASS
})
ok('user_can_login', code == 200 and bool(ulogin.get('token')), 'ms=' + str(round(ulms)) + ' err=' + str(ulogin.get('error')))

# cleanup
cloud_users = [u for u in cloud_users if not (u and str(u.get('username','')).upper() == TEST_USER)]
code, cleaned, _ = api('POST', '/api/nebras-cloud?action=push', {
    'rows': [{'store_key': 'admin_users', 'payload': cloud_users}]
}, token=tok)
ok('cleanup_user', code == 200 and cleaned.get('ok'))

passed = sum(1 for _, c, _ in checks if c)
total = len(checks)
print('RESULT', passed, '/', total)
raise SystemExit(0 if passed == total else 1)
