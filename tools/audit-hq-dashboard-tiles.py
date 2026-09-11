#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, re, urllib.request, urllib.parse, urllib.error
SITE = 'https://www.nebrasplasticcompany.com'

def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasDashFix/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'error': raw.decode('utf-8', 'replace')[:200]}

html = urllib.request.urlopen(SITE + '/', timeout=40).read().decode('utf-8', 'replace')
m = re.search(r'data-nebras-deploy="([^"]+)"', html)
print('deploy', m.group(1) if m else '?')
code, login = api('POST', '/api/nebras-auth?action=login', {
    'username': 'NEBRASFACTORY', 'password': 'NEBRASFACTORYCOMPANYBASIC'
})
tok = login.get('token')
print('login', bool(tok))
qs = urllib.parse.urlencode({'action': 'pull', 'keys': 'dashboard_tiles'})
code, pulled = api('GET', '/api/nebras-cloud?' + qs, token=tok)
tiles = None
for r in pulled.get('rows') or []:
    if r and r.get('store_key') == 'dashboard_tiles':
        tiles = r.get('payload')
print('count', len(tiles) if isinstance(tiles, list) else None)
if isinstance(tiles, list):
    hid = [t.get('id') for t in tiles if t and t.get('visible') is False]
    vis = [t for t in tiles if t and t.get('visible') is not False]
    print('visible', len(vis), 'hidden', len(hid))
    print('hidden_ids', hid[:40])
    for need in ['dash-wpc-cutting', 'dash-aluminum-cutting', 'dash-wpc-dept', 'dash-aluminum-dept',
                 'dash-users', 'dash-cloud-health', 'dash-rep-quotes', 'dash-governance']:
        t = next((x for x in tiles if x and x.get('id') == need), None)
        if not t:
            print(need, 'MISSING')
        else:
            print(need, 'vis=', t.get('visible'), 'h=', t.get('handler'), 'p=', t.get('permission'))
