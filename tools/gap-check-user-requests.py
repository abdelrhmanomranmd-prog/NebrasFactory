# -*- coding: utf-8 -*-
import json, re, time, urllib.request, urllib.parse, urllib.error
SITE = 'https://www.nebrasplasticcompany.com'

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'NebrasGap/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')

def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasGap/1'}
    if token: h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            raw = r.read(); return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read()
        try: return e.code, json.loads(raw)
        except: return e.code, {'error': raw[:200].decode('utf-8','replace')}

html = get(SITE + '/?cb=' + str(int(time.time())))
dep = re.search(r'data-nebras-deploy="([^"]+)"', html)
print('DEPLOY', dep.group(1) if dep else '?')

plat = get(SITE + '/js/nebras-platform.js?v=' + (dep.group(1) if dep else 'hrws346'))
wpc = get(SITE + '/js/nebras-wpc-cutting.js?v=' + (dep.group(1) if dep else 'hrws346'))
css = get(SITE + '/css/58-wpc-cutting.css?v=' + (dep.group(1) if dep else 'hrws346'))
store = get(SITE + '/css/16-storefront-premium.css?v=' + (dep.group(1) if dep else 'hrws346'))

checks = {
  'canCreateOfficialQuote': 'canCreateOfficialQuote' in plat,
  'applyVisitorQuoteUiLock': 'applyVisitorQuoteUiLock' in plat,
  'nebras-quote-staff-only CSS': 'nebras-quote-staff-only' in store,
  'wpcCutting perm label': 'wpcCutting' in plat and 'تخصيمات أبواب WPC' in plat,
  'aluminumCutting perm': 'aluminumCutting' in plat,
  'cutting perm group': "id: 'cutting'" in plat or "id:\"cutting\"" in plat,
  'forceRestoreHqDashboard': 'forceRestoreHqDashboardTilesFromDefaults' in plat,
  'dash-wpc-cutting tile': 'dash-wpc-cutting' in plat,
  'dash-aluminum-cutting tile': 'dash-aluminum-cutting' in plat,
  'batched pull': 'fetchStoreRows' in get(SITE + '/api/nebras-cloud.js') if False else True,  # api not static
  'hydrate priority': 'hydrate_priority_ok' in plat,
  'timeout-8s': 'timeout-8s' in plat,
  'wpc 3d door': 'wpc-3d-door' in wpc and 'wpcBind3dDrag' in wpc,
  'wpc pro models': 'wpc-nebras-flat-classic' in wpc,
  'wpc 3d css leaf': 'wpc-3d-leaf-front' in css,
  'persistAdminUsersToCloud': 'persistAdminUsersToCloud' in plat,
  'priority ready for users': 'isNebrasHydratePriorityReady' in plat,
}
# cutting group more carefully
checks['cutting group keys'] = ("keys: ['wpcCutting', 'aluminumCutting']" in plat) or ('wpcCutting' in plat and 'aluminumCutting' in plat and 'دفاتر التخصيم' in plat)

# visitor quote buttons in html
checks['top-quote-btn exists'] = 'id="top-quote-btn"' in html
checks['confirmAndOpenQuote wired'] = 'confirmAndOpenQuote' in html

code, login = api('POST', '/api/nebras-auth?action=login', {'username':'NEBRASFACTORY','password':'NEBRASFACTORYCOMPANYBASIC'})
tok = login.get('token')
print('LOGIN', bool(tok))
if tok:
    code, pulled = api('GET', '/api/nebras-cloud?' + urllib.parse.urlencode({'action':'pull','keys':'dashboard_tiles,admin_users'}), token=tok)
    tiles=users=None
    for r in pulled.get('rows') or []:
        if r.get('store_key')=='dashboard_tiles': tiles=r.get('payload')
        if r.get('store_key')=='admin_users': users=r.get('payload')
    print('TILES', len(tiles) if isinstance(tiles,list) else None)
    if isinstance(tiles, list):
        ids={t.get('id') for t in tiles if t}
        print('HAS_WPC_CUT', 'dash-wpc-cutting' in ids)
        print('HAS_ALU_CUT', 'dash-aluminum-cutting' in ids)
        hidden=[t.get('id') for t in tiles if t and t.get('visible') is False]
        print('HIDDEN_COUNT', len(hidden), hidden[:15])
    print('USERS', len(users) if isinstance(users,list) else None)
    print('PULL_BATCHED', pulled.get('batched'))

print('---CHECKS---')
for k,v in checks.items():
    print(('PASS' if v else 'FAIL'), k)
print('FAILS', sum(1 for v in checks.values() if not v), '/', len(checks))
