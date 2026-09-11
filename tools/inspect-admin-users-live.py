# -*- coding: utf-8 -*-
import json, urllib.request, urllib.parse, urllib.error
SITE='https://www.nebrasplasticcompany.com'

def api(method, path, body=None, token=None):
    data=json.dumps(body).encode() if body is not None else None
    h={'Content-Type':'application/json','User-Agent':'NebrasUsers/1'}
    if token: h['Authorization']='Bearer '+token
    req=urllib.request.Request(SITE+path, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=90) as r:
        raw=r.read(); return json.loads(raw) if raw else {}

login=api('POST','/api/nebras-auth?action=login',{'username':'NEBRASFACTORY','password':'NEBRASFACTORYCOMPANYBASIC'})
tok=login['token']
pulled=api('GET','/api/nebras-cloud?'+urllib.parse.urlencode({'action':'pull','keys':'admin_users'}), token=tok)
users=[]
for r in pulled.get('rows') or []:
    if r.get('store_key')=='admin_users':
        users=r.get('payload') or []
print('count', len(users))
for u in users:
    if not u: continue
    un=u.get('username')
    role=u.get('role')
    perms=u.get('permissions')
    print('-', un, role, 'perms', len(perms) if isinstance(perms,list) else perms, 'active', u.get('isActive'), 'pw?', bool(u.get('password')))
