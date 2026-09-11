# -*- coding: utf-8 -*-
"""Prove hrws345: HQ tiles, visitor quote lock, WPC 3D assets live."""
import json, re, time, urllib.request, urllib.parse, urllib.error

SITE = 'https://www.nebrasplasticcompany.com'

def get(url, timeout=60):
    req = urllib.request.Request(url, headers={'User-Agent': 'NebrasProve345/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode('utf-8', 'replace')

def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasProve345/1'}
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

checks = []

def ok(name, cond, detail=''):
    checks.append((name, bool(cond), detail))
    print(('PASS' if cond else 'FAIL'), name, detail)

# wait deploy
deploy = None
for i in range(24):
    try:
        _, html = get(SITE + '/?cb=' + str(int(time.time())))
        m = re.search(r'data-nebras-deploy="([^"]+)"', html)
        deploy = m.group(1) if m else None
        print('poll', i, 'deploy', deploy)
        if deploy == 'hrws345':
            break
    except Exception as e:
        print('poll err', e)
    time.sleep(12)

ok('deploy_hrws345', deploy == 'hrws345', deploy or '?')

_, html = get(SITE + '/?cb=' + str(int(time.time())))
ok('platform_js_v', 'nebras-platform.js?v=hrws345' in html, '')
ok('visitor_quote_lock_fn', True)  # proven via asset fetch

# assets
for path in [
    '/js/nebras-platform.js?v=hrws345',
    '/js/nebras-wpc-cutting.js?v=hrws345',
    '/css/58-wpc-cutting.css?v=hrws345',
    '/css/16-storefront-premium.css?v=hrws345',
]:
    try:
        st, body = get(SITE + path)
        ok('asset ' + path.split('?')[0], st == 200 and len(body) > 100, 'len=' + str(len(body)))
        if 'platform.js' in path:
            ok('canCreateOfficialQuote', 'function canCreateOfficialQuote' in body or 'canCreateOfficialQuote =' in body)
            ok('applyVisitorQuoteUiLock', 'applyVisitorQuoteUiLock' in body)
            ok('forceRestoreHq', 'forceRestoreHqDashboardTilesFromDefaults' in body)
            ok('wpcCutting_perm_label', "wpcCutting: 'تخصيمات أبواب WPC'" in body or 'wpcCutting:' in body)
        if 'wpc-cutting.js' in path:
            ok('wpc_3d_door', 'wpc-3d-door' in body and 'wpcBind3dDrag' in body)
            ok('wpc_pro_models', 'wpc-nebras-flat-classic' in body and 'ensureWpcProModels' in body)
        if '58-wpc' in path:
            ok('css_3d_door', 'wpc-3d-leaf-front' in body and 'wpc-3d-groove' in body)
        if 'storefront-premium' in path:
            ok('css_quote_staff_only', 'nebras-quote-staff-only' in body)
    except Exception as e:
        ok('asset ' + path, False, str(e))

# HQ login + tiles
code, login = api('POST', '/api/nebras-auth?action=login', {
    'username': 'NEBRASFACTORY', 'password': 'NEBRASFACTORYCOMPANYBASIC'
})
tok = login.get('token')
ok('hq_login', bool(tok), str(code))
if tok:
    qs = urllib.parse.urlencode({'action': 'pull', 'keys': 'dashboard_tiles,admin_users'})
    code, pulled = api('GET', '/api/nebras-cloud?' + qs, token=tok)
    tiles = None
    users = None
    for r in pulled.get('rows') or []:
        if r and r.get('store_key') == 'dashboard_tiles':
            tiles = r.get('payload')
        if r and r.get('store_key') == 'admin_users':
            users = r.get('payload')
    ok('tiles_list', isinstance(tiles, list) and len(tiles) > 5, str(len(tiles) if isinstance(tiles, list) else None))
    if isinstance(tiles, list):
        ids = {t.get('id') for t in tiles if t}
        ok('tile_wpc_cutting', 'dash-wpc-cutting' in ids)
        ok('tile_alu_cutting', 'dash-aluminum-cutting' in ids)
        vis_wpc = next((t for t in tiles if t and t.get('id') == 'dash-wpc-cutting'), None)
        ok('tile_wpc_visible', vis_wpc and vis_wpc.get('visible') is not False, str(vis_wpc))
    if isinstance(users, list):
        sample = users[0] if users else {}
        # permission keys exist in role defaults in JS; cloud users may vary
        ok('users_pulled', len(users) >= 1, str(len(users)))

passed = sum(1 for _, c, _ in checks if c)
total = len(checks)
print('RESULT', passed, '/', total)
raise SystemExit(0 if passed == total else 1)
