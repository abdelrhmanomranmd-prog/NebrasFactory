"""تحقق إنتاج — سحابة نظيفة + إصدار حي"""
import json
import re
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasProdVerify/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def main():
    print('=== NEBRAS PRODUCTION VERIFY ===')
    html = urllib.request.urlopen(SITE + '/index.html', timeout=30).read().decode('utf-8', 'replace')
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    deploy = m.group(1) if m else 'none'
    print('deploy:', deploy)
    prod_mode = 'NEBRAS_PRODUCTION_LIVE_MODE = true' in open('js/nebras-platform.js', encoding='utf-8').read()
    print('production mode in code:', prod_mode)

    login = api('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    token = login['token']
    keys = 'admin_users,site_products,hr_employees,customer_portal_users,crm_customers,branches'
    pull = api('GET', '/api/nebras-cloud?action=pull&keys=' + keys, token=token)
    ok = True
    for row in pull.get('rows', []):
        k = row.get('store_key')
        p = row.get('payload')
        n = len(p) if isinstance(p, (list, dict)) else 0
        print(k + ':', n)
        if k == 'admin_users':
            names = [u.get('username') for u in (p or []) if isinstance(u, dict)]
            if names != ['NEBRASFACTORY']:
                print('FAIL admin_users expected only NEBRASFACTORY, got', names)
                ok = False
        elif k in ('hr_employees', 'customer_portal_users', 'site_products', 'crm_customers') and n > 0:
            print('FAIL', k, 'should be empty')
            ok = False
    print('RESULT:', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
