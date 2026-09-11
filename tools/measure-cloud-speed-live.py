# -*- coding: utf-8 -*-
import json, time, re, urllib.request, urllib.error, urllib.parse
SITE = 'https://www.nebrasplasticcompany.com'

def api(method, path, body=None, token=None, timeout=120):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasSpeed/1'}
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

t0 = time.time()
req = urllib.request.Request(SITE + '/?cb=' + str(int(time.time())), headers={'User-Agent': 'NebrasSpeed/1', 'Cache-Control': 'no-cache'})
with urllib.request.urlopen(req, timeout=40) as r:
    html = r.read().decode('utf-8', 'replace')
home_ms = (time.time() - t0) * 1000
dep = re.search(r'data-nebras-deploy="([^"]+)"', html)
print('HOME', round(home_ms), 'ms', 'deploy', dep.group(1) if dep else '?', 'len', len(html))

code, login, lms = api('POST', '/api/nebras-auth?action=login', {
    'username': 'NEBRASFACTORY', 'password': 'NEBRASFACTORYCOMPANYBASIC'
})
print('LOGIN', code, round(lms), 'ms', 'token', bool(login.get('token')))
tok = login.get('token')
if not tok:
    raise SystemExit(1)

keys6 = 'admin_users,dashboard_tiles,system_settings,products,categories,branches'
code, pulled, pms = api('GET', '/api/nebras-cloud?' + urllib.parse.urlencode({'action': 'pull', 'keys': keys6}), token=tok)
print('PULL6', code, round(pms), 'ms', 'rows', len(pulled.get('rows') or []), 'bytes', len(json.dumps(pulled)))

keys12 = 'admin_users,dashboard_tiles,system_settings,products,categories,branches,audit_log,sales_quotes,wpc_models,wpc_estimates,aluminum_estimates,site_content'
code, pulled2, pms2 = api('GET', '/api/nebras-cloud?' + urllib.parse.urlencode({'action': 'pull', 'keys': keys12}), token=tok)
print('PULL12', code, round(pms2), 'ms', 'rows', len(pulled2.get('rows') or []), 'bytes', len(json.dumps(pulled2)))

# many keys like hydrate
many = ','.join([
    'admin_users','dashboard_tiles','system_settings','products','categories','branches','audit_log',
    'sales_quotes','wpc_models','wpc_estimates','wpc_cut_jobs','aluminum_estimates','aluminum_cut_jobs',
    'site_content','complaints','customers','orders','inventory','warehouse','hr_employees','legal_docs',
    'nebras_cart','payment_methods','bank_accounts','occasion','showroom','media_library','erp_hub'
] * 2)  # duplicate to inflate? no - unique
many_keys = [
    'admin_users','dashboard_tiles','system_settings','products','categories','branches','audit_log',
    'sales_quotes','wpc_models','wpc_estimates','wpc_cut_jobs','aluminum_estimates','aluminum_cut_jobs',
    'site_content','complaints','customers','orders','inventory','warehouse','hr_employees','legal_docs',
    'payment_methods','bank_accounts','occasion','showroom','media_library'
]
code, pulled3, pms3 = api('GET', '/api/nebras-cloud?' + urllib.parse.urlencode({'action': 'pull', 'keys': ','.join(many_keys)}), token=tok)
print('PULL26', code, round(pms3), 'ms', 'rows', len(pulled3.get('rows') or []), 'bytes', len(json.dumps(pulled3)))
