"""اختبار حي — حفظ الحوكمة في السحابة (hrws117+)"""
import json
import urllib.request
import urllib.error

SITE = 'https://www.nebrasplasticcompany.com'


def post(path, body, token=None):
    data = json.dumps(body).encode()
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasGovTest/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method='POST')
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.status, json.loads(r.read())


def get(path, token=None):
    h = {'User-Agent': 'NebrasGovTest/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, headers=h)
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.status, json.loads(r.read())


def main():
    ok = True

    # governance API exists (401 without token)
    try:
        req = urllib.request.Request(
            SITE + '/api/nebras-governance-persist',
            data=b'{}',
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        urllib.request.urlopen(req, timeout=20)
        print('FAIL: governance API should require auth')
        ok = False
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print('PASS: governance API requires auth (401)')
        else:
            print('WARN: governance API status', e.code)
            ok = False

    st, login = post('/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    if not login.get('ok'):
        print('FAIL: admin login', login)
        return 1
    token = login['token']
    print('PASS: admin login')

    st, pull = get('/api/nebras-cloud?action=pull&keys=admin_users', token)
    users = []
    if pull.get('rows'):
        users = pull['rows'][0].get('payload') or []
    print('INFO: admin_users in cloud:', len(users) if isinstance(users, list) else 0)

    st, cpull = get('/api/nebras-cloud?action=pull&keys=customer_portal_users', token)
    cp = []
    if cpull.get('rows'):
        cp = cpull['rows'][0].get('payload') or []
    print('INFO: customer_portal_users in cloud:', len(cp) if isinstance(cp, list) else 0)

    # portal-login endpoint
    st, pl = post('/api/nebras-auth?action=portal-login', {
        'username': 'nonexistent_test_user',
        'password': 'wrong'
    })
    if pl.get('error') == 'invalid_credentials':
        print('PASS: portal-login endpoint active')
    else:
        print('WARN: portal-login response', pl)

    print('RESULT:', 'ALL PASS' if ok else 'CHECK WARNINGS')
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
